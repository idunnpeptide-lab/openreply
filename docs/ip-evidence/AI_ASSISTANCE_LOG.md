# AI Assistance Log

Project owner: **Volodymyr Rudyi**
AI development assistance: **ChatGPT (OpenAI)**

## Authorship / decision model

ReplyHalo is developed by **Volodymyr Rudyi** with AI development assistance.

Volodymyr Rudyi is the project owner and the human who:

- defines product requirements and priorities;
- decides what should and should not be implemented;
- makes product and architecture decisions;
- provides business constraints and manual test scenarios;
- performs or organizes live/manual validation;
- reviews outcomes and approves results before continuing.

**ChatGPT (OpenAI)** is used as AI development assistance for:

- repository/code analysis;
- implementation assistance;
- debugging and root-cause analysis;
- tests and regression coverage;
- documentation and technical checkpoint preparation;
- architecture/safety options;
- GitHub PR and evidence preparation when repository access is available.

AI assistance does not replace Volodymyr Rudyi's role as owner, requirement setter, decision maker, tester/reviewer, and approver.

## Evidence rules

- Do not describe ChatGPT as the project owner or independent human contributor.
- Do not claim manual testing unless Volodymyr explicitly performed/confirmed it.
- Do not claim deployment unless deployment evidence exists.
- Do not invent dates, screenshots, commits, PRs, tests, approvals, or third-party contributions.
- Never store passwords, API keys, license/activation codes, OAuth secrets/tokens, database credentials, encryption keys, or other secrets in this log.
- Detailed prior versions remain available in Git history; this file keeps the cumulative authorship record needed for continuation.

---

## 2026-09-18 — Instagram staging debugging and fixes

**Human role — Volodymyr Rudyi**

- defined expected Instagram automation behavior;
- performed live staging tests;
- reported follow-up gaps;
- validated Follow Gate, tracked links, safe disconnect/reconnect, and post-reconnect delivery.

**AI assistance — ChatGPT (OpenAI)**

- inspected worker/disconnect implementation;
- identified direct-reveal follow-up scheduling gap;
- identified retained BullMQ terminal job IDs as the returning-user follow-up blocker;
- identified cascade-deletion risk in destructive disconnect;
- prepared code changes, tests, PRs, and technical explanations;
- prepared the staging release marker used before manual disconnect QA.

**Repository evidence**
PRs #6, #7, #8, #9.

---

## 2026-09-18 to 2026-09-19 — TikTok provider foundation and staging safety

**Human role — Volodymyr Rudyi**

- directed the product toward adding TikTok as another provider;
- required the working Instagram path to remain protected;
- required official provider APIs only;
- retained final approval over any live TikTok execution.

**AI assistance — ChatGPT (OpenAI)**

- analyzed the existing ReplyHalo architecture;
- implemented additive TikTok OAuth/account/client/webhook/ingress/dedupe/routing/campaign/read foundations;
- implemented staging UI, hard-gated execution boundary, sanitized diagnostics, runbook, signed-webhook readiness semantics, non-destructive disconnect/reconnect, webhook configure/readback controls, and doubly locked controlled-send boundary;
- added regression tests and CI/Security checkpoints;
- kept both live-send gates false and avoided unsafe provider-send auto-retry/exactly-once claims.

**Repository evidence**
PRs #20–#27, #29, #31, #33, #35, #37, #39, #41, #43 and their separate evidence checkpoint PRs.

No live TikTok OAuth/webhook/provider send is claimed.

---

## 2026-09-19 — Evidence-history rule

**Human role — Volodymyr Rudyi**

Volodymyr explicitly required every meaningful development stage to produce a truthful GitHub evidence checkpoint, identify human vs AI contribution, avoid secrets, and record manual validation only when it really occurred.

**AI assistance — ChatGPT (OpenAI)**

Implemented and maintained the repository evidence structure:

- `PROJECT_PROGRESS.md`
- `docs/ip-evidence/R&D_LOG.md`
- `docs/ip-evidence/AI_ASSISTANCE_LOG.md`
- `docs/ip-evidence/IP_EVIDENCE.md`

**Repository evidence**
PR #28 and later dedicated evidence PRs.

---

## 2026-09-20 — Launch onboarding / Quick Automations milestone

**Human role — Volodymyr Rudyi**

- prioritized launch simplicity and reducing Meta/provider complexity for customers;
- approved one-click connection, health/reconnect guidance, Quick Automations, templates, simple analytics, and preservation-first repair before broader features;
- retained final approval over live staging/customer activation.

**AI assistance — ChatGPT (OpenAI)**

- inspected the existing OAuth, dashboard, Settings, Campaign Builder, post picker, automation API, and soft-disconnect architecture;
- implemented Dashboard first-run onboarding, workspace-scoped Instagram health, four Quick Automations, runtime/post-picker reuse, `{link}` integrity guard, account-switch selection safety, and connected-only shell counting;
- diagnosed and corrected the initial PR #45 lint failure rather than suppressing the rule;
- merged only after CI/Security green and prepared evidence.

