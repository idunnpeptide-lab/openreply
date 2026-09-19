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
- prepared this evidence checkpoint immediately after the significant stage, per Volodymyr's permanent rule.

**Repository evidence**

PR #29, head SHA `af92401ce4ce107e228ad32f8b989e3bd228cf2f`, merge SHA `48a3e38143d65f240b38658e16d606e0d8a5e629`, CI run `35431525663`, Security run `35431525669`.
