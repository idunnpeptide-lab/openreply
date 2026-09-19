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

PR #35 CI run `35433279605` passed and Security run `35433279575` passed before merge. No live TikTok provider send, OAuth approval, webhook delivery, or provider E2E is claimed by that documentation milestone.

## Current TikTok staging state

The dashboard includes **TikTok staging** with:

- OAuth/developer-app configuration state;
- connected TikTok Business Account selection;
- stored token-expiry and granted-scope display;
- comment, public-reply, Business Messaging, Comment-to-Message, and webhook readiness indicators;
- official owned-video loading;
- TikTok campaign list/create/edit/delete controls;
- capability-gated comment and inbound-DM campaign configuration;
- sanitized recent durable-match diagnostics and TikTok worker OperationalEvents.

The action-execution foundation also exists behind the hard source-controlled gate:

- parses stored action plans and fails closed on invalid/mismatched data;
- re-checks current account capability before any future provider action;
- serializes concurrent execution attempts for the same durable match with a database row lock;
- treats non-`MATCHED` states as terminal for sequential replay protection;
- records structured OperationalEvent success/skip/failure diagnostics without storing campaign message text or credentials;
- does not automatically retry provider sends after provider/network failure;
- does not execute Comment-to-Message.

The diagnostics layer deliberately excludes comment/DM text, action-message text, actor identifiers, conversation IDs, provider tokens/credentials, and arbitrary raw OperationalEvent payload fields.

The live-staging handoff is now documented in `docs/TIKTOK_LIVE_STAGING_RUNBOOK.md`, including:

- staging OAuth callback: `https://replyhalo-web-staging.up.railway.app/api/tiktok/callback`;
- staging webhook callback: `https://replyhalo-web-staging.up.railway.app/api/tiktok/webhook`;
- deployment environment-variable names only, never secret values;
- desired scopes and provider products;
- OAuth, token/capability, webhook, inert comment, inert DM, duplicate-event, and controlled-send validation order;
- evidence-handling rules for the human staging session.

`TIKTOK_LIVE_EXECUTION_ENABLED` remains `false`, and the executor is not wired into a queue/cron/UI action.

## Current safety boundaries

- Instagram and TikTok account/automation paths remain additive and isolated.
- TikTok webhook events are normalized before automation matching.
- TikTok logical events use stable provider IDs for ingress/routing dedupe.
- EU stripped-message reconciliation fails closed on ambiguity.
- TikTok action plans can be persisted and validated, but live public-reply/DM execution remains gated until live provider staging QA.
- Current TikTok provider clients do not expose a persisted provider idempotency key in ReplyHalo. Therefore automatic send retries are intentionally prohibited; the future live executor uses row serialization + terminal match state, while hard-crash ambiguity after provider acceptance remains a staging/rollout consideration to validate before production enablement.
- Comment-to-Message is displayed as capability state only; it is not exposed as an active campaign action.
- Diagnostics are workspace-scoped and sanitized.
- No scraping/private endpoint fallback is part of the TikTok implementation.
- Secrets must never be committed into project documentation or evidence logs.

## Exact continuation point

The safe code-only TikTok foundation and the live-staging runbook are complete. The next meaningful phase requires **human/provider participation** for a real TikTok for Business staging environment:

1. create/open the dedicated ReplyHalo TikTok for Business developer app;
2. request/verify the Organic API and Business Messaging products/permissions available to the test Business Account;
3. configure the exact staging OAuth callback and deployment environment values directly in TikTok/Railway, without posting secret values in GitHub or chat;
4. connect a real test TikTok Business Account through ReplyHalo OAuth;
5. verify actual scopes/capabilities/token refresh and owned-video reads in `/tiktok`;
6. configure the `COMMENT` and `DIRECT_MESSAGE` webhook families for the ReplyHalo staging webhook URL and confirm a real signed provider event reaches the isolated ingress pipeline;
7. create an inert campaign and confirm one real provider event produces exactly one sanitized `MATCHED` record;
8. only after those checks pass, explicitly approve a controlled live-execution staging test for one public reply and one existing-conversation DM reply;
9. keep Comment-to-Message disabled until account eligibility is proven separately.

No live-execution gate should be changed before the real provider setup and human staging validation above.

## Evidence discipline

After every significant completed development stage:

- update this file;
- append the engineering decision record to `docs/ip-evidence/R&D_LOG.md`;
- append the AI/human contribution record to `docs/ip-evidence/AI_ASSISTANCE_LOG.md`;
- append verifiable PR/commit/CI/deployment/manual-test evidence to `docs/ip-evidence/IP_EVIDENCE.md`;
- use a dedicated commit/PR/checkpoint and record real SHAs only.
