# Olongapo Tours V4 — GALA MODE

**A Next.js / Vercel / Supabase migration of the provided Olongapo Tours V3 PHP/MySQL project.**

## What's included

- Creative responsive GALA MODE UI; a cinematic entry intro, text-first identity, custom scrollbar and client-side navigation with Next.js routing.
- 50 Olongapo, Subic Bay and nearby Zambales destinations; search, categories, location details and map links.
- 18 city/community/seasonal events across 12 months; schedule verification labels, individual event pages.
- Accuracy-first photos: 21 destination and 2 historical event source references; all other catalog entries have no photo rather than inaccurate stock images.
- Public Stories feed and traveler review submission with photo uploads + moderation.
- Google OAuth via Supabase Auth; user profiles; favorites; itinerary builder; separate traveler dashboard and admin command center.
- Admin destination/event editors, moderation, create private gallery, one-time QR/code, direct signed uploads to Supabase private Storage.
- Public dummy QR/code demo gallery (`GALA-TEST-2026`).
- One-time PostgreSQL schema + seed SQL; secure MySQL importer for existing content, reviews, favorites, itineraries, galleries and original media.

## Setup

See **MIGRATION-STEP-BY-STEP.md**. Read **PHOTO-ACCURACY.md** for source/image limitations. Start with `.env.example`; never upload your PHP config or Supabase service role key to GitHub.

## Testing

```bash
npm install
cp .env.example .env.local  # fill out privately
npm run dev
npm run typecheck
npm run build
```

## Important migration limits

- The old MySQL passwords, PHP admin hashes, PHP sessions and Google OAuth client config **do not transfer automatically**. Supabase Google provider needs setup once; admin must be promoted after verified Google login.
- Database records and private media are not magically copied by deploying this repo. Export old MySQL and files, then run `npm run migrate:legacy` with local private environment variables.
- Existing QR tokens and codes remain valid logically, but the old URL host changes: issue *new-domain QR links* from the private `migration-output/private-qr-links.json` generated locally.
- Gallery access codes and tokens are stored as hashes, not plaintext. Gallery photos remain private.
- Vercel/Supabase usage caps and quotas apply. Signed upload URLs handle larger files; ensure your Supabase project's limits allow their sizes.
- Package does **not** include any passwords or secret keys from the uploaded legacy archive.
