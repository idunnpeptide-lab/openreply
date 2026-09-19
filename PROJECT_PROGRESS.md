# ReplyHalo — Project Progress

Last updated: 2026-09-19
Owner / product decision maker: **Volodymyr Rudyi**
AI development assistance: **ChatGPT (OpenAI)**

## Working model

ReplyHalo is developed by Volodymyr Rudyi with AI development assistance. Volodymyr defines requirements and priorities, chooses the direction, performs or requests live/manual validation, and accepts or rejects results. ChatGPT (OpenAI) assists with code analysis, implementation, tests, documentation, debugging, and technical options.

This file records only work supported by repository history, CI, deployment evidence, or explicit human validation. It must not contain secrets, passwords, API keys, license keys, or fabricated/backfilled evidence.

## Current product state

### Instagram provider

Core Instagram staging behavior has been validated by Volodymyr Rudyi during live manual QA on 2026-09-18, including comment-triggered DM flows, Follow Gate behavior for followers/non-followers, tracked links/click tracking, follow-ups, safe disconnect/reconnect, and post-reconnect automation delivery.

Important fixes from that QA:

- PR #6 — follow-up scheduling for direct comment reveals; merge SHA `3ca7ca56ddb6de87f2e970413119eea07fad3213`.
- PR #7 — repeat follow-ups for returning users; merge SHA `940674886d8aa47d086d8a88db040ca36a1e2294`.
- PR #8 — soft Instagram disconnect preserving campaigns/history; merge SHA `b5453b0b2fefe85f3b624fb07c4b07def29ef207`.
- PR #9 — staging release marker used before live disconnect QA; merge SHA `29938e7251855de89bf1338ad5801e26173fbaad`.

Human validation evidence includes Volodymyr confirming that, after reconnect, the public comment reply, first private message, and subsequent configured message arrived successfully.

### TikTok provider

TikTok is implemented as an additive provider isolated from the proven Instagram path. Live TikTok send execution remains intentionally gated until a real TikTok for Business developer app/test Business Account completes staging E2E.

Merged TikTok milestones:

- PR #20 — isolated comment ingress; merge SHA `4ed413e6bb7cdc7a6857fd3aef3578b5c3bf2d5a`.
- PR #21 — inbound message normalization; merge SHA `4d3251d102e4f6a09a2d040333529f47156ec775`.
- PR #22 — conservative EU/UK/CH stripped-message reconciliation; merge SHA `03f8a899877874504972b47864c9613580968938`.
- PR #23 — provider-native event receipts / dedupe; merge SHA `078efe0ba84fba30305d7b4bd90dbeb87d69d204`.
- PR #24 — additive TikTok campaign routing foundation; merge SHA `76ad65b6db6ac8377495915c3070ecd37f1927f0`.
- PR #25 — guarded TikTok campaign CRUD API; merge SHA `b8da4e22aae5f87aa0f4011fa3f60324594f5c33`.
- PR #26 — safe TikTok account + owned-video read APIs; merge SHA `ef7b57712dd8603d16e34c1f6580e7dc266062cc`.
- PR #27 — public-reply validation aligned with the provider client limit; merge SHA `1c9f5e8dbf41dfd7092085042c7e26ffbefac150`.
- PR #29 — additive TikTok staging UI with provider capability display, official owned-video loading, campaign list/create/edit/delete controls, and explicit live-execution lock; merge SHA `48a3e38143d65f240b38658e16d606e0d8a5e629`.
- PR #31 — hard-gated TikTok action executor foundation for persisted `PUBLIC_REPLY` and existing-conversation `DM_REPLY` plans; merge SHA `346f1cc998dc28b99dbff9902411fcb1266ad1e5`.
- PR #33 — sanitized workspace-scoped TikTok routing/execution diagnostics in `/tiktok`; merge SHA `5572c398b56e214a3bea33c318c8c99b23da1c16`.
- PR #35 — live-staging handoff runbook with exact non-secret staging URLs, environment-variable names, permissions, provider-event sequence, inert QA matrix, and controlled-send safety gate; merge SHA `a9100d35ac5c6c513e2ce1d2f0ceedc58ad2d4a4`.
- PR #37 — evidence-based TikTok webhook readiness confirmation after a supported signed webhook is successfully handed to the isolated TikTok ingress queue; merge SHA `7ee473003d132aad79b35e2612e5d5371bc2d481`.
- PR #39 — non-destructive TikTok soft disconnect/reconnect preservation, connected-account filtering, webhook/provider isolation after local disconnect, and staging disconnect control; merge SHA `ce91619f4ada085e039114e1e11ab606c6c1f831`.
- PR #41 — staging-only authenticated TikTok webhook setup/readback control for `COMMENT` and `DIRECT_MESSAGE`, with connected-account guard, provider readback verification, sanitized browser output, and strict separation from runtime webhook-readiness evidence; merge SHA `85aec2d01047dfed5b410ec38dc5f9b0369ebe1d`.
- PR #43 — prepared one-shot controlled TikTok staging execution boundary behind two source-controlled disabled gates, with staging/role/workspace/confirmation/readiness guards and executor-level connection + signed-webhook rechecks; merge SHA `615266363e943ddb406406b86f4657b9cd441a3a`.

