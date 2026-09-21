# ReplyHalo continuation checkpoint — 2026-09-21

Owner / product decision maker: **Volodymyr Rudyi**
AI development assistance: **ChatGPT (OpenAI)**

## Exact source of truth

- Repository: `idunnpeptide-lab/openreply`
- Base branch: `main`
- Exact saved `main` SHA before this checkpoint: `c45b1ff8687b989dc95105db868ee04ebb709695`
- PR #77 merged the additive evidence for the fresh passwordless-authentication staging milestone.
- PR #77 merge SHA: `c45b1ff8687b989dc95105db868ee04ebb709695`.
- Railway production deployment after that docs-only merge reached `SUCCESS` for both `openreply-web` and `openreply-worker`.

## Completed fresh-customer stage

Fresh passwordless authentication is manually validated through authenticated workspace/Dashboard entry.

The staging sequence uncovered and closed two real launch blockers:

1. **PR #75** — automatic link-preview clients could consume the one-time Auth.js magic-link token before the customer. The emailed URL now terminates first at inert `/auth/confirm`, preserving one-time token semantics until explicit customer confirmation.
2. **PR #76** — the first confirmation implementation used a Next server-action redirect that did not reliably issue the browser GET to the Auth.js callback. The confirmation surface now uses a normal browser GET form to the validated callback.

Final successful runtime evidence after PR #76:

- `GET /auth/confirm -> 200`
- explicit customer confirmation
- `GET /api/auth/callback/resend -> 302`
- `GET /dashboard -> 200`
- authenticated `GET /api/dashboard/stats -> 200`
- authenticated `GET /api/license/status -> 200`
- authenticated `GET /api/instagram/health -> 200`

Volodymyr Rudyi supplied a screenshot showing the fresh ReplyHalo Dashboard/workspace with zero connected accounts and the onboarding path **Connect Instagram → Choose a Quick Automation → Activate**.

## Evidence already saved

The completed auth milestone is recorded additively in:

- `PROJECT_PROGRESS.md`
- `docs/ip-evidence/R&D_LOG.md`
- `docs/ip-evidence/AI_ASSISTANCE_LOG.md`
- `docs/ip-evidence/IP_EVIDENCE.md`

Evidence PR #77 passed CI and Security before merge.

## Exact continuation point

Do **not** repeat the passwordless-authentication stage unless a regression appears.

Resume the fresh-customer walkthrough from the visible **Connect Instagram** action on the authenticated Dashboard.

Next sequence:

1. Customer clicks **Connect Instagram**.
2. Complete the real Meta / Instagram OAuth flow.
3. After ReplyHalo receives the callback, inspect Railway runtime evidence and `/api/instagram/health` before moving forward.
4. Confirm the connected account is customer-ready and no raw provider/developer internals are exposed.
5. Only then continue to **Quick Automations**.
6. Choose one approved automation, activate it, then perform the controlled live comment/DM/link/follow-up scenario.
7. Verify Dashboard / Logs / CTR after delivery.
8. Record each manually observed result truthfully before continuing.

## Scope / safety boundaries

- No fresh Instagram OAuth success is claimed yet.
- No fresh Quick Automation activation or live Instagram comment/DM/link/follow-up success is claimed yet for this workspace.
- Existing older Instagram staging evidence remains valid history but does not replace the new fresh-customer walkthrough.
- Do not require customers to enter Meta App ID, App Secret, webhook credentials, scopes, or developer diagnostics in normal UX.
- Preserve the existing non-destructive account/history model and central account-slot rules.
- Do not start TikTok live-provider work during this Instagram launch validation.
- Keep `TIKTOK_LIVE_EXECUTION_ENABLED=false`.
- Keep `TIKTOK_CONTROLLED_STAGING_SEND_ENABLED=false`.
- Never store or expose secrets in repository evidence.

## Human handoff

No action is required from Volodymyr Rudyi until work is resumed.

When resuming later, start from this checkpoint, verify current `main` has not diverged unexpectedly, and continue from **Connect Instagram** rather than reconstructing or repeating the completed auth work.
