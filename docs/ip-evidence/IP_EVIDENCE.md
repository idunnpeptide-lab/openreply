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

## Documentation checkpoint evidence

- `docs/TIKTOK_INTEGRATION.md` updated on branch `docs/tiktok-foundation-checkpoint`.
- `docs/TIKTOK_FOUNDATION_CHECKPOINT_2026-09-18.md` created on the same branch.
- Branch checkpoint before the evidence-log bootstrap: commit `8c29acfbe89c0374e9b800f10edca70a19a83b7c`.

## Human evidence handling

Human validation means an explicit result reported/performed by Volodymyr Rudyi. Screenshots referenced in development chat are not automatically copied into GitHub unless a real repository artifact/path is created. This register records the fact of the human validation without inventing a file path for screenshots that were not committed.

## Current evidence checkpoint

The evidence-history bootstrap is being prepared on branch `docs/tiktok-foundation-checkpoint`. Its final PR number, CI result, merge SHA, and resulting main SHA must be appended after the checkpoint is actually merged; they are intentionally not guessed here.
