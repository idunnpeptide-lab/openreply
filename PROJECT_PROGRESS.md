# ReplyHalo — Project Progress

Last updated: 2026-09-20
Owner / product decision maker: **Volodymyr Rudyi**
AI development assistance: **ChatGPT (OpenAI)**

## Working model

ReplyHalo is developed by Volodymyr Rudyi with AI development assistance. Volodymyr defines requirements and priorities, chooses the direction, performs or requests live/manual validation, and accepts or rejects results. ChatGPT (OpenAI) assists with code analysis, implementation, tests, documentation, debugging, and technical options.

This file records only work supported by repository history, CI, deployment evidence, or explicit human validation. It must not contain secrets, passwords, API keys, license keys, or fabricated/backfilled evidence.

## Current product state

### Instagram provider

Core Instagram staging behavior has been validated by Volodymyr Rudyi during live manual QA on 2026-09-18, including comment-triggered DM flows, Follow Gate behavior for followers/non-followers, tracked links/click tracking, follow-ups, safe disconnect/reconnect, and post-reconnect automation delivery.

Important fixes from that QA and launch work:

- PR #6 — follow-up scheduling for direct comment reveals; merge SHA `3ca7ca56ddb6de87f2e970413119eea07fad3213`.
- PR #7 — repeat follow-ups for returning users; merge SHA `940674886d8aa47d086d8a88db040ca36a1e2294`.
- PR #8 — soft Instagram disconnect preserving campaigns/history; merge SHA `b5453b0b2fefe85f3b624fb07c4b07def29ef207`.
- PR #9 — staging release marker used before live disconnect QA; merge SHA `29938e7251855de89bf1338ad5801e26173fbaad`.
- PR #45 — launch onboarding, Instagram connection-health API/model, four Quick Automations, and connected-only account counting; merge SHA `8883da17b8d435755263a53137aa6373d112b084`.
- PR #47 — customer-facing Instagram connection-health and self-service reconnect UX; merge SHA `d2fa7a671e1ce6f7b1541e4c089559bad8295741`.
- PR #49 — launch-first Automations empty/error states and tighter Dashboard/Campaign analytics presentation; merge SHA `3d5a75ba1379f8137997e778ca0369b08ead4eeb`.
- PR #51 — ReplyHalo plan-readiness before Instagram connect, first-time login and template copy polish, customer-facing activation language/error sanitization, and fail-closed plan verification; merge SHA `be4417503533e35a516cb070d180192cfbc35531`.
- PR #53 — launch auth/plan recovery fixes, customer-safe OAuth error handling, and fail-closed Settings plan verification; merge SHA `f39c65320728ceb92abf71c9c1526a97d2666bec`.
- PR #55 — account-slot limit recovery guidance aligned with preserved social-account identity; merge SHA `b5563d88f079f1773220c44e921c89f1c19539a3`.
- PR #58 — Quick Automation account-loading recovery, connected-account activation preflight, account-switch post-picker isolation, and client-side HTTPS validation; merge SHA `e9f4f09d44f1ce4b07b5ec54781ab68abb79673f`.
- PR #62 — server-side fail-closed automation activation guard for preserved soft-disconnected Instagram rows; merge SHA `fb7f9b954351728456766143f234aa415b7d972e`.

Human validation evidence from the earlier Instagram staging session includes Volodymyr confirming that, after reconnect, the public comment reply, first private message, and subsequent configured message arrived successfully. PR #45/#47/#49/#51/#53/#55/#58/#62 launch UX/runtime-guard changes have automated CI evidence but have **not yet** been manually staging-validated as a fresh customer flow; no new live provider test is claimed for those milestones.

### Launch UX / pre-launch readiness

PR #45 moved ReplyHalo's first-run experience toward the intended SaaS model where provider complexity stays on ReplyHalo's side rather than the customer's side. PR #47 made connection repair customer-readable instead of developer-facing. PR #49 then made Quick Automations the primary creation path and tightened launch analytics/error handling without introducing a second analytics subsystem. PR #51 added plan-readiness as a prerequisite to Instagram connection and removed remaining internal licensing language from the normal customer path.

