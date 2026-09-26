# ReplyHalo — TikTok staging continuation checkpoint

Checkpoint date: 2026-09-26
Owner / product decision maker: Volodymyr Rudyi
AI development assistance: ChatGPT (OpenAI)

## Purpose

This checkpoint records the exact safe resume point for the TikTok provider rollout while Meta/Instagram commercial verification continues in parallel.

Do not store passwords, app secrets, access tokens, refresh tokens, license keys, EINs, phone numbers, or other sensitive values in this file.

## Source of truth

Primary application repository: `idunnpeptide-lab/openreply`

Current `main` after today's TikTok staging-scope change:

- PR #84: `Narrow TikTok staging OAuth to comment-only scopes`
- merge commit: `bc7114b56ecdc4b951a549c1f63441122b9be691`
- CI: PASS
- Security: PASS

PR #82 remains an open draft/persistent Meta checkpoint and is not the development branch for TikTok work.

## Instagram / Meta state

Instagram remains the proven live provider path and must not be refactored as part of TikTok staging.

Meta Business Verification for the legal company behind ReplyHalo has already been submitted and is still pending at this checkpoint. The product domain has been verified in Meta, and the corporate email verification path has also been completed. Sensitive business contact values are intentionally not duplicated here.

Meta App Review remains a parallel track. Do not restart or alter the submitted business verification merely to continue TikTok work.

## Existing TikTok implementation already in `main`

TikTok is additive and isolated from the Instagram runtime. The codebase already contains:

- TikTok for Business OAuth foundation with signed workspace-bound state;
- auth-code exchange and refresh-token lifecycle;
- encrypted TikTok token storage;
- connected-account capability flags derived from actual granted scopes;
- owned-video loading;
- comment listing / comment lookup;
- public comment reply provider client;
- Business Messaging client foundation;
- signed TikTok webhook verification;
- COMMENT and DIRECT_MESSAGE ingress support;
- EEA/UK/CH stripped-message reconciliation;
- provider-native durable event receipts and dedupe;
- isolated `tiktok-ingress` BullMQ queue and worker;
- additive `TikTokAccount`, `TikTokAutomation`, and `TikTokAutomationMatch` models;
- keyword routing for comment and inbound-message events;
- inert persisted action plans;
- hard-gated TikTok action executor;
- TikTok staging dashboard at `/tiktok`;
- webhook setup/readback diagnostics;
- soft disconnect/reconnect preservation;
- controlled one-shot staging-send surface;
- regression tests for OAuth, client, webhook, ingress, routing, messaging, executor, disconnect/reconnect and controlled execution.

Historical TikTok implementation milestones are PR #20 through PR #43. No real TikTok provider send has yet been claimed as validated.

## Hard safety gates — DO NOT CHANGE YET

The following source-controlled constants remain disabled:

```text
TIKTOK_LIVE_EXECUTION_ENABLED = false
TIKTOK_CONTROLLED_STAGING_SEND_ENABLED = false
```

Both gates must remain `false` during developer-app setup, OAuth setup, account connection, webhook configuration, inert routing QA, dedupe QA, and disconnect/reconnect QA.

No TikTok public reply or DM should be sent until the inert staging flow passes and Volodymyr explicitly approves the controlled send test.

## PR #84 — change completed today

The first real TikTok staging objective is intentionally limited to:

```text
comment keyword -> public reply
```

The default Phase 1 TikTok OAuth scope set is now:

```text
user.info.basic
user.info.username
video.list
comment.list
comment.list.manage
```

Business Messaging scopes are still defined in code for a later explicit phase but are no longer part of the default Phase 1 OAuth baseline.

`TIKTOK_BUSINESS_SCOPES` remains the explicit environment override if a later approved stage needs additional scopes.

No Instagram code, schema, OAuth, webhook, worker, or automation path was changed by PR #84.

## Railway staging state

Project: `dm-magnet-system`
Environment: `staging`

Relevant services:

- `replyhalo-web`
- `replyhalo-worker`
- Redis
- staging Postgres
- DM Magnet license staging services

After PR #84 merge, both ReplyHalo services deployed successfully in staging:

- `replyhalo-web`: SUCCESS
- `replyhalo-worker`: SUCCESS

At the start of today's work, neither ReplyHalo staging service had TikTok Business credentials configured. In particular, there were no deployed values yet for:

```text
TIKTOK_BUSINESS_APP_ID
TIKTOK_BUSINESS_APP_SECRET
TIKTOK_BUSINESS_REDIRECT_URI
TIKTOK_BUSINESS_SCOPES
```

