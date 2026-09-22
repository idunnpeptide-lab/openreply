# ReplyHalo — Instagram OAuth staging checkpoint

**Date:** 2026-09-22  
**Purpose:** persistent project checkpoint so work can resume from the exact current state without repeating completed steps.

## Exact stop point

**STOP before repeating `Connect Instagram` after tester acceptance.**

Test account `genp23t` has now:
- been converted from Personal to Professional **Creator** during the Instagram flow;
- been added in Meta Developers as **Instagram Tester** for `ReplyHalo Staging`;
- accepted the tester invite in Instagram;
- appeared in Meta Developers without the earlier pending/review status.

**Important:** after tester invite acceptance, `Connect Instagram` has **not yet been re-tested**. Do not claim tester access solved the OAuth blocker until that exact retest is performed.

## Fresh-customer flow already completed

- Fresh passwordless sign-in validated.
- Fresh ReplyHalo workspace created.
- Staging license activated:
  - Plan: `SOLO`
  - Status: `Active`
  - Connected account slots: `0/1`
  - No expiry.
- `Connect Instagram` is exposed only after plan readiness.
- Production account `@online.robota.affiliate` was **not** used or touched.

## Instagram flow already completed

For test account `genp23t`:
- `Connect Instagram` opened the official Instagram OAuth flow.
- Instagram prompted conversion to a professional account.
- Selected `Creator` / `Автор`.
- Selected category `Personal blog` / `Особистий блог`.
- Instagram confirmed the Creator account was ready.
- ReplyHalo Staging-IG OAuth permissions screen opened.
- User allowed requested permissions.
- Instagram returned to ReplyHalo callback.

## Real blocker observed before tester acceptance

ReplyHalo returned to Settings with:

`Instagram connection failed`

Plan remained `SOLO Active`, slot remained `0/1`.

Railway evidence showed:
- `GET /api/instagram/connect -> 307`
- `GET /api/instagram/callback -> 307`
- runtime error during callback:
  `Long-lived token exchange failed: Unsupported request - method type: get`

This proves:
- the license preflight is not preventing OAuth from starting;
- the Connect route works;
- Instagram OAuth opens;
- callback returns to ReplyHalo;
- the failure occurs during short-lived -> long-lived token exchange.

## PR #81 completed during this session

PR #81: **Fix Instagram long-lived token exchange after OAuth**

- head SHA: `67f188fa0748999b94cd8129c6b2b9d96829500f`
- merge SHA: `b13579624e4ddcb008956f100fb6f7858e5e55d9`

Change:
- replaced the derived/versioned long-lived exchange URL with the unversioned special endpoint:
  `https://graph.instagram.com/access_token`
- added dedicated long-lived token exchange helper and regression coverage;
- CI passed;
- Security passed;
- staging web deployment succeeded;
- staging worker succeeded.

Current `lib/meta/oauth.ts` uses:

`INSTAGRAM_LONG_LIVED_TOKEN_URL = "https://graph.instagram.com/access_token"`

and performs the exchange with `GET`.

## Result after PR #81 but before adding `genp23t` as tester

OAuth was retried after deployment.
- Instagram OAuth still opened correctly.
- callback returned.
- Railway still logged:
  `Long-lived token exchange failed: Unsupported request - method type: get`
- slot remained `0/1`.

Therefore removing `/v25.0` alone did **not** close the blocker.

## Meta roles discovered

Before this session's tester addition:
- `Rudyi Volodymyr` — Administrator
- `traffictiktok11` — Instagram Tester
- `genp23t` — **not** an Instagram Tester

During this session:
- `genp23t` was added as `Instagram Tester` in Meta Developers;
- initial status was pending / `На рассмотрении`;
- tester invitation was opened from Instagram settings -> Apps and Websites -> Tester Invites;
- invitation was accepted;
- after refresh, Meta Developers shows `genp23t` as Instagram Tester without the pending status.

## Historical review result from the previous working chat

The previous chat reviewed the handoff, GitHub history, the earlier working QA path, upstream OpenReply, Railway evidence, and current Meta guidance.