PR #43 CI run `35438125753` passed and Security run `35438125762` passed before merge. No real TikTok provider send or provider validation is claimed by that code milestone.

## Current TikTok staging state

The dashboard includes **TikTok staging** with:

- OAuth/developer-app configuration state;
- connected TikTok Business Account selection;
- stored token-expiry and granted-scope display;
- comment, public-reply, Business Messaging, Comment-to-Message, and webhook readiness indicators;
- official owned-video loading;
- TikTok campaign list/create/edit/delete controls;
- capability-gated comment and inbound-DM campaign configuration;
- sanitized recent durable-match diagnostics and TikTok worker OperationalEvents;
- non-destructive TikTok disconnect control for owner/admin users;
- staging-only webhook provider controls to read the provider config or configure + verify `COMMENT` and `DIRECT_MESSAGE` against the expected ReplyHalo callback without exposing app secrets to the browser;
- a prepared controlled-send panel that remains visibly locked while either source-controlled execution gate is false.

The action-execution foundation now has a deliberately narrow staging handoff but remains unable to send:

- parses stored action plans and fails closed on invalid/mismatched data;
- re-checks active connection, real signed-webhook readiness, and current account capability inside the locked execution transaction;
- serializes concurrent execution attempts for the same durable match with a database row lock;
- treats non-`MATCHED` states as terminal for sequential replay protection;
- records structured OperationalEvent success/skip/failure diagnostics without storing campaign message text or credentials;
- does not automatically retry provider sends after provider/network failure;
- does not execute Comment-to-Message;
- accepts no reply text, provider target, actor ID, or conversation ID from the controlled-send browser request; only an existing durable match ID plus an exact confirmation phrase is accepted;
- requires both `TIKTOK_LIVE_EXECUTION_ENABLED=false` and `TIKTOK_CONTROLLED_STAGING_SEND_ENABLED=false` to be changed by a later reviewed source-code decision before the staging endpoint can call the provider executor. Both remain `false` now.

The diagnostics layer deliberately excludes comment/DM text, action-message text, actor identifiers, conversation IDs, provider tokens/credentials, and arbitrary raw OperationalEvent payload fields.

Webhook readiness is evidence-based rather than configuration-based. A connected TikTok account is marked `webhookConfigured=true` only after a supported event (`comment.update`, `im_receive_msg`, or `im_receive_msg_eu`) passes the existing signature-verification boundary and its provider-specific queue handoff succeeds. The staging webhook control may prove that TikTok's provider readback points to the expected callback, but it deliberately does **not** set runtime readiness. Invalid signatures, unsupported event names, failed queue handoffs, or locally disconnected/expired accounts do not confirm readiness.

TikTok disconnect is evidence-preserving in code. Local disconnect never deletes the `TikTokAccount` row because its campaigns and durable matches use cascade relations. Instead ReplyHalo invalidates the locally stored tokens, expires the connection, clears scopes/capability/webhook-readiness state, hides the account from connected selectors/provider reads, and ignores webhook ingress for that disconnected row. Reconnecting the same `openId` reuses the preserved row and restores fresh OAuth state while requiring webhook readiness and Comment-to-Message eligibility to be proven again. The DM Magnet social-account slot remains bound intentionally, matching the established Instagram preservation model.

The live-staging handoff is documented in `docs/TIKTOK_LIVE_STAGING_RUNBOOK.md`, including:

