# Complete migration guide — PHP/MySQL → Vercel/Supabase

## 0. Before migrating: make two backups

1. Log into your current Byethost control panel and open **phpMyAdmin** for the live MySQL database.
2. Export the **entire database**, not only destinations/events: include `community_users`, `place_reviews`, `review_photos`, `saved_destinations`, `itineraries`, `itinerary_stops`, `galleries`, `media`, `destinations`, and `tourism_events`. Use SQL format.
3. Download the old `htdocs` directory **including `uploads/`** and any review-photo uploads. Keep them outside your public GitHub repository. The V3 ZIP does **not** contain the live customer gallery media.
4. Leave the PHP website running while validating the new site. Take another backup and freeze data changes just before the final cutover so no new reviews or galleries are missed.

## 1. Create your Supabase project

1. Open https://supabase.com/dashboard and create a project. Its database is PostgreSQL.
2. In **SQL Editor**, paste and run `supabase/001_schema.sql`.
3. Then paste and run `supabase/002_seed.sql`. This adds 50 destinations and 18 events with a conservative, source-identified photo set. Rows that have no trustworthy photo are **text-only**.
4. The first SQL file creates private bucket `visitor-private` and private bucket `review-private`. Inspect both in Storage. Private customer photos must stay private.
5. Copy **Project URL**, **publishable/anon key**, and (privately) **service_role key** from Supabase Project Settings → API Keys. Never put the service-role key in `NEXT_PUBLIC_*` or client-side files.

## 2. Enable Google login (new OAuth configuration)

1. In Supabase Dashboard → **Authentication → Providers → Google**, enable Google.
2. Open https://console.cloud.google.com/apis/credentials (or Google Auth Platform → Clients). Create or select an **OAuth 2.0 Web application** client belonging to your project.
3. Set Google's **Authorized redirect URI** to the **Supabase** callback shown in the provider page: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
4. Paste the Google **Client ID** and **Client secret** in the **Supabase Google provider form**, not in Next.js source.
5. In Supabase → Authentication → **URL Configuration**, set the **Site URL** to `https://YOUR-PROJECT.vercel.app` after Vercel issues it. Add Redirect URLs `http://localhost:3000/auth/callback` and `https://YOUR-PROJECT.vercel.app/auth/callback` (and your eventual custom-domain `/auth/callback`).
6. If Google's OAuth consent screen is in **Testing** mode, add your permitted test users in Google Cloud.
7. Google login in V4 uses `/auth/signin` → Supabase → Google → `/auth/callback`; **do not reuse** your old PHP `index.php?route=google-callback` URI as the Google Cloud callback.

## 3. Run the new website locally

1. Install **Node.js 22+** and Git. Extract this project folder and open a terminal there.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`. Enter your Supabase URL, publishable key, service-role key, and create a random secret (at least 32 random characters) for `GALLERY_SECRET`. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
4. Keep `.env.local` private; it is ignored by Git.
5. Run `npm run dev`, open http://localhost:3000, and test Places, Events, Stories, and demo Gallery.
6. Test Google sign-in. This creates your Supabase Auth account and links your V4 profile. After sign-in, make a test favorite/itinerary.

## 4. Deploy to Vercel

1. Create a **private** new GitHub repository and push the contents of this project. Do not commit `.env.local`, old `config/local.php`, MySQL exports, customer photos or `migration-output`.
2. In https://vercel.com/new, select the repo. Vercel should recognize **Next.js**; use the default framework settings.
3. Add these Vercel **Environment Variables** (Production, Preview as needed):
   - `NEXT_PUBLIC_SUPABASE_URL` = project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = publishable/anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase service-role key **server-only**
   - `GALLERY_SECRET` = the **same** random secret used when importing gallery access codes; **do not change it afterward** unless rehashing every access code
   - `NEXT_PUBLIC_SITE_URL` = `https://YOUR-PROJECT.vercel.app` (later update to your custom domain)
4. Click Deploy; open the generated URL. Update Supabase Site URL and Redirect allowlist to use that exact URL. Redeploy if you change `NEXT_PUBLIC_SITE_URL`.
5. Test Google sign-in before migrating real records.

## 5. Transfer all existing MySQL records and files

**Recommended: import the legacy data before inviting travelers.** The importer can also attach legacy IDs to an existing profile with a matching email if you tested Google login first.

