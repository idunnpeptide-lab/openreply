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
- public comment reply arrived;
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
The documented URLs were verified against the actual ReplyHalo routes (`/api/tiktok/callback`, `/api/tiktok/webhook`). Environment-variable names and HMAC secret usage were verified against `lib/env.ts` and `lib/tiktok/webhook.ts`. Current TikTok API for Business documentation was checked for the v1.3 TikTok-account OAuth/token endpoint, TikTok account webhooks, Business Messaging direct messages/webhooks, and Comment-to-Message endpoints. PR #35 CI run `35433279605` and Security run `35433279575` passed.

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

---

## 2026-09-19 — Non-destructive TikTok disconnect/reconnect preservation

**Task**
Prepare a safe TikTok disconnect/reconnect path for live staging without risking deletion of TikTok campaigns or durable routing history.

**Problem**
`TikTokAutomation` and `TikTokAutomationMatch` cascade from `TikTokAccount`. Deleting the account row during disconnect would therefore erase the exact history needed for staging evidence and later reconnect. The staging UI also had no local TikTok disconnect action, and disconnected/expired rows were not consistently excluded from connected-account/provider/webhook resolution.

**Options considered**
- Delete the TikTok account row and accept cascade deletion.
- Add a schema migration solely for a connection-state flag before provider QA.
- Preserve the existing account row, locally invalidate token/capability state, and use refresh-token expiry as the connected/disconnected boundary until the same `openId` reconnects through OAuth.

**Volodymyr's decision**
Continue the same data-preserving safety model already proven for Instagram: disconnect must not erase campaigns/history, the same provider identity should reconnect into the preserved row, and live TikTok sends must remain disabled until human provider QA.

**Implementation**
PR #39 added:

- an owner/admin `/api/tiktok/disconnect` soft-disconnect route;
- encrypted local sentinel replacement for stored TikTok tokens plus epoch token expiries;
- clearing of granted scopes, comment/public-reply/messaging/Comment-to-Message capabilities, and webhook readiness on disconnect;
- connected-account filtering in account resolution, account reads, owned-video reads, `/tiktok`, and webhook account lookup;
- a `/tiktok` disconnect control that explicitly tells the user campaigns and history are preserved;
- same-account OAuth reconnect behavior that reuses the preserved `openId` row, restores fresh encrypted tokens/scopes/capabilities, updates `connectedAt`, and requires webhook/Comment-to-Message proof again;
- preservation of the DM Magnet social-account/license binding rather than releasing the slot on local disconnect.

No schema migration was required. Instagram code paths were not changed.

**Test**
Focused regression coverage proves that disconnect never calls account deletion, writes the inert/expired token state, clears capabilities, preserves the history contract in the API response, enforces owner/admin access, filters disconnected/expired accounts from provider reads, and keeps normal token-lifecycle behavior. PR #39 head `8d077a3c4d803f615471ed02218add5086abead4` passed CI run `35435285708` (Prisma validate/generate, TypeScript, lint, tests, production build) and Security run `35435285684`.

**Result**
PR #39 merged at `ce91619f4ada085e039114e1e11ab606c6c1f831`. The code is ready for a future human TikTok disconnect/reconnect staging test, but no real TikTok OAuth, disconnect, reconnect, webhook delivery, or provider send is claimed by this milestone.

---

## 2026-09-19 — Staging-only TikTok webhook configuration/readback control

**Task**
Reduce manual provider setup during the first real TikTok staging session by exposing a safe in-product way to read and configure the two webhook families ReplyHalo needs, while preserving the distinction between provider configuration and runtime delivery evidence.

**Problem**
The codebase already had official TikTok webhook update/list/delete helpers, but they were not exposed through an authenticated staging workflow. The human session would otherwise need to construct API requests manually, increasing the risk of wrong callback URLs, secret leakage, or assuming that a successful configuration request meant a real signed webhook had reached ReplyHalo.

**Options considered**
- Keep webhook configuration fully manual in the TikTok portal/API.
- Expose a generic customer-facing webhook editor that accepts arbitrary callback URLs.
- Add a staging-only owner/admin control that derives the callback URL from ReplyHalo itself, requires a connected staging TikTok account before global app mutation, configures only `COMMENT` and `DIRECT_MESSAGE`, and verifies the result by provider readback.

**Volodymyr's decision**
Continue autonomous staging preparation without enabling sends or weakening evidence rules. Provider configuration may be automated, but `webhookConfigured=true` must still remain reserved for a real supported signed delivery reaching ReplyHalo's ingress path.

**Implementation**
PR #41 added:

