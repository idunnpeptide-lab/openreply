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
- Merge SHA: `4ed413e6bb7cdc7a6857fd3aef3578b5c3bf2d5a`.
- Evidence: exact official comment lookup, isolated ingress queue, normalized handoff, focused tests.

### PR #21 — inbound TikTok message normalization

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/21`
- Merge SHA: `4d3251d102e4f6a09a2d040333529f47156ec775`.
- Evidence: provider-neutral inbound message contract, text-only normalization, isolated ingress processing, tests.

### PR #22 — conservative EU/UK/CH message reconciliation

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/22`
- Merge SHA: `03f8a899877874504972b47864c9613580968938`.
- Evidence: official conversation/message reads, bounded correlation, ambiguity fail-closed behavior, tests.

### PR #23 — provider-native logical event receipts

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/23`
- Merge SHA: `078efe0ba84fba30305d7b4bd90dbeb87d69d204`.
- Evidence: Prisma migration + stable comment/message logical-event dedupe + regression tests.

### PR #24 — TikTok automation routing foundation

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/24`
- Merge SHA: `76ad65b6db6ac8377495915c3070ecd37f1927f0`.
- CI: completed successfully before merge.
- Security: completed successfully before merge.
- Evidence: separate TikTok campaign/match storage, inert capability-gated action plans, replay-safe routing tests.

### PR #25 — guarded TikTok campaign management API

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/25`
- Merge SHA: `b8da4e22aae5f87aa0f4011fa3f60324594f5c33`.
- CI: completed successfully before merge.
- Security: completed successfully before merge.
- Evidence: workspace-scoped and role-gated TikTok CRUD API with capability validation.

### PR #26 — safe TikTok account / owned-video read APIs

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/26`
- Merge SHA: `ef7b57712dd8603d16e34c1f6580e7dc266062cc`.
- CI: completed successfully before merge.
- Security: completed successfully before merge.
- Evidence: non-secret account metadata, official owned-video reads, workspace ownership guard, read API tests.

### PR #27 — TikTok public-reply provider-limit alignment

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/27`
- Merge SHA: `1c9f5e8dbf41dfd7092085042c7e26ffbefac150`.
- CI: completed successfully before merge.
- Security: completed successfully before merge.
- Evidence: API validation changed to reject public replies above the provider client's 150-character limit; regression coverage added for the 151-character boundary.

## Evidence-system checkpoint — 2026-09-19

### PR #28 — durable project progress and IP evidence history

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/28`
- Merge SHA: `a43ff6c1fcc0dd3efcd8e9516c4e7c0544797eea`.
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

### PR #36 — TikTok live-staging handoff evidence checkpoint

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/36`
- Head SHA: `fe6c215be558dd032390ae5ea1e57ade9cc58737`.
- Merge SHA: `4f5e370c22bb5d69b072f4fe91f643c35783ff33`.
- CI run: `35433526098` — success.
- Security run: `35433525994` — success.
- Evidence: recorded PR #35 runbook preparation, exact staging handoff URLs/configuration targets, current provider documentation verification, human/AI roles, and the no-secrets/no-live-send boundary.

### PR #38 — TikTok webhook-readiness evidence checkpoint

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/38`
- Head SHA: `ff6cd5f8a1f9d5fdb25bb3dca56f1bd7af1a0658`.
- Merge SHA: `ded6f9fdd40cbb02dc7bf4631f44fe391f6fe67b`.
- CI run: `35434772926` — success.
- Security run: `35434772933` — success.
- Evidence: recorded PR #37 signed-webhook readiness semantics, runtime safety boundaries, human/AI contribution split, and the exact provider-validation boundary without claiming a real TikTok delivery.

### PR #40 — TikTok safe-disconnect evidence checkpoint

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/40`
- Head SHA: `9d757110c221305dbaac2b9cbe706d95a7076173`.
- Merge SHA: `bbbabeefade86c0a19a2b28b5e3ebf0ab926ae22`.
- CI run: `35435557833` — success.
- Security run: `35435557845` — success.
- Evidence: recorded PR #39 non-destructive disconnect/reconnect design, exact CI/Security proof, data-preservation boundaries, and the provider/human validation stop point.

### PR #42 — TikTok webhook staging-control evidence checkpoint

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/42`
- Head SHA: `44e4eeca249d233dedb990f54416ecb3ba40a57f`.
- Merge SHA: `ba979a696f6c1424eaa67d181339b474c863ba5b`.
- CI run: `35437822934` — success.
- Security run: `35437822945` — success.
- Evidence: recorded PR #41 provider webhook configuration/readback controls, truthful separation from signed-delivery readiness, updated live-staging runbook, and exact human/provider continuation point.

### PR #44 — TikTok controlled-send evidence checkpoint

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/44`
- Head SHA: `7559146a427e2d961136313564ea0a72ee0255e7`.
- Merge SHA: `b5dcfd871782e048b1b1e3ea51981de8ba38e922`.
- CI run: `35438434392` — success.
- Security run: `35438434391` — success.
- Evidence: recorded PR #43's doubly source-locked one-shot execution boundary, no-send state, human/AI roles, and the exact real-provider continuation point.

## TikTok staging UI evidence — 2026-09-19

### PR #29 — additive TikTok staging UI with execution lock

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/29`
- Head SHA: `af92401ce4ce107e228ad32f8b989e3bd228cf2f`.
- Merge SHA: `48a3e38143d65f240b38658e16d606e0d8a5e629`.
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

## TikTok webhook-readiness evidence — 2026-09-19

