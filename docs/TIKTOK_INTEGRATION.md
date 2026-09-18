# ReplyHalo TikTok Provider — Integration Plan

Checkpoint: 2026-09-18

## Goal

Add TikTok as a second ReplyHalo social provider **without rewriting or destabilizing the production-proven Instagram provider**.

The TikTok implementation must use official TikTok APIs. Scraping, browser automation, password collection, and private/unofficial endpoints are out of scope.

## Official API path

ReplyHalo should integrate with **TikTok API for Business**, not rely on the consumer Display API alone.

The relevant TikTok API for Business products are:

1. **Organic API / TikTok Accounts**
   - profile/account data;
   - owned video list;
   - list comments on owned videos;
   - list comment replies;
   - create a comment;
   - reply to an existing comment;
   - TikTok account webhooks including comment update events.

2. **Business Messaging API**
   - list conversations/messages;
   - send direct messages;
   - account/conversation capability checks;
   - Business Messaging webhooks;
   - enable/disable **Comment-to-Message** when the authorized Business Account is eligible.

Business Messaging capability is account/app dependent and must be checked at runtime. ReplyHalo must not assume every connected TikTok account is eligible for every messaging feature.

## API and authorization baseline

Current TikTok API for Business base URL:

```text
https://business-api.tiktok.com/open_api
```

Current API version:

```text
v1.3
```

TikTok account authorization uses the TikTok for Business authorization flow. The callback returns an `auth_code` and `state`.

Short-term account token endpoint:

```text
POST https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/
```

The short-term access token expires in one day. The returned refresh token is used with `/tt_user/oauth2/refresh_token/` and is valid for one year according to current TikTok documentation.

ReplyHalo must therefore implement token refresh from the beginning rather than treating the first access token as long-lived.

## Desired permission set

The exact approved scopes are controlled by the TikTok developer app and review process. The provider foundation currently targets these capabilities/scopes where TikTok grants them:

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

Do not treat the desired list as proof that an app/account has been granted every permission. After OAuth, inspect the actual granted scopes and store provider capabilities for the account.

## Existing ReplyHalo/DM Magnet architecture we reuse

The central DM Magnet License Server already accepts a generic social-account identity:

```text
platform + accountId
```

TikTok will bind using:

```text
platform: TIKTOK
accountId: <authorized TikTok account ID/open ID as required by the chosen endpoint>
```

The existing SOLO / CREATOR / AGENCY social-account slot limit is shared across Instagram and TikTok.

The Instagram provider remains operational and untouched.

## Additive ReplyHalo target structure

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
    +-- short token + refresh token lifecycle
    +-- TikTok account capability/scopes
    +-- owned videos/comments
    +-- comment update webhooks
    +-- public comment replies
    +-- Business Messaging webhooks
    +-- direct messages
    +-- Comment-to-Message when eligible
```

## Data model strategy

Do **not** rename or replace `InstagramAccount` during the first TikTok phase.

Add TikTok storage alongside it. This avoids a risky migration of a provider that already passed live staging QA.

Proposed TikTok account record needs at minimum:

- workspace ID;
- TikTok account identifier / open ID;
- username/display name when available;
- encrypted access token;
- encrypted refresh token;
- access-token expiry;
- refresh-token expiry;
- granted scopes;
- capability snapshot (comments, public reply, messaging, Comment-to-Message);
- webhook configuration state;
- connection timestamps.

Automation generalization should also be additive. Existing Instagram automations continue using the current schema until TikTok is proven end-to-end.

## Webhook/idempotency requirement

TikTok webhook delivery must be treated as **at-least-once**. A duplicate provider event must not produce a duplicate public reply or DM.

The TikTok provider should follow the same principle already proven in ReplyHalo's Instagram replay QA:

```text
provider event ID / comment ID / message ID
        ↓
deterministic dedupe key
        ↓
queue once
        ↓
