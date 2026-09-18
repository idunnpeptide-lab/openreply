# TikTok Provider Foundation Checkpoint — 2026-09-18

## Summary

ReplyHalo now has an additive TikTok provider foundation that is isolated from the production-proven Instagram provider.

The code can connect/store TikTok Business Account credentials, refresh tokens, ingest and verify TikTok webhooks, normalize comments and inbound messages, deduplicate logical provider events, reconcile stripped EU message notifications, match TikTok campaigns, and persist safe action plans.

**Live TikTok public replies and campaign DMs are still intentionally disabled until a dedicated TikTok for Business developer app and test Business Account pass staging E2E.**

## Merged checkpoints

| PR | Milestone | Result |
|---|---|---|
| #20 | Isolated comment ingress | `comment.update` → exact comment lookup → normalized event |
| #21 | Normal inbound DM ingress | `im_receive_msg` → normalized text message event |
| #22 | EU inbound DM reconciliation | `im_receive_msg_eu` → bounded official conversation/message correlation; fail closed on ambiguity |
| #23 | Provider-native event receipts | exactly-once logical boundary using TikTok comment/message IDs |
| #24 | TikTok campaign routing foundation | additive campaign/match schema + inert capability-gated action plans |
| #25 | TikTok campaign management API | workspace-scoped, role-gated CRUD with trigger/capability validation |
| #26 | TikTok account/video read APIs | non-secret account metadata + official owned-video reads |
| #27 | Provider-limit validation fix | public comment reply limit aligned to 150 characters |

## Safety properties now in place

- Instagram `Automation`, `InstagramAccount`, Meta webhook, and Instagram DM worker are not reused or migrated for TikTok.
- TikTok work runs through its own ingress queue.
- Webhook signatures are verified before durable ingestion.
- 64-bit TikTok IDs are preserved losslessly.
- Comment webhook text is not guessed; the exact comment is fetched from the official API.
- Stripped EU DM webhook data is not guessed; official message history is correlated conservatively.
- Ambiguous EU DM matches fail closed.
- Provider-native dedupe uses stable `commentId` / `messageId`, not only delivery-envelope IDs.
- Routing is independently replay-safe per automation + logical provider event.
- Comment campaigns do not silently cold-DM commenters.
- Normal DM automation starts only from an inbound user conversation.
- Account capabilities gate planned public replies and DM replies.
- Comment-to-Message remains separate and account-dependent.
- Encrypted provider tokens are never returned by the account read API.
- No scraping/browser/private-API fallback exists.

## Current code flow

### TikTok comment

```text
signed comment.update webhook
→ durable WebhookEvent
→ isolated tiktok-ingress queue
→ exact official comment lookup
→ SocialCommentEvent
→ SocialEventReceipt(commentId)
→ keyword/video/account match
→ TikTokAutomationMatch
→ inert PUBLIC_REPLY plan (only if capability permits)
```

### Normal TikTok inbound DM

```text
signed im_receive_msg webhook
→ durable WebhookEvent
→ isolated tiktok-ingress queue
→ SocialMessageEvent
→ SocialEventReceipt(messageId)
→ keyword/account match
→ TikTokAutomationMatch
→ inert DM_REPLY plan for the existing conversation
```

### EU / UK / CH stripped inbound DM

```text
signed im_receive_msg_eu webhook
→ durable WebhookEvent
→ isolated tiktok-ingress queue
→ bounded official conversation/message reads
→ exactly one correlated inbound text message OR fail closed
→ SocialMessageEvent
→ same SocialEventReceipt(messageId)
→ same DM campaign routing path
```

## Not yet enabled

The following remain deliberately behind the live-provider gate:

- executing `TikTokAutomationMatch` PUBLIC_REPLY plans;
- executing DM_REPLY plans;
- Comment-to-Message campaign controls;
- TikTok tracked-link analytics/follow-ups;
- customer-facing production rollout.

## Live staging prerequisites

A dedicated TikTok for Business developer app and test Business Account are required to prove:

1. OAuth callback and state protection;
2. actual granted scopes and derived capabilities;
3. token refresh/rotation;
4. owned-video listing;
5. comment webhook delivery;
6. exact comment lookup;
7. public comment reply execution;
8. duplicate replay behavior;
9. normal inbound DM webhook + response;
10. EU stripped-message reconciliation where applicable;
11. messaging-window/rate-limit behavior;
12. Comment-to-Message only if TikTok reports the account eligible;
13. token revocation/error handling;
14. disconnect/reconnect/history behavior;
15. no Instagram regression.

## Next code milestone

Build the additive TikTok staging UI on top of the existing safe APIs:

- account/capability status;
- owned-video picker;
- TikTok campaign list/create/edit forms;
- explicit provider-readiness messaging;
- live send execution kept disabled until the staging checklist passes.
