import {NextResponse} from 'next/server';
import {viewer} from '@/lib/auth';
import {adminClient} from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export async function GET() {
  const u = await viewer();
  const allowed = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!u || !allowed || u.email.trim().toLowerCase() !== allowed ||
      u.profile?.role !== 'admin' || u.profile.auth_user_id !== u.id) {
    return NextResponse.json({error:'Forbidden'},{status:403});
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({status:'not_configured',hint:'Add a server-side Supabase secret key for the matching project in Vercel.'},
      {headers:{'Cache-Control':'no-store'}});
  }
  try {
    const {data, error, status} = await adminClient()
      .from('profiles').select('id').eq('auth_user_id',u.id).maybeSingle();
    if (error) {
      console.error('[admin-server-status] Privileged Supabase request failed', {
        status, code:error.code || 'none',
        message:String(error.message || '').slice(0,280),
      });
      return NextResponse.json({status:'failed',http_status:status,error_code:error.code||null,
        hint:status===401||status===403?'The server key may be incorrect, revoked, or from another project. Check the Vercel secret.':'Read Vercel logs for the safe Supabase error message.'},
      {headers:{'Cache-Control':'no-store'}});
    }
    return NextResponse.json({status:data?'ok':'profile_not_found',hint:data?'Privileged Supabase connection works.':'Check administrator profile linking.'},
      {headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    console.error('[admin-server-status] Supabase client failed', {
      message:error instanceof Error?error.message.slice(0,280):'Unknown error'
    });
    return NextResponse.json({status:'connection_failed',hint:'See Vercel server logs. Check the matching project URL and secret key.'},
      {headers:{'Cache-Control':'no-store'}});
  }
}