### PR #37 — confirm webhook readiness from signed supported ingress

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/37`
- Head SHA: `13a0bcb50c06f46add4ec201d241e3b1aecd9b04`.
- Merge SHA: `7ee473003d132aad79b35e2612e5d5371bc2d481`.
- CI run: `35433666350` — success.
- Security run: `35433666428` — success.
- Automated evidence: Prisma validation/generation, TypeScript, lint, focused webhook-readiness regression tests, existing full test suite, and production build passed.
- Implementation evidence: readiness confirmation is restricted to supported events (`comment.update`, `im_receive_msg`, `im_receive_msg_eu`) and runs only after the existing signature-verification boundary plus successful provider-specific queue handoff.
- Idempotency evidence: the readiness update is constrained to accounts with `webhookConfigured=false`, so later supported deliveries do not churn the account's timestamp.
- Safety evidence: invalid signatures, unsupported event names, and failed queue handoffs cannot confirm readiness; `TIKTOK_LIVE_EXECUTION_ENABLED=false`; no TikTok send wiring or Comment-to-Message execution was added; Instagram code paths were unchanged.
- Human validation: **not yet performed** for real TikTok webhook delivery. PR #37 prepares the truthful runtime transition that the later human/provider staging session can validate.

## TikTok safe-disconnect evidence — 2026-09-19

### PR #39 — non-destructive TikTok disconnect/reconnect preservation

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/39`
- Head SHA: `8d077a3c4d803f615471ed02218add5086abead4`.
- Merge SHA: `ce91619f4ada085e039114e1e11ab606c6c1f831`.
- CI run: `35435285708` — success.
- Security run: `35435285684` — success.
- Automated evidence: Prisma validation/generation, TypeScript, lint, safe-disconnect/account-read regression tests, existing full test suite, and production build passed.
- Data-preservation evidence: the disconnect route updates the existing `TikTokAccount` row and never deletes it, avoiding cascade deletion of `TikTokAutomation` and `TikTokAutomationMatch` history.
- Local credential-state evidence: encrypted sentinel values replace stored access/refresh token ciphertexts, both token expiries move to epoch, scopes and capability flags are cleared, and webhook readiness resets false.
- Isolation evidence: disconnected/expired accounts are hidden from connected account resolution/API/UI, blocked from owned-video/provider reads, and excluded from webhook account resolution so stray deliveries cannot resume local routing/readiness.
- Reconnect evidence in code: OAuth upsert for the same provider `openId` restores fresh encrypted tokens, expiry, granted scopes/capabilities and `connectedAt` on the preserved row, while webhook readiness and Comment-to-Message eligibility reset and must be proven again.
- License identity evidence: local disconnect intentionally does not release the DM Magnet TikTok social-account slot/binding, matching the established preservation model used for Instagram.
- Safety evidence: `TIKTOK_LIVE_EXECUTION_ENABLED=false`; no live-send wiring or Comment-to-Message execution was added; Instagram code paths were not changed; no schema migration was required.
- Human validation: **not yet performed** for real TikTok disconnect/reconnect. No provider OAuth, webhook delivery, disconnect/reconnect, or send is claimed by PR #39.

## TikTok webhook staging-control evidence — 2026-09-19

### PR #41 — staging-only webhook configuration and provider readback

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/41`
- Head SHA: `f5bd50842f18db776476657f4bff1e5bcab4c9f0`.
- Merge SHA: `85aec2d01047dfed5b410ec38dc5f9b0369ebe1d`.
- CI run: `35437528458` — success.
- Security run: `35437528438` — success.
- Automated evidence: Prisma validation/generation, TypeScript, lint, staging webhook API regression tests, existing full test suite, and production build passed.
- Access-control evidence: the webhook configuration API requires authenticated owner/admin access and returns 404 outside a staging deployment.
- Mutation-scope evidence: provider webhook mutation requires a currently connected TikTok account in the active staging workspace.
- Callback-integrity evidence: the browser cannot provide the callback target; ReplyHalo derives the HTTPS callback from the staging base URL and configures only `COMMENT` and `DIRECT_MESSAGE`.
- Verification evidence: a successful update request is not treated as enough; ReplyHalo performs provider readback and marks each family verified only when the provider callback exactly matches the expected staging URL.
- Sanitization evidence: browser output contains only normalized event status, callback URL and provider error code; raw provider responses, app secrets and token values are not returned.
- Runtime-evidence boundary: provider configuration/readback does **not** set `TikTokAccount.webhookConfigured`; that field still requires a real supported signed event whose isolated ingress queue handoff succeeds.
- UI evidence: `/tiktok` adds **Read provider config** and **Configure + verify** actions only on staging.
- Safety evidence: `TIKTOK_LIVE_EXECUTION_ENABLED=false`; no reply/DM/Comment-to-Message execution wiring was added; Instagram paths were unchanged.
- Human validation: **not yet performed** for real provider webhook configuration/readback or delivery. No TikTok OAuth, provider webhook mutation, signed event, disconnect/reconnect, or send is claimed by PR #41.

## TikTok controlled-send preparation evidence — 2026-09-19

### PR #43 — doubly locked one-shot staging execution boundary

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/43`
- Head SHA: `4a5c564fc560b1afd87cac788fe4299601e59f1d`.
- Merge SHA: `615266363e943ddb406406b86f4657b9cd441a3a`.
- CI run: `35438125753` — success.
- Security run: `35438125762` — success.
- Automated evidence: Prisma validation/generation, TypeScript, lint, new controlled-execution route tests, strengthened action-executor tests, existing full test suite, and production build all passed.
- Double-lock evidence: both `TIKTOK_LIVE_EXECUTION_ENABLED` and `TIKTOK_CONTROLLED_STAGING_SEND_ENABLED` are source-controlled `false`. The staging endpoint returns `423 LOCKED` and does not call the executor while either remains false.
- Access-control evidence: the endpoint is staging-only, owner/admin-only, and resolves the durable match only within the active workspace.
- Confirmation evidence: requests must provide the exact `EXECUTE_TIKTOK_STAGING_MATCH` confirmation phrase; there is no generic browser-supplied send body.
- Lifecycle/readiness evidence: terminal matches, disconnected accounts, and accounts without real signed-webhook runtime readiness are rejected before execution.
- Input-integrity evidence: the browser can submit only the durable match ID + confirmation. Reply text, action type, provider comment/message IDs, actor identifiers, and conversation targets come only from the already-persisted routing record and are not request parameters.
- Executor defense-in-depth evidence: active connection and `webhookConfigured` are rechecked again inside the row-locked executor transaction before provider work, in addition to current capability checks.
- Replay/retry evidence: non-`MATCHED` status remains terminal; one match is row-serialized; provider failure remains single-attempt and no automatic retry is added.
- UI evidence: `/tiktok` shows the controlled-send boundary as locked and exposes no execute action while both source gates are false.
- Safety evidence: no TikTok provider send is reachable in PR #43; Comment-to-Message remains excluded; Instagram paths are unchanged.
- Human validation: **not yet performed** for real TikTok OAuth/webhook/routing/reconnect/send behavior. No provider send is claimed.

