# R&D Log

Project owner / decision maker: **Volodymyr Rudyi**
AI development assistance: **ChatGPT (OpenAI)**

This log records engineering work as it actually occurred. It does not invent decisions, tests, dates, deployment, or human validation. Secrets are excluded. Detailed prior versions remain available in Git history; this file keeps the cumulative decision history needed to continue the project safely.

---

## 2026-09-18 — Instagram follow-up and safe reconnect fixes

**Task**
Close live Instagram runtime gaps found during staging QA.

**Problems**
- already-following users could receive the direct reveal without scheduling the configured follow-up;
- retained terminal BullMQ job IDs could block a future follow-up for a returning user;
- destructive Instagram disconnect risked cascade-deleting campaigns, logs, tracked clicks/CTR, and follower history.

**Options considered**
- leave paths inconsistent;
- duplicate scheduling logic;
- use random follow-up jobs and weaken dedupe;
- keep destructive disconnect;
- or centralize follow-up scheduling, recycle terminal dedupe state, and soft-disconnect while preserving the account row/history.

**Volodymyr's decision**
Follow-up behavior should be consistent for actual reveal delivery, returning interactions must be able to schedule a new follow-up without losing genuine dedupe, and disconnect/reconnect must preserve customer history.

**Implementation / Test / Result**
- PR #6 — direct-reveal follow-up scheduling; merge `3ca7ca56ddb6de87f2e970413119eea07fad3213`.
- PR #7 — returning-user repeat follow-up lifecycle; merge `940674886d8aa47d086d8a88db040ca36a1e2294`.
- PR #8 — non-destructive Instagram soft disconnect; merge `b5453b0b2fefe85f3b624fb07c4b07def29ef207`.
- PR #9 — release marker before live disconnect/reconnect QA; merge `29938e7251855de89bf1338ad5801e26173fbaad`.
- Automated regression coverage passed.
- Volodymyr's live staging QA confirmed preserved campaign/statistical history, same-account reconnect, post-reconnect public reply, first private reply, and subsequent configured message.

---

## 2026-09-18 to 2026-09-19 — Add TikTok without destabilizing Instagram

**Task**
Build an official TikTok API for Business provider foundation without rewriting the proven Instagram provider.

**Problem**
TikTok differs in webhook payloads, token lifecycle, organic comment APIs, messaging eligibility/regions, and provider-side idempotency boundaries. A premature generic rewrite would create Instagram regression risk.

**Options considered**
- generalize the existing Instagram schema/runtime immediately;
- reuse Instagram tables/workers directly for TikTok;
- or add TikTok provider-specific persistence/ingress and normalize only at safe boundaries.

**Volodymyr's decision**
Use an additive/isolated provider architecture. Do not enable live TikTok execution until real provider staging is completed and explicitly approved.

**Implementation / Test / Result**
The foundation was built and merged in small reviewed stages:

- PR #20 — isolated comment ingress; `4ed413e6bb7cdc7a6857fd3aef3578b5c3bf2d5a`.
- PR #21 — inbound message normalization; `4d3251d102e4f6a09a2d040333529f47156ec775`.
- PR #22 — conservative EU/UK/CH stripped-message reconciliation; `03f8a899877874504972b47864c9613580968938`.
- PR #23 — provider-native logical event receipts/dedupe; `078efe0ba84fba30305d7b4bd90dbeb87d69d204`.
- PR #24 — isolated TikTok campaign routing; `76ad65b6db6ac8377495915c3070ecd37f1927f0`.
- PR #25 — guarded campaign CRUD; `b8da4e22aae5f87aa0f4011fa3f60324594f5c33`.
- PR #26 — safe account/owned-video reads; `ef7b57712dd8603d16e34c1f6580e7dc266062cc`.
- PR #27 — public-reply provider-limit alignment; `1c9f5e8dbf41dfd7092085042c7e26ffbefac150`.
- PR #29 — additive TikTok staging UI with execution lock; `48a3e38143d65f240b38658e16d606e0d8a5e629`; CI `35431525663`, Security `35431525669`.
- PR #31 — hard-gated action executor; `346f1cc998dc28b99dbff9902411fcb1266ad1e5`; CI `35431963722`, Security `35431963663`.
- PR #33 — sanitized execution diagnostics; `5572c398b56e214a3bea33c318c8c99b23da1c16`; CI `35432848811`, Security `35432848785`.
- PR #35 — live-staging runbook; `a9100d35ac5c6c513e2ce1d2f0ceedc58ad2d4a4`; CI `35433279605`, Security `35433279575`.
- PR #37 — signed-webhook readiness semantics; `7ee473003d132aad79b35e2612e5d5371bc2d481`; CI `35433666350`, Security `35433666428`.
- PR #39 — non-destructive TikTok disconnect/reconnect preservation; `ce91619f4ada085e039114e1e11ab606c6c1f831`; CI `35435285708`, Security `35435285684`.
- PR #41 — staging-only webhook configure/readback controls; `85aec2d01047dfed5b410ec38dc5f9b0369ebe1d`; CI `35437528458`, Security `35437528438`.
- PR #43 — doubly locked one-shot staging execution boundary; `615266363e943ddb406406b86f4657b9cd441a3a`; CI `35438125753`, Security `35438125762`.

