-- DRAFT: apply before deploying the matching /api/responses handler.
-- Requires review of existing duplicate email hashes before UNIQUE index creation.
-- This migration does not delete or rewrite responses.
BEGIN;

-- Prevent a single email hash from being reserved more than once per project.
CREATE UNIQUE INDEX IF NOT EXISTS response_verifications_project_email_unique
ON public.response_verifications (project_id, email_hash);

CREATE OR REPLACE FUNCTION public.submit_survey_response_atomic(
  p_project_id uuid,
  p_email_hash text,
  p_session_id text,
  p_responses jsonb,
  p_completion_time_seconds integer,
  p_flag_reasons jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_response_id uuid;
  v_reserved uuid;
BEGIN
  IF p_email_hash IS NULL OR length(p_email_hash) <> 64
     OR p_session_id IS NULL OR length(p_session_id) = 0
     OR p_responses IS NULL OR jsonb_typeof(p_responses) <> 'array' THEN
    RAISE EXCEPTION 'invalid_submission';
  END IF;

  -- Check status again inside transaction; API must validate the
  -- participant token and allowed email before invoking this function.
  PERFORM 1 FROM public.projects
    WHERE id = p_project_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'project_not_active';
  END IF;

  INSERT INTO public.response_verifications (project_id, email_hash)
  VALUES (p_project_id, p_email_hash)
  ON CONFLICT (project_id, email_hash) DO NOTHING
  RETURNING id INTO v_reserved;

  IF v_reserved IS NULL THEN
    RAISE EXCEPTION 'already_submitted';
  END IF;

  INSERT INTO public.responses
    (project_id, session_id, responses, completion_time_seconds,
     flag_status, flag_reasons)
  VALUES
    (p_project_id, p_session_id, p_responses, p_completion_time_seconds,
     CASE WHEN p_flag_reasons IS NOT NULL AND jsonb_array_length(p_flag_reasons) > 0
       THEN 'flagged' ELSE NULL END,
     p_flag_reasons)
  RETURNING id INTO v_response_id;

  RETURN v_response_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_survey_response_atomic(
  uuid, text, text, jsonb, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_survey_response_atomic(
  uuid, text, text, jsonb, integer, jsonb) TO service_role;

COMMIT;
