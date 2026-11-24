import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public photos are served only for published stories (or to their authorized
// owner). Supabase RLS enforces both the metadata lookup and private download.
export async function GET(_req: NextRequest, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Not found', { status: 404 });
  const db = await createClient();
  const { data: photo, error: photoError } = await db.from('review_photos')
    .select('id,storage_path,review_id').eq('id', id).maybeSingle();
  if (photoError) {
    console.error('[stories] Photo metadata lookup failed', {code:photoError.code, message:photoError.message});
    return new NextResponse('Photo unavailable', { status: 503 });
  }
  if (!photo) return new NextResponse('Not found', { status: 404 });
  const { data: review } = await db.from('reviews')
    .select('id,status').eq('id', photo.review_id).maybeSingle();
  if (!review) return new NextResponse('Not found', { status: 404 });
  const { data, error } = await db.storage.from('review-private').download(photo.storage_path);
  if (error || !data) {
    if (error) console.error('[stories] Private photo read denied', {message:error.message});
    return new NextResponse('Photo unavailable', { status: 404 });
  }
  const contentType = data.type && ['image/jpeg','image/png','image/webp'].includes(data.type)
    ? data.type : 'application/octet-stream';
  return new NextResponse(data.stream(), { headers: {
    'Content-Type': contentType,
    'Content-Disposition': 'inline',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  }});
}
