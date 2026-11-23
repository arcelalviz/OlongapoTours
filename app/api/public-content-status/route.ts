import {createClient} from '@/lib/supabase/server';
import {bundledDestinations,bundledEvents} from '@/lib/bundled-catalog';
export const dynamic='force-dynamic';
export async function GET(){
 try {
  const db=await createClient();
  const [p,e]=await Promise.all([
    db.from('destinations').select('slug',{count:'exact',head:true}).eq('is_published',true),
    db.from('tourism_events').select('slug',{count:'exact',head:true}).eq('is_published',true)
  ]);
  return Response.json({databaseReachable:!p.error&&!e.error,databaseDestinations:p.count??0,databaseEvents:e.count??0,bundledFallbackDestinations:bundledDestinations.length,bundledFallbackEvents:bundledEvents.length,publicPagesHaveOfflineCatalog:true,note:'The catalog can show bundled content even when the database is empty. Existing private user data cannot be restored from this bundle.'},{headers:{'Cache-Control':'no-store'}});
 } catch {
  return Response.json({databaseReachable:false,bundledFallbackDestinations:bundledDestinations.length,bundledFallbackEvents:bundledEvents.length,publicPagesHaveOfflineCatalog:true},{headers:{'Cache-Control':'no-store'}});
 }
}
