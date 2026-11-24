import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type Failure = 'config' | 'credentials' | 'profile' | 'database';
function fail(request: NextRequest, reason: Failure) {
  const response = NextResponse.redirect(new URL(`/admin/login?error=${reason}`, request.url), {status: 303});
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(request: NextRequest) {
  const allowedEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!allowedEmail || !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[admin-login] Required private or public Supabase configuration is missing');
    return fail(request, 'config');
  }

  let form: FormData;
  try { form = await request.formData(); }
  catch { return fail(request, 'credentials'); }
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if (email !== allowedEmail || !password || password.length > 512)
    return fail(request, 'credentials');

  const db = await createClient();
  const { data: session, error: authError } = await db.auth.signInWithPassword({email, password});
  if (authError || !session.user) return fail(request, 'credentials');

  const user = session.user;
  if (!user.email_confirmed_at || user.email?.trim().toLowerCase() !== allowedEmail) {
    await db.auth.signOut({scope: 'local'});
    return fail(request, 'credentials');
  }

  // Read-only elevated database lookup, restricted to the Supabase-authenticated
  // and confirmed dedicated administrator. Do not modify roles on sign-in.
  // A missing/wrong database role continues to be rejected.
  try {
    const {data: profile, error} = await adminClient()
      .from('profiles')
      .select('auth_user_id,role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[admin-login] Service-role profile read failed', {code: error.code});
      await db.auth.signOut({scope: 'local'});
      return fail(request, 'database');
    }
    if (!profile || profile.auth_user_id !== user.id || profile.role !== 'admin') {
      console.warn('[admin-login] Verified account has no linked administrator role');
      await db.auth.signOut({scope: 'local'});
      return fail(request, 'profile');
    }
  } catch {
    console.error('[admin-login] Could not contact Supabase with the private server client');
    await db.auth.signOut({scope: 'local'});
    return fail(request, 'database');
  }

  const response = NextResponse.redirect(new URL('/admin', request.url), {status: 303});
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
