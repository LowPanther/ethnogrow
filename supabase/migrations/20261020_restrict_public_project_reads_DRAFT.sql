-- DRAFT - Deploy only after participant server-side data access is live.
-- Existing owner-scoped researcher policy remains unchanged.
BEGIN;
DROP POLICY IF EXISTS "Anyone can view active project by token" ON public.projects;
COMMIT;
