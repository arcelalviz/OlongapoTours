import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type {Destination,Event,Story} from './types';
export async function destinations(featured=false){const db=await createClient();let q=db.from('destinations').select('*').eq('is_published',true).order('sort_order');if(featured)q=q.eq('is_featured',true);const{data}=await q;return (data||[]) as Destination[]}
export async function events(){const db=await createClient();const{data}=await db.from('tourism_events').select('*').eq('is_published',true).order('month_number');return (data||[]) as Event[]}
export async function destination(slug:string){const db=await createClient();const{data}=await db.from('destinations').select('*').eq('slug',slug).eq('is_published',true).maybeSingle();return data as Destination|null}
export async function event(slug:string){const db=await createClient();const{data}=await db.from('tourism_events').select('*').eq('slug',slug).eq('is_published',true).maybeSingle();return data as Event|null}
export async function stories(limit=30){const db=await createClient();const{data}=await db.from('reviews').select('*,review_photos(id,public_url,alt_text),profiles(display_name)').eq('status','published').order('created_at',{ascending:false}).limit(limit);return (data||[]) as Story[]}
