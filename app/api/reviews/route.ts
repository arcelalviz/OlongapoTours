import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { bundledDestinations } from '@/lib/bundled-catalog';

export const runtime = 'nodejs';

type Submission = {
  title?: unknown;
  body?: unknown;
  place_name?: unknown;
  rating?: unknown;
  visit_date?: unknown;
};

const JSON_HEADERS = { 'Cache-Control': 'no-store' };

function failure(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: JSON_HEADERS });
}

export async function POST(req: NextRequest) {
  const db = await createClient();
  const { data: { user }, error: authenticationError } = await db.auth.getUser();
  if (authenticationError || !user) return failure('Please sign in before posting a story.', 401);
  if (!user.email_confirmed_at) return failure('Please verify your email before posting a story.', 403);

  // New travelers are not always in profiles yet after their first Google login.
  let { data: profile, error: profileError } = await db.from('profiles')
    .select('id').eq('auth_user_id', user.id).maybeSingle();
  if (profileError) {
    console.error('[stories] Profile lookup failed', { code: profileError.code, message: profileError.message });
    return failure('Your account profile could not be read. Check the profile RLS migration.', 503);
  }
  if (!profile && user.app_metadata?.provider === 'google') {
    const { error: claimError } = await db.rpc('claim_profile');
    if (claimError) console.error('[stories] Profile claim failed', { code: claimError.code, message: claimError.message });
    const retry = await db.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
    profile = retry.data;
    profileError = retry.error;
  }
  if (!profile || profileError) return failure('Your traveler profile is not linked yet. Sign out and back in, or contact the administrator.', 403);

  let payload: Submission;
  try {
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return failure('Update the website to the latest story form and try again.', 415);
    }
    payload = await req.json() as Submission;
  } catch { return failure('The story form could not be read.', 400); }

  const title = String(payload.title ?? '').trim();
  const body = String(payload.body ?? '').trim();
  const place = String(payload.place_name ?? '').trim();
  const rating = Number(payload.rating);
  const visitDate = String(payload.visit_date ?? '');
  if (title.length < 3 || title.length > 120 || body.length < 20 || body.length > 3000 ||
      !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return failure('Enter a title (3–120 characters), a story (20–3000 characters), and a rating from 1 to 5.', 400);
  }
  if (place.length < 2 || place.length > 200) return failure('Choose a valid destination.', 400);
  if (visitDate && (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || Number.isNaN(Date.parse(`${visitDate}T00:00:00Z`)))) {
    return failure('Please enter a valid visit date.', 400);
  }

  // Catalog pages can display bundled destinations when Supabase has not been seeded.
  // Do not reject a place that is part of that official shipped catalog.
  const bundledMatch = bundledDestinations.some(x => x.is_published && x.name === place);
  if (!bundledMatch) {
    const { data: selected, error: placeError } = await db.from('destinations')
      .select('slug').eq('name', place).eq('is_published', true).maybeSingle();
    if (placeError) {
      console.error('[stories] Destination lookup failed', { code: placeError.code, message: placeError.message });
      return failure('Destination lookup is temporarily unavailable.', 503);
    }
    if (!selected) return failure('Choose a destination from the list.', 400);
  }

  // Lightweight per-account spam control. No admin pre-approval is required.
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data: recent, error: recentError } = await db.from('reviews').select('id')
    .eq('user_id', profile.id).gte('created_at', oneMinuteAgo).limit(1);
  if (recentError) return failure('Story posting is temporarily unavailable. Check the reviews RLS policies.', 503);
  if (recent?.length) return failure('Please wait a minute before posting another story.', 429);
  const { count: dailyCount, error: countError } = await db.from('reviews')
    .select('id', { count: 'exact', head: true }).eq('user_id', profile.id).gte('created_at', oneDayAgo);
  if (countError) return failure('Story posting is temporarily unavailable. Please try again.', 503);
  if ((dailyCount ?? 0) >= 10) return failure('You have reached the daily limit of 10 stories.', 429);

  const { data: review, error: insertError } = await db.from('reviews').insert({
    user_id: profile.id,
    place_name: place,
    title,
    body,
    rating,
    visit_date: visitDate || null,
    status: 'published'
  }).select('id').single();
  if (insertError || !review) {
    console.error('[stories] Insert failed', { code: insertError?.code, message: insertError?.message });
    return failure('Could not publish your story. Run the public stories SQL update in Supabase, then try again.', 503);
  }

  revalidatePath('/stories');
  revalidatePath('/');
  revalidatePath('/dashboard');
  return NextResponse.json({ ok: true, id: review.id, userId: user.id, published: true },
    { status: 201, headers: JSON_HEADERS });
}