- staging-only authenticated `GET`/`POST` control at `/api/admin/diagnostics/tiktok-webhooks`;
- owner/admin authorization plus production 404 behavior;
- a connected-account guard before changing the global TikTok developer-app webhook configuration;
- server-derived callback URL from the current staging base URL, so the browser cannot supply an arbitrary webhook target;
- configuration/readback for `COMMENT` and `DIRECT_MESSAGE` only;
- provider readback verification after update rather than trusting update success alone;
- sanitized browser output limited to event state, callback URL, and provider error code without raw provider payloads or credentials;
- a `/tiktok` UI panel with **Read provider config** and **Configure + verify** actions;
- explicit UI text that provider readback does not change live execution or runtime webhook readiness.

Current TikTok API for Business documentation was rechecked during implementation and still lists the TikTok-account webhook update/list/delete endpoints and Business Messaging webhook configuration APIs.

**Test**
Regression coverage verifies staging-only behavior, role protection, connected-account mutation guard, correct expected callback derivation, provider readback match/mismatch handling, two-family configuration, operational evidence logging, and output sanitization. PR #41 head `f5bd50842f18db776476657f4bff1e5bcab4c9f0` passed CI run `35437528458` (Prisma validate/generate, TypeScript, lint, tests, production build) and Security run `35437528438`.

**Result**
PR #41 merged at `85aec2d01047dfed5b410ec38dc5f9b0369ebe1d`. ReplyHalo can now perform the provider webhook configuration/readback portion of staging from `/tiktok` after a real account is connected. No real TikTok provider configuration, OAuth authorization, signed webhook delivery, disconnect/reconnect, or send is claimed by this milestone.

---

## 2026-09-19 — Doubly locked one-shot TikTok staging execution boundary

**Task**
Prepare the final controlled-send handoff before the real provider session without making any TikTok send reachable today.

**Problem**
The action executor already existed behind `TIKTOK_LIVE_EXECUTION_ENABLED=false`, but after future human/provider validation there was no deliberately narrow authenticated path for executing exactly one already-routed durable match. Adding a generic send endpoint or browser-supplied reply body would weaken the safety model and could bypass the evidence collected during inert routing.

**Options considered**
- Wait until after provider QA and build the send trigger under time pressure.
- Expose a generic staging send API that accepts text and provider targets from the browser.
- Prepare a one-shot staging endpoint/UI now, but keep it behind two independent source-controlled disabled gates and require the action to come only from an existing workspace-scoped `MATCHED` durable plan.

**Volodymyr's decision**
Continue code-only preparation while preserving the rule that no live TikTok send is enabled before real OAuth/webhook/inert-routing/reconnect QA and his explicit later approval.

**Implementation**
PR #43 added:

- `TIKTOK_CONTROLLED_STAGING_SEND_ENABLED=false` as a second source-controlled approval gate alongside the already-disabled live execution gate;
- staging-only owner/admin `POST /api/admin/diagnostics/tiktok-execute-match`;
- exact confirmation phrase `EXECUTE_TIKTOK_STAGING_MATCH`;
- workspace-scoped match resolution, terminal-state rejection, active-account check, and real signed-webhook readiness requirement before either gate is consulted;
- a `423 LOCKED` response while either source gate is false, with no executor/provider call;
- a `/tiktok` controlled-send panel that exposes no execute action while locked;
- future execution input limited to a durable match ID + exact confirmation; reply text, action type, provider IDs, actor data, and conversation target are never accepted from the browser;
- executor-level rechecks for active refresh-token connection and real signed-webhook readiness inside the same row-locked execution transaction, in addition to existing capability checks;
- retained single-attempt/no-auto-retry behavior and continued exclusion of Comment-to-Message.

**Test**
Regression coverage verifies staging-only access, owner/admin authorization, workspace isolation, exact confirmation, terminal match handling, disconnected-account blocking, unconfirmed-webhook blocking, `423 LOCKED` behavior with both source gates false, and zero executor calls while locked. Executor tests additionally verify the connection and signed-webhook readiness rechecks inside the future live transaction. PR #43 head `4a5c564fc560b1afd87cac788fe4299601e59f1d` passed CI run `35438125753` (Prisma validate/generate, TypeScript, lint, tests, production build) and Security run `35438125762`.

**Result**
PR #43 merged at `615266363e943ddb406406b86f4657b9cd441a3a`. Both send gates remain false, so this milestone cannot send a TikTok public reply or DM. No live TikTok provider validation or send is claimed. The next meaningful work requires the real TikTok for Business staging session and Volodymyr Rudyi's later explicit approval before any separate gate-enabling code change.

