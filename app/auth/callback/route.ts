import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {adminClient} from '@/lib/supabase/admin';

export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get('code');
 if(!code)return NextResponse.redirect(new URL('/?auth=missing-code',req.url));
 const db=await createClient();
 const {error}=await db.auth.exchangeCodeForSession(code);
 if(error)return NextResponse.redirect(new URL('/?auth=oauth-failed',req.url));
 const {error:profileError}=await db.rpc('claim_profile');
 if(profileError)return NextResponse.redirect(new URL('/?auth=profile-failed',req.url));
 const {data:{user}}=await db.auth.getUser();
 const dedicated=(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
 const providers=user?.app_metadata?.providers;
 const isGoogle= user?.app_metadata?.provider==='google' || (Array.isArray(providers)&&providers.includes('google'));
 const isDedicated=!!dedicated && !!user?.email_confirmed_at && isGoogle && user?.email?.toLowerCase()===dedicated;
 if(isDedicated && user){
   const admin=adminClient();
   // Remove historic personal-account admin roles at the database/RLS level.
   const {error:cleanupError}=await admin.from('profiles').update({role:'traveler'}).eq('role','admin').neq('email',dedicated);
   if(cleanupError)return NextResponse.redirect(new URL('/?auth=admin-setup-failed',req.url));
   const {error:roleError}=await admin.from('profiles').update({role:'admin'}).eq('auth_user_id',user.id);
   if(roleError)return NextResponse.redirect(new URL('/?auth=admin-setup-failed',req.url));
 }
 return NextResponse.redirect(new URL(isDedicated?'/admin':'/dashboard',req.url));
}
