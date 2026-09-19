# ReplyHalo TikTok — Live Staging Runbook

Checkpoint prepared: 2026-09-19

Project owner / human decision maker: **Volodymyr Rudyi**
AI development assistance: **ChatGPT (OpenAI)**

## Purpose

This runbook is the handoff from the completed code-only TikTok foundation to the first real TikTok for Business staging integration.

It is intentionally written so provider setup can be completed without putting passwords, API keys, client secrets, access tokens, refresh tokens, license keys, or other credentials into GitHub, screenshots, issue comments, or chat.

The working Instagram provider must remain untouched during TikTok staging.

## Current hard safety gate

At this checkpoint:

```text
TIKTOK_LIVE_EXECUTION_ENABLED = false
```

The TikTok executor is not connected to a queue, cron, or customer-facing execution action.

Do **not** change that gate during developer-app setup, OAuth setup, webhook setup, account connection, or inert routing QA.

The first live public reply / DM test is a later, explicitly approved staging step.

## Staging URLs

Current ReplyHalo staging host:

```text
https://replyhalo-web-staging.up.railway.app
```

OAuth callback implemented by ReplyHalo:

```text
https://replyhalo-web-staging.up.railway.app/api/tiktok/callback
```

TikTok webhook receiver implemented by ReplyHalo:

```text
https://replyhalo-web-staging.up.railway.app/api/tiktok/webhook
```

If the Railway public domain changes, update the configured URLs to the new HTTPS host before starting OAuth. The OAuth callback configured in TikTok must exactly match `TIKTOK_BUSINESS_REDIRECT_URI` used by ReplyHalo.

## TikTok developer app requirements

Use a dedicated ReplyHalo TikTok for Business developer app for staging.

Provider-side access should cover the capabilities currently requested by ReplyHalo where TikTok approves them for the app/account:

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

These are desired permissions, not evidence that TikTok approved them. ReplyHalo stores the **actual granted scopes** after OAuth and derives capability flags from the real token/account state.

For the first staging E2E, the important provider products are:

1. TikTok Accounts / Organic API — account profile, owned videos, owned-video comments and comment replies.
2. Business Messaging API — inbound conversation/message access and replies in an eligible existing conversation.
3. TikTok account + Business Messaging webhooks.

Business Messaging and Comment-to-Message can depend on app review, account type, region, privacy/security review, user/conversation state, and other TikTok eligibility rules. ReplyHalo must fail closed when a capability is unavailable.

## Deployment environment variables

Configure values directly in the staging deployment environment. Do not commit the values.

Required for TikTok OAuth:

```text
TIKTOK_BUSINESS_APP_ID
TIKTOK_BUSINESS_APP_SECRET
TIKTOK_BUSINESS_REDIRECT_URI
```

Optional explicit scope override:

```text
TIKTOK_BUSINESS_SCOPES
```

Expected staging redirect value:

```text
TIKTOK_BUSINESS_REDIRECT_URI=https://replyhalo-web-staging.up.railway.app/api/tiktok/callback
```

The deployment must already have valid core ReplyHalo secrets such as:

```text
NEXTAUTH_SECRET
ENCRYPTION_KEY
```

Do not replace existing Instagram/ReplyHalo secrets merely to add TikTok.

There is **no separate ReplyHalo TikTok webhook-secret environment variable** in the current implementation. Webhook HMAC verification uses `TIKTOK_BUSINESS_APP_SECRET`.

## OAuth preflight

Before clicking **Connect TikTok Business Account** in ReplyHalo:

1. TikTok developer app exists and the required products/permissions have been requested/approved as applicable.
2. TikTok account-holder redirect/callback is exactly:
   `https://replyhalo-web-staging.up.railway.app/api/tiktok/callback`.
3. `TIKTOK_BUSINESS_APP_ID` is present in Railway staging.
4. `TIKTOK_BUSINESS_APP_SECRET` is present in Railway staging.
5. `TIKTOK_BUSINESS_REDIRECT_URI` is present and matches the provider callback exactly.
6. ReplyHalo staging has been redeployed/restarted after the environment change.
7. `/tiktok` shows **Developer app OAuth: Configured**.
8. `TIKTOK_LIVE_EXECUTION_ENABLED` still shows execution locked.

ReplyHalo OAuth state is workspace-bound and signed. The callback accepts TikTok's `auth_code` + `state`, exchanges the authorization code server-side, encrypts access/refresh tokens, binds the social-account license slot, stores the actual granted scopes, and derives account capability flags.

## OAuth validation sequence

After the human authorizes the test Business Account:

