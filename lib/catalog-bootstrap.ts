import 'server-only';
import {adminClient} from '@/lib/supabase/admin';
import {bundledDestinations,bundledEvents} from '@/lib/bundled-catalog';

/**
 * Restore missing public catalog rows without overwriting administrator edits.
 * Keeping destination and event writes separate is important: Supabase's typed
 * upsert overload cannot accept a union of two differently shaped row arrays.
 */
export async function ensurePublicCatalog(fillMissing = false) {
  const db = adminClient();
  const result = {destinations:'untouched',events:'untouched'};

  const destinationCount = await db.from('destinations').select('slug',{count:'exact',head:true});
  if (destinationCount.error) {
    throw new Error(`Supabase schema unavailable for destinations: ${destinationCount.error.message}`);
  }
  if (fillMissing || destinationCount.count === 0) {
    const {error} = await db.from('destinations').upsert(bundledDestinations,{
      onConflict:'slug',ignoreDuplicates:true
    });
    if (error) throw new Error(`Could not restore destinations: ${error.message}`);
    result.destinations = 'restored-missing-rows';
  }

  const eventCount = await db.from('tourism_events').select('slug',{count:'exact',head:true});
  if (eventCount.error) {
    throw new Error(`Supabase schema unavailable for tourism_events: ${eventCount.error.message}`);
  }
  if (fillMissing || eventCount.count === 0) {
    const {error} = await db.from('tourism_events').upsert(bundledEvents,{
      onConflict:'slug',ignoreDuplicates:true
    });
    if (error) throw new Error(`Could not restore tourism_events: ${error.message}`);
    result.events = 'restored-missing-rows';
  }

  return result;
}
