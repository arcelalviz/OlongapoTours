-- Olongapo Tours V4 | Run once in Supabase SQL Editor.
-- Supabase Auth users are created by Google sign-in; PHP password hashes are NOT imported.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid unique references auth.users(id) on delete set null,
 legacy_user_id bigint unique,
 email text not null,
 display_name text not null default 'Traveler',
 avatar_url text,
 role text not null default 'traveler' check(role in ('traveler','admin')),
 created_at timestamptz not null default now()
);
create unique index if not exists profiles_email_unique on public.profiles(lower(email));

create or replace function public.current_profile_id() returns uuid
language sql stable security definer set search_path='' as $$
 select p.id from public.profiles p where p.auth_user_id=(select auth.uid()) limit 1;
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.auth_user_id=(select auth.uid()) and p.role='admin');
$$;

-- Account ownership is reconnected only after a VERIFIED Google login.
create or replace function public.claim_profile() returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); mail text; pname text; profile_id uuid;
begin
 if uid is null then raise exception 'Authentication required';end if;
 select u.email,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),split_part(u.email,'@',1)) into mail,pname
 from auth.users u where u.id=uid and u.email_confirmed_at is not null
 and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google');
 if mail is null then raise exception 'Verified Google account required';end if;
 select p.id into profile_id from public.profiles p where p.auth_user_id=uid;
 if profile_id is not null then return profile_id;end if;
 update public.profiles set auth_user_id=uid where lower(email)=lower(mail) and auth_user_id is null returning id into profile_id;
 if profile_id is not null then return profile_id;end if;
 insert into public.profiles(email,display_name,auth_user_id)
 values(mail,pname,uid) returning id into profile_id;
 return profile_id;
end$$;
revoke all on function public.claim_profile() from public,anon;
grant execute on function public.claim_profile() to authenticated;
revoke all on function public.current_profile_id() from public;
grant execute on function public.current_profile_id() to anon,authenticated;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon,authenticated;

create table if not exists public.destinations (
 slug text primary key, name text not null, category text not null default 'Other',area text not null default 'Olongapo City',
 location_label text not null default '',excerpt text not null default '',description text not null default '',travel_tip text not null default '',
 image_url text,image_source_url text,image_credit text,map_query text not null default '',
 is_featured boolean not null default false,is_published boolean not null default true,sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 constraint destination_image_source_both check ((image_url is null and image_source_url is null) or (image_url is not null and image_source_url is not null))
);
create table if not exists public.tourism_events (
 slug text primary key,title text not null,category text not null default 'Festival',month_label text not null,
 month_number integer not null check(month_number between 1 and 12),
 date_start date,date_end date,date_note text not null default '',location_label text not null default '',
 excerpt text not null default '',description text not null default '',image_url text,image_source_url text,image_credit text,source_url text,
 schedule_status text not null default 'tba' check(schedule_status in ('confirmed','user_supplied','historical','tba')),
 is_featured boolean not null default false,is_published boolean not null default true,created_at timestamptz not null default now(),
 constraint event_image_source_both check ((image_url is null and image_source_url is null) or (image_url is not null and image_source_url is not null))
);

create table if not exists public.saved_destinations (
 user_id uuid not null references public.profiles(id) on delete cascade,
 destination_slug text not null references public.destinations(slug) on delete cascade,
 created_at timestamptz default now(),primary key(user_id,destination_slug)
);
create table if not exists public.itineraries (
 id uuid primary key default gen_random_uuid(),legacy_id bigint unique,
 user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null,created_at timestamptz not null default now()
);
create table if not exists public.itinerary_stops (
 itinerary_id uuid not null references public.itineraries(id) on delete cascade,
 destination_slug text not null references public.destinations(slug) on delete cascade,
 position integer not null check(position between 1 and 12),primary key(itinerary_id,destination_slug),unique(itinerary_id,position)
);
create table if not exists public.reviews (
 id uuid primary key default gen_random_uuid(),legacy_id bigint unique,
 user_id uuid not null references public.profiles(id) on delete cascade,
 place_name text not null,title text not null,body text not null,
 rating integer not null check(rating between 1 and 5),visit_date date,
 status text not null default 'pending' check(status in ('published','hidden','pending')),
 created_at timestamptz not null default now()
);
create table if not exists public.review_photos (
 id uuid primary key default gen_random_uuid(),legacy_id bigint unique,
 review_id uuid not null references public.reviews(id) on delete cascade,
 storage_path text not null,public_url text not null,alt_text text,created_at timestamptz not null default now()
);

