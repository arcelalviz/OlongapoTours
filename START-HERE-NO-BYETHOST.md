# Olongapo Tours V4 — No Byethost Database Recovery

This package uses your earlier project files and does **not** require access to the old host to restore the public tourism content.

## What is ready
- 50 destination records and 18 annual event entries in `data/bundled-catalog.json`.
- Public pages display the bundled catalog even if Supabase is empty, disconnected, or its tables have not been created.
- If both tables exist and are empty, the website attempts a non-destructive first-run seed using the `SUPABASE_SERVICE_ROLE_KEY` server-only variable.
- The admin dashboard has a **Restore Missing Destinations & Events** button (requires working Supabase tables and admin sign-in).
- Original project image files are included in `public/original-project` and displayed at `/archive`. Those old images are not automatically presented as verified attraction/event photographs. The old `olongapo-festival.jpg` is actually a lighthouse photo.
- Photos matched to an identified source are referenced in the catalog. Other destination and event photo fields are intentionally blank, not replaced by unrelated images.

## Deploy to Vercel
1. Back up your GitHub repository and Supabase data if applicable.
2. Replace your repository source files with this package and push to GitHub.
3. In Vercel > Project > Settings > Environment Variables, retain the existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `GALLERY_SECRET`.
4. Add `ADMIN_EMAIL` set to your **dedicated, verified Google account**, not your personal Gmail. You must personally create that Google account; the project cannot register a Gmail mailbox for you. The address in `.env.example` is only a placeholder.
5. Redeploy Vercel. Visit `/places`, `/events`, and `/api/public-content-status`. The public listings work from bundled data even if the Supabase database is empty.
6. If you have not run the Supabase SQL schema, open Supabase SQL Editor and run `supabase/001_schema.sql` once. The database cannot store users/favorites/reviews or admin-edited events without the schema. The public catalog can still display while you do this.
7. Once the tables exist, visit `/` to trigger first-run content restoration, or click Restore Missing Destinations & Events in `/admin`. You can also run `npm run seed:bundled` locally with `.env.local`.

## Dedicated admin Google login (no personal administrator)
1. Create a fresh Google account intended exclusively for administering Olongapo Tours. Use a password manager and enable 2-step verification.
2. Put its actual email address into the `ADMIN_EMAIL` environment variable in Vercel. It must already exist; do not enter a made-up address.
3. Supabase Authentication > Providers > Google must be enabled. Your Google OAuth client must include the Supabase-provided callback URL, and your site URL/redirect allowlist must include `https://YOUR-VERCEL-DOMAIN/auth/callback`.
4. Sign out of your personal Google account on the website, then sign in to V4 with this dedicated Google account.
5. The server checks a verified Google identity and exact email match, then promotes that user's `profiles` entry to `admin`. When the dedicated Google account logs in successfully, old personal-account administrator roles are demoted in Supabase (including RLS), and admin URLs enforce the exact `ADMIN_EMAIL`. Your personal account remains a traveler and cannot open admin routes.
6. Do not share the Google password. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

## Important limitations
- This does NOT recover old Byethost private photos, real traveler reviews, or old account records that were not in the ZIP. No tool can reproduce those without the original database/uploads or a backup.
- Old images from HEHE.zip are included *as an archive* because their location/rights cannot all be confirmed. Do not mislabel them as guaranteed current photos of named destinations or festivals.
- Remote authentic-photo URLs may still be blocked by some sources. The UI uses text-only placeholders in that case instead of showing a wrong photo.
- The source archive has not been deployed to your personal Vercel/Supabase account from this environment. Test Google sign-in and admin access on the live deployment.
