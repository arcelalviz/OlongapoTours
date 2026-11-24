import Link from 'next/link';
import {redirect} from 'next/navigation';
import {viewer} from '@/lib/auth';

export const metadata = {title: 'Admin sign in'};

const messages: Record<string, string> = {
  config: 'Administrator login configuration is incomplete. Check ADMIN_EMAIL and the public Supabase URL/key in Vercel, then redeploy.',
  credentials: 'Unable to sign in. Check the administrator email, password, and email confirmation.',
  profile: 'Your account is confirmed but does not have a correctly linked admin profile. Run the profile repair SQL provided with this update.',
  database: 'Sign-in succeeded, but the server could not read your administrator profile. Check the Supabase project keys and the admin-login error code in Vercel logs.',
  setup: 'Your deployment is using the older admin login handler. Install the latest admin login repair patch and redeploy.',
};

export default async function AdminLogin({searchParams}: {searchParams: Promise<{error?: string}>}) {
  const u = await viewer();
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (u?.profile?.role === 'admin' && u.email.toLowerCase() === adminEmail) redirect('/admin');
  const {error} = await searchParams;
  const configured = Boolean(adminEmail);
  return <section className="admin-login-view">
    <div className="admin-login-intro">
      <Link href="/" className="eyebrow">← BACK TO THE CITY</Link>
      <span className="eyebrow">OLONGAPO TOURS · PRIVATE ACCESS</span>
      <h1>Behind every <em>adventure.</em></h1>
      <p>Manage places, events, community stories, and private travel galleries.</p>
      <div className="admin-login-note">A separate entrance for the people who run the experience. Travelers continue using Google sign-in.</div>
    </div>
    <div className="admin-login-card">
      <div className="eyebrow">ADMINISTRATOR ACCESS</div>
      <h2>Welcome <em>back.</em></h2>
      {!configured && <p role="alert" className="login-alert">Admin access is not configured. Set ADMIN_EMAIL in Vercel before signing in.</p>}
      {error && <p role="alert" className="login-alert">{messages[error] || messages.credentials}</p>}
      <form method="post" action="/admin/login/submit" className="form">
        <label>Email address<input name="email" type="email" autoComplete="username" placeholder="Administrator email" required maxLength={254}/></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required minLength={8}/></label>
        <button type="submit" className="pill dark" disabled={!configured}>OPEN COMMAND CENTER ↗</button>
      </form>
      {u && <form method="post" action="/auth/signout"><button className="admin-signout-link" type="submit">Sign out of the current account</button></form>}
      <p className="small">Supabase email/password sign-in. Administrator permissions are checked server-side and never granted by the login form.</p>
      <Link href="/auth/signin" className="admin-signout-link">Traveler? Continue with Google ↗</Link>
    </div>
  </section>;
}