1. If your Byethost database permits remote MySQL connections from your computer, fill the `LEGACY_DB_*` values in your *local* `.env.local`.
2. If the old host blocks remote MySQL connections, import the SQL export into a **temporary local MySQL 8 server** (e.g., XAMPP/Docker), and point `LEGACY_DB_HOST=127.0.0.1`, `LEGACY_DB_USER`, `LEGACY_DB_NAME` to that local database.
3. Extract the previous site's `htdocs` folder into a local folder named `legacy-site` alongside `package.json`, so original media paths such as `uploads/...` resolve to `legacy-site/uploads/...`. Set `LEGACY_SITE_DIR=./legacy-site` in `.env.local`.
4. Set `NEXT_PUBLIC_SITE_URL` to the **final new Vercel HTTPS URL** in `.env.local`. This matters when generating replacement QR links.
5. Run `npm run migrate:legacy` **on your own computer**. This uses `mysql2`, Supabase Service Role, and Supabase Storage, and maps old numeric IDs to UUIDs. The script does **not** need to expose your MySQL server publicly.
6. Read `migration-output/summary.json` for missing files/failed imports. Resolve any warnings. The command also generates `migration-output/private-qr-links.json` with **sensitive** rebuilt QR URLs and original gallery codes; do not publish that file. Distribute replacement QR codes privately to visitors.
7. Google users' old reviews/favorites/itineraries attach to their imported profile by legacy user ID. Once they sign into Supabase with the **same verified Google email**, the profile is linked automatically by `claim_profile()`. The importer does not try to migrate Google passwords or PHP session cookies.
8. Old PHP admins are **not** migrated as password accounts. Use Step 6 to create your first admin.

## 6. Promote the administrator (once)

1. Sign into the new site using the Google account you want as administrator.
2. In **Supabase → SQL Editor**, run (replace the email with your own verified admin email):

```sql
update public.profiles
set role = 'admin'
where lower(email) = lower('YOUR_VERIFIED_ADMIN_GOOGLE_EMAIL')
  and auth_user_id is not null;
```

3. Sign out/in again if needed; open `/admin`. You can edit destinations/events, review stories, create galleries, and upload media. Only a trusted person with Supabase project administration should run this SQL; users cannot make themselves admin in the browser.

## 7. Test every essential feature before switching domains

- Public homepage, all 50 destinations and 18 events, mobile navigation and browser back/forward.
- Accurate images only: check a documented place photo, a text-only entry, and both historical event-photo references. If you lack rights to a photo, clear its image fields in Admin.
- Google login, logout, traveler dashboard, saved place, trip planner and itinerary deletion.
- Submit a new story; it stays `pending`, then publish it in Admin and confirm it's visible to logged-out visitors. Review photos should match user uploads only.
- Create a test private gallery, upload a new photo, open it with **both** QR URL and access code in incognito, verify that private media requests without access return 403, then check expiry.
- Compare migrated record totals: destinations/events, profiles, reviews, favorites, itineraries, galleries, original file counts. Inspect `summary.json` for missing source files.
- Try desktop and mobile and check Vercel function logs and Supabase Auth/Storage logs for errors.

## 8. Cut over and retire PHP

1. Set a short maintenance window on the old PHP site and stop new review/gallery submissions.
2. Take a final export, rerun the importer to capture the final changes, then compare totals again.
3. Configure your desired custom domain in Vercel and update DNS using Vercel's instructions.
4. Update the Site URL + Redirect allowlist in Supabase, `NEXT_PUBLIC_SITE_URL` in Vercel, and any published QR URLs pointing to the former host.
5. Keep the PHP/MySQL backups in a private offline location. Shut down the old hosting only after real account, gallery, image and QR tests pass on the new domain.

## Trouble checks

- Google `redirect_uri_mismatch`: Google Cloud must use **Supabase's** `/auth/v1/callback`; Supabase redirect allowlist must include **your Vercel `/auth/callback`**.
- Empty pages: run `001_schema.sql`, then `002_seed.sql` in that order; verify environment variables point to the same project.
- Empty admin gallery list: confirm admin role from SQL and that Service Role Key is set in Vercel.
- Missing photo: if no exact source match, it is intentionally hidden. Broken remote URLs also show a text-only state.
- Old gallery media missing: make sure the full original `uploads/` folder is present in `legacy-site`, not only the old V3 ZIP. Rerun importer after correcting paths.
- New gallery codes fail: keep `GALLERY_SECRET` unchanged between migration importer and deployed Vercel app.

## Security

The project ships **no actual secrets**. Supabase Service Role Key never belongs in browser code. Store customer gallery media in `visitor-private`, serve it only after a code/QR session check, and keep external media and sensitive exports out of GitHub.