## Instagram launch-onboarding evidence — 2026-09-20

### PR #45 — one-click onboarding, connection health, and Quick Automations

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/45`
- Final head SHA: `d521fa5b48b55c59a66637b75bc68ca6bb0b609a`.
- Merge SHA: `8883da17b8d435755263a53137aa6373d112b084`.
- Final CI run: `35521687018` — success.
- Security run: `35521687004` — success.
- Development-history evidence: initial CI run `35521482936` failed lint on three raw internal anchors; the implementation was corrected to use Next `Link`, then rerun to green. The failed run is retained as part of the truthful engineering history.
- Onboarding evidence: Dashboard now presents Connect Instagram as the first action when no account is connected and a three-step connect → choose automation → activate path.
- OAuth-boundary evidence: onboarding reuses the existing server-side `/api/instagram/connect` OAuth route; customers are not asked for Meta App ID, App Secret, webhook configuration, or developer credentials.
- Health evidence: `/api/instagram/health` is authenticated/workspace-scoped, derives only connection/token-expiry/webhook state already stored by ReplyHalo, uses `no-store`, and does not return the stored access token. Regression tests explicitly assert token material is absent from serialized output.
- Quick-Automation evidence: `/campaigns/quick` ships four templates — Comment → DM, Comment → Follow Gate → DM, Comment → Tracked Link, Comment → Link → Follow-up — while reusing the existing Instagram post picker and the existing `/api/automations` creation/runtime path.
- Input-integrity evidence: tracked-link templates require the `{link}` token; switching Instagram account clears the previously selected post to avoid submitting content from the wrong account.
- Lifecycle evidence: Dashboard shell counts only rows with a non-empty access token as connected, so preserved soft-disconnected rows no longer inflate active connection counts.
- Scope evidence: no schema migration, no new provider permission assumption, no TikTok behavior change, and no secret values were added.
- Human validation: **not yet performed for this new first-run UI**. No new deployment, live Instagram OAuth, customer activation, or production launch is claimed by PR #45.

## Instagram health / reconnect evidence — 2026-09-20

### PR #47 — customer-facing connection health and self-service reconnect UX

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/47`
- Final head SHA: `9b814eb580c8bb44ca33df47d2fa2ef0185c3372`.
- Merge SHA: `d2fa7a671e1ce6f7b1541e4c089559bad8295741`.
- Final CI run: `35523019203` — success.
- Security run: `35523019202` — success.
- Automated evidence: final typecheck, lint, full tests and production build passed in CI.
- Development-history evidence: earlier head `b82b3376e3b17175c9659f9bde724a39cc8878fc` passed typecheck but failed lint on one unescaped apostrophe; the copy was corrected without suppressing the rule, then CI/Security were rerun to green.
- UX evidence: Settings now shows per-account Connection, Authorization and Automation readiness plus an overall `Ready`, `Needs attention`, or `Disconnected` state and a clear Connect/Reconnect action.
- Preservation evidence: customer-facing copy explicitly explains that campaigns, logs, clicks and history stay saved while connection repair occurs; the existing non-destructive disconnect implementation is unchanged.
- Sanitization evidence: customer-facing OAuth failure notices no longer expose environment-variable names or raw provider failure reasons; the underlying health API remains workspace-scoped and does not return token material.
- Branding evidence: the customer-facing notice surface uses ReplyHalo plan wording instead of the older internal DM Magnet brand.
- Scope evidence: no provider permission model, worker/runtime behavior, TikTok path, or TikTok execution gate was changed.
- Human validation: **not yet performed as a fresh-customer launch walkthrough**. No new deployment, live OAuth/reconnect test or customer activation is claimed by PR #47.

## Launch empty/error-state and analytics evidence — 2026-09-20

