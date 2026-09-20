# AI Assistance Log

Project owner: **Volodymyr Rudyi**
AI development assistance: **ChatGPT (OpenAI)**

## Authorship / decision model

ReplyHalo is developed by **Volodymyr Rudyi** with AI development assistance.

Volodymyr Rudyi is the project owner and the human who:

- defines product requirements and priorities;
- decides what should and should not be implemented;
- chooses the product direction and accepts/rejects technical options;
- provides test scenarios and business constraints;
- performs or requests live/manual validation;
- reviews outcomes and approves the result before continuing.

**ChatGPT (OpenAI)** is used as AI development assistance for tasks such as:

- repository/code analysis;
- implementation drafts and code changes;
- debugging and root-cause analysis;
- test design and regression coverage;
- documentation and technical checkpoint preparation;
- evaluation of implementation options and safety boundaries;
- GitHub PR/checkpoint preparation when the repository connection is available.

The use of AI assistance does not replace Volodymyr Rudyi's role as project owner, requirement setter, decision maker, tester, and approver.

## Evidence rules

- Do not describe AI output as an independent human contributor.
- Do not claim a test was manually performed unless Volodymyr Rudyi explicitly performed/confirmed it.
- Do not claim a deployment occurred unless there is deployment evidence or explicit human confirmation.
- Do not invent dates, screenshots, commits, PRs, test results, or approvals.
- Do not store passwords, API keys, license keys, OAuth secrets, tokens, or other sensitive credentials in this log.
- If a third-party human developer contributes, identify that contribution truthfully when evidence is available.

---

## 2026-09-18 — Instagram staging debugging and fixes

**Human role — Volodymyr Rudyi**

- defined the expected Instagram automation behavior;
- performed live staging tests with test Instagram accounts;
- reported missing/working follow-ups;
- validated Follow Gate behavior;
- validated tracked link behavior;
- validated safe disconnect/reconnect behavior;
- confirmed post-reconnect public reply and DM delivery.

**AI assistance — ChatGPT (OpenAI)**

- inspected worker/disconnect implementation;
- identified the direct-reveal follow-up scheduling gap;
- identified retained BullMQ terminal job IDs as the repeat-follow-up blocker;
- identified cascade-deletion risk in the original disconnect implementation;
- prepared code changes, regression tests, PRs, and technical explanations;
- added the staging release marker used before manual disconnect QA.

**Repository evidence**

PRs #6, #7, #8, #9.

---

## 2026-09-18 — TikTok provider foundation

**Human role — Volodymyr Rudyi**

- directed the product toward adding TikTok as another provider;
- required the existing Instagram path to remain protected;
- continued the development sequence after reviewing prior milestones;
- retains final approval over enabling live TikTok behavior.

**AI assistance — ChatGPT (OpenAI)**

- analyzed the existing ReplyHalo architecture;
- implemented additive TikTok ingress, normalization, dedupe, routing, guarded campaign APIs, and safe read APIs;
- added unit/regression tests;
- kept live send execution behind staging/provider approval gates;
- created PR/checkpoint documentation.

**Repository evidence**

PRs #20–#27 and `docs/TIKTOK_FOUNDATION_CHECKPOINT_2026-09-18.md`.

---

## 2026-09-19 — Evidence-history rule

**Human role — Volodymyr Rudyi**

Volodymyr explicitly required that every significant completed development stage automatically produce a GitHub evidence checkpoint. He specified the required files, the truthfulness standard, the prohibition on secrets, the requirement to identify human validation, and the wording that the product is developed by him with AI assistance.

**AI assistance — ChatGPT (OpenAI)**

Implemented the repository-level evidence structure and incorporated this rule into project documentation/agent guidance so future milestones are expected to update the evidence set automatically.

**Repository evidence**

PR #28, merge SHA `a43ff6c1fcc0dd3efcd8e9516c4e7c0544797eea`.

---

## 2026-09-19 — TikTok staging UI milestone

**Human role — Volodymyr Rudyi**

- instructed ChatGPT to continue the development autonomously until his participation is actually required;
- had already chosen the additive TikTok direction and the requirement not to destabilize Instagram;
- retained the decision that live TikTok execution must not be enabled before real provider staging/approval;
- did not perform or claim a live TikTok provider validation for this UI milestone.

**AI assistance — ChatGPT (OpenAI)**