---

## 2026-09-20 — Launch onboarding, Instagram health, and Quick Automations

**Task**
Reduce first-run friction before launch so a customer can connect Instagram and activate a useful automation without seeing Meta developer/API setup or learning the full Campaign Builder first.

**Problem**
The official Instagram OAuth route already existed, but it was primarily surfaced inside Settings. A new customer landing on Dashboard could see statistics before seeing a clear first action. Connection health was also scattered across token/webhook fields, and the full Campaign Builder required more decisions than a first-time user should need. Soft-disconnected Instagram rows could additionally inflate the dashboard-shell connected-account count.

**Options considered**
- Keep onboarding documentation-only and leave the existing dashboard/settings flow unchanged.
- Build a large visual flow builder before launch.
- Reuse the existing OAuth, post picker, automation API, Follow Gate, tracked-link and follow-up runtime while adding a thin launch onboarding layer, health model, and template-driven quick creator.

**Volodymyr's decision**
Prioritize launch simplicity over adding broad new platform functionality: one-click Instagram connect, visible account health/reconnect guidance, ready-made automations, and a short path to activation before expanding into a larger visual builder or AI layer.

**Implementation**
PR #45 added:

- Dashboard first-run onboarding with **Connect Instagram** as the first action;
- clear 3-step progress: connect account → choose automation → activate;
- workspace-scoped `/api/instagram/health` plus a pure connection-health model using only evidenced local state: connection, token expiry and webhook subscription;
- a self-service connection-attention/reconnect banner when an active account needs attention;
- `Quick Automations` navigation and `/campaigns/quick`;
- four launch templates: Comment → DM, Comment → Follow Gate → DM, Comment → Tracked Link, and Comment → Link → Follow-up;
- reuse of the existing official Instagram post picker and existing `/api/automations` backend rather than creating a parallel runtime;
- tracked-link template guard requiring the `{link}` token before activation;
- account-switch behavior that clears a previously selected post so content from one Instagram account cannot accidentally be submitted under another account;
- dashboard-shell counting of connected accounts only, excluding preserved soft-disconnected rows;
- retention of the full Campaign Builder as the advanced/custom path.

**Test**
Automated coverage was added for Instagram connection-health states, workspace scoping and token sanitization in the health API, and quick-template payload behavior. The first PR #45 CI run `35521482936` failed lint because three internal page navigations used raw `<a>` tags. Those links were changed to Next `Link`, the quick wizard received loading/account-switch polish, and the final head `d521fa5b48b55c59a66637b75bc68ca6bb0b609a` passed CI run `35521687018` (Prisma validate/generate, TypeScript, lint, tests, production build) and Security run `35521687004`.

**Result**
PR #45 merged at `8883da17b8d435755263a53137aa6373d112b084`. The launch onboarding/Quick Automations milestone is code-complete. No new live Instagram provider QA or production customer activation is claimed by this code milestone; manual staging validation of the new first-run UX remains a later human test step.

---

## 2026-09-20 — Customer-facing Instagram health and reconnect UX

**Task**
Make Instagram connection repair understandable to a normal ReplyHalo customer without exposing deployment or provider implementation details.

**Problem**
The health API introduced in PR #45 existed, but Settings still primarily showed technical token-expiry/webhook text. OAuth error notices could expose environment-variable names and raw provider failure reasons. That is useful for developers but creates unnecessary friction and support burden for customers.

**Options considered**
- Leave Settings technical and document the repair steps separately.
- Add provider API debugging details directly to the customer UI.
- Reuse the sanitized health API and translate it into customer-facing connection/authorization/automation readiness with one obvious reconnect action while preserving detailed developer diagnostics elsewhere.

**Volodymyr's decision**
Keep provider complexity on ReplyHalo's side. Customers should see a clear account state and repair action, not Meta/TikTok developer terminology.

**Implementation**
PR #47 updated the customer-facing Instagram Settings/notice surface to:

- show per-account Connection, Authorization and Automation readiness;
- summarize each account as `Ready`, `Needs attention`, or `Disconnected`;
- provide one **Connect / Reconnect Instagram** action using the existing official OAuth route;
- explain that campaigns, logs, clicks and history remain saved during repair;
- add a friendly `?instagram=connected` success notice;
- remove environment-variable names and raw provider failure reasons from customer-facing OAuth errors;
- replace remaining internal `DM Magnet` wording in this customer-facing notice surface with ReplyHalo plan language.

