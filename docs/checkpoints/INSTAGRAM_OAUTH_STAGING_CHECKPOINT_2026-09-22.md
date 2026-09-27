# ReplyHalo — Instagram OAuth staging checkpoint

**Date:** 2026-09-22  
**Purpose:** persistent project checkpoint so work can resume from the exact current state without repeating completed steps.

## CURRENT RESUME POINT — CONTROL TEST PASSED

The controlled post-invite retest has now been completed successfully.

Test account: `genp23t`

Final observed UI after `Connect Instagram`:
- ReplyHalo redirected to `/dashboard?connected=true`;
- top-right account shows `@genp23t`;
- dashboard shows `1 connected account`;
- onboarding step `Connect Instagram` is checked;
- ReplyHalo displays `Your Instagram is connected — create your first automation`.

Railway evidence for the successful attempt:
- `GET /api/instagram/connect -> 307` at 2026-09-22T20:10:30Z;
- `GET /api/instagram/callback -> 307` at 2026-09-22T20:10:57Z;
- callback then redirected to `/dashboard -> 200`;
- no new `[Instagram Callback]` error was logged for this successful attempt.

This retest occurred only **after** `genp23t` had been added as an Instagram Tester for `ReplyHalo Staging` and had accepted the tester invitation.

## WHAT THIS TEST PROVES

The fresh external account failed repeatedly before tester access and connected successfully after tester access was accepted.

Therefore Meta app/account access was materially involved in the observed blocker.

The earlier successful QA account `@traffictiktok11` was already an Instagram Tester, so that earlier success never proved commercial third-party OAuth readiness.

Hard rule for future work:

**Tester-only success != commercial OAuth readiness.**

Do not redesign ReplyHalo around manually adding every paying customer as an Instagram Tester. Tester roles are for staging/development validation, not the intended SaaS customer journey.

## TARGET COMMERCIAL CUSTOMER FLOW

The intended product flow remains:

`Activation -> Connect Instagram -> Instagram/Meta OAuth -> Allow -> callback -> connected`

A normal paying customer must not need to:
- contact the owner to be added to Meta Developers;
- become an Instagram Tester;
- accept a developer/tester invitation;
- manage Meta scopes, webhooks, app secrets, or developer settings.

The next production-readiness problem is therefore **Meta App Review / Advanced Access** for real third-party users, not automatic tester provisioning.

## FRESH-CUSTOMER STAGING WORK ALREADY COMPLETED

- Fresh passwordless sign-in validated.
- Fresh ReplyHalo workspace created.
- Staging license activated:
  - Plan: `SOLO`
  - Status: `Active`
  - pre-connect slots were `0/1`;
  - No expiry.
- `Connect Instagram` is gated behind plan readiness.
- Production account `@online.robota.affiliate` was not used or touched.
- `genp23t` was converted from Personal to Professional `Creator` during the Instagram flow.
- Category selected: Personal blog / Особистий блог.
- Instagram OAuth permissions were accepted.
- `genp23t` was added as `Instagram Tester` in Meta Developers.
- Tester invitation was accepted from Instagram settings.
- Meta Developers then showed `genp23t` without pending status.
- Controlled reconnect after acceptance succeeded.

## PRE-TESTER FAILURE EVIDENCE

Before `genp23t` had accepted tester access, ReplyHalo repeatedly returned:

`Instagram connection failed`

Railway showed:
- `/api/instagram/connect -> 307`;
- `/api/instagram/callback -> 307`;
- callback runtime error:
  `Long-lived token exchange failed: Unsupported request - method type: get`.

This established that:
- the license gate was not preventing OAuth from starting;
- the Connect route worked;
- Instagram OAuth opened;
- callback returned to ReplyHalo;
- failure occurred during the callback/token path while the account lacked tester access.

## PR #81 STATUS

PR #81: **Fix Instagram long-lived token exchange after OAuth**

- head SHA: `67f188fa0748999b94cd8129c6b2b9d96829500f`
- merge SHA: `b13579624e4ddcb008956f100fb6f7858e5e55d9`

Change:
- switched long-lived exchange to `https://graph.instagram.com/access_token`;
- added a dedicated helper and regression coverage;
- CI passed;
- Security passed;
- staging web/worker deployment succeeded.

Important interpretation:
- PR #81 is merged and currently deployed;
- however it is **not proven to be the root-cause fix** because the same error persisted after PR #81 while `genp23t` still lacked tester access;
- success occurred only after tester access was accepted;
- do not revert PR #81 blindly, but do not attribute the successful reconnect solely to PR #81 either.

## LICENSE ARCHITECTURE FINDING

Current `app/api/instagram/connect/route.ts` calls:

`validateDmMagnetWorkspaceLicense(context.workspaceId)`

before OAuth redirect.

Observed evidence:
- `/api/license/status -> 200`;
- active SOLO plan;
- `/api/instagram/connect -> 307` to Instagram;
- OAuth completed successfully once tester access was valid.

Therefore the plan/license gate is not the demonstrated cause of this OAuth blocker.

Staging and production License Server / DB remain intentionally isolated, so a staging QA activation key may differ from production keys.

## META / PRODUCT CONCLUSION

Current integration uses Instagram API with Instagram Login and `instagram_business_*` permissions.

Repository review already identified the commercial-readiness path in `META_APP_REVIEW.md`, including relevant permissions such as:
- `instagram_business_basic`;
- `instagram_business_manage_comments`;
- `instagram_business_manage_messages`.

The next phase is to verify/request the required Meta App Review / Advanced Access so a non-role third-party customer can complete the same flow without being manually added as Tester.

Do not introduce a linked Facebook Page as a normal requirement unless the integration architecture is intentionally changed to the Facebook Login variant; that is not the current target flow.

## NEXT RECOMMENDED PHASE

Before creating another external QA account, inspect the current Meta App Review / Permissions and Features state for `ReplyHalo Staging` and determine exactly which requested Instagram permissions currently have Standard vs Advanced Access.

Then prepare/complete the App Review evidence needed for third-party customer access.

After appropriate Advanced Access is confirmed, perform a new fresh-customer test with an Instagram Business/Creator account that has **no app role/tester access**.

Commercial readiness is only proven when that unrelated account can complete:

`Activate plan -> Connect Instagram -> Allow -> connected`

without manual Meta Developers intervention.

## DO NOT DO

- Do not touch production `@online.robota.affiliate` during staging QA.
- Do not add each real customer as an Instagram Tester.
- Do not automate Tester-role creation as a SaaS solution.
- Do not make more OAuth code changes solely because of the old `Unsupported request - method type: get` error without new evidence.
- Do not revert PR #81 blindly.
- Do not remove the license gate: the successful controlled test shows it can coexist with working Instagram OAuth.
- Do not claim commercial OAuth readiness from tester-only success.

## EXACT NEXT STEP

Open Meta Developers for `ReplyHalo Staging` and inspect the Instagram permissions/features access state (Standard vs Advanced/App Review) for the permissions requested by ReplyHalo.

That is the new resume point.