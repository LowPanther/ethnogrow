# Ethnogrow security rollout (DRAFT — not safe to deploy without checks)

## Known facts
- Current live Supabase RLS: enabled on all 7 public application tables.
- Public active-project SELECT policy grants broad read access.
- Direct inserts into responses and response_verifications are permitted by current live RLS.
- researcher_usage permits all operations to PUBLIC through policy named "Service role manages usage".
- Draft branch submission endpoint now expects a participant token and server-computed email hash.
- Plain email allowlisting is NOT email ownership verification.
- The current duplicate check and response insert are NOT atomic.

## Deployment order
1. Keep SQL unexecuted and PR unmerged until a local isolated restore is tested and a clean backup stored off-device.
2. Confirm whether any client uses direct Supabase inserts for responses/verifications or writes researcher_usage. If so, move to server routes before revocation.
3. Implement server-only participant token endpoints to replace broad public project SELECT. Do not revoke SELECT until participant pages function through the new endpoint.
4. Use an atomic database function or transaction to claim a response_verification unique (project_id,email_hash) before inserting responses. Test concurrency, recover from failures.
5. Test anonymous and researcher workflows in staging, including report generation, usage accounting and respondent submission.
6. Apply staged SQL in Supabase SQL Editor only after approval, deploy matching application changes, test and monitor.

## Rollback
The supplied SQL is transactional but a successful COMMIT requires a tested reverse migration, not merely restoring a data dump. Preserve pg_policies and grants output and regenerate privileges deliberately. Never restore a full Supabase dump over an existing live Supabase database.

## Backup limitations
Readable pg_dump archives aren't a full tested restore; hosted Auth, Storage objects, secrets and platform configuration may need separate recovery.