No provider token/secret was added to browser responses, safe disconnect behavior was unchanged, and TikTok paths/gates were untouched.

**Test**
The first PR #47 head `b82b3376e3b17175c9659f9bde724a39cc8878fc` passed typecheck but failed lint on one unescaped apostrophe. The text was corrected without suppressing the lint rule. Final head `9b814eb580c8bb44ca33df47d2fa2ef0185c3372` passed CI run `35523019203` (Prisma validate/generate, TypeScript, lint, tests, production build) and Security run `35523019202`.

**Result**
PR #47 merged at `d2fa7a671e1ce6f7b1541e4c089559bad8295741`. The self-service Instagram health/reconnect milestone is code-complete. No fresh-customer live OAuth/reconnect walkthrough is claimed yet; that remains a human staging validation step after deployment.

---

## 2026-09-20 — Launch-first empty states and analytics presentation

**Task**
Finish the immediate code-only launch polish by making Quick Automations the default creation path, adding recoverable empty/error states, and presenting the analytics ReplyHalo already records as a clear launch funnel.

**Problem**
The first-run Dashboard had onboarding after PR #45, but the Automations page still made the full builder the primary CTA and the empty state sent new users straight into the advanced setup. Dashboard and Automations fetch failures were mostly console-only, and campaign metrics presented sent/skipped/failed/clicks without emphasizing the customer value path.

**Options considered**
- Build a new analytics subsystem and new persistence before launch.
- Keep current UI and document which button new customers should choose.
- Reuse existing Dashboard/campaign analytics and runtime, change only the launch presentation, recovery states, and primary CTAs.

**Volodymyr's decision**
Keep the MVP narrow and launch-focused: guide ordinary customers to Quick Automations first, preserve the advanced builder as an explicit secondary path, and reuse proven analytics/runtime data instead of expanding scope.

**Implementation**
PR #49:

- makes **Quick Automation** the primary Automations-page creation CTA;
- keeps **Custom builder** and Import available as secondary/advanced paths;
- replaces the no-automation empty state with a Quick-Automation-first launch path;
- adds explicit retry/connection-repair states for Dashboard and Automations data failures;
- adds visible failure handling for automation toggle/delete/duplicate actions;
- adds a clear-filter recovery state when search/status filters return nothing;
- renames Dashboard presentation around **Launch performance** and prioritizes Active Automations, DMs Sent, Link Clicks and CTR;
- keeps Failed and Skipped visible for operational health;
- adds useful zero-data states for 7-day DMs and recent activity;
- orders per-automation funnel metrics as runs → sent → clicks → CTR, surfacing failed/skipped when non-zero;
- introduces no schema migration, worker/provider change, or new analytics store.

**Test**
PR #49 head `4812d60ca790bd508e05e6a826660923073f5fa3` passed CI run `35524959374` including Prisma validate/generate, TypeScript, lint, full tests and production build. Security run `35524959433` passed.

**Result**
PR #49 merged at `3d5a75ba1379f8137997e778ca0369b08ead4eeb`. The immediate empty/error-state and launch-analytics presentation milestone is code-complete. No fresh-customer manual staging walkthrough is claimed by this milestone.

---

## 2026-09-20 — Plan-readiness and customer-facing activation milestone

**Task**
Close the active pre-launch branch by making ReplyHalo plan readiness a real prerequisite to Instagram onboarding and by removing remaining internal licensing/demo language from the normal customer journey.

**Problem**
The launch onboarding and connection-health work was already merged, but the next customer-facing layer still had several launch risks: the dashboard could make Instagram connection look like the first action even when workspace plan activation was not ready; login language still leaned toward company users; Quick Automation defaults sounded like technical examples; Settings exposed internal license terminology/error names; and a temporary failure of `/api/license/status` could leave onboarding in a fail-open state after the readiness request completed.

**Options considered**
- Leave plan activation solely in Settings and rely on documentation/support to tell users to activate first.
- Rewrite the licensing backend into new customer-facing models before launch.
- Keep the proven workspace licensing architecture intact, add a thin customer-facing readiness layer, sanitize known error states, and fail closed before provider connection when plan readiness cannot be verified.

**Volodymyr's decision**
Keep the underlying multi-tenant licensing architecture unchanged, but make the customer journey simple and trustworthy: ReplyHalo activation/plan language for customers, plan readiness before Instagram, no raw internal error names, and no provider connection when readiness verification is unavailable.

**Implementation**
PR #51, built from the existing `feat/launch-readiness-plan-copy` branch, delivered:

