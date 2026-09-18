# ReplyHalo TikTok Provider — Integration Plan

Checkpoint: 2026-09-18

## Goal

Add TikTok as a second ReplyHalo social provider **without rewriting or destabilizing the production-proven Instagram provider**.

The TikTok implementation uses official TikTok APIs only. Scraping, browser automation, password collection, and private/unofficial endpoints are out of scope.

## Official API path

ReplyHalo integrates with **TikTok API for Business**.

The relevant products are:

1. **Organic API / TikTok Accounts**
   - profile/account data;
   - owned video list;
   - list comments on owned videos;
   - list comment replies;
   - create/reply to comments;
   - TikTok account webhooks including `comment.update`.

2. **Business Messaging API**
   - list conversations/messages;
   - send direct messages inside eligible conversations;
   - account/conversation capability checks;
   - Business Messaging webhooks;
   - **Comment-to-Message** when the authorized Business Account is eligible.

Business Messaging capability is account/app dependent. ReplyHalo must never assume every connected TikTok account can use every messaging feature.

## API and authorization baseline

Business API base URL:

```text
https://business-api.tiktok.com/open_api
```

API version used by the provider:

```text
v1.3
```

TikTok account authorization uses the TikTok for Business authorization flow. The callback returns an `auth_code` and `state`.

Token exchange:

```text
POST https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/
```

ReplyHalo stores encrypted access/refresh tokens and refreshes short-lived access tokens instead of treating the initial token as long-lived.

## Desired permission set

The exact granted scopes are controlled by TikTok app review and the connected Business Account. The provider targets these capabilities where TikTok grants them:

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

The desired list is not treated as proof of approval. ReplyHalo stores actual granted scopes and derives runtime capability flags from them.

## Existing ReplyHalo / DM Magnet architecture reused

The central DM Magnet License Server already supports a generic social identity:

```text
platform + accountId
```

TikTok binds as:

```text
platform: TIKTOK
accountId: <authorized TikTok open_id/business_id>
```

SOLO / CREATOR / AGENCY social-account slot limits remain shared across providers.

The Instagram provider remains operational and isolated.

## Additive provider structure

```text
ReplyHalo core
|
+-- Instagram provider (existing, live)
|   +-- Meta OAuth
|   +-- Meta webhooks
|   +-- comments/public replies
|   +-- private replies/DM
|   +-- Follow Gate
|   +-- tracked links/follow-ups
|
+-- TikTok provider (new)
    +-- TikTok for Business OAuth
    +-- access/refresh token lifecycle
    +-- account capability/scopes
    +-- owned video reads
    +-- comment update webhooks
    +-- Business Messaging webhooks
    +-- EU stripped-message reconciliation
    +-- provider-native event dedupe
    +-- additive TikTok campaign storage
    +-- inert keyword/action routing plans
    +-- live public-reply/DM execution: still gated
```

## Data model strategy

Do **not** rename or replace `InstagramAccount` or the production Instagram `Automation` model during the TikTok rollout.

TikTok is additive and currently has separate storage for:

- `TikTokAccount` — workspace, open ID, profile metadata, encrypted tokens, expiry, granted scopes, capability flags, webhook state;
- `SocialEventReceipt` — provider-native exactly-once boundary for logical events;
- `TikTokAutomation` — TikTok-specific campaign configuration;
- `TikTokAutomationMatch` — durable inert match/action-plan snapshot.

This keeps TikTok development reversible and prevents a provider still under live QA from destabilizing Instagram.

## Webhook and idempotency model

TikTok delivery is treated as **at-least-once**.

ReplyHalo now uses two layers of idempotency:

```text
signed webhook delivery
        ↓
durable WebhookEvent receipt
        ↓
provider-native id (commentId / messageId)
        ↓
SocialEventReceipt unique key
        ↓
normalized event
        ↓
TikTokAutomationMatch unique per automation + logical event
```

A new webhook envelope containing the same logical TikTok comment/message cannot create a second provider-level handoff. Routing itself is independently replay-safe so a retry can repair a failed routing step without duplicating the campaign match.

## Provider capability model

A TikTok account can have different capabilities depending on app review, account type, region, and conversation eligibility.

ReplyHalo distinguishes:

- `SUPPORTED` — official API capability exists and is generally available;
- `ACCOUNT_DEPENDENT` — official API supports it, but the connected account/app must pass runtime checks;
- `UNSUPPORTED` — the product must not expose an unsupported action.

TikTok direct messaging and Comment-to-Message remain `ACCOUNT_DEPENDENT`.

Campaign configuration fails closed when the connected account lacks the required capability.

## Implementation phases

### Phase A — developer access and app configuration

1. Create/use a dedicated ReplyHalo TikTok for Business developer app.
2. Request TikTok Accounts / Organic API permissions needed for owned videos and comments.
3. Request Business Messaging API access and complete required review.
4. Configure the ReplyHalo staging OAuth callback.
5. Configure TikTok Account and Business Messaging webhooks.
6. Keep all TikTok credentials out of Git and chat.

**Code readiness:** foundation implemented. **External app approval/live configuration still required.**

### Phase B — account connection foundation

Implemented in code:

