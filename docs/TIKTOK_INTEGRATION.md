# ReplyHalo TikTok Provider — Integration Plan

Updated checkpoint: 2026-09-19

Project owner / human decision maker: **Volodymyr Rudyi**
AI development assistance: **ChatGPT (OpenAI)**

## Goal

Add TikTok as a second ReplyHalo social provider **without rewriting or destabilizing the production-proven Instagram provider**.

The TikTok implementation uses official TikTok APIs only. Scraping, browser automation, password collection, and private/unofficial endpoints are out of scope.

## Official API path

ReplyHalo integrates with **TikTok API for Business**.

Relevant provider products:

1. **TikTok Accounts / Organic API**
   - profile/account data;
   - owned video list;
   - comments/replies on owned videos;
   - public comment replies;
   - TikTok account webhooks such as `comment.update`.

2. **Business Messaging API**
   - conversations/messages;
   - text replies in eligible existing conversations;
   - Business Messaging webhooks;
   - Comment-to-Message capability when the authorized Business Account is eligible.

Business Messaging and Comment-to-Message remain account/app/region dependent. ReplyHalo must not infer eligibility merely from the existence of the API.

## API and authorization baseline

Business API base URL:

```text
https://business-api.tiktok.com/open_api
```

API version used by ReplyHalo:

```text
v1.3
```

TikTok Business Account authorization uses the TikTok for Business authorization flow. The ReplyHalo callback is implemented at:

```text
/api/tiktok/callback
```

The staging callback currently expected by the runbook is:

```text
https://replyhalo-web-staging.up.railway.app/api/tiktok/callback
```

Token exchange uses:

```text
POST https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/
```

ReplyHalo stores encrypted access/refresh tokens and supports refresh instead of treating the initial access token as long-lived.

## Desired permission set

The provider requests these scopes where TikTok approves them for the app/account:

```text
user.info.basic
user.info.username
video.list
comment.list
comment.list.manage
message.list.read
message.list.send
message.list.manage
```

The desired list is not proof of approval. ReplyHalo persists actual granted scopes and derives runtime capability flags from the provider response.

## Additive architecture

```text
ReplyHalo core
|
+-- Instagram provider (existing, staging QA passed)
|   +-- Meta OAuth/webhooks
|   +-- comments/public replies
|   +-- private reply/DM
|   +-- Follow Gate
|   +-- tracked links/follow-ups
|
+-- TikTok provider (additive staging path)
    +-- TikTok for Business OAuth
    +-- encrypted access/refresh token lifecycle
    +-- account capability/scopes
    +-- owned-video reads
    +-- signed TikTok account webhooks
    +-- Business Messaging webhooks
    +-- EU/UK/CH stripped-message reconciliation
    +-- provider-native logical event receipts/dedupe
    +-- separate TikTok campaign storage
    +-- durable routing/action-plan matches
    +-- hard-gated action executor
    +-- sanitized staging diagnostics
    +-- live public-reply/DM execution: LOCKED
```

Do **not** rename or replace `InstagramAccount` or the proven Instagram `Automation` model during the TikTok staging rollout.

## Persistence / idempotency model

TikTok currently has separate storage for:

- `TikTokAccount` — workspace, open ID, metadata, encrypted tokens, expiry, actual scopes, capability flags, webhook state;
- `SocialEventReceipt` — provider-native logical-event dedupe;
- `TikTokAutomation` — isolated TikTok campaign configuration;
- `TikTokAutomationMatch` — durable action-plan snapshot and execution state.

TikTok webhook delivery is treated as **at least once**:

```text
signed webhook delivery
        ↓
durable WebhookEvent
        ↓
provider-native commentId/messageId
        ↓
SocialEventReceipt unique key
        ↓
normalized event
        ↓
TikTokAutomationMatch unique per automation + logical event
```

Routing is independently replay-safe so a retry can repair routing without producing a second campaign match.

The future send boundary has additional protection:

- row serialization for one durable match;
- terminal `EXECUTED` / `FAILED` / `SKIPPED` states suppress sequential replay;
- current account capability is re-checked immediately before a future provider action;
- automatic provider-send retry is deliberately absent because the current TikTok send clients do not expose a persisted provider idempotency key in ReplyHalo.

Therefore ReplyHalo does **not** claim exactly-once delivery across a hard process crash after provider acceptance but before the DB status commit.

## Webhook model

ReplyHalo staging receiver:

```text
https://replyhalo-web-staging.up.railway.app/api/tiktok/webhook
```

The receiver:

- enforces a request-body size limit;
- verifies `tiktok-signature` with HMAC SHA-256 using `TIKTOK_BUSINESS_APP_SECRET`;
- applies a timestamp tolerance;
- stores durable delivery evidence;
- uses deterministic delivery dedupe;
- preserves event-specific raw content where required so 64-bit TikTok IDs are not rounded by JavaScript;
- routes provider-specific work onto the isolated TikTok ingress queue.

Supported first-stage logical events:

```text
comment.update
im_receive_msg
im_receive_msg_eu
```

The EU/UK/CH stripped-message path reconciles through official conversation/message reads and fails closed when a unique mapping cannot be proven.

Provider webhook configuration helpers exist for:

```text
/business/webhook/update/
/business/webhook/list/
/business/webhook/delete/
```

The first live staging phase needs only the relevant `COMMENT` and `DIRECT_MESSAGE` webhook families.

## Capability model

Runtime behavior is based on actual stored capability state, including:

- comments access;
- public comment reply;
- Business Messaging;
- Comment-to-Message;
- webhook confirmation.

