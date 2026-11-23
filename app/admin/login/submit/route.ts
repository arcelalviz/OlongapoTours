import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {adminClient} from '@/lib/supabase/admin';

export const dynamic='force-dynamic';
const fail=(req:NextRequest,reason='credentials')=>NextResponse.redirect(new URL(`/admin/login?error=${reason}`,req.url),{status:303});

export async function POST(req:NextRequest){
 const configured=(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
 if(!configured || !process.env.SUPABASE_SERVICE_ROLE_KEY)return fail(req,'setup');
 let form:FormData;
 try{form=await req.formData()}catch{return fail(req)}
 const email=String(form.get('email')||'').trim().toLowerCase();
 const password=String(form.get('password')||'');
 // Never log, persist, or bundle the password. The identity is verified by Supabase Auth.
 if(email!==configured || !password || password.length>512)return fail(req);
 const db=await createClient();
 const {data,error}=await db.auth.signInWithPassword({email,password});
 if(error||!data.user){await db.auth.signOut();return fail(req)}
 const user=data.user;
 if(user.email?.trim().toLowerCase()!==configured||!user.email_confirmed_at){await db.auth.signOut();return fail(req)}
 try {
  const admin=adminClient();
  const {data:existing,error:readError}=await admin.from('profiles').select('id,auth_user_id').ilike('email',configured).maybeSingle();
  if(readError)throw readError;
  if(existing?.auth_user_id && existing.auth_user_id!==user.id)throw new Error('Administrator email is attached to a different account');
  if(existing){
   const {error:e}=await admin.from('profiles').update({auth_user_id:user.id,role:'admin'}).eq('id',existing.id);
   if(e)throw e;
  }else{
   const {error:e}=await admin.from('profiles').insert({auth_user_id:user.id,email:configured,display_name:'Olongapo Tours Administrator',role:'admin'});
   if(e)throw e;
  }
  // Restrict administrative access to the configured identity even if older roles persist.
  const {error:cleanupError}=await admin.from('profiles').update({role:'traveler'}).eq('role','admin').neq('auth_user_id',user.id);
  if(cleanupError)throw cleanupError;
 }catch{
  await db.auth.signOut();
  return fail(req,'setup');
 }
 const result=NextResponse.redirect(new URL('/admin',req.url),{status:303});
 result.headers.set('Cache-Control','no-store');
 return result;
}
