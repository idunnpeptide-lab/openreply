# IP / Technical Evidence Register

Project owner: **Volodymyr Rudyi**
AI development assistance: **ChatGPT (OpenAI)**

This register points to verifiable repository/deployment/manual-test evidence. It must not fabricate or backdate evidence and must not contain secrets.

## Instagram staging evidence — 2026-09-18

### PR #6 — direct-comment follow-up scheduling

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/6`
- Merge SHA: `3ca7ca56ddb6de87f2e970413119eea07fad3213`
- Evidence type: code + regression tests + live staging issue reproduced by Volodymyr Rudyi.
- Result: follow-up scheduling added to direct reveal delivery path.

### PR #7 — repeat follow-ups for returning users

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/7`
- Merge SHA: `940674886d8aa47d086d8a88db040ca36a1e2294`
- Evidence type: queue logic + regression tests + human re-test.
- Human validation: Volodymyr Rudyi confirmed both test accounts received the follow-up after the fix.

### PR #8 — safe Instagram disconnect

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/8`
- Merge SHA: `b5453b0b2fefe85f3b624fb07c4b07def29ef207`
- Evidence type: code review, regression tests, preserved campaign/history data.
- Result: destructive account deletion replaced by soft disconnect.

### PR #9 — staging release marker

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/9`
- Merge SHA: `29938e7251855de89bf1338ad5801e26173fbaad`
- Staging evidence: Railway deployment shown by Volodymyr Rudyi as ACTIVE/successful for the release-marker build.
- Runtime evidence: `/api/release` returned `{"service":"replyhalo","release":"safe-instagram-disconnect-v1"}` before the live disconnect test.
- Human validation after disconnect/reconnect: campaign/statistical history remained; the same Instagram account reconnected; public comment reply, first DM, and subsequent configured message arrived.

## TikTok provider foundation evidence — 2026-09-18

### PR #20 — isolated TikTok comment ingress

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/20`
- Merge SHA: `4ed413e6bb7cdc7a6857fd3aef3578b5c3bf2d5a`
- Evidence: exact official comment lookup, isolated ingress queue, normalized handoff, focused tests.

### PR #21 — inbound TikTok message normalization

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/21`
- Merge SHA: `4d3251d102e4f6a09a2d040333529f47156ec775`
- Evidence: provider-neutral inbound message contract, text-only normalization, isolated ingress processing, tests.

### PR #22 — conservative EU/UK/CH message reconciliation

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/22`
- Merge SHA: `03f8a899877874504972b47864c9613580968938`
- Evidence: official conversation/message reads, bounded correlation, ambiguity fail-closed behavior, tests.

### PR #23 — provider-native logical event receipts

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/23`
- Merge SHA: `078efe0ba84fba30305d7b4bd90dbeb87d69d204`
- Evidence: Prisma migration + stable comment/message logical-event dedupe + regression tests.

### PR #24 — TikTok automation routing foundation

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/24`
- Merge SHA: `76ad65b6db6ac8377495915c3070ecd37f1927f0`
- CI: completed successfully before merge.
- Security: completed successfully before merge.
- Evidence: separate TikTok campaign/match storage, inert capability-gated action plans, replay-safe routing tests.

### PR #25 — guarded TikTok campaign management API

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/25`
- Merge SHA: `b8da4e22aae5f87aa0f4011fa3f60324594f5c33`
- CI: completed successfully before merge.
- Security: completed successfully before merge.
- Evidence: workspace-scoped and role-gated TikTok CRUD API with capability validation.

### PR #26 — safe TikTok account / owned-video read APIs

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/26`
- Merge SHA: `ef7b57712dd8603d16e34c1f6580e7dc266062cc`
- CI: completed successfully before merge.
- Security: completed successfully before merge.
- Evidence: non-secret account metadata, official owned-video reads, workspace ownership guard, read API tests.

### PR #27 — TikTok public-reply provider-limit alignment

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/27`
- Merge SHA: `1c9f5e8dbf41dfd7092085042c7e26ffbefac150`
- CI: completed successfully before merge.
- Security: completed successfully before merge.
- Evidence: API validation changed to reject public replies above the provider client's 150-character limit; regression coverage added for the 151-character boundary.

## Evidence-system checkpoint — 2026-09-19

