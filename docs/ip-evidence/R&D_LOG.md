# R&D Log

Project owner / decision maker: **Volodymyr Rudyi**
AI development assistance: **ChatGPT (OpenAI)**

This log records engineering work as it actually occurred. It does not invent decisions, tests, dates, or evidence. Human validation is identified explicitly. Secrets are excluded.

---

## 2026-09-18 — Instagram follow-up delivery gap

**Task**
Ensure configured follow-ups are delivered regardless of whether a user passes through the Follow Gate/postback path or receives the reveal directly because they already follow the Instagram account.

**Problem observed**
During live staging QA, Volodymyr Rudyi observed that the normal Follow Gate path could schedule a follow-up, but an already-following user receiving the reveal directly did not receive the follow-up.

**Options considered**
- Leave follow-up scheduling only in the postback path.
- Duplicate scheduling logic in several worker branches.
- Introduce/reuse one shared follow-up scheduling path after actual reveal delivery.

**Volodymyr's decision**
The behavior should be consistent for both paths: when the actual reveal/content is delivered, the configured follow-up should be scheduled.

**Implementation**
PR #6 added shared follow-up scheduling to the direct-comment reveal path without scheduling follow-up for a mere opening prompt or Follow Gate prompt.

**Test**
Automated scheduler regression coverage plus live staging re-test.

**Result**
Merged PR #6, merge SHA `3ca7ca56ddb6de87f2e970413119eea07fad3213`.

---

## 2026-09-18 — Returning-user follow-up dedupe bug

**Task**
Allow a returning Instagram user to receive a newly scheduled follow-up on a later interaction while preserving dedupe for an already pending/active follow-up.

**Problem observed**
Volodymyr Rudyi tested two accounts and found one later follow-up did not arrive. Investigation showed deterministic BullMQ job IDs combined with retained completed jobs could permanently block future follow-ups for the same automation + user.

**Options considered**
- Use random job IDs and lose deterministic dedupe.
- Keep completed jobs indefinitely and accept missed repeat follow-ups.
- Retain dedupe for pending/active jobs but recycle terminal completed/failed jobs before scheduling a new interaction.

**Volodymyr's decision**
Repeat interactions must be able to schedule a fresh follow-up, while genuine duplicate delivery events must still be deduplicated.

**Implementation**
PR #7 updated follow-up job lifecycle/dedupe behavior so terminal retained jobs no longer block later interactions.

**Test**
Automated follow-up scheduler tests and human live re-test by Volodymyr Rudyi using the same test accounts.

**Result**
Both follow-ups arrived in the re-test. PR #7 merged at `940674886d8aa47d086d8a88db040ca36a1e2294`.

---

## 2026-09-18 — Safe Instagram disconnect/reconnect

**Task**
Make Instagram disconnect safe for customer data before performing live disconnect/reconnect QA.

**Problem observed**
Code inspection before the manual test showed the disconnect route used destructive account deletion. Because related records use cascade relations, clicking Disconnect could delete campaigns, DM logs, tracked-link clicks/CTR history, and follower history.

**Options considered**
- Keep destructive deletion.
- Add a schema migration for a separate connection-state model.
- Soft-disconnect by clearing connection credentials/state while retaining the InstagramAccount row and all related history.

**Volodymyr's decision**
Disconnect must not erase campaign/history data. Reconnecting the same account must restore the connection without rebuilding customer history.

**Implementation**
PR #8 replaced destructive deletion with soft disconnect, hid disconnected accounts from connected selectors, and preserved license binding for safe same-account reconnect.

**Test**
Automated disconnect regression tests; PR #9 added a staging release marker so Volodymyr could verify the safe build was deployed before clicking Disconnect. Human live QA then confirmed:

- campaign data/statistics remained after disconnect;
- reconnect restored the same Instagram account;
- webhook-ready connection returned;
- public comment reply arrived after reconnect;
- first private message arrived;
- subsequent configured message arrived.

**Result**
PR #8 merge SHA `b5453b0b2fefe85f3b624fb07c4b07def29ef207`.
PR #9 merge SHA `29938e7251855de89bf1338ad5801e26173fbaad`.
Human validation: passed.

---

## 2026-09-18 — Add TikTok without destabilizing Instagram

**Task**
Begin multi-provider expansion by adding TikTok while preserving the already working Instagram provider.

**Problem**
A direct generalization/migration of the Instagram account and automation schema would create unnecessary regression risk before TikTok had passed live provider QA. TikTok also differs materially in webhook payloads, messaging eligibility, token lifecycle, comment APIs, and regional message behavior.