The executor intentionally has no automatic provider-send retry because the current clients do not expose a persisted provider idempotency key. Both source gates remain false. No real TikTok OAuth/webhook/provider send is claimed.

---

## 2026-09-19 — Project evidence discipline

**Task**
Make technical/IP evidence capture automatic after meaningful development stages.

**Problem**
Raw Git history alone does not explain human requirements/decisions, AI assistance, manual-vs-automated validation, or the exact continuation point.

**Options considered**
- rely only on commit history;
- reconstruct evidence from memory later;
- maintain cumulative progress, R&D, AI-assistance, and technical-evidence records as part of normal PR flow.

**Volodymyr's decision**
Maintain permanent evidence discipline. Volodymyr Rudyi remains project owner/human decision maker; ChatGPT (OpenAI) is AI development assistance. Record only real evidence, identify manual validation explicitly, and never commit secrets.

**Implementation / Result**
Established/standardized `PROJECT_PROGRESS.md`, `docs/ip-evidence/R&D_LOG.md`, `docs/ip-evidence/AI_ASSISTANCE_LOG.md`, and `docs/ip-evidence/IP_EVIDENCE.md`, plus repository-agent guidance. PR #28 merged at `a43ff6c1fcc0dd3efcd8e9516c4e7c0544797eea` after CI/Security green.

---

## 2026-09-20 — Launch onboarding, Instagram health, and Quick Automations

**Task**
Reduce first-run friction so customers can reach a useful Instagram automation quickly without learning provider internals or the full builder first.

**Problem**
OAuth existed but was buried in Settings, account health was technical/scattered, and the full Campaign Builder required too many first-run decisions.

**Options considered**
- documentation-only onboarding;
- build a large visual builder before launch;
- reuse existing OAuth/post-picker/automation runtime and add a thin launch onboarding + health + templates layer.

**Volodymyr's decision**
Prioritize launch simplicity: ReplyHalo-owned OAuth, clear health/reconnect, Quick Automations first, custom builder second.

**Implementation / Test / Result**
PR #45 added the Dashboard 3-step path, workspace-scoped Instagram health, four Quick Automations, post-picker/runtime reuse, `{link}` guard, account-switch selection protection, and connected-only shell counting. Initial lint failure was fixed rather than suppressed. Final head `d521fa5b48b55c59a66637b75bc68ca6bb0b609a`; CI `35521687018`; Security `35521687004`; merge `8883da17b8d435755263a53137aa6373d112b084`.

No new live provider validation was claimed.

---

## 2026-09-20 — Customer-facing Instagram health and reconnect UX

**Task**
Make connection repair understandable to a normal customer without exposing deployment/provider implementation details.

**Problem**
Settings/OAuth notices still surfaced technical concepts and potential provider/configuration detail.

**Options considered**
- leave technical UI and document it;
- expose more provider diagnostics to customers;
- use the sanitized health model for customer-readable readiness with one repair action while keeping diagnostics elsewhere.

**Volodymyr's decision**
Provider complexity stays on ReplyHalo's side.

**Implementation / Test / Result**
PR #47 added Connection/Authorization/Automation readiness, `Ready`/`Needs attention`/`Disconnected`, one Connect/Reconnect path, preserved-history wording, friendly OAuth success/failure copy, and ReplyHalo plan wording. Final head `9b814eb580c8bb44ca33df47d2fa2ef0185c3372`; CI `35523019203`; Security `35523019202`; merge `d2fa7a671e1ce6f7b1541e4c089559bad8295741`.

No fresh-customer walkthrough was claimed.

---

## 2026-09-20 — Launch-first empty states and analytics presentation

**Task**
Make Quick Automations the default creation path and present existing analytics as a useful launch funnel.

**Problem**
Automations still privileged the advanced builder; fetch/action failures were weakly surfaced; analytics existed but did not emphasize customer value progression.

**Options considered**
- build new analytics persistence;
- document how to use existing UI;
- reuse current data/runtime and change only launch presentation/recovery.

