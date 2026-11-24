import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Failure = 'config' | 'credentials' | 'profile' | 'database';
function fail(request: NextRequest, reason: Failure) {
  const response = NextResponse.redirect(new URL(`/admin/login?error=${reason}`, request.url), {status: 303});
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(request: NextRequest) {
  const allowedEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!allowedEmail || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[admin-login] Admin email or public Supabase configuration is missing');
    return fail(request, 'config');
  }
  let form: FormData;
  try { form = await request.formData(); }
  catch { return fail(request, 'credentials'); }
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if (email !== allowedEmail || !password || password.length > 512) return fail(request, 'credentials');

  // Use the sign-in session to check its own profile under RLS. A privileged
  // service key is NOT necessary to authenticate an administrator.
  const db = await createClient();
  const {data: session, error: authError} = await db.auth.signInWithPassword({email, password});
  if (authError || !session.user) return fail(request, 'credentials');
  const user = session.user;
  if (!user.email_confirmed_at || user.email?.trim().toLowerCase() !== allowedEmail) {
    await db.auth.signOut({scope: 'local'});
    return fail(request, 'credentials');
  }
  const {data: profile, error, status} = await db.from('profiles')
    .select('auth_user_id,role')
    .eq('auth_user_id',user.id)
    .maybeSingle();
  if (error) {
    console.error('[admin-login] Authenticated profile lookup failed', {
      status, code: error.code || 'none',
      message: String(error.message || 'Unknown database response').slice(0, 280),
    });
    await db.auth.signOut({scope:'local'});
    return fail(request, 'database');
  }
  if (!profile || profile.auth_user_id !== user.id || profile.role !== 'admin') {
    console.warn('[admin-login] Account authenticated but lacks its linked admin role');
    await db.auth.signOut({scope:'local'});
    return fail(request, 'profile');
  }
  const response = NextResponse.redirect(new URL('/admin',request.url), {status:303});
  response.headers.set('Cache-Control','no-store');
  return response;
}
