# IP / Technical Evidence Register

Project owner: **Volodymyr Rudyi**
AI development assistance: **ChatGPT (OpenAI)**

This register points to verifiable repository, CI, deployment, and explicit human-test evidence. It must not fabricate/backdate evidence and must not contain secrets. Detailed prior versions remain available in Git history; this file keeps the cumulative milestone register required for continuation.

## Instagram staging evidence — 2026-09-18

### PR #6 — direct-comment follow-up scheduling
- Merge SHA: `3ca7ca56ddb6de87f2e970413119eea07fad3213`.
- Evidence: code + regression tests + live staging issue reproduced by Volodymyr Rudyi.

### PR #7 — repeat follow-ups for returning users
- Merge SHA: `940674886d8aa47d086d8a88db040ca36a1e2294`.
- Evidence: queue lifecycle/dedupe fix + automated tests + human re-test.
- Human validation: Volodymyr confirmed both test accounts received the follow-up after the fix.

### PR #8 — safe Instagram disconnect
- Merge SHA: `b5453b0b2fefe85f3b624fb07c4b07def29ef207`.
- Evidence: destructive delete replaced by soft disconnect; campaign/log/click/history preservation regression coverage.

### PR #9 — staging release marker and live reconnect QA
- Merge SHA: `29938e7251855de89bf1338ad5801e26173fbaad`.
- Human validation after safe disconnect/reconnect: campaign/statistical history remained, same Instagram account reconnected, webhook-ready state returned, public reply arrived, first private reply arrived, subsequent configured message arrived.

## TikTok provider foundation / safety evidence — 2026-09-18 to 2026-09-19

The following milestones are repository/CI evidence only unless explicitly stated otherwise. No real TikTok provider OAuth/webhook/send is claimed.

- PR #20 — isolated TikTok comment ingress; merge `4ed413e6bb7cdc7a6857fd3aef3578b5c3bf2d5a`.
- PR #21 — inbound TikTok message normalization; merge `4d3251d102e4f6a09a2d040333529f47156ec775`.
- PR #22 — conservative EU/UK/CH message reconciliation; merge `03f8a899877874504972b47864c9613580968938`.
- PR #23 — provider-native event receipts/dedupe; merge `078efe0ba84fba30305d7b4bd90dbeb87d69d204`.
- PR #24 — TikTok automation routing foundation; merge `76ad65b6db6ac8377495915c3070ecd37f1927f0`.
- PR #25 — guarded TikTok campaign API; merge `b8da4e22aae5f87aa0f4011fa3f60324594f5c33`.
- PR #26 — safe TikTok account/owned-video read APIs; merge `ef7b57712dd8603d16e34c1f6580e7dc266062cc`.
- PR #27 — public-reply limit alignment; merge `1c9f5e8dbf41dfd7092085042c7e26ffbefac150`.
- PR #29 — additive TikTok staging UI; final head `af92401ce4ce107e228ad32f8b989e3bd228cf2f`; merge `48a3e38143d65f240b38658e16d606e0d8a5e629`; CI `35431525663`; Security `35431525669`.
- PR #31 — hard-gated action executor; head `a40f274ba8cc2aa0ce73638eac2326c6dda89a92`; merge `346f1cc998dc28b99dbff9902411fcb1266ad1e5`; CI `35431963722`; Security `35431963663`.
- PR #33 — sanitized execution diagnostics; final head `bcf67ee27cee10b153dee6f8e82467e85e183e38`; merge `5572c398b56e214a3bea33c318c8c99b23da1c16`; CI `35432848811`; Security `35432848785`.
- PR #35 — live-staging runbook; head `946e17780629601b0af20847745df486cf3a8a58`; merge `a9100d35ac5c6c513e2ce1d2f0ceedc58ad2d4a4`; CI `35433279605`; Security `35433279575`.
- PR #37 — signed-webhook readiness confirmation; head `13a0bcb50c06f46add4ec201d241e3b1aecd9b04`; merge `7ee473003d132aad79b35e2612e5d5371bc2d481`; CI `35433666350`; Security `35433666428`.
- PR #39 — non-destructive TikTok disconnect/reconnect; head `8d077a3c4d803f615471ed02218add5086abead4`; merge `ce91619f4ada085e039114e1e11ab606c6c1f831`; CI `35435285708`; Security `35435285684`.
- PR #41 — staging-only webhook configuration/readback; head `f5bd50842f18db776476657f4bff1e5bcab4c9f0`; merge `85aec2d01047dfed5b410ec38dc5f9b0369ebe1d`; CI `35437528458`; Security `35437528438`.
- PR #43 — doubly locked controlled-send preparation; head `4a5c564fc560b1afd87cac788fe4299601e59f1d`; merge `615266363e943ddb406406b86f4657b9cd441a3a`; CI `35438125753`; Security `35438125762`.