Key correction:
- the earlier successful test account `@traffictiktok11` was already an **Instagram Tester**;
- therefore that success did **not** prove that a fresh external customer account could connect under Standard Access;
- this was the missing distinction in the earlier handoff.

The historical review concluded that the intended commercial journey remains correct:

`Activation -> Connect Instagram -> Instagram/Meta OAuth -> connected`

A customer must **not** be required to:
- enter Meta Developers;
- be manually added as an Instagram Tester;
- accept a developer/tester invite as part of normal paid onboarding;
- manage scopes, webhooks, app secrets, or developer configuration.

For the current Instagram Login architecture, Standard Access is sufficient for app-role/tester accounts, while third-party customers require the appropriate App Review / Advanced Access for the requested Instagram permissions. The repository already contains `META_APP_REVIEW.md` covering this production-readiness path and the relevant permissions, including:
- `instagram_business_basic`
- `instagram_business_manage_comments`
- `instagram_business_manage_messages`

The current implementation uses **Instagram API with Instagram Login**, so a linked Facebook Page should not be introduced as a normal customer requirement merely to solve this staging issue.

## Revised interpretation of PR #81

PR #81 is merged and deployed, but it is **not yet proven to be the root-cause fix**.

Reason:
- the older Sep-18 reconnect path also used GET for the long-lived token exchange;
- the same error persisted after PR #81 while `genp23t` still lacked tester access;
- therefore the token error may have been an access/app-role symptom rather than proof that the HTTP method itself was wrong.

Do **not** revert PR #81 blindly, but do **not** treat it as validated root-cause resolution either.

## Important product conclusion

Do **not** redesign the SaaS around manually adding every customer as an Instagram Tester.
That is not an acceptable production customer journey.

Target production journey remains:

`Customer -> ReplyHalo -> Connect Instagram -> Meta/Instagram OAuth -> Allow -> callback -> connected`

No manual owner intervention should be required per customer.

Tester access is currently only a staging/development variable to validate, not a production architecture decision.

Hard rule for future chats:

**Tester-only success != commercial OAuth readiness.**

If a fresh external account only works after being added as a Tester, stop rebuilding OAuth and verify App Review / Advanced Access readiness instead.

## License architecture note

Current `app/api/instagram/connect/route.ts` calls:

`validateDmMagnetWorkspaceLicense(context.workspaceId)`

before building the OAuth redirect.

In this fresh workspace:
- `/api/license/status` returns 200;
- plan is active;
- `/api/instagram/connect` redirects to Instagram with 307;
- OAuth starts successfully.

So current evidence does **not** show the new license gate itself as the callback failure. The staging key being separate from production is expected because staging License Server / DB are isolated from production.

## What must happen next

No more OAuth code changes and no more tester additions before the control test.

The next action is now a single controlled retest:

1. Open staging ReplyHalo Settings.
2. Click `Connect Instagram`.
3. Authorize specifically as `genp23t`, which now has accepted Instagram Tester access.
4. Observe the page ReplyHalo returns to.
5. Inspect Railway callback logs immediately after the attempt.

Interpretation:
- **If success:** tester/app access was materially involved in the blocker. The next commercial-readiness phase is Meta App Review / Advanced Access so real customers can connect without tester roles.
- **If failure:** tester-access hypothesis is not sufficient; use the fresh Railway trace to continue debugging the technical OAuth/token path.

## Do not do until the retest

- Do not touch production `@online.robota.affiliate`.
- Do not change production Meta app settings.
- Do not remove/alter License Server architecture without evidence.
- Do not revert PR #81 blindly.
- Do not implement automatic Instagram Tester creation as a production solution.
- Do not add more Tester accounts.
- Do not make further OAuth code changes before the controlled `genp23t` retest.
- Do not claim tester access fixed the issue until the post-accept retest succeeds.

## Exact resume action

**Run `Connect Instagram` once for `genp23t` now that its tester invitation is accepted, then inspect Railway.**

That is the exact resume point. No Meta Developers changes should be made before this test.
