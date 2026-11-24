# Olongapo Tours V4 — Instant Public Stories

This patch changes travel stories to publish instantly, with no administrator pre-approval. People can read public stories without signing in; Google-authenticated users can post. Admins may hide inappropriate submissions after publication.

## Why posting failed before

1. The API demanded a destination record in Supabase even when the public page displayed the bundled 50-place catalog.
2. New posts were forced into `pending`, and Supabase's insert policy allowed only pending posts.
3. The post endpoint always initialized the privileged Supabase client—even without photos. A missing/invalid service-role key could break submission after the review was inserted.
4. A newly signed-in traveler's `profiles` row might not have been linked yet.

The patch fixes all four. It sends story text as a small JSON request, then uploads any photos straight to Supabase Storage from the authenticated browser. The private-gallery service role is not used for new story photos.

## Installation — do this in order

1. Back up your current Supabase database and GitHub project. Existing private gallery data is not deleted.
2. Open **Supabase → SQL Editor** and run **`supabase/005_public_stories.sql`** once. The script configures the existing private review-photo bucket and changes RLS to allow immediate public posting. **Existing pending stories are also published**; `hidden` stories stay hidden.
3. Copy the patch files into your current Next.js repo. Preserve the folder layout.
4. Commit/push to GitHub and let Vercel deploy. No changes to `.env` or Google OAuth are necessary for this patch.
5. Sign in as a traveler, open `/stories/new`, publish a short text-only test, and open `/stories` in a private/incognito window. The story should be visible without login.
6. Test another story with one JPEG/PNG/WebP photo. It should show publicly after upload completes.
7. Confirm that the homepage previews recent stories, while Admin → Story visibility & removal can still hide abusive content.

**Photo storage:** `review-private` stays private. Public visitors retrieve only photos attached to published stories through `/api/review-photo/[id]`, where database and Storage policies enforce visibility. The `visitor-private` bucket is unchanged.

**Troubleshooting:**
- "Could not publish ... Run the public stories SQL update" → Apply `005_public_stories.sql` and review Supabase API logs.
- "Profile not linked" → Log out/in with the verified Google account; the API tries `claim_profile` once. Verify `public.profiles.auth_user_id` matches the user's `auth.users.id`.
- "Photo could not be added" → Supabase → Storage should show `review-private`; confirm the Storage policies from the SQL script.
- "No stories yet" after posting → Verify database counts and permissions:

```sql
select id, title, status, created_at from public.reviews order by created_at desc limit 10;
select id, name, public from storage.buckets where id = 'review-private';
```

Do **not** paste your Supabase service-role or secret API key into chat or public GitHub repositories.

### Privacy and safety

Posts and their photos are viewable publicly immediately, but photos remain stored in a private bucket so hiding a story revokes public access. Remind contributors to avoid sharing personal contact details, home addresses, or photos of others without permission. Admins can remove harmful posts after publication. Rate controls are implemented as a basic per-user cooldown and daily limit, not as a comprehensive abuse-prevention service.

### Testing

Source syntax and import checks were performed locally. Live Supabase RLS, storage, and Vercel deployment still need testing in your own project.
