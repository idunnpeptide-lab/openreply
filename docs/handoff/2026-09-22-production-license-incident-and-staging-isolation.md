# Production licensing incident and staging isolation — 2026-09-22

## Source checkpoint
- Repository: `idunnpeptide-lab/openreply`
- Base `main`: `39fb2f6aa53d1c6341c887b07f630e300bac170a`
- This document records a production configuration incident, rollback, verified recovery, and the required isolation rule for future licensing/customer-flow QA.

## What happened
- Central licensing was enabled on the existing production `openreply-web` and `openreply-worker` Railway services while validating the new commercial activation flow.
- The existing production Instagram workspace for `@online.robota.affiliate` had not been activated through the new central license system.
- Worker runtime logs then showed delivery failures with the error: `This workspace does not have a DM Magnet License Key`.
- This caused production Instagram reply automation for the existing workspace to stop processing correctly.

## Recovery performed
- `DM_MAGNET_LICENSE_URL` and `DM_MAGNET_SERVICE_SECRET` were removed/cleared again from the production `openreply-web` and `openreply-worker` services, restoring the previous Local-mode behavior.
- Railway redeployed both production services successfully.
- The production worker restarted successfully with `[DM Worker] Started`.
- Volodymyr manually confirmed that `@online.robota.affiliate` was working again after rollback.

## Permanent safety rule
- The production project that serves `@online.robota.affiliate` must not be used for activation-key, licensing, plan-gate, onboarding, or new-customer-flow experiments.
- All future SOLO/CREATOR/AGENCY activation tests and license-gate QA must run only in the isolated Railway staging environment under project `dm-magnet-system`, using its `replyhalo-web`, `replyhalo-worker`, staging Redis, and staging Postgres.
- Production licensing must not be re-enabled until the complete staging customer journey has passed and an explicit production migration plan exists for already-connected workspaces.

## Staging preparation discovered immediately afterward
- Railway staging already contains isolated `replyhalo-web`, `replyhalo-worker`, Redis, and Postgres services.
- Staging `replyhalo-web` already has `DM_MAGNET_LICENSE_URL` and `DM_MAGNET_SERVICE_SECRET` configured.
- The staging worker had a historical build failure because the new fail-closed email configuration requires `EMAIL_FROM` and an email transport during Next.js build.
- `EMAIL_FROM` and `RESEND_API_KEY` were added to the staging worker via Railway service references to `replyhalo-web`; no production variables were changed for this staging fix.

## Next continuation point
1. Wait for the staging worker redeploy to finish and require `SUCCESS`.
2. Verify staging web + worker startup logs and license connectivity.
3. Run the activation journey only in staging: fresh login/workspace → no-license gate → test SOLO activation → 1 account slot → Personal Instagram handling → Creator/Business conversion → OAuth callback → connection health → Quick Automation.
4. Keep production `@online.robota.affiliate` untouched throughout this work.

## Evidence limits
- The production recovery is based on Railway runtime logs plus Volodymyr's direct manual confirmation that replies resumed.
- No claim is made that the staging customer journey has passed yet; staging worker redeployment was still in progress when this checkpoint was created.
