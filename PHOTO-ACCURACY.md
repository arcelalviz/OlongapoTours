# Photo Accuracy Policy — Olongapo Tours V4

**No photograph is better than the wrong photograph.**

The new `002_seed.sql` contains 50 destinations and 18 annual/seasonal event entries, but includes photographs only for **21 destinations** and **2 historical event records** whose source descriptions identify the actual subject. Images are *not* generated or invented. The rest of the catalog has `image_url = NULL` and `image_source_url = NULL`.

Removed (even from earlier V3 matches) because source names were too broad or the exact site could not be established confidently: Marikit Park, Barretto Beachfront, Tapinac Oval, Subic Bay Boardwalk, San Roque Chapel, Pundaquit Beach, among others. This is conservative by design.

The remaining photo-source records are in `data/photo-manifest.json`. The approved set is defined in `scripts/generate-seed.mjs`. To produce the SQL again, run `npm run seed:sql`. Do not add a destination photo without checking the photo's *actual location*, the photographer/source, and the reuse license. A Wikimedia Commons file page may permit reuse with attribution and share-alike requirements; a third-party news photo may require permission.

**Two event images** point to historical DepEd Olongapo reports (City Fiesta parade and Ulo ng Apo Festival). They must be credited to their original publishers, and you must obtain permission or ensure a valid license before publishing them on a public commercial website. If permission cannot be established, remove those two photos in the admin event editor before launch.

Remote URLs can break or refuse hotlinking. V4's `<Photo>` component shows a **text-only visual** if the link fails; it never substitutes a generic stock photo. To check remote delivery in your own network, run `npm run verify:photos`. This test does **not** validate the authenticity of the subject and is not legal clearance.

After permissions are verified, host copies in a dedicated public Supabase Storage bucket to improve reliability and change the `image_url` to the corresponding public Storage URL while retaining the authentic source/credit in the database. The private `visitor-private` bucket must never be used for public destination images.

Original traveler-submitted photos are still shown only with their approved published review. Private gallery media is protected behind an access-checked API; neither is replaced with stock photography.

The site package also includes the existing **cinematic illustrated Olongapo Tours brand asset** under `public/brand/`; it is decorative branding, **not** represented as a factual photograph of a destination or event. The default V4 layout uses expressive text navigation; the branding image can be reused later without compromising photo provenance.