### PR #28 — durable project progress and IP evidence history

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/28`
- Merge SHA: `a43ff6c1fcc0dd3efcd8e9516c4e7c0544797eea`
- CI run: `35404592051` — success.
- Security run: `35404592036` — success.
- Evidence: established `PROJECT_PROGRESS.md`, `R&D_LOG.md`, `AI_ASSISTANCE_LOG.md`, `IP_EVIDENCE.md`, and repository-agent guidance for automatic milestone evidence capture.
- Authorship model recorded truthfully: Volodymyr Rudyi is project owner / requirement setter / decision maker / tester / approver; ChatGPT (OpenAI) is AI development assistance.

### PR #30 — TikTok staging UI evidence checkpoint

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/30`
- Head SHA: `ac4caded71beb1652ab3457ceaea6a59a336a9aa`.
- Merge SHA: `e7cb96379dfb5f5fef90731364e2ccca64658782`.
- CI run: `35431698775` — success.
- Security run: `35431698783` — success.
- Evidence: recorded PR #29 progress, R&D decision history, AI-assistance role split, and exact repository/CI evidence without claiming live TikTok validation.

### PR #32 — TikTok executor evidence checkpoint

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/32`
- Head SHA: `772d9b96dfaf4df1e72fbd449e8789266b0755d8`.
- Merge SHA: `8e2cbca07b68c14a2349c85ff3a7907c2f1e157a`.
- Evidence: recorded the completed PR #31 executor milestone, exact CI/Security evidence, safety gate, and the provider idempotency limitation without claiming live provider validation.

### PR #34 — TikTok diagnostics evidence checkpoint

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/34`
- Head SHA: `bc4348df0d5b4118750a61a53512586b1ae9b649`.
- Merge SHA: `59d9cdc2c709afd0d2383da16ad2289d57740d4e`.
- CI run: `35433044451` — success.
- Security run: `35433044465` — success.
- Evidence: recorded PR #33 implementation/test history, sanitization/privacy boundaries, human/AI roles, and the exact human/provider continuation point without inventing provider validation.

## TikTok staging UI evidence — 2026-09-19

### PR #29 — additive TikTok staging UI with execution lock

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/29`
- Head SHA: `af92401ce4ce107e228ad32f8b989e3bd228cf2f`
- Merge SHA: `48a3e38143d65f240b38658e16d606e0d8a5e629`
- CI run: `35431525663` — success.
- Security run: `35431525669` — success.
- Automated evidence: Prisma validation/generation, TypeScript, lint, unit/regression tests, and production build all passed in CI.
- Implementation evidence: `/tiktok` dashboard page, provider readiness/status endpoint, capability/scopes/token-expiry display, official owned-video loading, isolated TikTok campaign CRUD UI, and readiness regression tests.
- Safety evidence: `TIKTOK_LIVE_EXECUTION_ENABLED=false`; Comment-to-Message is displayed as capability state only and is not an executable campaign action.
- Development-history evidence: an earlier PR #29 CI attempt failed the React `set-state-in-effect` lint rule; the UI data flow was refactored to server-load initial state and use explicit user-action refreshes rather than suppressing the lint rule. The final head above is the green revision.
- Human validation: **not yet performed for TikTok live provider behavior**. No live TikTok send, deployment, OAuth approval, webhook delivery, or provider E2E is claimed by this evidence entry.

## TikTok action-executor evidence — 2026-09-19

### PR #31 — hard-gated TikTok action executor foundation

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/31`
- Head SHA: `a40f274ba8cc2aa0ce73638eac2326c6dda89a92`.
- Merge SHA: `346f1cc998dc28b99dbff9902411fcb1266ad1e5`.
- CI run: `35431963722` — success.
- Security run: `35431963663` — success.
- Automated evidence: Prisma validation/generation, TypeScript, lint, executor regression tests, existing full test suite, and production build passed.
- Implementation evidence: hard-gated action executor for persisted `PUBLIC_REPLY` and existing-conversation `DM_REPLY` plans; plan/event validation; capability re-check; same-match row serialization; terminal-status replay suppression; structured OperationalEvent diagnostics.
- Safety evidence: production/staging wrapper still uses `TIKTOK_LIVE_EXECUTION_ENABLED=false`; executor is not wired into queue/cron/UI execution; Comment-to-Message is not executed; provider-send auto-retry was deliberately not added.
- Idempotency limitation recorded truthfully: ReplyHalo's current TikTok send clients do not expose a persisted provider idempotency key. A hard process crash after provider acceptance but before DB commit can remain ambiguous. No exactly-once claim is made across that failure boundary.
- Human validation: **not yet performed for TikTok live provider behavior**. No real provider send is claimed by PR #31.

