import Link from 'next/link';
import {redirect} from 'next/navigation';
import {viewer} from '@/lib/auth';

export const metadata={title:'Admin sign in'};
export default async function AdminLogin({searchParams}:{searchParams:Promise<{error?:string}>}){
 const u=await viewer();
 const adminEmail=(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
 if(u?.profile?.role==='admin' && u.email.toLowerCase()===adminEmail) redirect('/admin');
 const {error}=await searchParams;
 const configured=Boolean(adminEmail);
 return <section className="admin-login-view"><div className="admin-login-intro"><Link href="/" className="eyebrow">← BACK TO THE CITY</Link><span className="eyebrow">OLONGAPO TOURS · PRIVATE ACCESS</span><h1>Behind every <em>adventure.</em></h1><p>Manage places, events, community stories, and private travel galleries.</p><div className="admin-login-note">A separate entrance for the people who run the experience. Travelers continue using Google sign-in.</div></div><div className="admin-login-card"><div className="eyebrow">ADMINISTRATOR ACCESS</div><h2>Welcome <em>back.</em></h2>{!configured ? <p role="alert" className="login-alert">Admin access is not configured. Set ADMIN_EMAIL in Vercel before signing in.</p> : null}{error ? <p role="alert" className="login-alert">{error==='setup'?'The administrator account is not ready. Create and confirm it in Supabase Authentication, then try again.':'Unable to sign in. Verify your credentials and account setup.'}</p> : null}<form method="post" action="/admin/login/submit" className="form"><label>Email address<input name="email" type="email" autoComplete="username" placeholder="Administrator email" required maxLength={254}/></label><label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required minLength={8}/></label><button type="submit" className="pill dark" disabled={!configured}>OPEN COMMAND CENTER ↗</button></form>{u&&<form method="post" action="/auth/signout"><button className="admin-signout-link" type="submit">Sign out of the current account</button></form>}<p className="small">This login uses Supabase email/password authentication. Passwords are never included in the website source.</p><Link href="/auth/signin" className="admin-signout-link">Traveler? Continue with Google ↗</Link></div></section>;
}