PR #53 continued the same launch-readiness audit without changing the licensing architecture: it closed authentication recovery, Settings plan-check, and customer-facing OAuth error-leakage blockers found during the focused audit.

PR #55 completed the account-slot / plan-limit audit. The central License Server already enforced the standard `SOLO=1`, `CREATOR=3`, and `AGENCY=10` defaults transactionally, treated reconnecting the same provider account as an existing binding, and preserved account-slot identity across local disconnect. The launch blocker was customer guidance that incorrectly suggested local disconnect would free a slot; PR #55 corrected that guidance without changing the backend model.

PR #58 completed the focused Quick Automations regression stage. The four existing launch templates and proven `/api/automations` runtime remain unchanged; the wizard now distinguishes a real account-list load failure from an empty connected-account state, fails closed if the selected account disconnects before activation, remounts the post picker when accounts change so stale posts cannot be selected, and validates tracked-link HTTPS input before submission.

PR #62 closed the matching server-side activation boundary. Creating an active automation or leaving an automation active through PATCH now requires the preserved Instagram account row to still have an active local connection. Soft-disconnected rows may remain attached to inactive drafts/duplicates, and customers can still pause an active automation after disconnect. Bulk import was audited separately and was already fail-closed through `getWorkspaceInstagramAccount()`.

Current launch path now includes:

- first-time login copy aimed at creators and individual users rather than company-only language;
- passwordless sign-in explained as a secure one-time email link and automatic workspace creation for new users;
- ReplyHalo-branded verify-request copy with spam/junk guidance and a clear **Send a new sign-in link** recovery path;
- ReplyHalo plan-readiness checked before exposing Instagram connection as the next customer action;
- a fail-closed plan-check state that sends the customer to Settings instead of exposing Connect Instagram when plan verification cannot be completed;
- Settings plan-status failures show **Check required / Check plan** instead of being mistaken for Local mode, and Instagram connection remains unavailable until readiness is known and acceptable;
- customer-facing **ReplyHalo activation code**, **Connected account slots**, and **Plan renewal** terminology while preserving the internal licensing architecture;
- account-slot recovery copy that explains an already-linked account can reconnect without consuming another slot, while a different account requires available plan capacity or controlled migration/support;
- normalized customer messages for suspended, revoked, expired, already-assigned, account-limit, migration-required, not-found and temporary service failures rather than raw licensing error codes;
- Dashboard **Connect Instagram** as the first provider action after plan readiness when no active Instagram connection exists;
- reuse of the existing ReplyHalo-owned Instagram OAuth route instead of asking customers to create Meta developer apps or provide developer secrets;
- a three-step onboarding path: connect account → choose automation → activate;
- workspace-scoped Instagram health reporting for connection state, token expiry, and webhook subscription without returning token material;
- self-service attention/reconnect guidance when a connected account is not fully ready;
- Settings health cards showing Connection, Authorization, and Automation readiness with `Ready`, `Needs attention`, or `Disconnected` states;
- one obvious **Connect / Reconnect Instagram** repair action while reminding users that campaigns, logs, clicks and history stay preserved;
- customer-facing OAuth failure notices that no longer expose environment-variable names or raw provider/internal exception strings;
- customer-facing plan notices branded as ReplyHalo rather than the older internal DM Magnet name;
- a dedicated **Quick Automations** entry point and primary creation CTA on the Automations page;
- four launch templates:
  - Comment → DM;
  - Comment → Follow Gate → DM;
  - Comment → Tracked Link;
  - Comment → Link → Follow-up;
