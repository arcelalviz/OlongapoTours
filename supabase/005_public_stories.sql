-- Olongapo Tours V4: Stories appear publicly immediately after submission.
-- Run once in Supabase SQL Editor BEFORE uploading the code patch.
-- Preserves accounts, photos, and the private visitor-gallery bucket.
-- IMPORTANT: This migration publishes existing stories that were still pending.

begin;

-- Anonymous visitors can read published stories and their image metadata.
grant usage on schema public to anon, authenticated;
grant select on table public.reviews to anon, authenticated;
grant select on table public.review_photos to anon, authenticated;
grant insert on table public.reviews to authenticated;
grant insert on table public.review_photos to authenticated;

alter table public.reviews enable row level security;
alter table public.review_photos enable row level security;
alter table public.reviews alter column status set default 'published';

-- Only the authenticated author's profile may create a PUBLIC story.
-- The browser cannot submit another account's stories or set arbitrary statuses.
drop policy if exists reviews_add on public.reviews;
create policy reviews_add on public.reviews
  for insert to authenticated
  with check (user_id = public.current_profile_id() and status = 'published');

-- Keep public access read-only for anonymous visitors; owners can read their own
-- historical hidden stories. Admin may hide or republish after publication.
drop policy if exists reviews_view on public.reviews;
create policy reviews_view on public.reviews
  for select to anon, authenticated
  using (
    status = 'published'
    or user_id = public.current_profile_id()
    or public.is_admin()
  );

drop policy if exists photos_view on public.review_photos;
create policy photos_view on public.review_photos
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.reviews r
      where r.id = review_id
        and (r.status = 'published' or r.user_id = public.current_profile_id() or public.is_admin())
    )
  );

drop policy if exists photos_add on public.review_photos;
create policy photos_add on public.review_photos
  for insert to authenticated
  with check (
    exists (
      select 1 from public.reviews r
      where r.id = review_id
        and r.user_id = public.current_profile_id()
        and r.status = 'published'
    )
  );

-- Previously pending stories become publicly visible, as requested.
update public.reviews set status = 'published' where status = 'pending';

create index if not exists reviews_user_created_at on public.reviews(user_id, created_at desc);

-- Story photos stay in their existing PRIVATE bucket. Only published-story
-- photos may be downloaded by guests through an RLS-checked route.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-private', 'review-private', false, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Object key format: <verified-auth-user-id>/<owned-review-id>/<random-id>.jpg
-- No anonymous uploads, and no cross-account uploads.
drop policy if exists review_story_photo_upload on storage.objects;
create policy review_story_photo_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review-private'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.reviews r
      where r.id::text = (storage.foldername(name))[2]
        and r.user_id = public.current_profile_id()
        and r.status = 'published'
    )
  );

-- Owners can read their files during upload. Guests can read ONLY photo
-- objects that are attached to a currently published story.
drop policy if exists review_story_photo_read on storage.objects;
create policy review_story_photo_read on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'review-private'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.review_photos p
        join public.reviews r on r.id = p.review_id
        where p.storage_path = name and r.status = 'published'
      )
    )
  );

drop policy if exists review_story_photo_delete on storage.objects;
create policy review_story_photo_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'review-private'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;

-- Post-migration check (run as trusted SQL Editor user):
select
  (select count(*) from public.reviews where status='published') as public_stories,
  (select count(*) from public.reviews where status='pending') as pending_stories,
  (select count(*) from storage.buckets where id='review-private' and public=false) as private_review_bucket_ready;