- Dashboard launch onboarding that checks `/api/license/status` in addition to Instagram health;
- activation/check-plan states before Instagram connection when the workspace plan is missing or invalid;
- first-time login copy using **Email address**, **Continue with email**, passwordless one-time-link explanation, and automatic workspace creation language;
- launch-ready customer copy for all four Quick Automation templates;
- customer-facing **ReplyHalo activation code**, **Connected account slots**, and **Plan renewal** terminology in Settings while leaving internal licensing code/database names untouched;
- mappings for `LICENSE_SUSPENDED`, `LICENSE_REVOKED`, `LICENSE_EXPIRED`, `ACCOUNT_LIMIT_REACHED`, `LICENSE_NOT_FOUND`, `LICENSE_ALREADY_ASSIGNED`, `LICENSE_ACCOUNT_MIGRATION_REQUIRED`, and `LICENSE_SERVICE_UNAVAILABLE` into understandable customer messages;
- preserved-work wording during temporary plan-verification problems;
- a final review fix for a fail-open readiness edge case: if the plan-status request cannot be verified, onboarding now shows **Plan check needed / Check plan** and keeps **Connect Instagram** unavailable rather than treating a completed request as sufficient readiness.

No Instagram worker/provider path, database schema, or TikTok execution gate was changed.

**Test**
The final PR #51 head `0bf05ea82021bb7b2912ac424df805a20d1ecfe7` passed CI run `35528589277` (Prisma validate/generate, TypeScript, lint, tests and production build) and Security run `35528589275` before merge.

**Result**
PR #51 merged at `be4417503533e35a516cb070d180192cfbc35531`. The previously active launch plan-readiness/copy branch is closed. No deployment or fresh-customer manual staging walkthrough is claimed for this milestone. The exact next engineering phase is the focused launch-readiness audit, followed only later by deployment and one-step-at-a-time fresh-customer staging validation.

---

## 2026-09-20 — Launch auth / plan recovery milestone

**Task**
Continue the focused launch-readiness audit through authentication recovery, plan-status failure handling, and Instagram OAuth customer-error boundaries without expanding the licensing or provider architecture.

**Problem**
The audit found three launch blockers after PR #51: the verify-request screen still used the old OpenReply brand and offered weak resend guidance; Settings could make a failed plan-status request look like Local mode and expose Instagram connection before readiness was actually known; and Instagram OAuth/customer activation responses could leak environment-variable names, provider exception text, or raw licensing error messages into browser-visible responses.

**Options considered**
- Leave these cases to support/documentation because the happy path worked.
- Redesign the licensing/control-plane and Instagram OAuth architecture before launch.
- Keep the existing architecture, make readiness fail closed, provide explicit customer recovery, and retain detailed diagnostics server-side while returning stable customer-safe errors.

**Volodymyr's decision**
Continue the launch-focused audit and fix only real customer blockers. Keep provider and licensing complexity on ReplyHalo's side, do not expose internal errors to customers, and do not claim manual staging validation until the later fresh-customer walkthrough actually occurs.

**Implementation**
PR #53 delivered:

- ReplyHalo-branded `/verify-request` copy describing the secure one-time email link, spam/junk guidance, and **Send a new sign-in link** recovery;
- `Promise.allSettled` startup handling in Settings so plan-status failure is isolated from unrelated stats/member loading;
- explicit Settings `licenseLoadError` / **Check required** / **Check plan** behavior;
- fail-closed Instagram connection availability until plan status is successfully known and acceptable;
- safe activation network-failure copy;
- Instagram connect misconfiguration redirect reduced to `?instagram=misconfigured` instead of exposing missing environment-variable names;
- Instagram callback failures reduced to `?instagram=failed` while server-side logging/OperationalEvent diagnostics retain the detailed reason;
- remaining customer-facing **activation key** wording changed to **activation code**;
- activation POST responses reduced to stable error code output without returning raw `error.message` text.

No licensing schema/backend redesign, Instagram worker/runtime rewrite, or TikTok gate change was introduced.

**Test**
Final PR #53 head `73ac74d3ef9db34c49802577ff20b3703c7ea985` passed CI run `35529338503` and Security run `35529338567` before merge.

**Result**
PR #53 merged at `f39c65320728ceb92abf71c9c1526a97d2666bec`. No deployment or fresh-customer manual staging walkthrough is claimed for this milestone. The next focused audit stage is account slots / plan limits, followed by Quick Automations regression and the remaining launch-readiness sequence.

---

## 2026-09-20 — Account slots / plan limits launch audit

**Task**
Verify the commercial account-slot boundary before continuing the launch-readiness audit: standard plan capacities, over-limit behavior, same-account reconnect, and the relationship between non-destructive local disconnect and preserved central social-account identity.

