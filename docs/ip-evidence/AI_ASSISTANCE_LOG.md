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
- investigated a failed React lint run, chose to refactor the data flow rather than suppress the lint rule, then re-ran CI/Security to green;
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