- staging OAuth callback: `https://replyhalo-web-staging.up.railway.app/api/tiktok/callback`;
- staging webhook callback: `https://replyhalo-web-staging.up.railway.app/api/tiktok/webhook`;
- deployment environment-variable names only, never secret values;
- desired scopes and provider products;
- provider webhook readback/configuration through the staging-only `/tiktok` control after a real account is connected;
- OAuth, token/capability, webhook, inert comment, inert DM, duplicate-event, disconnect/reconnect, and controlled-send validation order;
- evidence-handling rules for the human staging session.

Both TikTok send gates remain source-controlled `false`. No browser action, environment variable, database row, or provider callback can turn them on.

## Current safety boundaries

- Instagram and TikTok account/automation paths remain additive and isolated.
- TikTok webhook events are normalized before automation matching.
- TikTok logical events use stable provider IDs for ingress/routing dedupe.
- EU stripped-message reconciliation fails closed on ambiguity.
- TikTok webhook provider setup/readback is restricted to authenticated owner/admin access on staging and requires a currently connected TikTok staging account before mutation.
- The browser never supplies the webhook callback; ReplyHalo derives it from the staging base URL.
- Provider webhook readback is not equivalent to runtime webhook readiness; only a valid supported signed delivery whose queue handoff succeeds confirms runtime readiness.
- TikTok local disconnect preserves the account row, campaigns, durable matches, and license/social-slot identity; it does not cascade-delete history.
- Disconnected/expired TikTok accounts are excluded from connected-account reads, owned-video/provider reads, webhook account resolution, and controlled execution.
- The controlled-send endpoint is staging-only, owner/admin-only, workspace-scoped, exact-confirmation guarded, requires a current `MATCHED` row plus active connection and signed-webhook runtime readiness, and is doubly locked by source constants.
- TikTok action plans can be persisted and validated, but live public-reply/DM execution remains gated until live provider staging QA and explicit human approval.
- Current TikTok provider clients do not expose a persisted provider idempotency key in ReplyHalo. Therefore automatic send retries are intentionally prohibited; the future controlled executor uses row serialization + terminal match state, while hard-crash ambiguity after provider acceptance remains a staging/rollout consideration to validate before production enablement.
- Comment-to-Message is displayed as capability state only; it is not exposed as an active campaign action.
- Diagnostics are workspace-scoped and sanitized.
- No scraping/private endpoint fallback is part of the TikTok implementation.
- Secrets must never be committed into project documentation or evidence logs.

## Exact continuation point

All useful code-only preparation for the first TikTok provider staging session is complete. Further meaningful progress now requires **human/provider participation**:

1. create/open the dedicated ReplyHalo TikTok for Business developer app;
2. request/verify the Organic API and Business Messaging products/permissions available to the test Business Account;
3. configure the exact staging OAuth callback and deployment environment values directly in TikTok/Railway, without posting secret values in GitHub or chat;
4. connect a real test TikTok Business Account through ReplyHalo OAuth;
5. verify actual scopes/capabilities/token refresh and owned-video reads in `/tiktok`;
6. in `/tiktok`, use **Read provider config** or **Configure + verify** for the `COMMENT` and `DIRECT_MESSAGE` provider webhook families and confirm provider readback points both to the expected staging callback;
7. trigger a real supported signed provider event and confirm ReplyHalo's separate runtime webhook-readiness indicator becomes confirmed only after successful ingress handoff;
8. create an inert TikTok campaign and confirm one real provider event produces exactly one sanitized `MATCHED` record while the controlled-send panel remains locked;
9. perform the safe disconnect/reconnect staging test and verify campaigns/history remain and the same account resumes on the preserved identity;
10. only after those checks pass, Volodymyr Rudyi may explicitly approve a separate reviewed code change to enable the two source-controlled gates for the deliberately tiny controlled-send test;
11. if approved, execute one public reply to one controlled comment and one text reply in one existing controlled Business Messaging conversation, with no automatic retry after any ambiguous failure;
12. keep Comment-to-Message disabled until account eligibility is proven separately.

No send gate should be changed before the real provider setup and human staging validation above.

## Evidence discipline

After every significant completed development stage:

- update this file;
- append the engineering decision record to `docs/ip-evidence/R&D_LOG.md`;
- append the AI/human contribution record to `docs/ip-evidence/AI_ASSISTANCE_LOG.md`;
- append verifiable PR/commit/CI/deployment/manual-test evidence to `docs/ip-evidence/IP_EVIDENCE.md`;
- use a dedicated commit/PR/checkpoint and record real SHAs only.
