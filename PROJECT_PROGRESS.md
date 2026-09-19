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

PR #31 CI run `35431963722` passed and Security run `35431963663` passed before merge. No live TikTok provider send was claimed or performed.

## Current TikTok staging state

The dashboard includes **TikTok staging** with:

- OAuth/developer-app configuration state;
- connected TikTok Business Account selection;
- stored token-expiry and granted-scope display;
- comment, public-reply, Business Messaging, Comment-to-Message, and webhook readiness indicators;
- official owned-video loading;
- TikTok campaign list/create/edit/delete controls;
- capability-gated comment and inbound-DM campaign configuration;
- durable routing/match visibility without implying that a provider send occurred.

The action-execution foundation now also exists behind the hard source-controlled gate:

- parses stored action plans and fails closed on invalid/mismatched data;
- re-checks current account capability before any future provider action;
- serializes concurrent execution attempts for the same durable match with a database row lock;
- treats non-`MATCHED` states as terminal for sequential replay protection;
- records structured OperationalEvent success/skip/failure diagnostics without storing campaign message text or credentials;
- does not automatically retry provider sends after provider/network failure;
- does not execute Comment-to-Message.

`TIKTOK_LIVE_EXECUTION_ENABLED` remains `false`, and the executor is not wired into a queue/cron/UI action.

## Current safety boundaries

- Instagram and TikTok account/automation paths remain additive and isolated.
- TikTok webhook events are normalized before automation matching.
- TikTok logical events use stable provider IDs for ingress/routing dedupe.
- EU stripped-message reconciliation fails closed on ambiguity.
- TikTok action plans can be persisted and validated, but live public-reply/DM execution remains gated until live provider staging QA.
- Current TikTok provider clients do not expose a persisted provider idempotency key in ReplyHalo. Therefore automatic send retries are intentionally prohibited; the future live executor uses row serialization + terminal match state, while hard-crash ambiguity after provider acceptance remains a staging/rollout consideration to validate before production enablement.
- Comment-to-Message is displayed as capability state only; it is not exposed as an active campaign action.
- No scraping/private endpoint fallback is part of the TikTok implementation.
- Secrets must never be committed into project documentation or evidence logs.

## Exact continuation point

The next code-only milestone is **TikTok staging execution diagnostics**, still without enabling provider sends:

1. expose workspace-scoped recent TikTok automation matches/action-plan states without leaking secrets;
2. show match status (`MATCHED`, `EXECUTED`, `FAILED`, `SKIPPED`) and trigger/action type in the TikTok staging console;
3. surface related OperationalEvent diagnostics for provider-action readiness/failure investigation;
4. add tests for workspace isolation and no-secret/no-message-text diagnostic responses;
5. keep the executor unqueued and `TIKTOK_LIVE_EXECUTION_ENABLED=false`.

After staging diagnostics are prepared, meaningful progress requires human participation for the real TikTok for Business developer app/account phase: app configuration/approval, deployment secrets, real OAuth connection, webhook configuration/delivery, and live end-to-end validation. Live execution must not be enabled before that validation.

## Evidence discipline

After every significant completed development stage:

- update this file;
- append the engineering decision record to `docs/ip-evidence/R&D_LOG.md`;
- append the AI/human contribution record to `docs/ip-evidence/AI_ASSISTANCE_LOG.md`;
- append verifiable PR/commit/CI/deployment/manual-test evidence to `docs/ip-evidence/IP_EVIDENCE.md`;
- use a dedicated commit/PR/checkpoint and record real SHAs only.
