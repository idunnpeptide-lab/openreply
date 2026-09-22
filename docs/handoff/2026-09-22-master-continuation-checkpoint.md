# Master continuation checkpoint — 2026-09-22

## Purpose
This checkpoint preserves the exact continuation state after the 2026-09-22 production-licensing incident was rolled back and isolated staging was restored. It is a continuation aid, not a product-code change.

Project owner / product decision maker: **Volodymyr Rudyi**. ChatGPT (OpenAI) provides AI development assistance. Volodymyr sets product requirements and priorities, makes product/architecture decisions, performs or coordinates manual/provider QA, and approves results.

## Source of truth
Before continuing, re-read current GitHub and prefer any newer merged state over this checkpoint.

- `idunnpeptide-lab/openreply` main at checkpoint: `b35f201e64c7124e248de4b92fbed7b8e7cc1a14` (PR #79, production licensing incident + staging isolation documentation).
- `idunnpeptide-lab/dm-magnet-system` main at checkpoint: `68c0613741a570eb74059b8270fe0014e533035f` (PR #54, optional `DM_MAGNET_SERVICE_SECRET_NEXT` overlap for zero-downtime service-secret rotation).

Known stale PRs must not be treated as resume points:
- openreply PR #59 is an old draft superseded by merged PR #58 and later launch-readiness work.
- dm-magnet-system PR #28 is an old stale documentation PR.

## Completed launch-readiness work after the older handoff
The previous master handoff stopped around the PR #49/#50 era. The following later stages are now complete and must not be repeated:

- PR #51: plan readiness, creator-friendly login/activation/template copy, fail-closed plan verification.
- PR #53: auth/plan recovery, customer-safe OAuth errors, fail-closed Settings plan verification.
- PR #55: preserved-slot account-limit recovery copy.
- PR #58: Quick Automations account-load recovery, active preflight, account-switch post-picker isolation, HTTPS link validation.
- PR #62: server-side active-automation connection guard for soft-disconnected Instagram rows.
- PR #64: Custom Builder account-readiness/integrity fixes.
- PR #66: Automations/Settings recovery fixes.
- PR #69/#70: mobile navigation and primary-control basic accessibility fixes.
- PR #71: evidence checkpoint for mobile/basic accessibility.
- PR #72: fail-closed sign-in email configuration.
- PR #73/#74: email auth and external Railway/Resend readiness evidence.
- PR #75: real staging fix for link-preview scanners consuming one-time Auth.js verification tokens.
- PR #76: real staging fix replacing the failed server-action redirect with a direct browser GET to the Auth.js callback after explicit confirmation.
- PR #77: evidence for the successful fresh passwordless sign-in to the authenticated Dashboard after #75/#76.
- PR #78: Instagram/customer-flow continuation checkpoint.
- PR #79: production licensing incident, rollback, and permanent staging-isolation rule.

Do not restart email deliverability/magic-link work from scratch. A fresh staging login was manually proven after the real preview/callback blockers were fixed.

## Permanent production safety boundary
The existing production environment serving Instagram account `@online.robota.affiliate` must not be used for activation-key, licensing, plan-gate, onboarding, or new-customer-flow experiments.

On 2026-09-22 central licensing variables were temporarily enabled on the legacy production OpenReply web/worker. The existing production workspace had not been migrated to the new central workspace-license model, and worker delivery began failing with `This workspace does not have a DM Magnet License Key`.

Recovery already completed:
- central license URL/service-secret configuration was removed/cleared again from the legacy production web and worker;
- production services redeployed;
- worker restarted;
- Volodymyr manually confirmed `@online.robota.affiliate` works again.

Until an explicit migration plan is approved, do **not**:
- disconnect/reconnect/re-OAuth `@online.robota.affiliate`;
- change its Meta token;
- attach it to staging;
- re-enable central licensing variables on that legacy production runtime;
- use it as a test customer.

## Current isolated staging state
Railway project: `dm-magnet-system`
Environment: `staging`

Verified current service status on 2026-09-22:
- `Postgres-MmWg` — SUCCESS
- `Redis` — SUCCESS
- `replyhalo-web` — SUCCESS, deployment `7bb5cc8c-654e-4a88-8776-9681172a8834`
- `replyhalo-worker` — SUCCESS, deployment `fa6db13e-d684-4302-b834-5dee99337350`
- `dm-magnet-license-db` — SUCCESS
- `dm-magnet-system-staging` — SUCCESS

The worker startup was observed with `[DM Worker] Started`.

Staging ReplyHalo: `https://replyhalo-web-staging.up.railway.app`
Staging license/admin service: `https://dm-magnet-system-staging-staging.up.railway.app`

Do not recreate staging, Postgres, Redis, web, worker, or the staging license service.

## Exact browser/customer state
The current fresh staging workspace is at Settings with **ReplyHalo Plan → Activation required**. Instagram is not connected in this fresh workspace. That is the expected state.

## Exact next step
The next stage is **not coding** and is **not another audit**.

Create exactly one **staging-only QA license** in `dm-magnet-system-staging`:
- plan: `SOLO`
- `maxAccounts`: `1`
- `expiresAt`: blank/null
- test identity may be `qa@replyhalo.example` unless a newer staging-specific choice has already been recorded.

Admin login:
`https://dm-magnet-system-staging-staging.up.railway.app/admin/login`

`LICENSE_ADMIN_SECRET` is owner/admin-only. Never ask Volodymyr to paste it into ChatGPT or show it in a screenshot. He should use it privately from Railway staging variables.

The generated activation/license key is also a secret. Do **not** ask Volodymyr to paste it into ChatGPT. He should copy it directly from the staging License Admin into the fresh staging ReplyHalo activation field.

Manual/provider work must be one step at a time. The first manual step in the next chat should be: open the staging License Admin login, sign in privately, then send a screenshot after login with no secret visible.

## Walkthrough after license creation
After the QA activation code is applied directly to the fresh staging workspace:
1. confirm plan Active and SOLO capacity `0/1` before binding;
2. confirm Connect Instagram becomes available;
3. use only a safe staging/test Instagram account;
4. never use production `@online.robota.affiliate`;
5. do not destroy/disconnect existing staging account `@traffictiktok11` merely to free a slot;
6. if the chosen fresh test Instagram account is Personal, handle official Professional Creator/Business conversion as needed;
7. complete official OAuth;
8. verify callback and Instagram health: Connected / Authorization healthy / Automation ready;
9. verify slot becomes `1/1`;
10. create a Quick Automation using a controlled post/reel;
11. activate and confirm list state;
12. trigger a real external keyword comment;
13. verify public reply and private reply/request;
14. verify Follow Gate / tracked click / follow-up if selected;
15. verify Dashboard / Logs / CTR / activity.

Record only facts actually observed. First-contact Instagram private replies can appear in Requests/Hidden Requests and that alone is not a ReplyHalo send failure.

## Existing Instagram staging evidence
Earlier live staging QA already proved the Instagram runtime path, including comment keyword trigger, public reply, private reply/DM, Follow Gate for follower/non-follower cases, tracked links/click/CTR, delayed follow-up, repeat follow-up for returning interactions, DM keyword trigger, safe soft disconnect, history preservation, same-account reconnect, post-reconnect delivery, and provider-event replay dedupe.

The current fresh-customer test has a different purpose: prove that a normal user can go from fresh login/workspace through activation, Instagram connection, Quick Automation and a working real automation without developer knowledge.

## TikTok boundary
TikTok official-provider foundation already exists and must not be rebuilt during this stage. Both source-controlled live-send gates remain false:
- `TIKTOK_LIVE_EXECUTION_ENABLED=false`
- `TIKTOK_CONTROLLED_STAGING_SEND_ENABLED=false`

Real TikTok provider E2E comes only after a stable commercial Instagram version and explicit Volodymyr approval.

## Evidence / preservation discipline
After every meaningful **product development stage**, update:
1. `PROJECT_PROGRESS.md`
2. `docs/ip-evidence/R&D_LOG.md`
3. `docs/ip-evidence/AI_ASSISTANCE_LOG.md`
4. `docs/ip-evidence/IP_EVIDENCE.md`

Use product PR → green CI/Security → merge → separate evidence checkpoint PR. Preserve previous evidence additively. Never fabricate deployment/manual validation or store secrets.

When Volodymyr says to save work before continuing, or context is near its limit, create/update a `docs/handoff` checkpoint first and then continue.

## First response rule for the next chat
Do not give a long lecture. Re-check current GitHub and, if needed, Railway. If no newer state supersedes this checkpoint, briefly confirm that production `@online.robota.affiliate` remains untouched, staging is green, and the exact continuation is the staging-only SOLO/1-slot QA license. Then give only the first manual admin-login step and wait for the screenshot/result.