Safety evidence:

- `TIKTOK_LIVE_EXECUTION_ENABLED=false`.
- `TIKTOK_CONTROLLED_STAGING_SEND_ENABLED=false`.
- Provider webhook readback does not set runtime webhook readiness.
- A supported signed event + successful provider-specific queue handoff is required for runtime readiness.
- Local TikTok disconnect preserves account row, campaigns, durable matches, and social-slot identity.
- Current provider-send clients do not expose a persisted provider idempotency key, so no exactly-once claim is made across provider-acceptance/DB-commit crashes and automatic send retry remains prohibited.

## Evidence-system checkpoints

- PR #28 — evidence system established; merge `a43ff6c1fcc0dd3efcd8e9516c4e7c0544797eea`; CI `35404592051`; Security `35404592036`.
- PR #30 — TikTok staging UI evidence; merge `e7cb96379dfb5f5fef90731364e2ccca64658782`.
- PR #32 — executor evidence; merge `8e2cbca07b68c14a2349c85ff3a7907c2f1e157a`.
- PR #34 — diagnostics evidence; merge `59d9cdc2c709afd0d2383da16ad2289d57740d4e`.
- PR #36 — live-staging runbook evidence; merge `4f5e370c22bb5d69b072f4fe91f643c35783ff33`.
- PR #38 — webhook-readiness evidence; merge `ded6f9fdd40cbb02dc7bf4631f44fe391f6fe67b`.
- PR #40 — safe-disconnect evidence; merge `bbbabeefade86c0a19a2b28b5e3ebf0ab926ae22`.
- PR #42 — webhook staging-control evidence; merge `ba979a696f6c1424eaa67d181339b474c863ba5b`.
- PR #44 — controlled-send evidence; merge `b5dcfd871782e048b1b1e3ea51981de8ba38e922`.

## Instagram launch-readiness evidence — 2026-09-20

### PR #45 — one-click onboarding, connection health, and Quick Automations
- Final head `d521fa5b48b55c59a66637b75bc68ca6bb0b609a`.
- Merge `8883da17b8d435755263a53137aa6373d112b084`.
- CI `35521687018` — success.
- Security `35521687004` — success.
- Initial CI `35521482936` failed lint on raw internal anchors; corrected to Next `Link` and rerun to green.
- Evidence: Dashboard connect-first onboarding, workspace-scoped health without token leakage, four Quick Automations using existing post picker/runtime, `{link}` guard, account-switch selection safety, connected-only shell counting.
- Human validation: not yet performed for this new first-run UX.

### PR #47 — customer-facing connection health and reconnect
- Final head `9b814eb580c8bb44ca33df47d2fa2ef0185c3372`.
- Merge `d2fa7a671e1ce6f7b1541e4c089559bad8295741`.
- CI `35523019203` — success.
- Security `35523019202` — success.
- Evidence: Connection/Authorization/Automation readiness, customer-readable states, one reconnect action, preserved-history wording, sanitized OAuth/customer copy.
- Human validation: no fresh-customer walkthrough claimed.

