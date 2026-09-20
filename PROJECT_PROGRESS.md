# ReplyHalo — Project Progress

Last updated: 2026-09-20
Owner / product decision maker: **Volodymyr Rudyi**
AI development assistance: **ChatGPT (OpenAI)**

## Working model

ReplyHalo is developed by Volodymyr Rudyi with AI development assistance. Volodymyr defines product requirements and priorities, makes product/architecture decisions, performs or organizes manual QA, reviews outcomes, and approves results. ChatGPT (OpenAI) assists with repository analysis, implementation, tests, debugging, documentation, architecture options, and evidence preparation.

This file records only repository, CI, deployment, or explicit human evidence. It must not contain secrets or fabricated/backfilled validation.

## Current product state

### Instagram provider

Instagram staging core was live-tested by Volodymyr Rudyi on 2026-09-18. Verified behavior included comment keyword triggers, public replies, private replies/DMs, Follow Gate for followers/non-followers, tracked links/click recording/CTR, delayed follow-up, repeat follow-up for returning interactions, DM keyword trigger, safe soft disconnect, history preservation, same-account reconnect, post-reconnect delivery, and provider-event replay dedupe.

Important merged milestones:

- PR #6 — direct-reveal follow-up scheduling; merge `3ca7ca56ddb6de87f2e970413119eea07fad3213`.
- PR #7 — repeat follow-ups for returning users; merge `940674886d8aa47d086d8a88db040ca36a1e2294`.
- PR #8 — non-destructive Instagram disconnect; merge `b5453b0b2fefe85f3b624fb07c4b07def29ef207`.
- PR #9 — staging release marker used before disconnect QA; merge `29938e7251855de89bf1338ad5801e26173fbaad`.
- PR #45 — launch onboarding, Instagram health, four Quick Automations, connected-only account counting; merge `8883da17b8d435755263a53137aa6373d112b084`.
- PR #47 — customer-facing health and self-service reconnect UX; merge `d2fa7a671e1ce6f7b1541e4c089559bad8295741`.
- PR #49 — launch-first Automations empty/error states and analytics presentation; merge `3d5a75ba1379f8137997e778ca0369b08ead4eeb`.
- PR #51 — plan-readiness, first-time login/template copy, activation-language/error sanitization, fail-closed onboarding; merge `be4417503533e35a516cb070d180192cfbc35531`.
- PR #53 — launch auth/plan recovery fixes, customer-safe OAuth error handling, and fail-closed Settings plan verification; merge `f39c65320728ceb92abf71c9c1526a97d2666bec`.

The 2026-09-18 live QA remains valid runtime evidence. PRs #45/#47/#49/#51/#53 have automated CI/Security evidence but the combined fresh-customer first-run journey has **not yet** been manually staging-validated. No new deployment/manual success is claimed for those launch UX milestones.

### Launch UX / pre-launch readiness

Current launch path includes:

- creator/individual-friendly login copy rather than company-only wording;
- passwordless secure one-time email-link sign-in;
- automatic workspace creation wording for first-time users;
- ReplyHalo-branded `/verify-request` with spam/junk guidance and a clear **Send a new sign-in link** recovery path;
- ReplyHalo plan-readiness before Instagram connection;
- fail-closed Dashboard onboarding when plan status cannot be verified;
- fail-closed Settings behavior when plan-status loading fails, with **Check plan** retry instead of misleading `Local mode`;
- Settings blocks Instagram connection until plan readiness is known and acceptable;
- customer-facing **ReplyHalo activation code**, **Connected account slots**, and **Plan renewal** terminology;
- stable licensing error codes mapped to customer messages without returning raw provider/internal error text from the activation endpoint;
- customer-safe messages for suspended, revoked, expired, account-limit, not-found, already-assigned, migration-required, and temporary service failures;
- Instagram OAuth customer URLs no longer include missing environment-variable names or raw callback/provider exception messages;
- detailed callback errors remain server-side in diagnostics/OperationalEvent evidence;
- official ReplyHalo-owned Instagram OAuth route; customers are never asked to configure Meta developer credentials;
- workspace-scoped Instagram health for connection/token/webhook readiness without token leakage;
- customer-readable `Ready`, `Needs attention`, and `Disconnected` states with reconnect guidance;
- non-destructive repair wording that preserves automations, logs, clicks, and history;
- Quick Automations as the primary first-run creation path;
- four launch templates: Comment → DM, Comment → Follow Gate → DM, Comment → Tracked Link, Comment → Link → Follow-up;
- existing official Instagram post picker and existing automation runtime reused;
- Custom Campaign Builder retained as the advanced path;
- `{link}` integrity guard and account-switch/post-selection protection;
- recoverable Dashboard/Automations load/action errors and filter reset;
- launch metrics: Active Automations, DMs Sent, Link Clicks, CTR, Failed, Skipped; campaign funnel runs → sent → clicks → CTR;
- explicit zero-data states rather than blank analytics panels.

Validation evidence for recent launch work:

- PR #45 final head `d521fa5b48b55c59a66637b75bc68ca6bb0b609a`; CI `35521687018`; Security `35521687004`.
- PR #47 final head `9b814eb580c8bb44ca33df47d2fa2ef0185c3372`; CI `35523019203`; Security `35523019202`.
- PR #49 head `4812d60ca790bd508e05e6a826660923073f5fa3`; CI `35524959374`; Security `35524959433`.
- PR #51 final head `0bf05ea82021bb7b2912ac424df805a20d1ecfe7`; CI `35528589277`; Security `35528589275`.
- PR #53 final head `73ac74d3ef9db34c49802577ff20b3703c7ea985`; CI `35529338503`; Security `35529338567`; merge `f39c65320728ceb92abf71c9c1526a97d2666bec`.