- analyzed the existing TikTok account/video/automation APIs and dashboard patterns;
- implemented the dedicated TikTok staging page, capability/readiness surface, official owned-video loading, and campaign management UI;
- added a non-secret staging-status endpoint and client-safe readiness model;
- kept `TIKTOK_LIVE_EXECUTION_ENABLED=false` and omitted Comment-to-Message as an executable action;
- added regression tests and opened PR #29;
- investigated a failed React lint run, chose to refactor the data flow rather than suppressing the lint rule, then re-ran CI/Security to green;
- merged the milestone only after CI and Security succeeded;
- prepared the evidence checkpoint immediately after the significant stage, per Volodymyr's permanent rule.

**Repository evidence**

PR #29, head SHA `af92401ce4ce107e228ad32f8b989e3bd228cf2f`, merge SHA `48a3e38143d65f240b38658e16d606e0d8a5e629`, CI run `35431525663`, Security run `35431525669`.

---

## 2026-09-19 — Hard-gated TikTok action executor milestone

**Human role — Volodymyr Rudyi**

- told ChatGPT to continue the development without his participation until a genuinely human/provider step is reached;
- had already approved the additive TikTok architecture and protection of the working Instagram path;
- retained final authority over when live TikTok execution may be enabled;
- did not perform a live TikTok provider send test for this milestone.

**AI assistance — ChatGPT (OpenAI)**

- inspected persisted TikTok routing plan shape, current match statuses, official-client reply functions, and Business Messaging send functions;
- designed a separate execution boundary instead of wiring routing directly to provider sends;
- implemented plan validation, current-capability re-check, database row serialization, terminal-status replay suppression, and structured diagnostics;
- explicitly kept `TIKTOK_LIVE_EXECUTION_ENABLED=false` in the production wrapper;
- deliberately did not wire the executor into a queue/cron/UI action and did not enable Comment-to-Message;
- recognized that the current provider clients do not expose a persisted provider idempotency key, and therefore avoided automatic provider-send retries rather than pretending exactly-once delivery could be guaranteed across a hard crash;
- added focused tests and ran PR #31 through CI and Security before merge;
- prepared the required evidence checkpoint after merge.

**Repository evidence**

PR #31, head SHA `a40f274ba8cc2aa0ce73638eac2326c6dda89a92`, merge SHA `346f1cc998dc28b99dbff9902411fcb1266ad1e5`, CI run `35431963722`, Security run `35431963663`.

---

## 2026-09-19 — TikTok execution diagnostics milestone

**Human role — Volodymyr Rudyi**

- instructed ChatGPT to continue development autonomously;
- had already required safe milestone evidence capture after every significant stage;
- retained the requirement that live TikTok execution stay disabled until real provider staging and his validation;
- did not perform or claim a live TikTok provider validation for this diagnostics milestone.

**AI assistance — ChatGPT (OpenAI)**

- rebased the prepared diagnostics work onto the latest evidence checkpoint before opening PR #33;
- implemented workspace-scoped sanitized TikTok match/worker diagnostics and the `/tiktok` read-only diagnostics surface;
- explicitly removed comment/DM text, action-message text, actor/conversation identifiers, provider credentials, and arbitrary raw payload fields from the diagnostic response;
- added regression tests for workspace scoping, sanitization, and bounded result size;
- diagnosed two TypeScript inference failures surfaced by CI and fixed them with explicit narrow union types rather than weakening type safety;
- re-ran CI and Security until both passed, then merged PR #33;
- prepared this evidence checkpoint immediately after merge.

**Repository evidence**

PR #33, final head SHA `bcf67ee27cee10b153dee6f8e82467e85e183e38`, merge SHA `5572c398b56e214a3bea33c318c8c99b23da1c16`, CI run `35432848811`, Security run `35432848785`.

---

## 2026-09-19 — TikTok live-staging handoff runbook

**Human role — Volodymyr Rudyi**

- instructed ChatGPT to continue all useful autonomous work until his participation is genuinely necessary;
- retained final authority over provider setup choices and over any future enabling of live TikTok sends;
- required that secrets never be committed and that future manual screenshots/tests be recorded only as real human evidence;
- did not perform or claim TikTok developer-app authorization, webhook delivery, or live provider send for this documentation milestone.

**AI assistance — ChatGPT (OpenAI)**

- inspected the actual ReplyHalo TikTok OAuth callback, environment helper, webhook receiver, webhook-signature/configuration helpers, status/readiness logic, and staging UI;
- checked current official TikTok API for Business documentation for v1.3 account OAuth/token handling, TikTok-account webhooks, Business Messaging, and Comment-to-Message;
- prepared `docs/TIKTOK_LIVE_STAGING_RUNBOOK.md` with the exact current staging callback URLs and a no-secrets deployment checklist;
- separated desired scopes from actually granted provider permissions;
- defined inert comment/DM E2E steps that preserve `TIKTOK_LIVE_EXECUTION_ENABLED=false`;
- defined the conditions that must be met before a later controlled public-reply/DM send test can be approved;
- added a human-evidence checklist that excludes secrets and private message content;
- ran the documentation PR through CI and Security before merge and then prepared this required evidence checkpoint.

