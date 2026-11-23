-- Read-only check. Run in Supabase SQL Editor to diagnose V4 content.
-- If you get "relation does not exist", run 001_schema.sql FIRST.
SELECT 'destinations' AS item, count(*) AS total_rows, count(*) FILTER (WHERE image_url IS NOT NULL AND image_source_url IS NOT NULL) AS with_source_matched_photo FROM public.destinations
UNION ALL
SELECT 'events' AS item, count(*) AS total_rows, count(*) FILTER (WHERE image_url IS NOT NULL AND image_source_url IS NOT NULL) AS with_source_matched_photo FROM public.tourism_events;
-- Show examples of photo sources:
SELECT slug,name,image_url,image_source_url FROM public.destinations WHERE image_url IS NOT NULL ORDER BY sort_order LIMIT 8;
