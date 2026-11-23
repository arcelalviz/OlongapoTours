import 'server-only';
import {adminClient} from '@/lib/supabase/admin';
import {bundledDestinations,bundledEvents} from '@/lib/bundled-catalog';

// One-time, non-destructive content recovery. Never overwrites edited rows.
export async function ensurePublicCatalog(fillMissing=false) {
  const db=adminClient();
  const result:{destinations:string;events:string}={destinations:'untouched',events:'untouched'};
  for (const item of [
    {table:'destinations' as const, rows:bundledDestinations},
    {table:'tourism_events' as const, rows:bundledEvents}
  ]) {
    const {count,error}=await db.from(item.table).select('slug',{count:'exact',head:true});
    if(error) throw new Error(`Supabase schema unavailable for ${item.table}`);
    if(!fillMissing && count !== 0) continue;
    const {error:writeError}=await db.from(item.table).upsert(item.rows,{onConflict:'slug',ignoreDuplicates:true});
    if(writeError) throw new Error(`Could not restore ${item.table}: ${writeError.message}`);
    result[item.table]='restored-missing-rows';
  }
  return result;
}