**Repository evidence**

PR #35, head SHA `946e17780629601b0af20847745df486cf3a8a58`, merge SHA `a9100d35ac5c6c513e2ce1d2f0ceedc58ad2d4a4`, CI run `35433279605`, Security run `35433279575`.

---

## 2026-09-19 — TikTok signed-webhook readiness confirmation milestone

**Human role — Volodymyr Rudyi**

- instructed ChatGPT to continue autonomously until the real TikTok for Business/provider step is reached;
- retained final authority over the later provider setup and any controlled live-send approval;
- did not perform or claim a real TikTok webhook delivery or OAuth connection for this code milestone.

**AI assistance — ChatGPT (OpenAI)**

- identified that `/tiktok` exposed `webhookConfigured`, but the application had no trustworthy runtime transition from “not confirmed” to confirmed after a real provider delivery;
- implemented readiness confirmation only after the existing TikTok signature-verification boundary and only after successful handoff of a supported webhook event to the isolated TikTok ingress queue;
- limited confirmation to `comment.update`, `im_receive_msg`, and `im_receive_msg_eu`;
- made the database update idempotent so already-confirmed accounts do not have their timestamps churned by later webhook traffic;
- added focused tests covering supported events, unsupported events, and already-confirmed accounts;
- kept `TIKTOK_LIVE_EXECUTION_ENABLED=false`, added no provider-send wiring, and changed no Instagram path;
- ran PR #37 through CI and Security and merged only after both succeeded;
- prepared the required evidence checkpoint immediately after merge.

**Repository evidence**

PR #37, head SHA `13a0bcb50c06f46add4ec201d241e3b1aecd9b04`, merge SHA `7ee473003d132aad79b35e2612e5d5371bc2d481`, CI run `35433666350`, Security run `35433666428`.

---

## 2026-09-19 — Safe TikTok disconnect/reconnect milestone

**Human role — Volodymyr Rudyi**

- instructed ChatGPT to keep progressing autonomously until a real TikTok provider/human action is required;
- had already established the product requirement that disconnect/reconnect must preserve history rather than destroy it;
- retained final authority over later live TikTok OAuth/disconnect/reconnect validation and any provider-send approval;
- did not perform or claim a real TikTok disconnect/reconnect test for this code milestone.

**AI assistance — ChatGPT (OpenAI)**

- inspected TikTok account relations and identified that deleting `TikTokAccount` would cascade-delete `TikTokAutomation` and `TikTokAutomationMatch` history;
- designed a migration-free soft-disconnect model using expired local token state while preserving the provider `openId` row and DM Magnet social identity;
- implemented owner/admin disconnect, encrypted sentinel token replacement, expiry/capability/webhook reset, and connected-account filtering;
- ensured disconnected/expired TikTok rows are excluded from account/provider-read and webhook resolution paths;
- implemented same-account OAuth reconnect so fresh credentials restore the preserved row while webhook readiness and Comment-to-Message eligibility must be proven again;
- added a visible non-destructive disconnect control in `/tiktok`;
- added focused regression tests and kept `TIKTOK_LIVE_EXECUTION_ENABLED=false` with no send wiring;
- ran PR #39 through CI and Security and merged only after both succeeded;
- prepared the required evidence checkpoint immediately after merge.

**Repository evidence**

PR #39, head SHA `8d077a3c4d803f615471ed02218add5086abead4`, merge SHA `ce91619f4ada085e039114e1e11ab606c6c1f831`, CI run `35435285708`, Security run `35435285684`.

---

## 2026-09-19 — TikTok webhook staging-control milestone

**Human role — Volodymyr Rudyi**

- instructed ChatGPT to continue autonomous development until actual TikTok for Business/provider participation is necessary;
- retained final authority over the later live provider session and any controlled send approval;
- required the no-secrets evidence model and the distinction between configuration state and real runtime proof;
- did not perform or claim a real TikTok provider configuration or webhook delivery for this code milestone.

**AI assistance — ChatGPT (OpenAI)**

