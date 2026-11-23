import {createClient} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';
export async function viewer(){
 try {
  const db=await createClient();
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user)return null;
  let {data:profile}=await db.from('profiles').select('id,display_name,role,auth_user_id').eq('auth_user_id',user.id).maybeSingle();
  if(!profile && user.app_metadata?.provider==='google'){
    // Repair a missing travel profile if the first OAuth callback was interrupted.
    const {error:claimError}=await db.rpc('claim_profile');
    if(!claimError){const res=await db.from('profiles').select('id,display_name,role,auth_user_id').eq('auth_user_id',user.id).maybeSingle();profile=res.data;}
  }
  return {id:user.id,email:user.email||'',profile:profile||null};
 }catch{return null;}
}
export async function requireUser(){const u=await viewer();if(!u)redirect('/auth/signin');return u;}
export async function requireAdmin(){
 const u=await viewer();
 if(!u)redirect('/admin/login');
 const dedicated=(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
 if(!dedicated||u.email.toLowerCase()!==dedicated||u.profile?.role!=='admin')redirect('/dashboard');
 return u;
}