1. ReplyHalo returns to Settings with the TikTok connection result.
2. Open `/tiktok` and confirm one connected TikTok account is visible.
3. Confirm the username/display name correspond to the intended test account.
4. Confirm access-token and refresh-token expiry timestamps are present.
5. Confirm the granted scope list contains only the real scopes returned by TikTok.
6. Confirm owned videos load through the official provider API.
7. Do not infer unavailable capabilities from the desired scope list.

Current token lifecycle code supports the short-term access-token + refresh-token flow; provider token values must never be copied into screenshots or evidence logs.

## Webhook configuration

ReplyHalo's receiver is:

```text
POST https://replyhalo-web-staging.up.railway.app/api/tiktok/webhook
```

The current server verifies TikTok's `tiktok-signature` HMAC before accepting an event. It applies a timestamp tolerance, stores a durable webhook receipt, deduplicates repeated deliveries, and forwards supported events to the isolated TikTok ingress queue.

For the first staging E2E configure only the event families actually needed:

```text
COMMENT
DIRECT_MESSAGE
```

Current ingress recognizes these logical provider events:

```text
comment.update
im_receive_msg
im_receive_msg_eu
```

The EEA/Switzerland/UK stripped-message path is intentionally reconciled through the official conversation/message APIs and fails closed if the event cannot be mapped unambiguously.

The codebase uses the official TikTok webhook configuration endpoints:

```text
/business/webhook/update/
/business/webhook/list/
/business/webhook/delete/
```

### Preferred staging workflow after PR #41

After the real staging TikTok Business Account is connected, use the **TikTok webhook setup** panel in `/tiktok` instead of manually constructing provider API requests.

1. Click **Read provider config** first. This performs provider readback only.
2. Confirm the expected callback shown by ReplyHalo is:
   `https://replyhalo-web-staging.up.railway.app/api/tiktok/webhook`.
3. If either `COMMENT` or `DIRECT_MESSAGE` is not verified, click **Configure + verify**.
4. ReplyHalo sends the provider configuration request server-side using the existing TikTok app credentials; secrets are never returned to the browser.
5. ReplyHalo immediately performs provider readback for both event families.
6. Treat **PASS — provider readback matches** as evidence only that the provider configuration points to the expected callback.
7. Do **not** treat provider readback as runtime webhook readiness. `TikTokAccount.webhookConfigured` remains false until a real supported signed webhook passes signature verification and is successfully handed to the isolated TikTok ingress queue.

Safety boundaries of this control:

- it is staging-only and returns 404 outside a staging deployment;
- it requires authenticated owner/admin access;
- provider mutation requires a currently connected TikTok account in the active staging workspace;
- the browser cannot submit an arbitrary callback URL; ReplyHalo derives it from the staging base URL;
- it configures only `COMMENT` and `DIRECT_MESSAGE`;
- it does not enable live ReplyHalo execution;
- it does not send a public reply, DM, or Comment-to-Message;
- it does not mark runtime webhook readiness by itself.

Do not mark an account's webhook state as confirmed merely because provider configuration/readback passed. Runtime confirmation must still come from a real signed event reaching ReplyHalo.

## Inert comment-flow QA — live provider event, no live ReplyHalo send

Keep live execution locked.

1. Connect the dedicated TikTok Business Account.
2. Confirm comment + public-reply capabilities shown by `/tiktok` reflect the actual connected account.
3. Confirm the `COMMENT` provider webhook shows verified readback in the `/tiktok` webhook setup panel.
4. Select an owned test video.
5. Create a TikTok staging campaign using a unique QA keyword.
6. From a separate TikTok test user, post one comment containing the keyword.
7. Confirm TikTok sends `comment.update` to the ReplyHalo webhook.
8. Confirm ReplyHalo performs exact comment lookup and normalization.
9. Confirm the separate runtime webhook-readiness indicator becomes confirmed after the supported signed delivery is successfully handed to ingress.
10. Confirm one provider-native event receipt exists.
11. Confirm exactly one `TikTokAutomationMatch` appears in the sanitized `/tiktok` diagnostics panel.
12. Confirm status remains `MATCHED` and no public reply is sent while the execution gate is locked.
13. Redeliver/replay the same logical event where safely possible and verify no second logical match is created.

Passing this stage proves provider ingress/routing, **not** TikTok send execution.

## Inert inbound-DM QA — live provider event, no live ReplyHalo send

Keep live execution locked.

1. Confirm the `DIRECT_MESSAGE` provider webhook shows verified readback in the `/tiktok` webhook setup panel.
2. Create/enable an inbound-DM TikTok staging campaign with a unique QA keyword.
3. From an eligible separate TikTok test user, open a normal user-created conversation with the Business Account and send the keyword.
4. Confirm the provider delivers `im_receive_msg` or the applicable `im_receive_msg_eu` event.
5. Confirm ReplyHalo normalizes/reconciles it without guessing missing EU sender/conversation data.
6. Confirm exactly one durable `TikTokAutomationMatch` appears.
7. Confirm its planned action is `DM_REPLY` but no outgoing DM is sent while execution is locked.