- rechecked current TikTok API for Business documentation for TikTok-account and Business Messaging webhook configuration APIs;
- identified that the official webhook update/list helpers existed but were not exposed in a safe staging workflow;
- designed a staging-only owner/admin API instead of a generic customer-facing webhook editor;
- made the server derive the expected callback from ReplyHalo's staging base URL so the browser cannot redirect provider webhooks to an arbitrary target;
- required a currently connected TikTok staging account before mutating the globally configured provider app;
- configured only the `COMMENT` and `DIRECT_MESSAGE` families and verified them with provider readback;
- sanitized browser output to event state/callback/error code instead of returning raw provider payloads or credentials;
- added the `/tiktok` **Read provider config** and **Configure + verify** controls;
- preserved the separate signed-delivery rule for `webhookConfigured=true` and left `TIKTOK_LIVE_EXECUTION_ENABLED=false`;
- added focused regression tests, ran PR #41 through CI and Security, and merged only after both succeeded;
- prepared the required evidence checkpoint after merge.

**Repository evidence**

PR #41, head SHA `f5bd50842f18db776476657f4bff1e5bcab4c9f0`, merge SHA `85aec2d01047dfed5b410ec38dc5f9b0369ebe1d`, CI run `35437528458`, Security run `35437528438`.

---

## 2026-09-19 — Doubly locked TikTok controlled-send milestone

**Human role — Volodymyr Rudyi**

- instructed ChatGPT to continue all code-only work until actual TikTok for Business/provider participation is required;
- retained final authority over the live provider session and any later decision to enable controlled TikTok sends;
- had already required that no live send gate be enabled before real provider validation and that milestone evidence remain truthful/no-secrets;
- did not perform or claim a TikTok provider send or live provider validation for this code milestone.

**AI assistance — ChatGPT (OpenAI)**

- identified the remaining code-only handoff gap between inert durable `MATCHED` records and a future deliberately tiny controlled-send session;
- chose not to expose a generic send endpoint or browser-supplied reply content;
- added a staging-only owner/admin one-shot endpoint that accepts only a workspace-scoped durable match ID plus an exact confirmation phrase;
- added a second source-controlled gate `TIKTOK_CONTROLLED_STAGING_SEND_ENABLED=false` alongside the already-disabled live execution gate;
- made the route refuse terminal matches, disconnected accounts, and accounts without real signed-webhook runtime readiness before either gate can be passed;
- added an inert `/tiktok` controlled-send panel that exposes no executable button while the gates are false;
- strengthened the action executor so connection and signed-webhook readiness are rechecked inside the same row-locked execution transaction, preventing a future alternate caller from bypassing the staging route checks;
- preserved single-attempt/no-auto-retry semantics and continued to exclude Comment-to-Message;
- added focused regression tests and ran PR #43 through CI and Security before merge;
- did not change either send gate from false and did not claim a real TikTok send.

**Repository evidence**

PR #43, head SHA `4a5c564fc560b1afd87cac788fe4299601e59f1d`, merge SHA `615266363e943ddb406406b86f4657b9cd441a3a`, CI run `35438125753`, Security run `35438125762`.

---

## 2026-09-20 — Launch onboarding / Quick Automations milestone

**Human role — Volodymyr Rudyi**

- asked for a current comparison of Buzzfy, ManyChat, SendPulse, ChatPlace, SmartSender and ReplyHalo specifically to reduce launch friction;
- decided that ReplyHalo should hide Meta/TikTok developer complexity from customers and prioritize one-click connection, connection health, quick automations, onboarding, simple analytics, templates and clean reconnect UX before broader features;
- explicitly instructed ChatGPT to implement the launch-priority work (`роби`);
- retains final approval over live staging/customer activation and did not claim a new live Instagram staging test for this milestone.

**AI assistance — ChatGPT (OpenAI)**

- inspected the existing Instagram OAuth, dashboard, Settings, Campaign Builder, post picker, automation API and soft-disconnect architecture;
- reused the existing `/api/instagram/connect` OAuth path rather than introducing customer-side Meta developer configuration;
- implemented a workspace-scoped Instagram connection-health model/API that exposes no token value;
- implemented Dashboard first-run onboarding and self-service reconnect guidance;
- implemented four template-driven Quick Automations using the existing Instagram post picker and `/api/automations` runtime;
- kept the full Campaign Builder as the advanced/custom path instead of replacing the proven runtime;
- added guards for tracked-link token placement and account-switch/post-selection integrity;
- corrected dashboard-shell connected-account counting so soft-disconnected preserved rows are not presented as active connections;
- added focused regression coverage;
- investigated the first PR #45 lint failure, replaced raw internal anchors with Next `Link`, then reran CI/Security until green;
- merged only after the final CI and Security runs succeeded and prepared the required evidence checkpoint.

**Repository evidence**

PR #45, final head SHA `d521fa5b48b55c59a66637b75bc68ca6bb0b609a`, merge SHA `8883da17b8d435755263a53137aa6373d112b084`, final CI run `35521687018`, Security run `35521687004`. Initial CI run `35521482936` failed lint and is retained as truthful development-history evidence rather than hidden.
