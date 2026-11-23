import {createClient} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';
export async function viewer(){
 try {
  const db=await createClient();const {data:{user},error}=await db.auth.getUser();if(error||!user)return null;
  const {data:profile}=await db.from('profiles').select('id,display_name,role,auth_user_id').eq('auth_user_id',user.id).maybeSingle();
  return {id:user.id,email:user.email||'',profile:profile||null};
 } catch {return null;}
}
export async function requireUser(){const u=await viewer();if(!u)redirect('/?login=required');return u}
export async function requireAdmin(){
 const u=await requireUser();
 const dedicated=(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
 // If a dedicated admin is configured, old personal admin profiles cannot enter.
 if(u.profile?.role!=='admin'||(dedicated && u.email.toLowerCase()!==dedicated))redirect('/dashboard');
 return u;
}