**Options considered**
- Rewrite the existing provider model into one generalized schema immediately.
- Reuse Instagram tables/workers for TikTok events.
- Build TikTok additively with provider-specific persistence/ingress and provider-neutral normalized event contracts at the boundary.

**Volodymyr's decision**
Proceed with TikTok as an additive provider and do not destabilize the proven Instagram path.

**Implementation**
PRs #20–#27 built the foundation in isolated stages:

- #20 exact TikTok comment lookup + isolated ingress queue;
- #21 inbound text message normalization;
- #22 conservative stripped EU/UK/CH inbound-message reconciliation;
- #23 provider-native logical event receipts/dedupe;
- #24 separate TikTok campaign routing and inert action plans;
- #25 guarded workspace-scoped TikTok campaign management API;
- #26 safe TikTok account metadata + official owned-video read APIs;
- #27 validation alignment for TikTok public reply length.

**Test**
Each PR was submitted through repository CI and Security workflows before merge. Unit/regression coverage was added for webhook parsing, ingress, dedupe, routing, campaign API guards, owned-video reads, and provider limits. TikTok live send actions remain intentionally untested because a real approved TikTok for Business developer app/test Business Account is still required.

**Result**
Foundation merged through PR #27. Main checkpoint after PR #27: `1c9f5e8dbf41dfd7092085042c7e26ffbefac150`.

---

## 2026-09-19 — Project evidence discipline

**Task**
Make technical/IP evidence capture automatic after every significant development milestone.

**Problem**
A project can have valid Git history while still lacking one coherent record that explains who defined requirements, who made decisions, which tests were automated, which validations were human, and where exact PR/commit evidence lives.

**Options considered**
- Rely only on raw Git commit history.
- Reconstruct evidence later from memory.
- Maintain live progress, R&D, AI-assistance, and IP-evidence logs alongside normal PR history.

**Volodymyr's decision**
Use permanent project-level evidence logging. Volodymyr Rudyi remains the project owner and human decision maker; ChatGPT (OpenAI) is AI development assistance. Record milestones immediately, never fabricate/backfill proof, identify human validation explicitly, and never store secrets.

**Implementation**
Created/standardized:

- `PROJECT_PROGRESS.md`
- `docs/ip-evidence/R&D_LOG.md`
- `docs/ip-evidence/AI_ASSISTANCE_LOG.md`
- `docs/ip-evidence/IP_EVIDENCE.md`

and added repository-agent guidance so future development checkpoints follow the same discipline.

**Test**
Repository review for presence of required files and subsequent PR/CI checkpoint.

**Result**
Evidence discipline established as an ongoing project rule. PR #28 merged at `a43ff6c1fcc0dd3efcd8e9516c4e7c0544797eea` after CI and Security passed.

---

## 2026-09-19 — Additive TikTok staging UI without enabling live sends

**Task**
Expose the already-built TikTok provider foundation in the ReplyHalo dashboard so the next live staging phase can inspect real account readiness, owned videos, and campaign configuration without changing Instagram or accidentally sending TikTok actions.

**Problem**
The TikTok backend foundation existed, but there was no customer/staging surface to inspect provider capabilities, select owned videos, or configure the isolated TikTok campaign models. Enabling a normal campaign UI too early could also create the false impression that public replies or DMs were already live.

**Options considered**
- Reuse the existing Instagram campaign builder and generalize it immediately.
- Expose live TikTok send controls before provider staging.
- Build a dedicated additive TikTok staging console on top of the isolated TikTok APIs, with explicit provider capability gates and a hard execution lock.

**Volodymyr's decision**
Continue the additive TikTok path and do all code-only work possible without his participation, while keeping live sends disabled until real TikTok developer-app/account staging requires human involvement.

**Implementation**
PR #29 added:

- `/tiktok` staging navigation/page;
- non-secret provider/OAuth readiness status;
- connected Business Account capability/scopes/token-expiry display;
- official owned-video loading;
- TikTok campaign list/create/edit/delete controls;
- capability-gated comment and inbound-DM configuration;
- explicit messaging that durable matches are routing evidence, not send evidence;
- `TIKTOK_LIVE_EXECUTION_ENABLED=false` staging gate and readiness regression tests.

During CI, the first UI implementation hit the repository's React lint rule against effect-driven synchronous state updates. The implementation was refactored to server-load initial state and perform provider refreshes only from explicit user actions instead of suppressing the lint rule.

**Test**
PR #29 CI run `35431525663` passed: Prisma validate/generate, TypeScript, lint, tests, and production build. Security run `35431525669` passed. No live TikTok provider message was sent or claimed.

**Result**
PR #29 merged at `48a3e38143d65f240b38658e16d606e0d8a5e629`. The staging UI milestone is code-complete; human TikTok provider validation has not yet occurred.