-- Private visitor albums never grant direct table or storage access through public clients.
create table if not exists public.galleries (
 id uuid primary key default gen_random_uuid(),legacy_id bigint unique,
 tourist_name text not null,access_code_hash text not null unique,qr_token_hash text not null unique,
 expires_at timestamptz not null,created_at timestamptz not null default now()
);
create table if not exists public.media (
 id uuid primary key default gen_random_uuid(),legacy_id bigint unique,
 gallery_id uuid not null references public.galleries(id) on delete cascade,
 original_name text not null,storage_path text not null unique,media_type text not null check(media_type in ('image','video')),
 created_at timestamptz not null default now()
);
create table if not exists public.gallery_attempts (
 id bigint generated always as identity primary key,ip_hash text not null,created_at timestamptz not null default now()
);
create index if not exists gallery_attempts_rate on public.gallery_attempts(ip_hash,created_at);
create index if not exists reviews_status_date on public.reviews(status,created_at desc);

alter table public.profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.tourism_events enable row level security;
alter table public.saved_destinations enable row level security;
alter table public.itineraries enable row level security;
alter table public.itinerary_stops enable row level security;
alter table public.reviews enable row level security;
alter table public.review_photos enable row level security;
alter table public.galleries enable row level security;
alter table public.media enable row level security;
alter table public.gallery_attempts enable row level security;

create policy profiles_view on public.profiles for select using (id=public.current_profile_id() or public.is_admin());
create policy destinations_view on public.destinations for select using (is_published or public.is_admin());
create policy destinations_add on public.destinations for insert to authenticated with check (public.is_admin());
create policy destinations_edit on public.destinations for update to authenticated using (public.is_admin()) with check(public.is_admin());
create policy destinations_delete on public.destinations for delete to authenticated using(public.is_admin());
create policy events_view on public.tourism_events for select using (is_published or public.is_admin());
create policy events_add on public.tourism_events for insert to authenticated with check(public.is_admin());
create policy events_edit on public.tourism_events for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy events_delete on public.tourism_events for delete to authenticated using(public.is_admin());
create policy saved_view on public.saved_destinations for select to authenticated using(user_id=public.current_profile_id());
create policy saved_insert on public.saved_destinations for insert to authenticated with check(user_id=public.current_profile_id());
create policy saved_delete on public.saved_destinations for delete to authenticated using(user_id=public.current_profile_id());
create policy trips_view on public.itineraries for select to authenticated using(user_id=public.current_profile_id());
create policy trips_insert on public.itineraries for insert to authenticated with check(user_id=public.current_profile_id());
create policy trips_delete on public.itineraries for delete to authenticated using(user_id=public.current_profile_id());
create policy stops_view on public.itinerary_stops for select to authenticated using(exists(select 1 from public.itineraries t where t.id=itinerary_id and t.user_id=public.current_profile_id()));
create policy stops_insert on public.itinerary_stops for insert to authenticated with check(exists(select 1 from public.itineraries t where t.id=itinerary_id and t.user_id=public.current_profile_id()));
create policy stops_delete on public.itinerary_stops for delete to authenticated using(exists(select 1 from public.itineraries t where t.id=itinerary_id and t.user_id=public.current_profile_id()));
create policy reviews_view on public.reviews for select using(status='published' or user_id=public.current_profile_id() or public.is_admin());
create policy reviews_add on public.reviews for insert to authenticated with check(user_id=public.current_profile_id() and status='pending');
create policy reviews_edit on public.reviews for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy photos_view on public.review_photos for select using(exists(select 1 from public.reviews r where r.id=review_id and (r.status='published' or r.user_id=public.current_profile_id() or public.is_admin())));
create policy photos_add on public.review_photos for insert to authenticated with check(exists(select 1 from public.reviews r where r.id=review_id and r.user_id=public.current_profile_id()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('visitor-private','visitor-private',false,104857600,array['image/jpeg','image/png','image/webp','video/mp4'])
on conflict (id) do update set public=false;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('review-private','review-private',false,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false;
-- Only server-side service-role code creates storage objects or signed upload tickets.
-- No storage.objects INSERT/SELECT policies granted to the browser roles.