### PR #49 — launch-first Automations and performance presentation

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/49`
- Head SHA: `4812d60ca790bd508e05e6a826660923073f5fa3`.
- Merge SHA: `3d5a75ba1379f8137997e778ca0369b08ead4eeb`.
- CI run: `35524959374` — success.
- Security run: `35524959433` — success.
- Automated evidence: Prisma validation/generation, TypeScript, lint, full existing tests, and production build all passed before merge.
- Creation-path evidence: Automations now presents **Quick Automation** as the primary action; Import and the full **Custom builder** remain available as secondary/advanced choices.
- First-run evidence: the empty state directs a customer to the four Quick Automation templates instead of requiring the full builder first.
- Recovery evidence: Dashboard and Automations expose recoverable load/error states; automation toggle/delete/duplicate failures become visible; filter/search no-result state offers a clear reset.
- Analytics evidence: Dashboard reuses existing data and prioritizes Active Automations, DMs Sent, Link Clicks, CTR, Failed and Skipped; campaign cards present runs → sent → clicks → CTR and surface failed/skipped when relevant.
- Zero-data evidence: 7-day DM and recent-activity sections explain what will appear after the first automation runs rather than showing an unexplained blank panel.
- Scope evidence: no schema migration, new analytics persistence, background job, provider permission, Instagram worker behavior, TikTok behavior, or TikTok gate change was introduced.
- Human validation: **not yet performed as a fresh-customer launch walkthrough**. No deployment/customer activation is claimed by PR #49.

## ReplyHalo plan-readiness and activation-copy evidence — 2026-09-20

### PR #51 — plan readiness, customer copy, and fail-closed onboarding

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/51`
- Final head SHA: `0bf05ea82021bb7b2912ac424df805a20d1ecfe7`.
- Merge SHA: `be4417503533e35a516cb070d180192cfbc35531`.
- CI run: `35528589277` — success.
- Security run: `35528589275` — success.
- Automated evidence: Prisma validate/generate, TypeScript, lint, tests, and production build passed before merge.
- Customer-journey evidence: Dashboard verifies ReplyHalo plan readiness in addition to Instagram health before first connect; missing/invalid activation routes the customer to Settings; first-time login uses customer-friendly email/passwordless/workspace language; all four Quick Automation launch defaults were polished; Settings uses **ReplyHalo activation code**, **Connected account slots**, and **Plan renewal** terminology.
- Sanitization evidence: `LICENSE_SUSPENDED`, `LICENSE_REVOKED`, `LICENSE_EXPIRED`, `ACCOUNT_LIMIT_REACHED`, `LICENSE_NOT_FOUND`, `LICENSE_ALREADY_ASSIGNED`, `LICENSE_ACCOUNT_MIGRATION_REQUIRED`, and `LICENSE_SERVICE_UNAVAILABLE` are mapped to customer-facing ReplyHalo messages rather than displayed as raw internal errors.
- Fail-closed evidence: during PR review, failure of `/api/license/status` was identified as a potential fail-open onboarding state. Final head blocks **Connect Instagram** when plan readiness cannot be verified and instead shows **Plan check needed / Check plan**.
- Preservation evidence: plan-repair/temporary-verification copy tells customers that existing automations/history remain saved; the underlying workspace licensing architecture is unchanged.
- Scope evidence: no schema migration, Instagram worker/runtime rewrite, provider-permission change, or TikTok execution-gate change was introduced.
- Human validation: **not yet performed as a fresh-customer staging walkthrough**. No deployment, manual success, or screenshot artifact is claimed by PR #51.

## Launch auth / plan recovery evidence — 2026-09-20

### PR #53 — fail-closed auth/plan recovery and customer-safe OAuth errors

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/53`
- Final head SHA: `73ac74d3ef9db34c49802577ff20b3703c7ea985`.
- Merge SHA: `f39c65320728ceb92abf71c9c1526a97d2666bec`.
- CI run: `35529338503` — success.
- Security run: `35529338567` — success.
- Automated evidence: final Prisma validate/generate, TypeScript, lint, tests, and production build passed before merge.
- Authentication evidence: the actual NextAuth `/verify-request` surface is ReplyHalo-branded and explains the one-time sign-in link, spam/junk check, and **Send a new sign-in link** recovery path.
- Plan-readiness evidence: Settings treats failed plan-status loading as **Check required**, exposes **Check plan**, and keeps Instagram connection unavailable until plan readiness is known/acceptable instead of presenting a false `Local mode` state.
- Activation evidence: network/JSON failures receive customer-facing retry copy; the activation endpoint returns only stable error codes needed for safe customer mapping, not raw internal/provider `error.message`.
- OAuth sanitization evidence: connect misconfiguration no longer reflects missing environment-variable names into customer URLs; callback exceptions no longer reflect raw provider/internal failure text into `?reason=...`; detailed callback failure evidence remains server-side in logs/OperationalEvent.
- Terminology evidence: remaining **activation key** wording in the Instagram plan notice was replaced with **activation code**.
- Scope evidence: no schema migration, licensing-backend redesign, Instagram worker/runtime rewrite, provider-permission change, or TikTok gate change was introduced.
- Human validation: **not yet performed as a fresh-customer staging walkthrough**. No deployment, manual success, or screenshot artifact is claimed by PR #53.

## Account slots / plan limits evidence — 2026-09-20

### PR #55 — truthful account-limit recovery with preserved identity

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/55`
- Final head SHA: `919305d8e096467fe8a454638d825781322031e7`.
- Merge SHA: `b5563d88f079f1773220c44e921c89f1c19539a3`.
- CI run: `35534736487` — success.
- Security run: `35534736497` — success.
- Central-plan evidence: `dm-magnet-system` standard defaults were audited as `SOLO=1`, `CREATOR=3`, `AGENCY=10`.
- Enforcement evidence: central social-account binding runs in a Serializable transaction and rejects a new account with `ACCOUNT_LIMIT_REACHED` when used capacity reaches `maxAccounts`.
- Reconnect evidence: the exact existing `(platform, accountId)` binding is resolved before the capacity guard and returns `alreadyBound=true`, so same-account reconnect does not consume another slot.
- OAuth ordering evidence: the Instagram callback binds the provider account centrally before local account upsert, so a newly selected over-limit account cannot be silently created locally after the central rejection.
- Preservation evidence: local Instagram disconnect remains non-destructive and intentionally keeps the central social-account activation/slot, local account row, campaigns, DM logs, tracked clicks/CTR history, and follower history available for same-account reconnect.
- Customer-recovery evidence: PR #55 removed the misleading instruction to disconnect an unused account to free capacity; the notice now explains that same-account reconnect uses the existing slot, while a different account needs available plan capacity, upgrade, or controlled migration/support.
- Regression evidence: `ACCOUNT_LIMIT_REACHED` is explicitly covered as mapping to the safe Settings query code `account_limit`.
- Scope evidence: no central License Server code, plan capacities, schema, provider runtime, account-deletion semantics, or TikTok gate changed.
- Human validation: **not yet performed as a fresh-customer staging walkthrough**. No deployment, manual success, or screenshot artifact is claimed by PR #55.