**Problem**
The backend enforcement was already present, but the reachable customer-facing `account_limit` notice told customers to disconnect an unused account or upgrade. That guidance was misleading because ReplyHalo intentionally preserves the central social-account activation during a local soft disconnect so account identity, automations, analytics, and reconnect history are not destroyed. A customer could therefore disconnect, try a different account, and hit the same limit again.

**Options considered**
- Change local disconnect to release/delete the central activation and risk breaking preserved identity/history semantics.
- Redesign the central licensing/control-plane before launch.
- Keep the correct existing enforcement/preservation model and fix only the customer recovery guidance, with regression coverage for the safe account-limit routing code.

**Volodymyr's decision**
Continue the launch audit without weakening data preservation. Account limits must be explicit, reconnecting the same account must not consume another slot, and customers must not be told that a local disconnect frees capacity when it intentionally does not.

**Implementation / audit result**
The audit confirmed in `dm-magnet-system` that:

- standard defaults are `SOLO=1`, `CREATOR=3`, and `AGENCY=10`;
- new social-account binding runs inside a Serializable transaction and fails with `ACCOUNT_LIMIT_REACHED` when capacity is exhausted;
- the exact same `(platform, accountId)` is checked before the capacity guard and returns `alreadyBound=true`, so reconnect does not consume a second slot;
- license validation reports `usedAccounts` and non-negative `availableAccounts` from the preserved activations.

The audit confirmed in `openreply` that:

- Instagram OAuth binds centrally before the local account upsert, so an over-limit new account cannot be silently created locally;
- local Instagram disconnect is a soft disconnect that preserves the account row, campaigns, DM logs, click analytics, follower history, and the central activation/slot identity;
- PR #55 changed only the reachable account-limit notice so it now explains same-account reconnect, upgrade/controlled migration for a different account, and the fact that local disconnect keeps the slot reserved;
- regression coverage now explicitly verifies `ACCOUNT_LIMIT_REACHED -> account_limit` customer-safe routing.

No central License Server code, plan capacities, schema, provider runtime, destructive account behavior, or TikTok gate was changed.

**Test**
PR #55 final head `919305d8e096467fe8a454638d825781322031e7` passed CI run `35534736487` and Security run `35534736497` before merge.

**Result**
PR #55 merged at `b5563d88f079f1773220c44e921c89f1c19539a3`. The account slots / plan-limits stage is closed in code. No deployment or fresh-customer manual staging walkthrough is claimed. The next focused audit stage is Quick Automations regression.

---

## 2026-09-20 — Quick Automations regression audit

**Task**
Audit the launch Quick Automations path end-to-end in code: template selection, connected-account loading, account/post switching, keyword/public reply/private DM fields, Follow Gate, tracked link, follow-up configuration, activation, and `{link}` integrity.

**Problem**
The four existing templates and runtime were structurally sound, but the customer-facing wizard had three launch-relevant recovery/integrity gaps: an account-list request failure was presented as though no Instagram account was connected; a selected account was not rechecked immediately before activation; and the post picker could briefly retain the prior account's posts while a new account was loading. Tracked-link destination validity also reached server validation only after submission instead of failing early in the wizard.

**Options considered**
- Redesign Quick Automations or introduce a new runtime.
- Leave transient account/recovery cases for manual support.
- Keep the proven templates/runtime and harden only account readiness, picker state isolation, and customer-side URL validation.

**Volodymyr's decision**
Continue the narrow launch-readiness audit. Preserve the existing four templates and proven runtime, fail closed when connection readiness cannot be confirmed, and fix only real customer-journey blockers before staging validation.

**Implementation**
PR #58:

- separates an account-list request/API failure from a legitimate zero-connected-accounts state;
- adds a customer-safe **Try again** action and Settings recovery link when connected accounts cannot be loaded;
- rechecks the selected Instagram account against current connected Dashboard state immediately before activation and fails closed if the connection changed;
- refreshes account state and clears the selected post when the chosen account is no longer connected;
- remounts `PostPicker` on `selectedAccountId` changes so stale posts from the previous account cannot remain selectable while the next account loads;
- retains the existing `{link}` token guard and adds early malformed/non-HTTPS destination rejection for tracked-link templates;
- leaves all four existing template payloads, Follow Gate/follow-up behavior, `/api/automations` runtime, schema, provider worker, licensing backend, and TikTok gates unchanged.