- launch-oriented default template copy written as normal creator/customer flows rather than technical demos;
- reuse of the existing official Instagram post picker and existing `/api/automations` creation/runtime path;
- the full Campaign Builder retained as an explicit **Custom builder** secondary path;
- tracked-link `{link}` integrity guard plus early malformed/non-HTTPS destination rejection;
- account-switch behavior that clears the previously selected post and remounts the post picker for the newly selected account;
- Quick Automations account-list failures show a recoverable **Try again** / Settings path instead of pretending no Instagram account exists;
- Quick Automations recheck the selected connected Instagram account immediately before activation and fail closed if connection state changed;
- server-side automation create/update refuses an active state when the attached Instagram account is soft-disconnected, returning stable `INSTAGRAM_RECONNECT_REQUIRED` instead of silently accepting a non-runnable active campaign;
- inactive drafts/duplicates keep their preserved provider identity, and Pause/Stop remains available after disconnect;
- dashboard-shell connected-account count that excludes preserved soft-disconnected rows;
- recoverable Dashboard and Automations load/error states with retry and connection-repair paths;
- a first-run Automations empty state that points to Quick Automations first rather than the advanced builder;
- a no-results state that can clear search/status filters;
- launch-oriented Dashboard metrics prioritizing Active Automations, DMs Sent, Link Clicks, CTR, Failed, and Skipped;
- campaign-card funnel presentation ordered around runs → sent → clicks → CTR, with failed/skipped surfaced when relevant;
- explicit zero-activity states for the 7-day DM chart and recent activity instead of blank panels.

PR #45 final head `d521fa5b48b55c59a66637b75bc68ca6bb0b609a` passed CI run `35521687018` and Security run `35521687004` before merge. The initial CI attempt `35521482936` failed lint on internal raw links, was corrected, and is retained as truthful engineering history.

PR #47 final head `9b814eb580c8bb44ca33df47d2fa2ef0185c3372` passed CI run `35523019203` and Security run `35523019202` before merge. Its earlier head `b82b3376e3b17175c9659f9bde724a39cc8878fc` failed lint on one unescaped apostrophe, which was corrected without suppressing the rule.

PR #49 head `4812d60ca790bd508e05e6a826660923073f5fa3` passed CI run `35524959374` and Security run `35524959433` before merge. The change reused the existing Dashboard and per-automation analytics data rather than adding schema, provider, or worker complexity.

PR #51 final head `0bf05ea82021bb7b2912ac424df805a20d1ecfe7` passed CI run `35528589277` and Security run `35528589275` before merge. During review, a fail-open edge case was found in launch onboarding: a failed `/api/license/status` request could otherwise leave the Instagram connect path available after the readiness request finished. The same branch was corrected so failed plan verification now blocks provider connection and points the customer to Settings without exposing raw internals.

PR #53 final head `73ac74d3ef9db34c49802577ff20b3703c7ea985` passed CI run `35529338503` and Security run `35529338567` before merge. It merged at `f39c65320728ceb92abf71c9c1526a97d2666bec`. No deployment or fresh-customer manual staging walkthrough is claimed for this milestone.

PR #55 final head `919305d8e096467fe8a454638d825781322031e7` passed CI run `35534736487` and Security run `35534736497` before merge. It merged at `b5563d88f079f1773220c44e921c89f1c19539a3`. No deployment or fresh-customer manual staging walkthrough is claimed for this milestone.

PR #58 final head `fc5e78e508bf2be0eed49c4dc330a891ed868b85` passed CI run `35535726659` and Security run `35535726701` before merge. An earlier head `3aecead1e5ab41f98c0f4efd071d2ba02adf01f7` failed lint; the account-loading implementation was refactored without suppressing the rule and the final head was rerun to green. PR #58 merged at `e9f4f09d44f1ce4b07b5ec54781ab68abb79673f`. No deployment or fresh-customer manual staging walkthrough is claimed for this milestone.

PR #62 head `bb1b039ef7a9b33a8b55d47d98ad0f207cb8ba2e` passed CI run `35537552869` and Security run `35537552791` before merge. Focused regression tests cover active create rejection, inactive draft preservation, disconnected-account reactivation rejection, and Pause after disconnect. PR #62 merged at `fb7f9b954351728456766143f234aa415b7d972e`. No deployment or fresh-customer manual staging walkthrough is claimed for this milestone.

### TikTok provider

TikTok is implemented as an additive provider isolated from the proven Instagram path. Live TikTok send execution remains intentionally gated until a real TikTok for Business developer app/test Business Account completes staging E2E.

Merged TikTok milestones:

