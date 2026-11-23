# Olongapo Tours V4 — Dedicated Admin Login, My Space, and Hero Repair

## What was fixed

- `/admin/login` is a separate, designed email/password administrator login. It uses **Supabase Auth**, not Google OAuth.
- Passwords are **not hardcoded** in Next.js, GitHub, or `.env.example`.
- Admin access is restricted to the exact email specified by server-only `ADMIN_EMAIL`.
- After the first successful email/password login, the server securely creates/promotes the administrator profile in Supabase.
- Existing personal Google admin accounts are demoted; visitor accounts still use Google.
- My Space now provides a recovery path and working logout button. Logout is also visible in the navigation on every page when signed in.
- Hero displays the documented Ulo ng Apo Monument photographed in August 2025; photographer Ralff Nestor Nacor, CC BY-SA 4.0. The file is loaded from Wikimedia Commons, with a second URL if the first fails.
- Unverified public archive photos were removed from the site. Destination/event records lacking verified photos use typographic cards instead of a fake photo or misleading stock image. The listing stays available.

## Admin setup — required once

1. In **Supabase Dashboard → Authentication → Providers → Email**, ensure Email authentication is enabled.
2. Open **Authentication → Users → Add user → Create new user**. Enter the dedicated administrator Gmail and a **new, strong password**. Mark the email as confirmed if you are creating the account through the trusted admin dashboard. You must control the account; if Gmail is not registered, create/verify it yourself. The account must exist in Supabase Auth before the password form can log in.
3. In **Vercel → Project → Settings → Environment Variables**, set `ADMIN_EMAIL=olongapo.tours.admin@gmail.com`. Retain your Supabase URL, public key, server-side secret/service role key, and the gallery secret. Redeploy.
4. Open `https://YOUR-VERCEL-DOMAIN/admin/login`, enter the email and password that you created in Supabase. You will be redirected to `/admin` after successful login.
5. To log out, click **LOG OUT** in the main navigation (or visit My Space → LOG OUT).

**IMPORTANT:** The password typed in the conversation should be treated as exposed. Change it before deployment. Neither the requested password nor any default password is stored in this package. You can change it later in Supabase Authentication.

## Photo and license

Hero image source: https://commons.wikimedia.org/wiki/File:Head_of_Apo_Monument,_Olongapo_City,_Aug_2025.jpg
Photographer: Ralff Nestor Nacor. License: https://creativecommons.org/licenses/by-sa/4.0/ . Original was taken August 24, 2025. Website adds cropping/tonal styling; credit and license link remain visible. The hero depends on Wikimedia Commons delivery, so it cannot be guaranteed offline. This environment could not download the full image into the ZIP.

## Deployment

Apply this patch to the same V4 repository as before (keep `.env.local` private):

```
git add .
git commit -m "Add email admin login, repair my space and verified hero"
git push origin main
```

On Vercel, verify `/admin/login`, Google traveler sign-in, `/dashboard`, logout, `/places`, `/events`, and hero photo. Supabase must already have `supabase/001_schema.sql` applied; previous catalog records are left untouched. No new schema migration is required.

## Known limitations

- Admin account creation and ownership verification must happen in Supabase/Google; the ZIP cannot create a real Gmail account.
- Live build and authentication against your Supabase credentials have not been tested here.
- Wikimedia remote image delivery may be restricted by network; if unavailable, the hero shows an explicit no-photo state instead of an unrelated picture.
- The new controls do not restore old Byethost visitor records that are unavailable.
