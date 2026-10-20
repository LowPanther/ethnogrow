-- Ethnogrow: access hardening, staged for manual review.
-- Apply only after verifying production paths and an isolated restore.
-- Transactional: failures roll back changes.
BEGIN;
-- Prevent unauthenticated callers from changing financial/usage accounting.
REVOKE ALL PRIVILEGES ON TABLE public.researcher_usage FROM anon, authenticated;
DROP POLICY IF EXISTS "Service role manages usage" ON public.researcher_usage;
-- Signed-in researchers may continue to view their own usage using existing SELECT policy.
GRANT SELECT ON TABLE public.researcher_usage TO authenticated;
-- Remove privileges not required by the browser API. TRUNCATE bypasses RLS.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
-- Participants must submit through /api/responses, not directly to Supabase.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.responses, public.response_verifications FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.response_verifications FROM authenticated;
DROP POLICY IF EXISTS "Participants can submit to active projects" ON public.responses;
DROP POLICY IF EXISTS "Anyone can insert verification for active project" ON public.response_verifications;
-- Do not remove public project SELECT here: participant rendering currently relies on it.
-- Separate access-controlled participant endpoint must be deployed before that change.
COMMIT;