### PR #49 — launch-first Automations and analytics presentation
- Head `4812d60ca790bd508e05e6a826660923073f5fa3`.
- Merge `3d5a75ba1379f8137997e778ca0369b08ead4eeb`.
- CI `35524959374` — success.
- Security `35524959433` — success.
- Evidence: Quick Automation primary CTA, Custom builder/Import secondary, recoverable empty/error/filter states, launch KPIs and funnel presentation using existing persisted data.
- Human validation: no fresh-customer walkthrough claimed.

### PR #51 — plan readiness, customer activation copy, fail-closed onboarding
- Final head `0bf05ea82021bb7b2912ac424df805a20d1ecfe7`.
- Merge `be4417503533e35a516cb070d180192cfbc35531`.
- CI `35528589277` — success.
- Security `35528589275` — success.
- Evidence: workspace plan readiness before first Instagram connect, customer activation terminology/error mappings, creator-friendly login/template copy, fail-closed behavior when plan readiness cannot be verified.
- Evidence PR #52 merge `4920002f408326e6bfd7fb07920cafcad4799e4d`.
- Human validation: no deployment/fresh-customer walkthrough claimed.

### PR #53 — launch auth/plan recovery and customer-safe OAuth errors
- PR: `https://github.com/idunnpeptide-lab/openreply/pull/53`
- Final head: `73ac74d3ef9db34c49802577ff20b3703c7ea985`.
- Merge SHA: `f39c65320728ceb92abf71c9c1526a97d2666bec`.
- CI run: `35529338503` — success.
- Security run: `35529338567` — success.

Implementation evidence:

- real NextAuth `/verify-request` is ReplyHalo-branded and explains the secure one-time link, spam/junk check, and **Send a new sign-in link** recovery path;
- Settings isolates plan-status loading from unrelated stats/members loading and treats failed plan verification as **Check required**, not `Local mode`;
- Settings exposes a customer **Check plan** retry action and keeps Instagram connection unavailable until plan readiness is known/acceptable;
- activation-network failures receive customer-facing retry copy;
- Instagram connect misconfiguration no longer reflects missing environment-variable names into customer-visible URLs;
- Instagram callback exceptions no longer reflect raw `err.message` into customer-visible URLs; detailed error evidence remains server-side in logs/OperationalEvent;
- Instagram plan notices consistently use **activation code** wording;
- the license activation endpoint returns only the stable licensing error code needed for customer-safe mapping instead of raw internal/provider `error.message`.

Scope/safety evidence:

- no schema migration;
- no licensing-backend redesign;
- no Instagram worker/runtime rewrite;
- no provider-permission change;
- no TikTok behavior/gate change;
- customer work-preservation model unchanged.

Human validation: **not yet performed as a fresh-customer staging walkthrough**. No deployment, manual success, or screenshot artifact is claimed for PR #53.

## Documentation / human evidence handling

- `docs/TIKTOK_INTEGRATION.md`, `docs/TIKTOK_FOUNDATION_CHECKPOINT_2026-09-18.md`, and `docs/TIKTOK_LIVE_STAGING_RUNBOOK.md` remain supporting technical documentation.
- Human validation means an explicit result performed/reported by Volodymyr Rudyi.
- Screenshots from chat are not claimed as repository artifacts unless they are actually committed/stored with a real repository path.
- Secrets are never evidence and must not be committed.

## Current evidence checkpoint — after PR #53

PR #53 is the latest completed product milestone recorded here. The authentication/plan/OAuth blocker group found by the focused launch-readiness audit is closed in code with green CI/Security. The focused audit continues with account-slot behavior, Quick Automations, Custom builder/Automations/Dashboard/Settings regression, mobile/basic accessibility blockers, and email deliverability/domain/resend UX. The combined fresh-customer launch journey has not yet been manually staging-validated and no deployment/manual success is claimed at this checkpoint. TikTok remains separately doubly locked pending the later real-provider session.