**Volodymyr's decision**
Keep the MVP narrow: Quick Automations first, custom builder available but secondary, no second analytics subsystem.

**Implementation / Test / Result**
PR #49 added Quick-Automation-first CTAs/empty state, visible load/action errors, filter recovery, launch metrics, funnel ordering, and zero-data states. Head `4812d60ca790bd508e05e6a826660923073f5fa3`; CI `35524959374`; Security `35524959433`; merge `3d5a75ba1379f8137997e778ca0369b08ead4eeb`.

No fresh-customer walkthrough was claimed.

---

## 2026-09-20 — Plan-readiness and customer-facing activation milestone

**Task**
Make workspace plan readiness a real prerequisite to Instagram onboarding and remove remaining customer-facing licensing/demo language.

**Problem**
A customer could perceive Instagram as the next action while the plan was not ready; login/template copy still needed launch polish; Settings exposed internal licensing terms/error names; and `/api/license/status` failure had a potential fail-open onboarding edge.

**Options considered**
- keep plan activation in Settings/documentation only;
- rewrite the licensing backend;
- preserve the backend but add customer-facing readiness, sanitized mappings, and fail-closed provider entry.

**Volodymyr's decision**
Keep multi-tenant workspace licensing intact, but make customer-facing activation simple and fail closed before provider connection.

**Implementation / Test / Result**
PR #51 added plan readiness to onboarding, first-time login polish, Quick Automation default copy, ReplyHalo activation terminology, customer mappings for licensing states, preserved-work copy, and the fail-closed plan-check fix. Final head `0bf05ea82021bb7b2912ac424df805a20d1ecfe7`; CI `35528589277`; Security `35528589275`; merge `be4417503533e35a516cb070d180192cfbc35531`.

No deployment/fresh-customer manual QA was claimed.

---

## 2026-09-20 — Launch auth and plan recovery blockers

**Task**
Continue the focused launch-readiness audit across authentication/sign-up, plan activation, and the Instagram OAuth entry/callback path.

**Problems found**
- the actual NextAuth `/verify-request` page still displayed **OpenReply** and lacked a clear resend/recovery path;
- Settings loaded stats/members/plan in a way that could leave `licenseData=null` after a plan-status fetch/network/JSON failure and present that as `Local mode`;
- Settings could therefore make Instagram connection look available without trustworthy plan verification;
- Instagram connect misconfiguration could reflect missing environment-variable names into a customer-visible URL;
- callback exceptions could reflect raw provider/internal `err.message` into `?reason=...`;
- one customer-facing notice still used **activation key** instead of **activation code**;
- activation POST responses could include raw licensing `error.message` even though the UI only needed a stable error code.

**Options considered**
- document/support around these issues and leave code unchanged;
- redesign the licensing/auth backend before launch;
- or make narrow fail-closed and sanitization fixes while preserving current architecture/runtime.

**Volodymyr's decision**
Follow the established launch requirements: ReplyHalo customer language, provider/licensing internals hidden, plan readiness before Instagram, preserved customer data, and only real launch blockers fixed during this audit.

**Implementation**
PR #53:

- rebranded `/verify-request` to ReplyHalo and added secure one-time-link, spam/junk, and **Send a new sign-in link** recovery copy;
- changed Settings startup loading to isolate plan-status failure and show **Check required / Check plan** rather than a false `Local mode`;
- kept the Settings Connect Instagram action unavailable until plan readiness is known/acceptable;
- added activation-network failure handling with customer-facing retry copy;
- removed environment-variable names from OAuth misconfiguration redirects;
- removed raw callback/provider exception text from customer URLs while preserving detailed server-side OperationalEvent/console evidence;
- replaced remaining activation-key wording with activation-code wording;
- changed the license activation endpoint to return only the stable licensing error code needed for customer mapping, not raw internal/provider error text.

No schema migration, licensing-backend redesign, Instagram worker/runtime rewrite, provider-permission change, or TikTok gate change was introduced.

**Test**
Final PR #53 head `73ac74d3ef9db34c49802577ff20b3703c7ea985` passed CI run `35529338503` (Prisma validate/generate, TypeScript, lint, tests, production build) and Security run `35529338567`.

**Result**
PR #53 merged at `f39c65320728ceb92abf71c9c1526a97d2666bec`. Authentication/plan/OAuth blocker group is code-complete. No deployment or fresh-customer manual staging validation is claimed. The focused launch-readiness audit continues with account-slot behavior, Quick Automations, advanced/list/dashboard/settings regression, mobile/accessibility blockers, and email deliverability/domain UX.