---

## 2026-09-19 — Hard-gated TikTok action executor foundation

**Task**
Prepare the execution boundary for persisted TikTok routing plans while continuing to guarantee that current staging code cannot send a TikTok public reply or DM.

**Problem**
`TikTokAutomationMatch` already stored inert action plans, but there was no single execution boundary that could validate plan shape, re-check current provider capability, serialize duplicate attempts, record diagnostics, and refuse live sends until approval.

A second constraint is that the current ReplyHalo TikTok send clients do not expose a persisted provider idempotency key. Automatic retry after a network/provider ambiguity could therefore create a duplicate send.

**Options considered**
- Wire routing directly to provider send calls now.
- Add automatic provider-send retry using the existing ingress retry model.
- Build a separate executor behind the source-controlled live gate, serialize same-match attempts with a row lock, treat terminal match states as non-replayable, and prohibit automatic send retry until provider behavior is proven live.

**Volodymyr's decision**
Continue all safe code-only work autonomously, but do not enable or claim live TikTok sending before real developer-app/account staging and his validation.

**Implementation**
PR #31 added the hard-gated executor for the two already-approved plan types only:

- `PUBLIC_REPLY` to the triggering TikTok comment;
- `DM_REPLY` inside an existing inbound Business Messaging conversation.

The executor:

- returns `LOCKED` before any DB transaction/provider work while `TIKTOK_LIVE_EXECUTION_ENABLED=false`;
- validates stored plan/event compatibility;
- re-checks current comment/public-reply/messaging capability;
- uses a database row lock to serialize future concurrent attempts for one durable match;
- treats non-`MATCHED` states as terminal;
- records success/skip/failure OperationalEvents without campaign message text or credentials;
- does not implement Comment-to-Message;
- does not add queue/cron/UI execution wiring;
- does not automatically retry a failed/ambiguous provider send.

**Test**
Focused executor tests cover hard-lock behavior, future approved public-reply execution, existing-conversation DM execution, terminal replay suppression, capability re-check, invalid plan failure, and single-attempt provider failure handling. PR #31 CI run `35431963722` and Security run `35431963663` both passed.

**Result**
PR #31 merged at `346f1cc998dc28b99dbff9902411fcb1266ad1e5`. No live TikTok provider send occurred; human live provider validation is still pending.

---

## 2026-09-19 — Sanitized TikTok staging execution diagnostics

**Task**
Make TikTok routing/execution state inspectable in staging without exposing customer message content, provider credentials, or arbitrary worker payloads, and without enabling any provider send.

**Problem**
The hard-gated executor and durable `TikTokAutomationMatch` rows existed, but staging had no safe consolidated view of recent matches and worker diagnostics. Returning raw match or OperationalEvent records would expose comment/DM text, planned reply text, actor/conversation identifiers, or unrelated/raw payload fields.

**Options considered**
- Show raw database records directly in the dashboard.
- Reuse general operational diagnostics and expose full payloads.
- Add a dedicated workspace-scoped sanitization layer that allowlists only execution metadata needed for QA.

**Volodymyr's decision**
Continue autonomously, preserve privacy/security boundaries, and do not enable live TikTok execution until a real provider staging phase can be tested and approved by him.

**Implementation**
PR #33 added:

- `getTikTokExecutionDiagnostics()` with workspace-scoped reads;
- sanitized durable-match summaries: campaign name, event type, provider event ID, matched keyword, terminal/current status, trigger, action types, blocked reasons, timestamps;
- sanitized TikTok worker OperationalEvents with an explicit allowlist of diagnostic fields;
- an authenticated `/api/tiktok/diagnostics` endpoint with bounded result size and `Cache-Control: no-store`;
- a read-only `/tiktok` diagnostics panel;
- regression tests proving workspace isolation and exclusion of comment/DM text, reply text, actor IDs/usernames, conversation IDs, arbitrary payload fields, and token-like values.

During CI, two TypeScript inference issues were surfaced in the diagnostic summary (`trigger`, then `actionTypes`). Both were fixed with explicit narrow union typing rather than casts that would hide unsafe shapes.

**Test**
Final PR #33 head `bcf67ee27cee10b153dee6f8e82467e85e183e38` passed CI run `35432848811` (Prisma validate/generate, TypeScript, lint, tests, production build) and Security run `35432848785`.

**Result**
PR #33 merged at `5572c398b56e214a3bea33c318c8c99b23da1c16`. TikTok routing/execution diagnostics are code-complete and sanitized. No live TikTok provider validation or send occurred; the next meaningful phase requires real TikTok for Business app/account participation.