worker action once
```

Provider-specific webhook payloads must be normalized before they reach shared keyword/action logic.

## Provider capability model

A TikTok account can have different capabilities depending on the app review, account type, region, and conversation/account eligibility.

ReplyHalo therefore distinguishes:

- `SUPPORTED`: official API capability exists and is generally available for the integration;
- `ACCOUNT_DEPENDENT`: official API supports it, but the connected account/app must pass a capability/permission check;
- `UNSUPPORTED`: no supported path should be exposed in UI.

Current foundation marks TikTok direct messaging and Comment-to-Message as `ACCOUNT_DEPENDENT`.

## Implementation phases

### Phase A — developer access and app configuration

1. Create/use a dedicated ReplyHalo TikTok for Business developer app.
2. Request TikTok Accounts / Organic API permissions needed for owned videos and comments.
3. Request Business Messaging API access and complete any required data-security/privacy review.
4. Configure the ReplyHalo staging OAuth callback.
5. Configure TikTok account and Business Messaging webhooks.
6. Keep all TikTok credentials out of Git and chat.

### Phase B — account connection foundation

1. Add additive TikTok account persistence.
2. Add TikTok OAuth state protection.
3. Exchange `auth_code` for short-term access + refresh token.
4. Encrypt both tokens at rest.
5. Inspect granted scopes/account identity.
6. Bind `TIKTOK + accountId` to the workspace's existing ReplyHalo license.
7. Add token refresh/revocation handling.

### Phase C — organic comment automation

1. List owned videos.
2. List comments for a selected video.
3. Register TikTok account webhooks.
4. Normalize comment update events.
5. Apply the existing keyword matcher.
6. Reply publicly to matching comments.
7. Add dedupe/replay tests before live QA.

This phase can ship even if Business Messaging approval is still pending.

### Phase D — Business Messaging / Comment-to-Message

1. Inspect granted messaging scopes.
2. Check Business Account conversation/capability status.
3. Register Business Messaging webhook configuration.
4. Enable Comment-to-Message only when TikTok reports the account as eligible.
5. Send the private message through the official Business Messaging endpoint.
6. Respect TikTok messaging limits and any conversation-unlock requirements.
7. Never expose a campaign control that the connected account cannot use.

### Phase E — links, analytics, follow-ups

1. Reuse ReplyHalo tracked links where TikTok message format permits URLs/buttons.
2. Count click/CTR independently from platform delivery stats.
3. Add follow-up only after confirming current TikTok messaging-window/rate-limit rules for the relevant conversation type.
4. Do not copy Instagram's 24-hour assumptions into TikTok.

### Phase F — staging E2E

Required live staging matrix:

- OAuth + token refresh;
- central license slot binding;
- owned video load;
- comment webhook receipt;
- keyword matching;
- public reply;
- duplicate webhook replay/dedupe;
- DM / Comment-to-Message when the test Business Account is eligible;
- tracked link/click;
- disconnect/reconnect preserving history;
- token refresh/revocation failure handling;
- Dashboard/DM Logs/provider activity consistency.

Only after these pass should TikTok be enabled for customer workspaces.

## Environment placeholders

ReplyHalo will use deployment secrets similar to:

```text
TIKTOK_BUSINESS_APP_ID=...
TIKTOK_BUSINESS_APP_SECRET=...
TIKTOK_BUSINESS_REDIRECT_URI=https://<replyhalo-host>/api/tiktok/callback
TIKTOK_BUSINESS_SCOPES=user.info.basic,user.info.username,video.list,comment.list,comment.list.manage,message.list.read,message.list.send,message.list.manage
```

Do not add real values to `.env.example`, GitHub, screenshots, or chat.

## Current status

- Instagram provider: **LIVE / staging QA passed**.
- DM Magnet multi-platform license identity: **already supports TIKTOK**.
- TikTok official API feasibility: **confirmed**.
- ReplyHalo TikTok provider: **FOUNDATION**.
- TikTok OAuth/runtime/webhooks/database integration: **not enabled yet**.

## Next implementation checkpoint

After this foundation is merged, the next code change is an additive TikTok account schema + encrypted token lifecycle and OAuth routes. That work should begin only alongside a dedicated TikTok for Business developer app so callback/scopes can be tested against the real approval state.
