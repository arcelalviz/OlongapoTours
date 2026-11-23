/**
 * Run on your own computer, not on Vercel.
 * Needs a readable MySQL export/server and a local copy of the OLD htdocs media.
 * Secrets must be supplied by .env.local and never committed.
 */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import mysql from 'mysql2/promise';import {createClient} from '@supabase/supabase-js';
const envFile=path.resolve('.env.local');if(fs.existsSync(envFile)&&process.loadEnvFile)process.loadEnvFile(envFile);
for(const key of ['LEGACY_DB_HOST','LEGACY_DB_USER','LEGACY_DB_NAME','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','GALLERY_SECRET'])if(!process.env[key])throw new Error(`Missing ${key} in .env.local`);
if(process.env.GALLERY_SECRET.length<32)throw new Error('GALLERY_SECRET must be >=32 characters');
const root=path.resolve(process.env.LEGACY_SITE_DIR||'./legacy-site');
const db=await mysql.createConnection({host:process.env.LEGACY_DB_HOST,port:Number(process.env.LEGACY_DB_PORT||3306),user:process.env.LEGACY_DB_USER,password:process.env.LEGACY_DB_PASSWORD||'',database:process.env.LEGACY_DB_NAME,charset:'utf8mb4',dateStrings:true});
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const codeHash=c=>crypto.createHmac('sha256',process.env.GALLERY_SECRET).update(c.trim().toUpperCase()).digest('hex');
const tokenHash=t=>crypto.createHash('sha256').update(t).digest('hex');
const sql=async q=>{try{const [rows]=await db.query(q);return rows}catch(e){if(e.code==='ER_NO_SUCH_TABLE'){console.log('SKIP missing source table:',q.match(/FROM\s+[`\w]+/i)?.[0]);return []}throw e}};
async function put(table,obj,conflict){const{data,error}=await supabase.from(table).upsert(obj,{onConflict:conflict}).select();if(error){console.error(`IMPORT FAILED ${table}:`,error.message);return null}return data?.[0]||null}
function mediaFile(filename){const normalized=String(filename||'').replaceAll('\\','/').replace(/^\.?\//,'');const candidate=path.resolve(root,normalized);if(candidate!==root&&!candidate.startsWith(root+path.sep))return null;if(!fs.existsSync(candidate)||!fs.statSync(candidate).isFile())return null;return candidate}
function mime(filename){const ext=path.extname(filename).toLowerCase();return ({'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4'})[ext]||null}
function validPhoto(row,kind){const manifest=JSON.parse(fs.readFileSync(new URL('../data/photo-manifest.json',import.meta.url),'utf8'));const m=manifest.find(x=>x.type===kind&&x.slug===row.slug);return !!(m?.source&&row.image_source_url===m.source&&row.image_url?.startsWith('https://'))}
const errors=[],counts={};let count=(k)=>counts[k]=(counts[k]||0)+1;
console.log('Importing legacy content and users (existing Supabase records with matching legacy IDs will be updated).');
const legacyDest=await sql('SELECT * FROM destinations');
for(const r of legacyDest){const ok=validPhoto(r,'destination');await put('destinations',{slug:r.slug,name:r.name,category:r.category,area:r.area,location_label:r.location_label,excerpt:r.excerpt,description:r.description,travel_tip:r.travel_tip||'',map_query:r.map_query||'',image_url:ok?r.image_url:null,image_source_url:ok?r.image_source_url:null,image_credit:ok?r.image_credit:null,is_featured:!!r.is_featured,is_published:!!r.is_published,sort_order:r.sort_order||0},'slug');count('destinations')}
const legacyEvents=await sql('SELECT * FROM tourism_events');const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
for(const r of legacyEvents){const ok=validPhoto(r,'event');await put('tourism_events',{slug:r.slug,title:r.title,category:r.category,month_label:r.month_label,month_number:months.indexOf(r.month_label)+1,date_start:r.date_start||null,date_end:r.date_end||null,date_note:r.date_note||'',location_label:r.location_label,excerpt:r.excerpt,description:r.description,image_url:ok?r.image_url:null,image_source_url:ok?r.image_source_url:null,image_credit:ok?r.image_credit:null,source_url:r.source_url||null,schedule_status:r.schedule_status||'tba',is_featured:!!r.is_featured,is_published:!!r.is_published},'slug');count('events')}
const users=await sql('SELECT * FROM community_users');const profileMap=new Map();
for(const u of users){
 const obj={legacy_user_id:u.id,email:u.email,display_name:u.display_name,avatar_url:u.avatar_url||null};
 const {data:byEmail}=await supabase.from('profiles').select('id,auth_user_id,legacy_user_id').ilike('email',u.email).maybeSingle();
 let out=null;
 if(byEmail){const{data,error}=await supabase.from('profiles').update({legacy_user_id:u.id}).eq('id',byEmail.id).select().single();if(!error)out=data;else errors.push(`user ${u.id}: ${error.message}`)}
 else out=await put('profiles',obj,'legacy_user_id');
 if(out)profileMap.set(Number(u.id),out.id);else errors.push(`user ${u.id} could not be imported`);count('users')
}
const revs=await sql('SELECT * FROM place_reviews');const reviewMap=new Map();
for(const r of revs){const owner=profileMap.get(Number(r.user_id));if(!owner){errors.push(`review ${r.id}: no user`);continue}const out=await put('reviews',{legacy_id:r.id,user_id:owner,place_name:r.place_name,title:r.title,body:r.body,rating:r.rating,visit_date:r.visit_date||null,status:['published','pending','hidden'].includes(r.status)?r.status:'pending',created_at:r.created_at},'legacy_id');if(out)reviewMap.set(Number(r.id),out.id);count('reviews')}
const destMap=new Map((await sql('SELECT id,slug FROM destinations')).map(d=>[Number(d.id),d.slug]));
for(const s of await sql('SELECT * FROM saved_destinations')){const owner=profileMap.get(Number(s.user_id)),slug=destMap.get(Number(s.destination_id));if(owner&&slug){await put('saved_destinations',{user_id:owner,destination_slug:slug},'user_id,destination_slug');count('saved')}}
const itineraryMap=new Map();
for(const t of await sql('SELECT * FROM itineraries')){const owner=profileMap.get(Number(t.user_id));if(!owner)continue;const out=await put('itineraries',{legacy_id:t.id,user_id:owner,title:t.title,created_at:t.created_at},'legacy_id');if(out)itineraryMap.set(Number(t.id),out.id);count('itineraries')}
for(const s of await sql('SELECT * FROM itinerary_stops')){const trip=itineraryMap.get(Number(s.itinerary_id)),slug=destMap.get(Number(s.destination_id));if(trip&&slug&&Number(s.position)<=12){await put('itinerary_stops',{itinerary_id:trip,destination_slug:slug,position:s.position},'itinerary_id,destination_slug');count('stops')}}
const qrRecords=[];const galleryMap=new Map();
for(const g of await sql('SELECT * FROM galleries')){
 const out=await put('galleries',{legacy_id:g.id,tourist_name:g.tourist_name,access_code_hash:codeHash(g.access_code),qr_token_hash:tokenHash(g.qr_token),expires_at:g.expires_at,created_at:g.created_at},'legacy_id');
 if(out){galleryMap.set(Number(g.id),out.id);qrRecords.push({legacy_gallery_id:g.id,visitor:g.tourist_name,expires_at:g.expires_at,qr_url:`${process.env.NEXT_PUBLIC_SITE_URL||'https://YOUR-VERCEL-DOMAIN'}/gallery/qr/${g.qr_token}`,access_code:g.access_code});count('galleries')}
}
async function uploadOld(old,table,ownerId,storagePath){const filename=mediaFile(old.file_path);if(!filename){errors.push(`${table} ${old.id} missing physical file: ${old.file_path}`);return null}const kind=mime(filename);if(!kind){errors.push(`${table} ${old.id} unsupported file format`);return null}const bytes=fs.readFileSync(filename);const bucket=table==='review_photos'?'review-private':'visitor-private';const{error}=await supabase.storage.from(bucket).upload(storagePath,bytes,{contentType:kind,upsert:true});if(error){errors.push(`${table} ${old.id} storage: ${error.message}`);return null}return {kind,bucket,storagePath}}
for(const m of await sql('SELECT * FROM media')){const gallery=galleryMap.get(Number(m.gallery_id));if(!gallery)continue;const ext=path.extname(m.file_path).toLowerCase();const pathName=`${gallery}/legacy-${m.id}${ext}`;const uploaded=await uploadOld(m,'media',gallery,pathName);if(!uploaded)continue;await put('media',{legacy_id:m.id,gallery_id:gallery,original_name:m.original_name||path.basename(m.file_path),storage_path:pathName,media_type:uploaded.kind.startsWith('video/')?'video':'image',created_at:m.uploaded_at},'legacy_id');count('gallery_media')}
for(const p of await sql('SELECT * FROM review_photos')){const review=reviewMap.get(Number(p.review_id));if(!review)continue;const ext=path.extname(p.file_path).toLowerCase(),pathName=`${review}/legacy-${p.id}${ext}`;const uploaded=await uploadOld(p,'review_photos',review,pathName);if(!uploaded)continue;const {data:oldRow}=await supabase.from('review_photos').select('id').eq('legacy_id',p.id).maybeSingle();const photoId=oldRow?.id||crypto.randomUUID();await put('review_photos',{id:photoId,legacy_id:p.id,review_id:review,storage_path:pathName,public_url:`/api/review-photo/${photoId}`,alt_text:p.alt_text||null,created_at:p.created_at},'legacy_id');count('review_media')}
await db.end();const outDir=path.resolve('migration-output');fs.mkdirSync(outDir,{recursive:true});fs.writeFileSync(path.join(outDir,'private-qr-links.json'),JSON.stringify(qrRecords,null,2),{mode:0o600});fs.writeFileSync(path.join(outDir,'summary.json'),JSON.stringify({counts,errors},null,2),{mode:0o600});console.log('Migration summary:',counts,'warnings:',errors.length);console.log(`Private QR records written to ${outDir}. These contain ACCESS SECRETS; never commit or share them.`);if(errors.length)console.log('Review summary.json to resolve missing rows/files before shutting down PHP.');