Passing this stage proves provider ingress/routing for an existing conversation, **not** live send execution.

## Safe disconnect/reconnect QA

Keep live execution locked.

After at least one inert campaign/match exists:

1. Capture non-secret campaign/match counts in `/tiktok`.
2. Use the TikTok disconnect control.
3. Confirm the account disappears from connected TikTok account/provider-read surfaces while campaign/history data remains preserved in storage.
4. Reconnect the same TikTok Business Account through OAuth.
5. Confirm the same provider identity is reused and the existing campaigns/history return rather than being recreated from scratch.
6. Confirm fresh scopes/capabilities are derived from the new token set.
7. Confirm webhook readiness is reset and must be re-proven by a new supported signed delivery.
8. Use **Read provider config** to verify the app-level webhook callback still points to the expected staging URL; local account disconnect does not release the shared provider-app webhook configuration.

Passing this stage proves non-destructive account lifecycle behavior, not send execution.

## Controlled send QA — only after the inert flows pass

This section is intentionally blocked until Volodymyr Rudyi reviews the real staging results and explicitly approves the controlled send test.

Before any gate change:

- OAuth passed with the intended account;
- actual scopes/capabilities were reviewed;
- token refresh behavior is healthy;
- provider webhook configuration/readback is confirmed;
- signed comment event reaches ReplyHalo and confirms runtime readiness;
- signed DM event reaches ReplyHalo where messaging is available;
- inert routing creates one logical match per event;
- duplicate/replay behavior is understood;
- safe disconnect/reconnect preserves data;
- diagnostics contain no secrets/message content;
- no Instagram regression was introduced.

The first live execution should be deliberately tiny:

1. one public reply to one controlled test comment;
2. one text reply in one existing controlled Business Messaging conversation;
3. no automatic retry after an ambiguous provider/network failure;
4. inspect the TikTok diagnostics and provider-side result immediately after each action.

Comment-to-Message stays disabled during this first send QA.

## Comment-to-Message

ReplyHalo already has separate capability read/send client support, but Comment-to-Message is not exposed as an active campaign action.

Do not enable it because normal Business Messaging works. It requires its own account/provider eligibility validation and its own controlled test after the core comment + existing-conversation DM paths pass.

## Evidence checklist for the human staging session

Evidence may be recorded only after it actually exists.

Useful non-secret evidence includes:

- screenshot showing TikTok developer app product/permission status, with secrets hidden;
- screenshot showing ReplyHalo `/tiktok` OAuth/capability state;
- screenshot showing owned videos loaded;
- screenshot showing **Read provider config** / **Configure + verify** provider readback state;
- screenshot showing runtime webhook readiness after a real signed supported delivery;
- ReplyHalo diagnostics showing one real `MATCHED` event;
- Railway deployment status for the exact tested build;
- human report from Volodymyr Rudyi describing which test action was performed and whether the expected result occurred;
- exact PR/commit/deployment SHA corresponding to the test.

Never capture or commit:

- app secret;
- access token;
- refresh token;
- `NEXTAUTH_SECRET`;
- `ENCRYPTION_KEY`;
- license key;
- passwords;
- unredacted customer/private DM content.

## Provider references checked for this runbook

Current TikTok API for Business documentation confirms the provider remains on the `https://business-api.tiktok.com/open_api` base and `v1.3`, supports the TikTok-account OAuth token endpoint, owned-account APIs, TikTok-account webhooks, Business Messaging direct-message APIs, Business Messaging webhooks, and Comment-to-Message capability endpoints.

Official documentation entry points used during preparation/recheck:

- `https://business-api.tiktok.com/gateway/docs/index?doc_id=1735713875563521`
- `https://business-api.tiktok.com/gateway/docs/index?doc_id=1833997638479041`

Provider documentation and approval labels can change. At live setup time, use the current TikTok for Business portal wording while preserving ReplyHalo's fail-closed capability checks.

## Stop point

The remaining meaningful TikTok work now requires the real TikTok for Business developer app/test Business Account and human provider authorization. Code-only preparation includes OAuth/token handling, webhook configuration/readback, signed-delivery readiness confirmation, inert routing/dedupe diagnostics, safe disconnect/reconnect, and a hard-disabled live executor. The next step is therefore the real provider session with Volodymyr Rudyi; live execution must stay locked until that staging evidence passes.
