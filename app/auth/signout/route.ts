import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
 try{const db=await createClient();await db.auth.signOut({scope:'local'});}catch{/* Always allow navigation away. */}
 const res=NextResponse.redirect(new URL('/?signed_out=1',req.url),{status:303});
 res.headers.set('Cache-Control','no-store');
 return res;
}