## Quick Automations regression evidence — 2026-09-20

### PR #58 — fail-closed account recovery and account-switch integrity

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/58`
- Final head SHA: `fc5e78e508bf2be0eed49c4dc330a891ed868b85`.
- Merge SHA: `e9f4f09d44f1ce4b07b5ec54781ab68abb79673f`.
- Final CI run: `35535726659` — success.
- Security run: `35535726701` — success.
- Development-history evidence: earlier head `3aecead1e5ab41f98c0f4efd071d2ba02adf01f7` failed lint in the account-loading implementation; the flow was refactored without suppressing the rule and the final head was rerun to green.
- Account-loading evidence: failure of `/api/dashboard/stats` no longer appears as a legitimate zero-connected-account state; the wizard shows customer-safe recovery with **Try again** and a Settings connection-check path.
- Activation-readiness evidence: the selected Instagram account is rechecked against current connected Dashboard state immediately before the automation POST; an unavailable check or disconnected account fails closed instead of activating against a stale local row.
- Account-switch integrity evidence: `PostPicker` is remounted on `selectedAccountId`, while parent selection is cleared on account change, preventing stale prior-account posts from remaining selectable during the next account refresh.
- Tracked-link evidence: the existing `{link}` token requirement remains; malformed and non-HTTPS destination values are rejected in the wizard before submission while server-side validation remains authoritative.
- Template/runtime evidence: all four launch templates, Follow Gate/follow-up payload behavior, and the existing `/api/automations` runtime are preserved.
- Scope evidence: no schema migration, Instagram worker/provider change, licensing backend/control-plane change, or TikTok execution-gate change was introduced.
- Human validation: **not yet performed as a fresh-customer staging walkthrough**. No deployment, manual success, or screenshot artifact is claimed by PR #58.

## Automation connection-guard evidence — 2026-09-20

### PR #62 — fail closed on active automation state after Instagram disconnect

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/62`
- Head SHA: `bb1b039ef7a9b33a8b55d47d98ad0f207cb8ba2e`.
- Merge SHA: `fb7f9b954351728456766143f234aa415b7d972e`.
- CI run: `35537552869` — success.
- Security run: `35537552791` — success.
- Automated evidence: Prisma validation/generation, TypeScript, lint, focused regression tests, existing full test suite, and production build passed before merge.
- Server-boundary evidence: active POST creation rejects a requested preserved row with an empty access token using HTTP 409 and stable `INSTAGRAM_RECONNECT_REQUIRED`; default active account resolution also selects only a connected account.
- Reactivation evidence: PATCH checks the automation's attached workspace Instagram account whenever the resulting state is active and refuses the update if the account is soft-disconnected.
- Preservation evidence: inactive drafts/duplicates may remain attached to the preserved account row, and an active automation may still be paused after disconnect.
- Regression evidence: four tests cover active create rejection, inactive creation preservation, disconnected reactivation rejection, and successful Pause after disconnect.
- Import audit evidence: bulk import already resolves the selected account through `getWorkspaceInstagramAccount()`, which requires a non-empty access token, so no parallel import bypass was found.
- Scope evidence: no schema migration, provider worker/send behavior, licensing/control-plane change, destructive disconnect behavior, or TikTok execution-gate change was introduced.
- Human validation: **not yet performed as a fresh-customer staging walkthrough**. No deployment, manual success, or screenshot artifact is claimed by PR #62.

## Custom Builder readiness evidence — 2026-09-20