**Test**
The first PR #58 head `3aecead1e5ab41f98c0f4efd071d2ba02adf01f7` passed TypeScript but failed lint in the account-loading implementation. The data-loading pattern was refactored without suppressing the lint rule. Final head `fc5e78e508bf2be0eed49c4dc330a891ed868b85` passed CI run `35535726659` including Prisma validate/generate, TypeScript, lint, tests and production build. Security run `35535726701` passed.

**Result**
PR #58 merged at `e9f4f09d44f1ce4b07b5ec54781ab68abb79673f`. The Quick Automations regression stage is closed in code. No deployment or fresh-customer manual staging walkthrough is claimed. The next focused audit stage is Custom builder / Automations list / Dashboard / Settings regression.

---

## 2026-09-20 — Server-side automation connection guard

**Task**
Close the server-side customer-journey gap where a preserved soft-disconnected Instagram row could still be used to create or reactivate an automation in an active state.

**Problem**
Quick Automations had a client preflight after PR #58, but `/api/automations` still resolved a requested Instagram account by workspace/account ID without requiring a non-empty access token. PATCH also allowed an automation to be left or made active without rechecking the attached account connection. A stale client or alternate caller could therefore bypass the customer-side readiness check.

**Options considered**
- Rely only on the Quick Automations client preflight.
- Delete disconnected account rows so they can no longer be referenced, sacrificing preserved history/identity.
- Keep the non-destructive account model and enforce the active-state boundary server-side while still allowing inactive drafts/duplicates and Pause after disconnect.

**Volodymyr's decision**
Preserve the established non-destructive disconnect model and continue fixing real launch blockers without expanding scope. Active automations must fail closed when Instagram is disconnected, while preserved inactive work must remain editable/pausable.

**Implementation**
PR #62:

- rejects active POST creation against a soft-disconnected requested Instagram account with stable `INSTAGRAM_RECONNECT_REQUIRED` / HTTP 409;
- when no account ID is requested for an active create, resolves only a currently connected Instagram account;
- on PATCH, verifies the attached workspace Instagram account still has a non-empty access token whenever the resulting automation state is active;
- allows inactive drafts/duplicates to stay attached to the preserved Instagram account row;
- allows an active automation to be paused after disconnect instead of trapping the customer in an active state;
- leaves schema, worker/provider execution, licensing/control-plane behavior, and TikTok gates unchanged;
- separately audited bulk import and confirmed it was already fail-closed through `getWorkspaceInstagramAccount()`.

**Test**
Focused regression coverage verifies: active create rejection on a soft-disconnected row; inactive draft creation on the preserved row; reactivation rejection after disconnect; and successful Pause after disconnect. PR #62 head `bb1b039ef7a9b33a8b55d47d98ad0f207cb8ba2e` passed CI run `35537552869` (Prisma validate/generate, TypeScript, lint, tests and production build) and Security run `35537552791`.

**Result**
PR #62 merged at `fb7f9b954351728456766143f234aa415b7d972e`. No deployment, live provider test, or fresh-customer manual walkthrough is claimed. The audit continues with Custom Builder and the remaining Automations/Settings customer-recovery blockers.

---

## 2026-09-20 — Custom Builder account-readiness and edit-account integrity

**Task**
Close the remaining Custom Builder launch blockers around connected-account loading, active-save readiness, account-switch post integrity, and existing-campaign account ownership.

**Problem**
The Custom Builder still had four customer-facing integrity gaps after the server guard landed: a failed account-list request could look like no account was connected; active saves did not preflight the current connection for early recovery; changing accounts for a new campaign could leave stale provider-content state; and edit mode exposed an account selector even though the PATCH API does not migrate `instagramAccountId`, creating a false UI promise that could pair a post from one account with an automation still bound to another.

**Options considered**
- Add account migration semantics to the PATCH API during launch hardening.
- Leave the selector in edit mode and rely on server behavior.
- Keep existing account ownership immutable in this launch stage, make edit binding truthful, and harden loading/preflight/picker recovery without changing runtime semantics.

**Volodymyr's decision**
Continue the narrow launch audit without introducing silent account migration or weakening the non-destructive account model. Existing automations should remain attached to their original Instagram identity; customers should reconnect that identity when needed, while new campaigns may still choose among connected accounts.

**Implementation**
PR #64:

