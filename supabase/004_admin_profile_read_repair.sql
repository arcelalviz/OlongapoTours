-- Olongapo Tours V4 — dedicated administrator profile / RLS repair.
-- Execute in Supabase SQL Editor (the project's trusted SQL administrator).
-- Does NOT reset any password, delete any table, or affect gallery records.
BEGIN;

-- Browser user sessions should be able to read ONLY their own profile.
-- Administrator management endpoints perform a separate checked server-side
-- role lookup, using a secret key that must never be exposed to the browser.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_view ON public.profiles;
CREATE POLICY profiles_view ON public.profiles
  FOR SELECT TO authenticated
  USING (auth_user_id = (select auth.uid()));

-- Link/promote ONLY the existing confirmed, dedicated admin account.
-- Does not overwrite a profile already linked to a different Auth identity.
UPDATE public.profiles AS p
SET auth_user_id = u.id, role = 'admin'
FROM auth.users AS u
WHERE lower(trim(p.email)) = 'olongapo.tours.admin@gmail.com'
  AND lower(trim(u.email)) = lower(trim(p.email))
  AND u.email_confirmed_at IS NOT NULL
  AND (p.auth_user_id IS NULL OR p.auth_user_id = u.id);

COMMIT;

-- Verify: one row, confirmed=true, role=admin, linked=true.
SELECT u.email,
       (u.email_confirmed_at IS NOT NULL) AS confirmed,
       p.role,
       (p.auth_user_id = u.id) AS linked
FROM auth.users u
LEFT JOIN public.profiles p ON lower(trim(p.email))=lower(trim(u.email))
WHERE lower(trim(u.email))='olongapo.tours.admin@gmail.com';