---

## 2026-09-19 — TikTok live-staging handoff runbook

**Task**
Remove avoidable ambiguity from the first real TikTok for Business staging session so the human/provider phase can start with exact ReplyHalo URLs, configuration names, safety gates, QA order, and evidence rules already documented.

**Problem**
The code-only TikTok foundation was ready, but the external provider phase still depended on details spread across OAuth routes, webhook routes, environment helpers, provider clients, and current TikTok API documentation. Entering the wrong callback URL, exposing a secret in a screenshot/chat, or enabling live execution too early would create unnecessary risk.

**Options considered**
- Wait until the provider session and reconstruct all setup details interactively.
- Put real credential examples into repository documentation for convenience.
- Prepare a non-secret runbook from the actual code and current official provider documentation, while keeping all secret values out of GitHub and preserving the hard live-execution lock.

**Volodymyr's decision**
Continue autonomously until a genuinely human/provider step is reached; preserve the rule that live TikTok sends remain disabled until real staging has passed and he explicitly approves the controlled send test.

**Implementation**
PR #35 added `docs/TIKTOK_LIVE_STAGING_RUNBOOK.md` with:

- the current staging host and exact implemented OAuth/webhook callback URLs;
- TikTok environment-variable **names only** and expected redirect shape;
- desired scopes/provider products while clearly distinguishing requested permissions from actually granted permissions;
- OAuth preflight and post-connection checks;
- signed webhook configuration/verification requirements for `COMMENT` and `DIRECT_MESSAGE`;
- inert comment and existing-conversation DM QA sequences while execution remains locked;
- a controlled-send checklist that can be used only after inert provider E2E passes;
- separate Comment-to-Message eligibility validation;
- non-secret human evidence rules for the eventual staging session;
- current official TikTok API for Business documentation references checked during preparation.

**Test / verification**
The documented URLs were verified against the actual ReplyHalo routes (`/api/tiktok/callback`, `/api/tiktok/webhook`). Environment-variable names and HMAC secret usage were verified against `lib/env.ts` and `lib/tiktok/webhook.ts`. Current TikTok API for Business documentation was checked for the v1.3 account OAuth/token endpoint, TikTok account webhooks, Business Messaging APIs/webhooks, and Comment-to-Message endpoints. PR #35 CI run `35433279605` and Security run `35433279575` passed.

**Result**
PR #35 merged at `a9100d35ac5c6c513e2ce1d2f0ceedc58ad2d4a4`. The remaining blocker is now external/human: create/configure the real TikTok for Business developer app, supply secrets directly to staging deployment, authorize a dedicated test Business Account, and perform real provider E2E without changing the live-execution gate beforehand.

---

## 2026-09-19 — Evidence-based TikTok webhook readiness confirmation

**Task**
Ensure the TikTok staging readiness indicator becomes true only after ReplyHalo has evidence that a supported signed TikTok webhook was actually accepted into the provider-specific ingress pipeline.

**Problem**
`TikTokAccount.webhookConfigured` was exposed in the staging UI but had no trustworthy runtime transition after a real delivery. Leaving the flag false forever would make real provider QA misleading, while setting it merely because a callback URL was configured would overstate readiness without delivery evidence.

**Options considered**
- Mark webhook readiness during OAuth connection or when a callback URL is saved.
- Leave the flag manual and require a human/database update.
- Confirm readiness only after signature verification succeeds and a supported event is successfully handed to the isolated TikTok queue.

**Volodymyr's decision**
Continue safe autonomous preparation while preserving truthful evidence semantics and keeping live TikTok execution disabled until real provider staging is performed and approved.

**Implementation**
PR #37 added a narrow readiness-confirmation helper and wired it after successful queue handoff for supported events only:

- `comment.update`;
- `im_receive_msg`;
- `im_receive_msg_eu`.

The confirmation uses an idempotent `updateMany` constrained to `webhookConfigured=false`, so later supported events do not churn the account's `updatedAt`. Unsupported event names do not confirm readiness. Because the call runs only after the existing signature-verification boundary and after queue handoff, invalid signatures and failed queue adds cannot flip the flag.

**Test**
Focused tests cover supported events, unsupported events, and the already-confirmed no-op case. PR #37 head `13a0bcb50c06f46add4ec201d241e3b1aecd9b04` passed CI run `35433666350` (Prisma validate/generate, TypeScript, lint, tests, production build) and Security run `35433666428`.

**Result**
PR #37 merged at `7ee473003d132aad79b35e2612e5d5371bc2d481`. The code can now truthfully reflect future signed webhook delivery in staging, but no real TikTok webhook delivery has yet been claimed or human-validated.
