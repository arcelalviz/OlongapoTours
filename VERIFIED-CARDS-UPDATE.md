# Olongapo Tours V4 — Hide cards without accurate photographs

This update changes **public cards only**: homepage featured destinations/events, `/places`, and `/events`. It does **not** delete any destination or event record from Supabase. The admin tools, map, planner, user accounts, reviews, private galleries, and Google/email sign-in stay in place.

## What users see

- A public place/event card appears only when its `image_url` and `image_source_url` exactly match the previously curated `data/verified-photo-index.json` entry for that slug.
- If that approved photo fails both the website photo proxy and the direct image URL, the **whole card disappears** instead of leaving a blank or misleading image.
- The homepage features and the place directory show only image-approved destinations.
- The events page shows only months with image-approved events, with no placeholder event cards.
- The prominent Ulo ng Apo Monument hero is unchanged.
- Public `/map` and `/planner` still offer the full destination catalog, since these are functional tools rather than photo-card galleries. Direct page links are also left working.

## Installation

1. Make a backup of your current GitHub project.
2. Extract the ZIP and copy its files into the project, keeping the folder structure.
3. In your VS Code terminal:

```bash
git add .
git commit -m "Hide unsourced destination and event cards"
git push origin main
```

4. Vercel redeploys automatically. Hard refresh `/`, `/places`, `/events`.

No new Supabase migration, account changes, environment variables, or image uploads are required.

## Important accuracy limitation

The curated index has **21 source-matched destination photos and 2 historical event photo sources**. Having a documented source is not an independent guarantee of current photo validity, legal reuse permission, or live network availability. Please confirm licensing and subject accuracy for each before public launch. Events with uncertain photo rights should remain hidden until permission is established.

## Files changed

- `lib/verified-cards.ts` (new)
- `components/Cards.tsx`
- `components/Photo.tsx`
- `components/PlaceBrowser.tsx`
- `app/page.tsx`
- `app/places/page.tsx`
- `app/events/page.tsx`
- `app/archive/page.tsx`