- PR #20 — isolated comment ingress; merge SHA `4ed413e6bb7cdc7a6857fd3aef3578b5c3bf2d5a`.
- PR #21 — inbound message normalization; merge SHA `4d3251d102e4f6a09a2d040333529f47156ec775`.
- PR #22 — conservative EU/UK/CH stripped-message reconciliation; merge SHA `03f8a899877874504972b47864c9613580968938`.
- PR #23 — provider-native event receipts / dedupe; merge SHA `078efe0ba84fba30305d7b4bd90dbeb87d69d204`.
- PR #24 — additive TikTok campaign routing foundation; merge SHA `76ad65b6db6ac8377495915c3070ecd37f1927f0`.
- PR #25 — guarded TikTok campaign CRUD API; merge SHA `b8da4e22aae5f87aa0f4011fa3f60324594f5c33`.
- PR #26 — safe TikTok account + owned-video read APIs; merge SHA `ef7b57712dd8603d16e34c1f6580e7dc266062cc`.
- PR #27 — public-reply validation aligned with the provider client limit; merge SHA `1c9f5e8dbf41dfd7092085042c7e26ffbefac150`.
- PR #29 — additive TikTok staging UI with provider capability display, official owned-video loading, campaign list/create/edit/delete controls, and explicit live-execution lock; merge SHA `48a3e38143d65f240b38658e16d606e0d8a5e629`.
- PR #31 — hard-gated TikTok action executor foundation for persisted `PUBLIC_REPLY` and existing-conversation `DM_REPLY` plans; merge SHA `346f1cc998dc28b99dbff9902411fcb1266ad1e5`.
- PR #33 — sanitized workspace-scoped TikTok routing/execution diagnostics in `/tiktok`; merge SHA `5572c398b56e214a3bea33c318c8c99b23da1c16`.
- PR #35 — live-staging handoff runbook with exact non-secret staging URLs, environment-variable names, permissions, provider-event sequence, inert QA matrix, and controlled-send safety gate; merge SHA `a9100d35ac5c6c513e2ce1d2f0ceedc58ad2d4a4`.
- PR #37 — evidence-based TikTok webhook readiness confirmation after a supported signed webhook is successfully handed to the isolated TikTok ingress queue; merge SHA `7ee473003d132aad79b35e2612e5d5371bc2d481`.
- PR #39 — non-destructive TikTok soft disconnect/reconnect preservation, connected-account filtering, webhook/provider isolation after local disconnect, and staging disconnect control; merge SHA `ce91619f4ada085e039114e1e11ab606c6c1f831`.
- PR #41 — staging-only authenticated TikTok webhook setup/readback control for `COMMENT` and `DIRECT_MESSAGE`, with connected-account guard, provider readback verification, sanitized browser output, and strict separation from runtime webhook-readiness evidence; merge SHA `85aec2d01047dfed5b410ec38dc5f9b0369ebe1d`.
- PR #43 — prepared one-shot controlled TikTok staging execution boundary behind two source-controlled disabled gates, with staging/role/workspace/confirmation/readiness guards and executor-level connection + signed-webhook rechecks; merge SHA `615266363e943ddb406406b86f4657b9cd441a3a`.

PR #43 CI run `35438125753` passed and Security run `35438125762` passed before merge. No real TikTok provider send or provider validation is claimed by that code milestone.

## Current TikTok staging state

The dashboard includes **TikTok staging** with:

- OAuth/developer-app configuration state;
- connected TikTok Business Account selection;
- stored token-expiry and granted-scope display;
- comment, public-reply, Business Messaging, Comment-to-Message, and webhook readiness indicators;
- official owned-video loading;
- TikTok campaign list/create/edit/delete controls;
- capability-gated comment and inbound-DM campaign configuration;
- sanitized recent durable-match diagnostics and TikTok worker OperationalEvents;
- non-destructive TikTok disconnect control for owner/admin users;
- staging-only webhook provider controls to read the provider config or configure + verify `COMMENT` and `DIRECT_MESSAGE` against the expected ReplyHalo callback without exposing app secrets to the browser;
- a prepared controlled-send panel that remains visibly locked while either source-controlled execution gate is false.

