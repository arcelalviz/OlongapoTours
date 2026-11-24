# Olongapo Tours V4 — Admin connection repair

## What the previous error meant

`[admin-login] Service-role profile read failed { code: undefined }` does not
identify a specific database error. The old log omitted the response message
and status. It may mean an invalid secret key, upstream HTTP error, or network
problem. It does not prove that RLS is broken.

## This patch

- Administrator email/password login uses the **authenticated user session**
  and a RLS-limited read of **its own profile**, rather than a service-role query.
- Basic destination/event editing and moderation use the same RLS-protected
  session after `requireAdmin()` authorizes the administrator.
- Private gallery operations still require a server-only Supabase secret key.
- A new `/api/admin/server-status` endpoint can test the server key **after**
  successful admin login, returning only safe diagnostic information.
- Google sign-in no longer changes administrator roles.
- No database is reset, and no credentials are embedded in the source.

## Deployment

1. Back up your existing project. Copy the patch files over their matching
   paths. Commit and push to GitHub, then wait for Vercel to deploy.
2. In Supabase SQL Editor, verify the admin profile is `admin`, linked to the
   confirmed Auth user. If profile RLS is not yet repaired, apply the **existing**
   `supabase/004_admin_profile_read_repair.sql` from your previous package.
3. Sign in at `/admin/login` with the dedicated Supabase email/password user.
4. After successful login open `/api/admin/server-status` on the same domain.
   - `ok`: private key can read Supabase tables.
   - `failed`, HTTP 401/403: verify the private key belongs to the **same**
     Supabase project as `NEXT_PUBLIC_SUPABASE_URL` and isn't revoked.
   - `connection_failed`: examine the `[admin-server-status]` line in Vercel
     Runtime Logs for the safe error message.
   - `not_configured`: server key is absent for the deployment environment.
5. In Vercel Settings > Environment Variables, set `SUPABASE_SERVICE_ROLE_KEY`
   to the project's **server-only** secret key, or its correct legacy service
   role key. Do not use `sb_publishable_...` or an `anon` key. Do not add this
   secret to `NEXT_PUBLIC_` variables. Redeploy when changing env vars.
6. Test private galleries only after the server-status endpoint returns `ok`.

**Important:** The status endpoint is admin-only; keep your key confidential.
Never paste credentials into chat or public GitHub. The old disclosed password
should be changed in Supabase Authentication.

## Verification notes

Source import paths and syntax have been checked. A live Vercel/Supabase
production test has not been performed in this environment.