### PR #64 — account-readiness and truthful edit-account binding

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/64`
- Final head SHA: `6be3162bdf47c57ae450138868f37cbea8e20aa4`.
- Merge SHA: `8e64d0b52017495bc0048bc790dfb0bb8eb5acc7`.
- CI run: `35538310136` — success.
- Security run: `35538309969` — success.
- Automated evidence: Prisma validation/generation, TypeScript, lint, focused readiness-helper tests, existing full test suite, and production build passed before merge.
- Account-loading evidence: the Custom Builder distinguishes a failed connected-account request from a legitimate zero-account state and exposes retry plus Settings recovery.
- Active-save evidence: any save whose resulting state is active rechecks the selected connected Instagram account before mutation; the server-side PR #62 guard remains authoritative for stale/alternate callers.
- Preservation evidence: inactive edits and Stop/Pause remain available after disconnect so a customer is not trapped in an active state.
- Account-switch integrity evidence: new-campaign account changes clear post ID/URL/thumbnail/caption and remount `PostPicker`, preventing provider content from the prior account from remaining selectable.
- Edit-binding evidence: edit mode no longer offers unsupported Instagram account migration. It displays the automation's actual attached account and requires reconnect before changing provider content or returning the automation live.
- Provider-read evidence: a disconnected edit account does not trigger post-picker provider reads while repair is required.
- Customer-recovery evidence: stable `INSTAGRAM_RECONNECT_REQUIRED` is mapped to customer-readable reconnect guidance instead of shown as an internal code.
- Scope evidence: no schema migration, provider worker/send behavior, account-migration backend, licensing/control-plane change, or TikTok execution-gate change was introduced.
- Human validation: **not yet performed as a fresh-customer staging walkthrough**. No deployment, manual success, or screenshot artifact is claimed by PR #64.

## Automations / Settings recovery evidence — 2026-09-20

### PR #66 — reconnect recovery, truthful slot guidance, and disconnect failure handling

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/66`
- Final head SHA: `3320daca236678c39283784489abadb36b10e153`.
- Merge SHA: `91e90bcd847d14a41fad6686a67aa052aef9e8aa`.
- CI run: `35539584486` — success.
- Security run: `35539584447` — success.
- Automations recovery evidence: stable `INSTAGRAM_RECONNECT_REQUIRED` now becomes customer-readable reconnect guidance instead of a generic toggle failure.
- Settings plan evidence: account-limit guidance reflects preserved-slot semantics; local disconnect is no longer presented as freeing centrally preserved capacity.
- Disconnect evidence: page reload occurs only after HTTP success and `payload.success=true`; failure remains visible, says nothing changed, clears busy state, and remains retryable.
- Regression evidence: focused helper tests cover preserved-slot copy and Disconnect success/failure decisions.
- Dashboard audit evidence: current Dashboard recovery/empty states were reviewed and no new launch blocker requiring code changes was found.
- Scope evidence: no schema, disconnect backend semantics, provider worker/runtime, central licensing enforcement, or TikTok execution-gate change was introduced.
- Human validation: **not yet performed as a fresh-customer staging walkthrough**. No deployment or manual success is claimed by PR #66.

## Documentation checkpoint evidence

- `docs/TIKTOK_INTEGRATION.md` was updated during the TikTok foundation checkpoint.
- `docs/TIKTOK_FOUNDATION_CHECKPOINT_2026-09-18.md` records the provider foundation through PR #27.
- `docs/TIKTOK_LIVE_STAGING_RUNBOOK.md` records the current live-staging handoff and the staging-only provider webhook control after PR #41/#42.
- Earlier branch checkpoint commit: `8c29acfbe89c0374e9b800f10edca70a19a83b7c`.

## Human evidence handling

Human validation means an explicit result reported/performed by Volodymyr Rudyi. Screenshots referenced in development chat are not automatically copied into GitHub unless a real repository artifact/path is created. This register records the fact of the human validation without inventing a file path for screenshots that were not committed.

## Current evidence checkpoint — after PR #66

PR #66 is the latest completed product milestone recorded here. Automations reactivation now gives customer-readable reconnect recovery, Settings account-limit copy matches the preserved-slot model, and failed Instagram Disconnect actions can no longer look successful because reload requires confirmed API success. Dashboard regression was reviewed without finding a new launch blocker requiring code changes. The focused audit now continues with mobile/responsive and basic accessibility blockers only where real, followed by email deliverability/domain/resend UX and then the fresh-customer staging walkthrough. No deployment/manual success is claimed. TikTok remains separately doubly locked pending the later real-provider session.

## Mobile / basic accessibility evidence — 2026-09-20

### PR #69 — keyboard-safe mobile navigation and post-search labeling

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/69`
- Final head SHA: `3f7c1fe429bf14360f71070fd96d74a252620e0f`.
- Merge SHA: `5bcf272d87eec26b810710eeb995d4a427ca8615`.
- CI run: `35541233027` — success.
- Security run: `35541232961` — success.
- Navigation evidence: the closed mobile sidebar is hidden/non-interactive on small screens so off-canvas navigation links do not remain in the normal keyboard tab sequence.
- Keyboard/focus evidence: mobile navigation has an explicit Close control, closes on Escape, receives focus when opened, and restores focus to the Menu control when closed by Close/overlay/Escape.
- State evidence: the Menu control exposes `aria-expanded` and `aria-controls`; the sidebar has a stable control id and the navigation has an explicit label.
- Post-picker evidence: Instagram post search has a programmatic accessible name rather than relying on placeholder text alone.
- Scope evidence: no API, schema, provider, automation-runtime, licensing/control-plane, analytics, or TikTok execution-gate change was introduced.
- Human validation: **not yet performed as a fresh-customer staging or manual accessibility walkthrough**. No deployment/manual success is claimed by PR #69.

### PR #70 — primary launch-control accessibility semantics

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/70`
- Final head SHA: `22c1780a5bc3289da647088bb7207f6cd1d0fcf5`.
- Merge SHA: `bf9788f036c8180b648e088e02b2eb6aaea369ae`.
- CI run: `35541638010` — success.
- Security run: `35541638050` — success.
- Custom Builder evidence: visual selection controls expose programmatic selected state; toggle controls expose switch semantics/checked state; primary message/link/follow-up fields receive explicit accessible names; save errors expose alert semantics.
- Automations evidence: search/status controls have programmatic names/state, automation active controls expose switch state, automation names are keyboard-accessible links to their editor, and the reel preview exposes basic dialog semantics while existing pointer/card navigation is preserved.
- Settings evidence: team invitation email and role controls receive explicit accessible names.
- Scope evidence: no schema, API payload, automation runtime, Instagram provider behavior, licensing/control-plane enforcement, analytics model, or TikTok execution-gate change was introduced.
- Human validation: **not yet performed as a fresh-customer staging or manual accessibility walkthrough**. No deployment/manual success is claimed by PR #70.