The action-execution foundation remains unable to send while the two source gates are false:

- parses stored action plans and fails closed on invalid/mismatched data;
- re-checks active connection, real signed-webhook readiness, and current account capability inside the locked execution transaction;
- serializes concurrent execution attempts for the same durable match with a database row lock;
- treats non-`MATCHED` states as terminal for sequential replay protection;
- records structured OperationalEvent success/skip/failure diagnostics without storing campaign message text or credentials;
- does not automatically retry provider sends after provider/network failure;
- does not execute Comment-to-Message;
- accepts no reply text, provider target, actor ID, or conversation ID from the controlled-send browser request; only an existing durable match ID plus an exact confirmation phrase is accepted;
- requires both `TIKTOK_LIVE_EXECUTION_ENABLED=false` and `TIKTOK_CONTROLLED_STAGING_SEND_ENABLED=false` to be changed by a later reviewed source-code decision before the staging endpoint can call the provider executor. Both remain `false` now.

Webhook readiness is evidence-based rather than configuration-based. A connected TikTok account is marked `webhookConfigured=true` only after a supported event (`comment.update`, `im_receive_msg`, or `im_receive_msg_eu`) passes the existing signature-verification boundary and its provider-specific queue handoff succeeds. Provider webhook readback deliberately does not set runtime readiness.

TikTok disconnect remains evidence-preserving in code: the provider account row, campaigns, durable matches and social-slot identity are preserved, while local tokens/capabilities/readiness are invalidated until same-account OAuth reconnect.

## Current safety boundaries

- Instagram and TikTok account/automation paths remain additive and isolated.
- Instagram launch onboarding reuses existing OAuth/runtime infrastructure; no customer developer credentials are introduced.
- Instagram health output is workspace-scoped, `no-store`, and does not expose the stored access token.
- ReplyHalo plan verification now fails closed before first Instagram connect if plan status cannot be confirmed.
- Settings plan-status failures fail closed and cannot masquerade as Local mode or expose Instagram connection before readiness is known.
- Customer-facing activation/plan failures are translated to ReplyHalo language rather than raw internal licensing codes.
- Instagram customer-facing reconnect notices no longer expose deployment configuration names or raw provider failure reasons.
- Central standard account limits remain `SOLO=1`, `CREATOR=3`, and `AGENCY=10`; new bindings fail closed with `ACCOUNT_LIMIT_REACHED` when capacity is exhausted.
- Reconnecting the same provider account reuses its existing license activation, while local soft disconnect keeps the slot reserved to preserve provider identity and customer history.
- Quick Automations reuse the proven Instagram automation runtime rather than creating a second worker or provider path.
- Quick Automations fail closed when connected-account readiness cannot be confirmed immediately before activation, and account switching cannot reuse stale post-picker state from the previous account.
- Active automation create/update now also fails closed server-side when the attached Instagram account is soft-disconnected; inactive preservation and Pause remain available.
- Launch analytics presentation reuses already persisted Dashboard/campaign data; PR #49 added no schema or background processing.
- Soft-disconnected Instagram rows are preserved but no longer counted as active shell connections.
- TikTok webhook events are normalized before automation matching.
- TikTok logical events use stable provider IDs for ingress/routing dedupe.
- EU stripped-message reconciliation fails closed on ambiguity.
- TikTok webhook provider setup/readback is restricted to authenticated owner/admin access on staging and requires a currently connected TikTok staging account before mutation.
- Provider webhook readback is not equivalent to runtime webhook readiness.
- TikTok local disconnect preserves the account row, campaigns, durable matches, and license/social-slot identity; it does not cascade-delete history.
- The controlled-send endpoint is staging-only, owner/admin-only, workspace-scoped, exact-confirmation guarded, requires a current `MATCHED` row plus active connection and signed-webhook runtime readiness, and is doubly locked by source constants.
- Current TikTok provider clients do not expose a persisted provider idempotency key in ReplyHalo; automatic send retries remain intentionally prohibited.
- Comment-to-Message is displayed as capability state only; it is not exposed as an active campaign action.
- Diagnostics are workspace-scoped and sanitized.
- No scraping/private endpoint fallback is part of the TikTok implementation.
- Secrets must never be committed into project documentation or evidence logs.

