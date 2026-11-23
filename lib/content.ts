import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {ensurePublicCatalog} from '@/lib/catalog-bootstrap';
import {bundledDestinations,bundledEvents,trustedPlaceImage,trustedEventImage} from '@/lib/bundled-catalog';
import type {Destination,Event,Story} from './types';

// Public pages are always readable even if a new Supabase project has not
// received the catalog seed yet. We seed an EMPTY table when possible, without
// touching existing records or requiring anything from Byethost.
async function catalogRows<T extends Destination|Event>(table:'destinations'|'tourism_events') {
  const bundled=(table==='destinations'?bundledDestinations:bundledEvents) as T[];
  let db;
  try { db=await createClient(); } catch { return bundled; }
  const order=table==='destinations'?'sort_order':'month_number';
  let {data,error}=await db.from(table).select('*').eq('is_published',true).order(order);
  if(!error && (!data || data.length===0)) {
    try {
      await ensurePublicCatalog();
      ({data,error}=await db.from(table).select('*').eq('is_published',true).order(order));
    } catch { /* Missing schema or credentials: use the shipped content. */ }
  }
  if(error) return bundled;
  // Merge missing rows without resurrecting records an admin intentionally hid.
  // The service-role view can distinguish "deleted/never imported" from "unpublished".
  try {
    const {adminClient}=await import('@/lib/supabase/admin');
    const {data:all,error:readError}=await adminClient().from(table).select('slug');
    if(!readError && all){
      const known=new Set(all.map(row=>row.slug));
      const merged=[...(data||[]) as T[],...bundled.filter(row=>!known.has(row.slug))];
      return merged.sort((a,b)=>table==='destinations'
        ? (a as Destination).sort_order-(b as Destination).sort_order
        : ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf((a as Event).month_label)-['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf((b as Event).month_label));
    }
  } catch { /* Service role not configured; do not override existing visibility. */ }
  return data?.length ? data as T[] : bundled;
}

export async function destinations(featured=false){
  const data=(await catalogRows<Destination>('destinations')).map(trustedPlaceImage);
  return featured?data.filter(x=>x.is_featured):data;
}
export async function events(){return (await catalogRows<Event>('tourism_events')).map(trustedEventImage)}
export async function destination(slug:string){return (await destinations()).find(x=>x.slug===slug)||null}
export async function event(slug:string){return (await events()).find(x=>x.slug===slug)||null}
export async function stories(limit=30){
  try {const db=await createClient();const{data}=await db.from('reviews').select('*,review_photos(id,public_url,alt_text),profiles(display_name)').eq('status','published').order('created_at',{ascending:false}).limit(limit);return (data||[]) as Story[]}
  catch {return [] as Story[]}
}
