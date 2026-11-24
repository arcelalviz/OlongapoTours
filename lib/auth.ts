import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
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
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return null;

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const dedicatedAdmin = Boolean(
      adminEmail && user.email_confirmed_at &&
      user.email?.trim().toLowerCase() === adminEmail
    );

    let profile: UserProfile | null = null;

    // The dedicated admin's *own* profile is read with a separate server-only
    // Supabase client. No service key is sent to the browser. The account still
    // needs a valid auth session, a confirmed email, the exact allowlisted
    // email, a linked user ID and the pre-existing 'admin' database role.
    // This avoids failing admin navigation when the browser RLS policy is broken.
    if (dedicatedAdmin && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { data, error } = await adminClient()
          .from('profiles')
          .select('id,display_name,role,auth_user_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        if (error) console.error('[viewer] Admin profile read failed', { code: error.code });
        else profile = data as UserProfile | null;
      } catch {
        console.error('[viewer] Admin profile connection failed');
      }
    }

    if (!profile) {
      const { data, error } = await db
        .from('profiles')
        .select('id,display_name,role,auth_user_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (error) console.error('[viewer] Authenticated profile read failed', { code: error.code });
      profile = data as UserProfile | null;
    }

    if (!profile && !dedicatedAdmin && user.app_metadata?.provider === 'google') {
      // Restore interrupted Google traveler signup only. This RPC never grants
      // administrator privileges.
      const { error: claimError } = await db.rpc('claim_profile');
      if (!claimError) {
        const { data } = await db.from('profiles')
          .select('id,display_name,role,auth_user_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        profile = data as UserProfile | null;
      }
    }

    return { id: user.id, email: user.email || '', profile };
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