### TikTok provider

TikTok remains an additive provider isolated from proven Instagram behavior. Foundation is merged through PR #43, including OAuth/account backend, official Organic/Business Messaging clients, webhook ingress, provider-native dedupe, routing, guarded CRUD/read APIs, staging UI, hard-gated action executor, sanitized diagnostics, live-staging runbook, signed-webhook readiness semantics, non-destructive disconnect/reconnect, staging webhook configure/readback controls, and a doubly locked one-shot execution boundary.

Key merged checkpoints:

- PR #20 `4ed413e6bb7cdc7a6857fd3aef3578b5c3bf2d5a`
- PR #21 `4d3251d102e4f6a09a2d040333529f47156ec775`
- PR #22 `03f8a899877874504972b47864c9613580968938`
- PR #23 `078efe0ba84fba30305d7b4bd90dbeb87d69d204`
- PR #24 `76ad65b6db6ac8377495915c3070ecd37f1927f0`
- PR #25 `b8da4e22aae5f87aa0f4011fa3f60324594f5c33`
- PR #26 `ef7b57712dd8603d16e34c1f6580e7dc266062cc`
- PR #27 `1c9f5e8dbf41dfd7092085042c7e26ffbefac150`
- PR #29 `48a3e38143d65f240b38658e16d606e0d8a5e629`
- PR #31 `346f1cc998dc28b99dbff9902411fcb1266ad1e5`
- PR #33 `5572c398b56e214a3bea33c318c8c99b23da1c16`
- PR #35 `a9100d35ac5c6c513e2ce1d2f0ceedc58ad2d4a4`
- PR #37 `7ee473003d132aad79b35e2612e5d5371bc2d481`
- PR #39 `ce91619f4ada085e039114e1e11ab606c6c1f831`
- PR #41 `85aec2d01047dfed5b410ec38dc5f9b0369ebe1d`
- PR #43 `615266363e943ddb406406b86f4657b9cd441a3a`

Both TikTok send gates remain source-controlled `false`:

- `TIKTOK_LIVE_EXECUTION_ENABLED=false`
- `TIKTOK_CONTROLLED_STAGING_SEND_ENABLED=false`

No real TikTok provider OAuth/webhook E2E/send is claimed. Provider work stays deferred until Instagram commercial readiness is stable and Volodymyr explicitly approves the later controlled-send stage.

## Current safety boundaries

- Instagram and TikTok remain provider-isolated.
- Plan verification fails closed before first Instagram connection.
- Settings plan verification also fails closed on network/JSON/service failure.
- Customer-facing activation/OAuth surfaces do not expose raw licensing/provider messages or deployment configuration names.
- Detailed provider callback errors stay server-side.
- Quick Automations reuse the proven runtime; there is no second automation engine.
- Analytics presentation reuses current persisted data; there is no second analytics subsystem.
- Instagram and TikTok disconnect/reconnect preserve customer history/identity according to the established soft-disconnect model.
- TikTok webhook configuration readback is not treated as runtime webhook-delivery evidence.
- TikTok controlled execution remains unreachable while either source gate is false.
- TikTok provider sends have no automatic retry because exactly-once cannot be guaranteed across the provider-acceptance/DB-commit boundary.
- Secrets never belong in repository evidence or chat.

## Exact continuation point — 2026-09-20 after PR #53

### Focused launch-readiness audit continues

PR #53 closed the first auth/plan/OAuth blocker group found during the focused audit. Continue code-only review in this order:

1. **Account slots / plan limits** — SOLO 1, CREATOR 3, AGENCY 10; verify no silent over-limit, no accidental release/destruction of preserved social-account identity, and customer-readable limit behavior.
2. **Quick Automations** — template selection, Instagram account selection, post/reel picker, keyword, public reply, DM, Follow Gate, tracked link, follow-up, activation, account switching, and `{link}` integrity.
3. **Custom builder + Automations list** — ensure advanced builder remains available without becoming a first-run blocker; verify loaded/empty/search/filter/toggle/duplicate/delete/error recovery.
4. **Dashboard + Settings regression** — no-data/real-data/load-error/retry/recent-activity/metrics, plan/activation/account health/reconnect/members, no internal jargon.
5. **Mobile/responsive + basic accessibility** — only real launch usability blockers; no broad redesign.
6. **Email deliverability/domain/resend UX** — verify sender/domain configuration and customer-friendly retry/delivery behavior before commercial release without exposing provider internals.

For each real blocker: small dedicated branch → focused tests where runtime behavior changes → CI + Security green → merge → separate evidence checkpoint. Do not expand into visual flow builder, generic AI, CRM segmentation, localization, or other deferred post-launch features.

After the code audit is complete, deploy staging and perform the **fresh-customer** walkthrough one manual step at a time with Volodymyr Rudyi:

fresh user → email login → workspace → activation → Dashboard → Connect Instagram → health → Quick Automation → controlled post/reel → activate → external keyword comment → public reply → private reply/request → optional Follow Gate → tracked click → follow-up → Dashboard/Logs/CTR.

No deployment or fresh-customer manual success is claimed at this checkpoint.

## Evidence discipline

After every meaningful development stage:

- update this file;
- update `docs/ip-evidence/R&D_LOG.md`;
- update `docs/ip-evidence/AI_ASSISTANCE_LOG.md`;
- update `docs/ip-evidence/IP_EVIDENCE.md`;
- product PR must be green before merge;
- evidence must be recorded in a separate checkpoint after the product merge so the exact product merge SHA can be recorded;
- never fabricate deployment/manual validation/screenshots and never commit secrets.
