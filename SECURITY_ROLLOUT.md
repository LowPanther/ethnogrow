# Ethnogrow security rollout — draft (do not deploy yet)

## Work completed in branch
- Participant page uses a server-side privileged read by unguessable token, returning only questionnaire fields.
- Eligibility check requires project ID and participant token, and uses a server-side project lookup.
- Response submission checks project token, activity, email and allowlist before invoking a service-role-only database function.
- Atomic submission SQL reserves (project_id,email_hash) using a unique index and writes response in one transaction.
- AI report route validates user and project ownership, then writes researcher usage through a service-role client to avoid relying on client write privileges.
- Staged permissions migration revokes exposed accounting and participant insert permissions and removes broad response insert policies.
- A separate migration removes the public active-project SELECT policy after associated application changes.

## Preconditions for deployment
1. Backups were exported and readable but have **not** been restored in isolation; do not treat them as proven recovery.
2. Confirm live responses and response_verifications columns are compatible with the atomic SQL function; confirm no existing duplicate project/email hashes (owner reported none).
3. Review all remaining API and browser Supabase paths for direct reads of active project records or writes to response/verification/usage tables.
4. Run TypeScript build, focused automated tests and an end-to-end staging survey.
5. Confirm the site deployment method and create rollback plan preserving both old application code and SQL RLS/grants.
6. Provision a staging database and test migrations there, including anonymous, authenticated and service-role permission negative cases.
7. Apply database function/index before deploying matching response endpoint; coordinate RLS changes with server code. Do not run draft migrations in arbitrary order.

## Risks and limits
- **Email allowlist is not identity verification**; a claimant can enter someone else's email. Invitation tokens and email ownership verification are a separate product feature.
- The database function trusts an API validated project/email; it is granted to service_role only. Keep service role credential private.
- Current API requires email even for open surveys; the current participant UI also requires it. Public anonymous surveys require separate design.
- The existing public project's policy should not be removed before verifying the researcher and participant paths.
- RLS alone does not restrict TRUNCATE; revoke grants as drafted.
- All changes are on a draft pull request; no Supabase migration or production deployment has occurred.
- Archive-read success is not a full restore and doesn't cover Supabase Storage payloads or every hosted setting.
