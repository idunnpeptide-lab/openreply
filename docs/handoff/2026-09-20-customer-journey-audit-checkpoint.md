# ReplyHalo launch-readiness audit checkpoint — 2026-09-20

This checkpoint preserves the exact continuation state before the next product changes. It does **not** claim that the current customer-journey audit stage is complete or manually staging-validated.

## Source of truth

- Repository: `idunnpeptide-lab/openreply`
- Base branch: `main`
- Base SHA at checkpoint creation: `1b6d6e353491679f41b1310ec6627de219337c7f`
- TikTok live-provider work remains out of scope for this launch pass.
- TikTok execution gates remain intentionally disabled; no real TikTok provider send is claimed.

## Completed immediately before this checkpoint

### Account slots / plan limits

- PR #55 merged product changes.
- PR #56 recorded the corresponding evidence checkpoint.
- Confirmed launch model: standard plan limits are `SOLO=1`, `CREATOR=3`, `AGENCY=10`; reconnecting the same provider account preserves the existing slot identity; local soft disconnect preserves customer data and does not silently free the central slot.
- Customer guidance was corrected so Disconnect is not presented as a way to free a plan slot.

### Quick Automations regression

- PR #58 merged product changes at `e9f4f09d44f1ce4b07b5ec54781ab68abb79673f`.
- PR #60 recorded the corresponding evidence checkpoint and produced the current base SHA above.
- Quick Automations now distinguish account-load failure from an empty account state, re-check the selected connected Instagram account before activation, isolate the post picker on account switch, and reject malformed/non-HTTPS tracked-link input before submission.
- PR #58 final head passed CI and Security before merge. No new fresh-customer staging walkthrough is claimed for these launch UX changes.

## Current audit stage in progress

Next approved stage: **Custom Builder / Automations list / Dashboard / Settings regression**, followed by mobile/accessibility, email deliverability, staging deploy, and a fresh-customer walkthrough.

### Findings already confirmed

1. **Server-side automation connection guard needs fail-closed behavior.**
   - Soft-disconnected Instagram rows are intentionally preserved in the database with an empty access token and webhook readiness cleared.
   - The automation create/reactivation path must not allow an active automation to be created or re-enabled against such a preserved-but-disconnected row.
   - This guard must be server-side so it cannot be bypassed by stale client state or another caller.

2. **Custom Builder needs the same account-integrity protections already added to Quick Automations.**
   - Account-list loading failure must not be presented as if the customer simply has no Instagram account.
   - Switching Instagram accounts must clear/isolate the selected post and remount or otherwise reset the post picker so posts from the previous account cannot be selected during the transition.
   - Before saving/activating, the selected Instagram account must still be connected.

3. **Settings disconnect recovery needs review/fix.**
   - Current customer flow reloads after the Disconnect request without first presenting a customer-readable API failure state.
   - A failed disconnect should not be silently treated as success.

4. **Settings plan-limit copy needs to remain aligned with preserved-slot behavior.**
   - Reconnect of an already-linked account is valid without consuming a new slot.
   - A different account requires available plan capacity or controlled migration/support.
   - Normal customer UI must not expose developer/licensing internals.

### Areas reviewed with no blocker confirmed yet

- Dashboard initial-load failure has a retry/recovery state.
- Dashboard refresh failure keeps the last loaded data visible instead of wiping it.
- Dashboard empty states and launch CTA ordering are currently consistent with the launch-first Quick Automations path.

## Exact continuation point

1. Re-read `main` before product edits and stop if it advanced unexpectedly.
2. Create a small product branch from the current `main`.
3. Implement only the confirmed customer-journey blockers above:
   - server fail-closed automation guard for disconnected Instagram accounts;
   - Custom Builder account-load recovery and account-switch/post-picker integrity;
   - Settings disconnect customer-readable failure recovery;
   - copy alignment only where needed for the same scope.
4. Add focused regression tests for runtime behavior changes.
5. Open a focused product PR.
6. Require final-head CI + Security green before merge.
7. After product merge, create a separate evidence checkpoint updating the established evidence files truthfully.
8. Continue to mobile/responsive/basic accessibility audit, then email deliverability, staging deploy, and the fresh-customer walkthrough.

## Product principles to preserve

- Instagram remains the launch reference path: one-click provider connection, customer-friendly readiness, Quick Automations first, and no scopes/webhook/app-secret/developer diagnostics in normal customer UI.
- ManyChat, ChatPlace, SendPulse and similar products are UX/product references only; adapt strong patterns, do not copy them.
- Do not begin TikTok live provider work during this launch-readiness sequence.
- Do not store secrets in source, docs, logs, tests, or evidence.
- Do not claim deployment, manual QA, provider validation, or live send unless it actually occurred and is evidenced.