## Current evidence checkpoint — after PR #70

PR #69 and PR #70 close the focused mobile/responsive/basic-accessibility code stage. The responsive shell/login/verify-request/Quick Automation layouts were reviewed and no broader redesign blocker was found; product changes stayed limited to confirmed keyboard/focus and programmatic-control semantics. Both product PRs passed CI and Security before merge. No new deployment, fresh-customer manual walkthrough, or accessibility certification is claimed. The next launch-readiness stage is email sign-in deliverability/domain/resend UX, followed by staging deployment and the one-step-at-a-time fresh-customer walkthrough with Volodymyr Rudyi. TikTok live-provider work remains out of scope and both source-controlled TikTok send gates remain false.

## Email sign-in readiness evidence — 2026-09-21

### PR #72 — fail-closed email transport configuration

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/72`
- Final head SHA: `b3f5c103c5ba3ca4f00a8a963b97f80a621b4ffe`.
- Merge SHA: `5dd78018e80207e9492bf65aafdff5c51179e859`.
- Initial CI run: `35574331028` — failed TypeScript because partial email-config test fixtures were cast to the repository's stricter `NodeJS.ProcessEnv` type.
- Final CI run: `35574464223` — success.
- Security run: `35574464026` — success.
- Configuration evidence: Auth.js no longer has the fallback `ReplyHalo <login@example.com>` or `missing-resend-api-key`; an explicit non-placeholder sender plus either Resend credentials or a valid SMTP URL is required.
- Placeholder evidence: checked-in `example.com`, `example.org`, and `example.net` sender domains are rejected so a placeholder deployment cannot appear email-ready.
- SMTP/Resend evidence: SMTP selection does not require a Resend key; otherwise Resend credentials are required. Focused tests cover both paths and malformed SMTP input.
- Health evidence: `/api/health` includes sanitized sign-in-email readiness/transport and degrades when email config is invalid without returning sender addresses, API keys, SMTP URLs, or environment-variable details.
- Customer-recovery evidence: Auth.js errors return to the branded `/login` page, which displays generic retry/support guidance instead of provider/internal error text; `/verify-request` retains spam/junk guidance and the **Send a new sign-in link** recovery path.
- Development-history evidence: the initial CI typing failure was fixed by narrowing the pure helper's environment input to the keys it consumes; no validator rule or type check was suppressed.
- Provider-boundary evidence: source code cannot prove that the configured Resend sender domain is verified or that an email reaches an external inbox; those remain real staging/provider checks.
- Scope evidence: no schema, session model, workspace-creation behavior, Instagram automation/provider runtime, licensing/control-plane, analytics, or TikTok execution-gate change was introduced.
- Human validation: **not yet performed** for real sender-domain verification or magic-link delivery. No deployment/manual success is claimed by PR #72.

## Current evidence checkpoint — after PR #72

PR #72 closes the code-level email-auth readiness stage. The code-only launch-readiness audit is now complete through authentication/plan recovery, account slots, Quick Automations, server active-state guards, Custom Builder, Automations/Settings recovery, Dashboard regression, mobile/basic accessibility, and email transport configuration. The next step is real staging validation: verify the actual sender/transport configuration and provider domain status, complete one real magic-link sign-in, then perform the one-step-at-a-time fresh-customer walkthrough through workspace creation, activation, Instagram connection, Quick Automation, real comment/DM/link/follow-up behavior, and Dashboard/Logs/CTR. No staging/deployment/manual success is claimed here. TikTok live-provider work remains out of scope and both source-controlled TikTok send gates remain false.

## Staging email provider readiness evidence — 2026-09-21

- Source-of-truth `main`: `fcc9650aa716e0d8a65e30da1ea164e18c8d09c4` after additive PR #73 evidence merge.
- Railway source evidence: `openreply-web` is connected to `idunnpeptide-lab/openreply` on branch `main`.
- PR #72 deployment evidence: product merge `5dd78018e80207e9492bf65aafdff5c51179e859` has a successful Railway web deployment.
- Current deployment evidence: `openreply-web` deployment `74b4edc5-7132-4251-917d-577f09fef101` is `SUCCESS`; the corresponding worker deployment is also `SUCCESS`.
- Build/start evidence: Next.js production build compiled, TypeScript completed, static/dynamic routes were generated, Prisma reported 22 migrations with no pending migrations, and the web service reached `Ready`.
- Configuration-presence evidence: Railway exposes the required email variable names `EMAIL_FROM` and `RESEND_API_KEY`; their values are not exposed or recorded here.
- Sending-domain evidence: Resend reports `auth.traffictiktok.com` as verified, sending enabled, region `eu-west-1`.
- DNS-authentication evidence: DKIM is verified and both SPF records are verified. DNS record values/key material are intentionally not copied into this register.
- Provider-delivery evidence: aggregate metrics for the verified domain show 2 sent, 2 delivered, 0 failed, 0 bounced, delivery rate 100%. Recipient identifiers are intentionally excluded.
- Historical-boundary evidence: the two delivered messages were sign-in emails dated before PR #72. They prove historical provider delivery, not a fresh post-change magic-link E2E.
- Fresh validation status: **not yet performed**. No new post-PR #72 sign-in link has been requested/clicked in this checkpoint.
- Scope evidence: this verification changed no app code, schema, provider runtime, licensing/control-plane behavior, analytics, or TikTok execution gates.

## Current evidence checkpoint — after external email readiness verification

The code, current Railway deployment, verified Resend sending domain, DNS authentication, and historical provider delivery are now all independently evidenced. The remaining authentication validation is deliberately narrow and human-visible: request a fresh magic link to an explicitly approved test address, confirm the new delivery event in Resend, click the link, and confirm the resulting sign-in/workspace flow. Only after that should the fresh-customer walkthrough continue through activation, Instagram connection, Quick Automation, live comment/DM/link/follow-up behavior, and Dashboard/Logs/CTR. TikTok live-provider work remains out of scope and both source-controlled TikTok send gates remain false.

## Fresh passwordless-authentication staging evidence — 2026-09-21

### PR #75 — prevent automatic preview consumption

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/75`
- Final head SHA: `793f9641700cbd29092aa3482ec4eca186e406c6`.
- CI run: `35581464612` — success.
- Security run: `35581464605` — success.
- Merge SHA: `ef8b1549dd4cbe28464c7a8dd9fc2aace2e5fa35`.
- Fresh-provider evidence: a new post-PR #72 passwordless sign-in message was delivered by Resend.
- Failure evidence before the fix: Railway request order showed an automatic Telegram link-preview client reaching `/api/auth/callback/resend` before the customer's browser, consuming the one-time Auth.js verification token; the later browser request landed on `/login?error=Verification`.
- Implementation evidence: the emailed URL is rewritten to inert `/auth/confirm`, which validates the expected provider/token/email/callback parameters but does not consume the token on GET. `Verification` copy now describes invalid/expired/already-used links instead of claiming email send failure.
- Deployment evidence: Railway web deployment `4ea2c4c4-38c9-4922-baab-b679b0f70c8d` reached `SUCCESS`; the corresponding worker deployment also reached `SUCCESS`.
- First post-fix retest: `/auth/confirm` loaded successfully and no automatic `/api/auth/callback/resend` request consumed the token before the customer.
- Second blocker discovered during that retest: pressing **Continue to ReplyHalo** produced `POST /auth/confirm -> 200` but no browser GET to the Auth.js callback, so the session was not established and the customer returned to login.