## Exact continuation point — 2026-09-20 after PR #62

### Focused launch-readiness audit

PR #62 closed the server-side disconnected-account activation boundary while preserving non-destructive Instagram identity/history. The remaining current customer-journey audit continues from the Custom builder / Automations / Settings recovery surface.

Continue in this order:

1. Custom builder: distinguish account-load failure from a legitimate empty account state, isolate the post picker on account switch, and recheck connected-account readiness before an active save;
2. Automations list / Settings: map reconnect-required activation failures into customer-readable recovery, make Disconnect failures visible instead of unconditionally reloading, and align any remaining plan-limit copy with preserved-slot semantics;
3. Dashboard regression: retain the already-reviewed recovery/empty states unless a new real blocker is found;
4. mobile/responsive and basic accessibility only where a real launch usability blocker exists;
5. email deliverability/domain/resend UX before commercial release, without exposing provider internals.

For any blocker found, create a small dedicated branch, add focused tests when behavior changes, require CI + Security green before merge, and then record a separate evidence checkpoint. Do not expand into the deferred visual-flow/AI/CRM/localization roadmap during this audit.

After the code audit and any blocker fixes are complete, deploy staging and perform the **fresh-customer** manual walkthrough one step at a time with Volodymyr Rudyi. The combined PR #45/#47/#49/#51/#53/#55/#58/#62 first-run journey has **not yet** been manually staging-validated and no deployment/manual success is claimed here.

### TikTok provider work

Further meaningful TikTok progress still requires human/provider participation and remains after stable Instagram commercial readiness. Both source-controlled TikTok send gates remain false. No TikTok live provider setup/send should start during the current Instagram launch-readiness audit.

## Evidence discipline

After every significant completed development stage:

- update this file;
- append the engineering decision record to `docs/ip-evidence/R&D_LOG.md`;
- append the AI/human contribution record to `docs/ip-evidence/AI_ASSISTANCE_LOG.md`;
- append verifiable PR/commit/CI/deployment/manual-test evidence to `docs/ip-evidence/IP_EVIDENCE.md`;
- use a dedicated commit/PR/checkpoint and record real SHAs only.

---

## Launch-readiness update — 2026-09-20 after PR #64

PR #64 hardened the advanced **Custom builder** without changing the proven automation runtime or introducing account migration semantics. New campaigns now distinguish account-load failure from a legitimate zero-account state, offer retry/Settings recovery, remount and clear provider-post state when switching accounts, and recheck the selected connected Instagram account immediately before any save whose resulting state is active. The stable server error `INSTAGRAM_RECONNECT_REQUIRED` is translated into customer-readable reconnect guidance.

Edit mode no longer offers an Instagram account selector that the PATCH API does not support. Existing automations truthfully remain attached to their original provider account; if that account is disconnected, provider-post reads are withheld until reconnect, while inactive edits and **Stop/Pause** remain available. Focused readiness-helper tests were added. PR #64 final head `6be3162bdf47c57ae450138868f37cbea8e20aa4` passed CI run `35538310136` and Security run `35538309969` before merge; merge SHA `8e64d0b52017495bc0048bc790dfb0bb8eb5acc7`.

No deployment or fresh-customer manual staging walkthrough is claimed for PR #64.

### Latest continuation point

Continue in this order:

1. Automations list / Settings: map reconnect-required activation failures into customer-readable recovery, make Disconnect failures visible instead of unconditionally reloading, and align remaining account-limit copy with preserved-slot semantics;
2. Dashboard regression: retain the already-reviewed recovery/empty states unless a new real blocker is found;
3. mobile/responsive and basic accessibility only where a real launch usability blocker exists;
4. email deliverability/domain/resend UX before commercial release;
5. then deploy staging and perform the fresh-customer walkthrough with Volodymyr Rudyi.

TikTok live-provider work remains out of scope and both source-controlled TikTok send gates remain false.