- additive TikTok account persistence;
- OAuth state protection;
- `auth_code` token exchange;
- encrypted access + refresh token storage;
- granted-scope/capability snapshot;
- DM Magnet `TIKTOK + accountId` license binding path;
- token refresh lifecycle;
- workspace-scoped, non-secret account read API.

Live approval/account QA remains outstanding.

### Phase C — organic comment automation

Implemented in code:

- owned-video client and workspace-scoped video read API;
- comment reads and exact comment lookup;
- verified `comment.update` webhook ingestion;
- lossless provider ID parsing;
- isolated TikTok ingress queue;
- normalization to provider-neutral comment events;
- existing Unicode-safe keyword matcher reuse;
- additive TikTok campaign routing by account + selected video/any video;
- provider-native dedupe and replay-safe routing;
- public-reply action planning gated by account capability;
- TikTok public reply campaign text constrained to the provider client's 150-character limit.

**Not enabled yet:** live execution of planned public replies. Live staging must prove app permissions and provider behavior first.

### Phase D — Business Messaging / Comment-to-Message

Implemented in code:

- conversation list/read clients;
- normal text send client for an existing conversation;
- inbound `im_receive_msg` parsing/normalization;
- stripped `im_receive_msg_eu` conservative reconciliation using official conversation/message reads;
- stable provider-message dedupe across normal and EU paths;
- inbound-DM keyword campaign routing;
- DM reply action planning only for an existing user-created conversation;
- 6,000-character DM text validation;
- Comment-to-Message capability read/send client kept separate from normal DM flow.

Still gated:

- live campaign action execution;
- Comment-to-Message UI/control;
- any Comment-to-Message attempt until account eligibility is verified against the live app/account.

ReplyHalo does not convert an ordinary comment into a cold DM.

### Phase E — links, analytics, follow-ups

Not yet enabled for TikTok.

Before implementation:

1. confirm which TikTok message formats safely support the needed link UX;
2. count click/CTR independently from provider delivery stats;
3. implement follow-up behavior only after live validation of current TikTok conversation windows/rate limits;
4. do not copy Instagram's 24-hour assumptions into TikTok.

### Phase F — staging E2E

Required live staging matrix:

- OAuth + state validation;
- token refresh;
- central license slot binding;
- owned video load;
- comment webhook receipt;
- exact comment body lookup;
- keyword matching;
- public reply execution;
- duplicate webhook replay/dedupe;
- normal inbound DM keyword flow;
- EU inbound DM reconciliation where applicable;
- DM send inside an eligible existing conversation;
- Comment-to-Message only if the test Business Account is eligible;
- disconnect/reconnect preserving history;
- token refresh/revocation failure handling;
- Dashboard/provider activity consistency.

Only after these pass should TikTok sending be enabled for customer workspaces.

## Environment placeholders

Deployment secrets use placeholders similar to:

```text
TIKTOK_BUSINESS_APP_ID=...
TIKTOK_BUSINESS_APP_SECRET=...
TIKTOK_BUSINESS_REDIRECT_URI=https://<replyhalo-host>/api/tiktok/callback
TIKTOK_BUSINESS_SCOPES=user.info.basic,user.info.username,video.list,comment.list,comment.list.manage,message.list.read,message.list.send,message.list.manage
```

Never add real values to `.env.example`, GitHub, screenshots, or chat.

## Current status

- Instagram provider: **LIVE / staging QA passed**.
- DM Magnet multi-platform license identity: **TIKTOK supported**.
- TikTok official API feasibility: **confirmed**.
- TikTok OAuth/token/account foundation: **implemented in code**.
- TikTok signed webhook ingestion: **implemented in code**.
- TikTok comment normalization + exact lookup: **implemented in code**.
- TikTok normal inbound DM normalization: **implemented in code**.
- TikTok EU stripped-message reconciliation: **implemented in code, fail-closed on ambiguity**.
- Provider-native comment/message dedupe: **implemented in code**.
- TikTok additive campaign storage + keyword routing: **implemented in code**.
- TikTok campaign management/read APIs: **implemented in code**.
- Live TikTok campaign sends: **disabled pending developer-app approval and staging E2E**.
- Instagram schema/worker behavior: **not migrated into TikTok code paths**.

## Merged implementation checkpoints

- PR #20 — isolated TikTok comment ingress pipeline.
- PR #21 — inbound TikTok message normalization pipeline.
- PR #22 — conservative EU stripped-message reconciliation.
- PR #23 — provider-native durable event receipts.
- PR #24 — additive TikTok campaign storage and inert routing plans.
- PR #25 — guarded TikTok campaign management API.
- PR #26 — safe TikTok account and owned-video read APIs.
- PR #27 — public-reply validation aligned with TikTok's 150-character client limit.

## Next implementation checkpoint

The remaining blocker is no longer core schema/OAuth/ingress architecture. The next major milestone is **live TikTok for Business staging integration** with an approved developer app and dedicated test Business Account.

Before live sends are enabled, ReplyHalo should add the TikTok staging UI needed to:

1. connect/inspect a TikTok Business Account;
2. show actual granted capabilities;
3. select owned videos;
4. create/edit additive TikTok campaigns;
5. keep send execution visibly disabled until the live provider checks pass.