- distinguishes account-load failure from a legitimate zero-connected-account state and provides **Try again** / Settings recovery;
- rechecks the selected connected Instagram account before any save whose resulting state is active, while preserving inactive edits and Stop/Pause after disconnect;
- maps stable `INSTAGRAM_RECONNECT_REQUIRED` into customer-readable recovery instead of exposing the internal code;
- clears selected post URL/thumbnail/caption and remounts `PostPicker` when a new campaign changes account;
- restricts account switching to new campaigns;
- makes edit mode display the automation's attached account instead of offering unsupported migration UI;
- avoids provider post reads for a disconnected edit account and points the customer to reconnect before changing provider content or going live;
- adds a small pure helper for connected-account resolution/error mapping plus focused tests;
- leaves schema, worker/provider runtime, licensing/control-plane behavior, and TikTok gates unchanged.

**Test**
PR #64 final head `6be3162bdf47c57ae450138868f37cbea8e20aa4` passed CI run `35538310136` including Prisma validate/generate, TypeScript, lint, tests and production build. Security run `35538309969` passed.

**Result**
PR #64 merged at `8e64d0b52017495bc0048bc790dfb0bb8eb5acc7`. No deployment, live provider test, or fresh-customer manual walkthrough is claimed. The focused audit continues with Automations-list and Settings customer recovery, then Dashboard regression, mobile/basic accessibility, and email deliverability/resend UX.

---

## 2026-09-20 — Automations list / Settings customer recovery

**Task**
Close the remaining customer-recovery blockers in the Automations list and Settings.

**Problem**
Reactivation failures lost the stable reconnect-required reason, account-limit copy contradicted preserved-slot semantics, and Settings reloaded after Disconnect without confirming success.

**Decision**
Keep the non-destructive backend model and make customer recovery reflect it truthfully.

**Implementation**
PR #66 maps `INSTAGRAM_RECONNECT_REQUIRED` to reconnect guidance, corrects preserved-slot plan copy, and reloads after Disconnect only when both HTTP and API success are confirmed. Failed disconnects remain visible and retryable. Focused helper tests cover these decisions. Dashboard recovery/empty states were also reviewed and no new blocker requiring code changes was found.

**Test**
PR #66 head `3320daca236678c39283784489abadb36b10e153` passed CI `35539584486` and Security `35539584447`.

**Result**
PR #66 merged at `91e90bcd847d14a41fad6686a67aa052aef9e8aa`. No deployment or fresh-customer manual validation is claimed. Next: mobile/basic accessibility, then email deliverability/resend UX.

---

## 2026-09-20 — Mobile / basic accessibility launch milestone

**Task**
Close real mobile/responsive and basic-accessibility launch blockers on the primary ReplyHalo customer journey without redesigning the product or changing automation/provider behavior.

**Problem**
The audit found that the off-canvas mobile navigation could leave hidden links keyboard-focusable and lacked explicit Close/Escape/focus-return behavior. Primary automation controls also relied on visual-only selection/switch styling or placeholder-only field names in places, making Custom Builder, Automations, and team invitation controls less understandable to keyboard/screen-reader users.

**Decision**
Keep the existing responsive layout and launch flows. Fix only keyboard/focus safety and programmatic names/states on primary controls; do not expand into a visual redesign, runtime rewrite, schema change, or provider work.

**Implementation**
PR #69 made the mobile sidebar non-interactive while hidden, added explicit Close and Escape behavior, moved focus into the opened navigation and back to Menu on close, exposed `aria-expanded`/`aria-controls`, labeled the main navigation, and added an accessible name to Instagram post search.

PR #70 added programmatic selection/switch semantics and accessible names across the Custom Builder, Automations list, and Settings team invite controls. It also made automation names keyboard-accessible links, exposed status-filter state, added alert/dialog semantics where appropriate, and preserved existing pointer/card behavior and business logic.

No API payload, schema, automation runtime, Instagram provider behavior, licensing/control-plane behavior, analytics model, or TikTok execution gate changed.

**Test**
PR #69 final head `3f7c1fe429bf14360f71070fd96d74a252620e0f` passed CI run `35541233027` and Security run `35541232961` before merge; merge SHA `5bcf272d87eec26b810710eeb995d4a427ca8615`.

PR #70 final head `22c1780a5bc3289da647088bb7207f6cd1d0fcf5` passed CI run `35541638010` and Security run `35541638050` before merge; merge SHA `bf9788f036c8180b648e088e02b2eb6aaea369ae`.

**Result**
The focused mobile/basic-accessibility launch stage is closed in code. No deployment, fresh-customer manual staging walkthrough, or manual accessibility certification is claimed for PR #69/#70. The next launch-readiness stage is email sign-in deliverability/domain/resend UX, followed by staging deployment and the fresh-customer walkthrough. TikTok live provider work remains out of scope and both source-controlled TikTok send gates remain false.