### PR #76 — direct browser GET after explicit confirmation

- PR: `https://github.com/idunnpeptide-lab/openreply/pull/76`
- Final head SHA: `10ad30cbd872104c61c0d27443bb71c5791debae`.
- CI run: `35583177511` — success.
- Security run: `35583177496` — success.
- Merge SHA: `ab2dbb81741d6398ab9ef429dd1d866f3af04498`.
- Implementation evidence: the confirmation surface uses a normal HTML GET form targeted at the validated Auth.js provider callback, carrying the required token/email/callbackUrl fields only after the customer explicitly submits **Continue to ReplyHalo**. Automatic link previews still terminate safely at `/auth/confirm`.
- Deployment evidence: Railway web deployment `a2676a8c-2e3f-40ed-9ba8-b0bc1f63f652` and worker deployment `d1ffebfe-f53b-447a-98b6-0ac2878a5448` both reached `SUCCESS`; Next.js reached `Ready`, and Prisma reported no pending migrations.
- Human validation: Volodymyr Rudyi repeated the fresh sign-in flow and reached the authenticated ReplyHalo Dashboard.
- Runtime evidence: Railway recorded `GET /auth/confirm -> 200`, then after explicit confirmation `GET /api/auth/callback/resend -> 302`, followed by `GET /dashboard -> 200`.
- Authenticated follow-up evidence: `/api/dashboard/stats`, `/api/license/status`, and `/api/instagram/health` returned HTTP 200 on the authenticated Dashboard.
- Screenshot evidence boundary: Volodymyr supplied a chat screenshot showing the fresh ReplyHalo workspace/dashboard with zero connected accounts and the **Connect Instagram → Choose a Quick Automation → Activate** onboarding. The screenshot is not claimed as a repository artifact because no GitHub file path was created for it.
- Scope boundary: this validates fresh passwordless authentication and workspace/Dashboard entry only. It does not yet prove fresh Instagram OAuth, Quick Automation activation, live comment/DM/link/follow-up delivery, or final Dashboard/Logs/CTR behavior.

## Current evidence checkpoint — after successful fresh authentication

The fresh passwordless-authentication boundary is now manually validated after two staging-discovered launch blockers were fixed in PR #75 and PR #76. One-time token semantics remain intact, automatic link previews no longer consume the token, and explicit customer confirmation now reaches the Auth.js callback and authenticated Dashboard. The next fresh-customer step is the visible **Connect Instagram** action, followed by connection-health validation, Quick Automation activation, the approved live comment/DM/link/follow-up scenario, and final Dashboard/Logs/CTR verification. TikTok live-provider work remains out of scope and both source-controlled TikTok send gates remain false.