**Repository evidence**
PR #45; final head `d521fa5b48b55c59a66637b75bc68ca6bb0b609a`; CI `35521687018`; Security `35521687004`; merge `8883da17b8d435755263a53137aa6373d112b084`.

---

## 2026-09-20 — Instagram health / self-service reconnect milestone

**Human role — Volodymyr Rudyi**

- prioritized customer-readable connection health and clean reconnect/error UX;
- required Meta/API implementation complexity to remain hidden;
- retained final approval over fresh-customer manual staging.

**AI assistance — ChatGPT (OpenAI)**

- translated sanitized health state into customer-facing Connection/Authorization/Automation readiness;
- added one clear Connect/Reconnect path and preserved-history explanation;
- removed customer-facing environment-variable names/raw provider reasons;
- corrected a lint failure without suppressing the rule;
- merged only after CI/Security green and prepared evidence.

**Repository evidence**
PR #47; head `9b814eb580c8bb44ca33df47d2fa2ef0185c3372`; CI `35523019203`; Security `35523019202`; merge `d2fa7a671e1ce6f7b1541e4c089559bad8295741`.

---

## 2026-09-20 — Launch empty/error-state and analytics presentation milestone

**Human role — Volodymyr Rudyi**

- approved the launch-first sequence and narrow MVP scope;
- prioritized a short first-run path over visual builder/CRM/AI expansion;
- retained final authority over fresh-customer staging and launch approval.

**AI assistance — ChatGPT (OpenAI)**

- inspected existing Dashboard/Automations APIs and confirmed required metrics already existed;
- made Quick Automations primary while retaining Import/Custom builder;
- added recoverable load/action/filter states and zero-data presentation;
- reused existing analytics/runtime instead of adding new persistence/background processing;
- ran CI/Security and merged only after green;
- prepared evidence.

**Repository evidence**
PR #49; head `4812d60ca790bd508e05e6a826660923073f5fa3`; CI `35524959374`; Security `35524959433`; merge `3d5a75ba1379f8137997e778ca0369b08ead4eeb`.

---

## 2026-09-20 — ReplyHalo plan-readiness / activation-copy milestone

**Human role — Volodymyr Rudyi**

- required completion of the existing `feat/launch-readiness-plan-copy` branch before starting a new stage;
- required plan readiness before Instagram, customer-facing ReplyHalo activation language, preservation of customer data, and no raw licensing/provider errors;
- retained final authority over fresh-customer staging/commercial launch.

**AI assistance — ChatGPT (OpenAI)**

- verified current `openreply` and `dm-magnet-system` source-of-truth state;
- confirmed the handoff branch was unmerged and had no PR;
- inspected the existing diff and opened PR #51 without rewriting the branch;
- identified/fixed a fail-open `/api/license/status` onboarding edge case in the same branch;
- preserved workspace licensing internals while keeping customer UX on ReplyHalo activation/plan language;
- ran CI/Security, merged only after green, and prepared the separate evidence checkpoint.

**Repository evidence**
PR #51; final head `0bf05ea82021bb7b2912ac424df805a20d1ecfe7`; CI `35528589277`; Security `35528589275`; merge `be4417503533e35a516cb070d180192cfbc35531`. Evidence PR #52 merged at `4920002f408326e6bfd7fb07920cafcad4799e4d`.

No deployment/manual staging success is claimed.

---

## 2026-09-20 — Launch auth / plan recovery milestone

**Human role — Volodymyr Rudyi**

- established the launch-priority requirements already governing this audit: plan readiness before Instagram, customer-facing ReplyHalo language, provider/licensing internals hidden, preserved customer work, and fixes limited to real launch blockers;
- retained final authority over fresh-customer manual staging and commercial release;
- did not perform or claim manual validation for this code milestone.

**AI assistance — ChatGPT (OpenAI)**

- continued from the exact post-PR #52 checkpoint and audited the actual authentication, plan-status, activation, and Instagram OAuth entry/callback paths;
- found the stale OpenReply `/verify-request` surface and missing resend guidance;
- found the Settings fail-open presentation where failed plan-status loading could look like `Local mode`;
- found customer-visible leakage of OAuth environment-variable names and callback/provider exception text;
- found remaining activation-key wording and raw licensing `error.message` in the activation API response;
- implemented narrow fixes without redesigning licensing, changing schema, rewriting the Instagram worker/runtime, changing provider permissions, or touching TikTok execution gates;
- preserved detailed callback failure evidence server-side while removing it from customer URLs;
- ran final PR #53 through CI/Security and merged only after both were green;
- prepared this separate evidence checkpoint.

**Repository evidence**

- PR #53
- final head `73ac74d3ef9db34c49802577ff20b3703c7ea985`
- CI `35529338503` — success
- Security `35529338567` — success
- merge `f39c65320728ceb92abf71c9c1526a97d2666bec`

No deployment, fresh-customer walkthrough, or screenshot artifact is claimed for PR #53.
