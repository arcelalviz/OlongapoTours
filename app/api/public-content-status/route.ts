import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export async function GET(){
  try {
    const db=await createClient();
    const [dest,events,photos,festivalPhotos] = await Promise.all([
      db.from('destinations').select('*',{count:'exact',head:true}).eq('is_published',true),
      db.from('tourism_events').select('*',{count:'exact',head:true}).eq('is_published',true),
      db.from('destinations').select('*',{count:'exact',head:true}).not('image_url','is',null).not('image_source_url','is',null),
      db.from('tourism_events').select('*',{count:'exact',head:true}).not('image_url','is',null).not('image_source_url','is',null)
    ]);
    return Response.json({
      databaseReachable: ![dest,events,photos,festivalPhotos].some(q=>Boolean(q.error)),
      destinations:dest.count??0,events:events.count??0,
      destinationPhotoReferences:photos.count??0,eventPhotoReferences:festivalPhotos.count??0,
      errorCategory:[dest,events,photos,festivalPhotos].some(q=>Boolean(q.error))?'Database query failed':'none',
      note:'Photo references are not proof that remote image hosts are accessible. No private information is returned.'
    },{headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({databaseReachable:false,errorCategory:'Server configuration or connection failed'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