## TikTok execution-diagnostics evidence — 2026-09-19

### PR #33 — sanitized TikTok execution diagnostics

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/33`
- Final head SHA: `bcf67ee27cee10b153dee6f8e82467e85e183e38`.
- Merge SHA: `5572c398b56e214a3bea33c318c8c99b23da1c16`.
- Final CI run: `35432848811` — success.
- Final Security run: `35432848785` — success.
- Automated evidence: Prisma validation/generation, TypeScript, lint, diagnostics regression tests, existing full test suite, and production build passed.
- Implementation evidence: workspace-scoped sanitized query, authenticated `/api/tiktok/diagnostics` endpoint, `/tiktok` routing/execution diagnostics panel, bounded result size, `no-store` response.
- Privacy/security evidence: diagnostic output excludes comment/DM text, action-message text, actor IDs/usernames, conversation IDs, provider tokens/credentials, and arbitrary raw OperationalEvent payload fields; tests include explicit sentinel values proving they do not appear in serialized output.
- Development-history evidence: earlier PR #33 CI attempts surfaced two TypeScript inference issues (`trigger`, then `actionTypes`); both were fixed with explicit narrow union types and the final head above is the green revision.
- Safety evidence: `TIKTOK_LIVE_EXECUTION_ENABLED=false`; no executor queue/cron/UI execution wiring was added; no Comment-to-Message execution was added.
- Human validation: **not yet performed for TikTok live provider behavior**. No TikTok deployment, OAuth approval, webhook delivery, or real provider send is claimed by PR #33.

## TikTok live-staging handoff evidence — 2026-09-19

### PR #35 — TikTok live-staging runbook

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/35`
- Head SHA: `946e17780629601b0af20847745df486cf3a8a58`.
- Merge SHA: `a9100d35ac5c6c513e2ce1d2f0ceedc58ad2d4a4`.
- CI run: `35433279605` — success.
- Security run: `35433279575` — success.
- Repository evidence: `docs/TIKTOK_LIVE_STAGING_RUNBOOK.md` records the exact implemented staging OAuth callback and webhook callback, required environment-variable names, desired provider scopes/products, inert comment/DM provider-E2E sequence, controlled-send gate, Comment-to-Message hold, and non-secret human-evidence checklist.
- Code cross-check evidence: `/api/tiktok/callback`, `/api/tiktok/webhook`, `lib/env.ts`, and `lib/tiktok/webhook.ts` were inspected while preparing the runbook.
- Provider research evidence: current official TikTok API for Business documentation was checked for the v1.3 TikTok-account OAuth/token endpoint, account webhooks, Business Messaging direct messages/webhooks, and Comment-to-Message APIs.
- Safety evidence: `TIKTOK_LIVE_EXECUTION_ENABLED` remains false; no secret values are stored; the runbook explicitly forbids enabling live sends during OAuth/webhook/inert-routing setup.
- Human validation: **not yet performed** for TikTok developer-app approval, OAuth connection, webhook delivery, or live send. PR #35 is preparation for that future human/provider session, not evidence that it occurred.

## Documentation checkpoint evidence

- `docs/TIKTOK_INTEGRATION.md` was updated during the TikTok foundation checkpoint.
- `docs/TIKTOK_FOUNDATION_CHECKPOINT_2026-09-18.md` records the provider foundation through PR #27.
- `docs/TIKTOK_LIVE_STAGING_RUNBOOK.md` records the current live-staging handoff after PR #35.
- Earlier branch checkpoint commit: `8c29acfbe89c0374e9b800f10edca70a19a83b7c`.

## Human evidence handling

Human validation means an explicit result reported/performed by Volodymyr Rudyi. Screenshots referenced in development chat are not automatically copied into GitHub unless a real repository artifact/path is created. This register records the fact of the human validation without inventing a file path for screenshots that were not committed.

## Current evidence checkpoint

PR #35 is the latest completed preparation milestone recorded here. The next meaningful TikTok phase requires real TikTok for Business developer-app/account configuration and human provider validation. Live TikTok OAuth/deployment/webhook/provider-send validation has not yet occurred and is not claimed.
