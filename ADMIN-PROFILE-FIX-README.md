# Fix: administrator signed in but profile could not be read

This patch was prepared from the **OlongapoTours-V4-Admin-Login-Repair** project.
It fixes the **server-side profile lookup** and admin dashboard reads without creating a new account.

## Do this in this order

1. Back up Supabase data and the working GitHub project. Ensure the Supabase project in Vercel is the same one where the admin account was created.
2. In **Supabase → SQL Editor**, execute `supabase/004_admin_profile_read_repair.sql`. It grants authenticated users the right to read their **own** profile, replaces the problematic profile SELECT policy, and (only if safely possible) links the already confirmed dedicated account to its admin profile. It does not change passwords or delete data.
3. Verify the last SQL result says `confirmed=true`, `role=admin`, `linked=true`. If it does not, do not repeatedly run other commands; inspect which field failed.
4. In **Vercel → Project → Settings → Environment Variables**, verify these are configured for the production deployment: `ADMIN_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Never publish their values. **All Supabase keys must belong to the same project**. Redeploy after changes.
5. Install the updated files from this patch (or use the full project), `git add . && git commit -m "Repair admin profile permissions and login" && git push origin main`.
6. In a private browsing window, open `/admin/login`, sign in with the dedicated Supabase email/password account, and open `/admin`.

## How the repair works

- `app/admin/login/submit/route.ts` authenticates with Supabase email/password, requires confirmed email and a matching `ADMIN_EMAIL`, and checks an *existing* linked admin profile with a separate **server-only** admin client. It **does not grant admin privileges on login**.
- `lib/auth.ts` uses the same verified, allowlisted administrator's server-side profile read when rendering navigation and protected routes. Google traveler accounts continue using regular RLS.
- Admin pages and admin content actions use the server-only Supabase client **only after `requireAdmin()` succeeds**. A browser never receives the Supabase service key.
- `supabase/004_admin_profile_read_repair.sql` keeps the authenticated browser's own profile accessible through RLS for normal traveler features.

## If this still fails

Open **Vercel → Deployments → Latest deployment → Runtime/Function Logs** and look for `[admin-login]`.
- `Required private or public Supabase configuration is missing`: verify Production variable names and redeploy.
- `Service-role profile read failed` with a code: use the code to diagnose missing table (`42P01`, `PGRST205`), permission (`42501`), or invalid key (`401`/`403`). Do not share credentials.
- `Verified account has no linked administrator role`: the SQL verification should report `role=admin`, `linked=true`. Confirm the same Supabase project is used by Vercel.

**Important:** A previously shared password should be changed via Supabase Authentication; do not commit any password or `.env.local` to GitHub. Verify the full build and live sign-in; this patch has not been tested against your production database.
