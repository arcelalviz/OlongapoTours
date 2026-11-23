import fs from 'node:fs';import path from 'node:path';
const source=JSON.parse(fs.readFileSync(new URL('../data/source-v3.json',import.meta.url),'utf8'));
const allowed=new Set([
 'ulo-ng-apo','rizal-triangle','magsaysay-drive','olongapo-city-public-market','sm-city-olongapo-downtown',
 'inflatable-island','spanish-gate','ocean-adventure','subic-bay-yacht-club','camayan-beach','grande-island','harbor-point',
 'moonbay-marina','hell-ships-memorial','anawangin-cove','nagsasa-cove','capones-island','camara-island','magalawa-island',
 'potipot-island','zambales-provincial-capitol'
]);
const allowEvents=new Set(['olongapo-city-fiesta-dyipni','ulo-ng-apo-festival']);
const quote=s=>s===null||s===undefined?'NULL':"'"+String(s).replaceAll("'","''")+"'";
const bool=x=>x?'true':'false';
let count=0;
const dest=source.destinations.map(d=>{
 const verified=allowed.has(d.slug)&&d.image_url?.startsWith('https://')&&d.image_source_url?.startsWith('https://');if(verified)count++;
 const values=[d.slug,d.name,d.category,d.area,d.location_label,d.excerpt,d.description,d.travel_tip,verified?d.image_url:null,verified?d.image_source_url:null,verified?d.image_credit:null,d.map_query];
 return `(${values.map(quote).join(',')},${bool(d.is_featured)},true,${Number(d.sort_order)||0})`;
});
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const events=source.events.map(e=>{const verified=allowEvents.has(e.slug)&&e.image_url?.startsWith('https://')&&e.image_source_url?.startsWith('https://');const values=[e.slug,e.title,e.category,e.month_label,months.indexOf(e.month_label)+1,e.date_start,e.date_end,e.date_note,e.location_label,e.excerpt,e.description,verified?e.image_url:null,verified?e.image_source_url:null,verified?e.image_credit:null,e.source_url,e.schedule_status];return `(${values.map(quote).join(',')},${bool(e.is_featured)},true)`});
const sql=`-- Generated from V3 content + conservative provenance allowlist; no generic images.\n-- Missing photos are NULL and the UI shows text instead.\nINSERT INTO public.destinations(slug,name,category,area,location_label,excerpt,description,travel_tip,image_url,image_source_url,image_credit,map_query,is_featured,is_published,sort_order) VALUES\n${dest.join(',\n')}\nON CONFLICT(slug) DO NOTHING;\n\nINSERT INTO public.tourism_events(slug,title,category,month_label,month_number,date_start,date_end,date_note,location_label,excerpt,description,image_url,image_source_url,image_credit,source_url,schedule_status,is_featured,is_published) VALUES\n${events.join(',\n')}\nON CONFLICT(slug) DO NOTHING;\n`;
fs.writeFileSync(new URL('../supabase/002_seed.sql',import.meta.url),sql);
const manifest=[...source.destinations.map(d=>({type:'destination',name:d.name,slug:d.slug,photo:allowed.has(d.slug)&&!!d.image_source_url?'source-identified':'removed-no-verified-match',source:allowed.has(d.slug)?d.image_source_url||'':''})),...source.events.map(e=>({type:'event',name:e.title,slug:e.slug,photo:allowEvents.has(e.slug)&&!!e.image_source_url?'historical-source-identified':'removed-no-verified-match',source:allowEvents.has(e.slug)?e.image_source_url||'':''}))];
fs.writeFileSync(new URL('../data/photo-manifest.json',import.meta.url),JSON.stringify(manifest,null,2));
console.log(`Seed created: ${source.destinations.length} places, ${source.events.length} events; ${count} places and ${allowEvents.size} events have sourced photos. Other photo fields NULL.`)
