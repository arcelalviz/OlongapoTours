import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const fail = (request: NextRequest, reason: 'config' | 'credentials' | 'profile' | 'database' = 'credentials') => {
  const response = NextResponse.redirect(new URL(`/admin/login?error=${reason}`, request.url), {status: 303});
  response.headers.set('Cache-Control', 'no-store');
  return response;
};

export async function POST(request: NextRequest) {
  // The admin email is a server-side identity allowlist, never a password substitute.
  const allowedEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!allowedEmail || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return fail(request, 'config');
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(request);
  }

  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if (email !== allowedEmail || !password || password.length > 512) {
    return fail(request);
  }

  const db = await createClient();
  const {data: session, error: authError} = await db.auth.signInWithPassword({email, password});
  if (authError || !session.user) {
    return fail(request);
  }

  const user = session.user;
  if (user.email?.trim().toLowerCase() !== allowedEmail || !user.email_confirmed_at) {
    await db.auth.signOut({scope: 'local'});
    return fail(request);
  }

  // IMPORTANT: Do not elevate permissions during login. The administrator must
  // already have a verified, linked profile with role='admin' in Supabase.
  // This avoids making successful authentication depend on the service-role key
  // and avoids an unnecessary write on every login.
  const {data: profile, error: profileError} = await db
    .from('profiles')
    .select('auth_user_id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[admin-login] Authenticated profile lookup failed', {code: profileError.code || 'unknown'});
    await db.auth.signOut({scope: 'local'});
    return fail(request, 'database');
  }
  if (!profile || profile.role !== 'admin' || profile.auth_user_id !== user.id) {
    console.warn('[admin-login] Authenticated account lacks a linked administrator profile');
    await db.auth.signOut({scope: 'local'});
    return fail(request, 'profile');
  }

  const result = NextResponse.redirect(new URL('/admin', request.url), {status: 303});
  result.headers.set('Cache-Control', 'no-store');
  return result;
}