TikTok campaign configuration fails closed when the connected account lacks the required capability.

Comment-to-Message is kept separate from ordinary comment automation and from normal replies in an existing DM conversation.

## Implemented phases

### A — OAuth/account/token foundation

Implemented:

- signed workspace-bound OAuth state;
- `auth_code` exchange;
- encrypted access + refresh token storage;
- refresh lifecycle;
- account profile read;
- actual scope/capability snapshot;
- shared multi-platform license slot binding;
- workspace-scoped non-secret account API.

Live provider approval/account validation is still pending.

### B — organic comment ingress/routing

Implemented:

- official owned-video reads;
- comment list/exact lookup;
- lossless 64-bit comment/video ID handling;
- signed `comment.update` webhook ingestion;
- isolated TikTok ingress queue;
- provider-neutral normalization;
- keyword/video matching;
- provider-native logical-event receipts;
- replay-safe TikTok campaign routing;
- public-reply planning gated by account capability;
- 150-character public-reply validation.

Live public-reply execution remains locked.

### C — Business Messaging ingress/routing

Implemented:

- conversation/message reads;
- text send client for an existing eligible conversation;
- normal `im_receive_msg` normalization;
- conservative `im_receive_msg_eu` reconciliation;
- inbound-DM keyword routing;
- 6,000-character DM validation;
- Comment-to-Message read/send client kept separate.

Live campaign DM execution and Comment-to-Message campaign execution remain locked.

### D — staging UI / diagnostics

Implemented:

- `/tiktok` provider QA surface;
- OAuth configured/not-configured state;
- connected account selection;
- actual granted scopes and token expiry;
- account capability indicators;
- official owned-video loading;
- TikTok campaign list/create/edit/delete UI;
- explicit execution lock;
- sanitized durable-match/worker diagnostics that exclude message content, action text, actor/conversation identifiers, credentials, and arbitrary raw worker payload fields.

### E — hard-gated executor foundation

Implemented for two action-plan types only:

- `PUBLIC_REPLY` to the triggering controlled comment;
- `DM_REPLY` in an already existing inbound Business Messaging conversation.

The executor is not wired into queue/cron/UI execution and returns locked while:

```text
TIKTOK_LIVE_EXECUTION_ENABLED = false
```

Comment-to-Message is not an active campaign action.

### F — links, analytics, follow-ups

Not enabled for TikTok.

Do not copy Instagram follow-up windows, link UX, or rate-limit assumptions into TikTok until live provider behavior is validated.

## Current live-staging handoff

The exact provider/human setup sequence is maintained in:

```text
docs/TIKTOK_LIVE_STAGING_RUNBOOK.md
```

That runbook contains:

- exact current staging callback URLs;
- required environment-variable names without values;
- desired permissions/provider products;
- OAuth preflight;
- webhook preflight;
- inert comment and inbound-DM E2E;
- dedupe checks;
- controlled-send prerequisites;
- Comment-to-Message hold;
- non-secret evidence checklist.

## Environment placeholders

Set real values only in the staging deployment environment:

```text
TIKTOK_BUSINESS_APP_ID
TIKTOK_BUSINESS_APP_SECRET
TIKTOK_BUSINESS_REDIRECT_URI
TIKTOK_BUSINESS_SCOPES   # optional explicit override
```

Expected current staging redirect:

```text
TIKTOK_BUSINESS_REDIRECT_URI=https://replyhalo-web-staging.up.railway.app/api/tiktok/callback
```

Core secrets such as `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` must already exist but their values must never be committed or pasted into evidence.

## Merged implementation checkpoints

- PR #20 — isolated TikTok comment ingress.
- PR #21 — inbound message normalization.
- PR #22 — EU/UK/CH stripped-message reconciliation.
- PR #23 — provider-native durable event receipts.
- PR #24 — separate TikTok campaign storage and inert routing plans.
- PR #25 — guarded TikTok campaign CRUD API.
- PR #26 — safe account and owned-video read APIs.
- PR #27 — public-reply provider-limit alignment.
- PR #29 — additive TikTok staging UI.
- PR #31 — hard-gated TikTok action executor foundation.
- PR #33 — sanitized TikTok execution diagnostics.
- PR #35 — live-staging handoff runbook.

Evidence checkpoints are recorded separately in `docs/ip-evidence/`.

## Current status

- Instagram provider: **staging QA passed**.
- TikTok code-only provider foundation: **implemented through staging diagnostics and guarded executor**.
- TikTok live execution: **disabled**.
- TikTok developer-app approval/configuration: **not yet human-validated**.
- TikTok real Business Account OAuth: **not yet human-validated**.
- TikTok real webhook delivery: **not yet human-validated**.
- TikTok live public reply / DM send: **not yet performed**.
- Comment-to-Message campaign action: **disabled pending separate eligibility proof**.

## Exact next phase

The next meaningful milestone is no longer another speculative code-only feature. It is the real **TikTok for Business staging E2E** with Volodymyr Rudyi:

1. developer app + provider products/permissions;
2. staging secret configuration directly in Railway;
3. real OAuth connection;
4. actual scopes/capabilities + owned-video read;
5. signed `COMMENT` / `DIRECT_MESSAGE` webhook delivery;
6. one inert comment match and one inert DM match while execution remains locked;
7. duplicate-event validation;
8. only then a separately approved controlled send test.

Do not change `TIKTOK_LIVE_EXECUTION_ENABLED` before that sequence reaches the explicit controlled-send approval point.
