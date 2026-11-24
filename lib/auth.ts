import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

type UserProfile = {
  id: string;
  display_name: string;
  role: 'traveler' | 'admin';
  auth_user_id: string | null;
};

export async function viewer() {
  try {
    const db = await createClient();
    const {data: {user}, error: authError} = await db.auth.getUser();
    if (authError || !user) return null;
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const isDedicatedAdmin = Boolean(adminEmail && user.email_confirmed_at && user.email?.trim().toLowerCase() === adminEmail);
    const {data, error, status} = await db.from('profiles')
      .select('id,display_name,role,auth_user_id')
      .eq('auth_user_id',user.id)
      .maybeSingle();
    if (error) console.error('[viewer] User-scoped profile lookup failed', {
      status, code: error.code || 'none', message: String(error.message || '').slice(0,240)
    });
    let profile = (data || null) as UserProfile | null;
    if (!profile && !isDedicatedAdmin && user.app_metadata?.provider === 'google') {
      // Only Google travelers may claim their own profile. This RPC does not
      // grant new administrator roles.
      const {error: claimError} = await db.rpc('claim_profile');
      if (!claimError) {
        const {data: claimed} = await db.from('profiles')
          .select('id,display_name,role,auth_user_id').eq('auth_user_id',user.id).maybeSingle();
        profile = (claimed || null) as UserProfile | null;
      }
    }
    return {id: user.id, email: user.email || '', profile};
  } catch {
    console.error('[viewer] Unable to retrieve authenticated session');
    return null;
  }
}

export async function requireUser() {
  const u = await viewer();
  if (!u) redirect('/auth/signin');
  return u;
}

export async function requireAdmin() {
  const u = await viewer();
  if (!u) redirect('/admin/login');
  const dedicatedEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!dedicatedEmail || u.email.trim().toLowerCase() !== dedicatedEmail ||
      u.profile?.role !== 'admin' || u.profile.auth_user_id !== u.id) {
    redirect('/admin/login?error=profile');
  }
  return u;
}