Do not put real values into GitHub or chat. Add provider credentials directly to Railway when the TikTok developer app is ready.

## Existing staging endpoints

The existing live-staging runbook uses the staging Railway host:

```text
https://replyhalo-web-staging.up.railway.app
```

OAuth callback:

```text
https://replyhalo-web-staging.up.railway.app/api/tiktok/callback
```

Webhook receiver:

```text
https://replyhalo-web-staging.up.railway.app/api/tiktok/webhook
```

Do not change the provider callback to another hostname unless the application base URL and provider configuration are deliberately reviewed together. The configured TikTok redirect URI must exactly match `TIKTOK_BUSINESS_REDIRECT_URI`.

## Exact next resume point

Tomorrow resume here — do not redo PR #84 and do not touch the working Instagram provider.

### Step 1 — TikTok API for Business portal

Open TikTok API for Business / Developer portal and go to `My Apps`.

- If a ReplyHalo developer app already exists, inspect and reuse it rather than creating a duplicate.
- If none exists, create a dedicated ReplyHalo TikTok for Business developer app.

### Step 2 — Accounts / Organic API access

Use the TikTok Accounts / Organic API path needed for owned-account comment moderation.

The Phase 1 use case is:

```text
owned Business Account
-> owned videos
-> receive/read comments
-> match keyword in ReplyHalo
-> prepare public reply
```

TikTok's current access process may require the Accounts API Access Application before app/scope approval. Complete provider-side application requirements truthfully for the ReplyHalo use case.

### Step 3 — request only Phase 1 scopes

Request the minimum required scope set first:

```text
user.info.basic
user.info.username
video.list
comment.list
comment.list.manage
```

Do not add Business Messaging scopes during the first comment-only staging phase unless provider setup specifically forces a reviewed change.

### Step 4 — configure Railway secrets

Once TikTok supplies the real developer app credentials, add them directly to Railway staging for the services that need provider OAuth/token lifecycle/runtime access.

Expected variable names:

```text
TIKTOK_BUSINESS_APP_ID
TIKTOK_BUSINESS_APP_SECRET
TIKTOK_BUSINESS_REDIRECT_URI
TIKTOK_BUSINESS_SCOPES
```

Phase 1 scope override, if explicitly set:

```text
user.info.basic,user.info.username,video.list,comment.list,comment.list.manage
```

Never paste the real App Secret into GitHub documentation or screenshots.

### Step 5 — staging OAuth validation

After Railway redeploy:

1. Open ReplyHalo staging `/tiktok`.
2. Confirm developer-app OAuth shows configured.
3. Confirm both TikTok send gates still show locked.
4. Connect the dedicated TikTok Business test account.
5. Confirm the correct account profile appears.
6. Confirm the actual granted scope list is stored/displayed correctly.
7. Confirm owned videos load from TikTok.

### Step 6 — COMMENT webhook / inert automation QA

Only after OAuth + owned-video read pass:

1. Configure/read back the COMMENT webhook to the staging webhook URL.
2. Create one staging TikTok automation for one owned test video and a unique QA keyword.
3. Post the keyword from a separate TikTok test user.
4. Verify a valid signed `comment.update` reaches ReplyHalo.
5. Verify exact comment lookup + normalization.
6. Verify durable provider receipt/dedupe.
7. Verify exactly one `TikTokAutomationMatch` is produced.
8. Verify the match remains inert/`MATCHED` while the send gates remain locked.
9. Verify no TikTok reply has been sent yet.

Only after this passes should the project discuss a separate reviewed change for one controlled public-reply send.

## Do not do on resume

- Do not rewrite Instagram into generic provider tables.
- Do not merge TikTok runtime into the Instagram worker path.
- Do not enable TikTok live-send gates just to test OAuth/webhooks.
- Do not add Business Messaging to Phase 1 without a reason.
- Do not commit provider secrets.
- Do not treat provider webhook readback alone as proof of signed runtime delivery.
- Do not redo already completed PR #84 work.

## Resume command

Use this sentence to resume in a new chat if necessary:

`Продовжуй ReplyHalo з docs/checkpoints/TIKTOK_STAGING_CHECKPOINT_2026-09-26.md. Спочатку перевір актуальний main і Railway staging, потім продовжуй з TikTok API for Business -> My Apps. Instagram не ламати і TikTok send gates не відкривати без мого окремого підтвердження.`
