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

## Important product conclusion

Do **not** redesign the SaaS around manually adding every customer as an Instagram Tester.
That is not an acceptable production customer journey.

Target production journey remains:

`Customer -> ReplyHalo -> Connect Instagram -> Meta/Instagram OAuth -> Allow -> callback -> connected`

No manual owner intervention should be required per customer.

Tester access is currently only a staging/development variable to validate, not a production architecture decision.

## License architecture note

Current `app/api/instagram/connect/route.ts` calls:

`validateDmMagnetWorkspaceLicense(context.workspaceId)`

before building the OAuth redirect.

In this fresh workspace:
- `/api/license/status` returns 200;
- plan is active;
- `/api/instagram/connect` redirects to Instagram with 307;
- OAuth starts successfully.

So current evidence does **not** show the new license gate itself as the callback failure. However, the older known-working version must still be compared against current main to determine what changed around the time plan gating was introduced.

## Required historical comparison before more code changes

Find the last genuinely confirmed version where Instagram connected through `Connect Instagram` without manually adding the account as a new tester, then compare against current main:

1. `app/api/instagram/connect/route.ts`
2. `app/api/instagram/callback/route.ts`
3. `lib/meta/oauth.ts`
4. short-lived -> long-lived token endpoint
5. HTTP method and query/body params
6. scopes / permissions
7. Instagram App ID / Meta app configuration
8. whether the previously working test Instagram account already had Admin/Tester role
9. when `validateDmMagnetWorkspaceLicense()` was introduced before Connect
10. whether licensing changes touched only the preflight guard or also OAuth/token/callback logic
11. whether the integration previously used a different Instagram/Facebook login flow.

Do not assume the older flow truly worked for an unrelated third-party account until role status is verified historically.

## Do not do until comparison/retest

- Do not touch production `@online.robota.affiliate`.
- Do not change production Meta app settings.
- Do not remove/alter License Server architecture without evidence.
- Do not revert PR #81 blindly.
- Do not implement automatic Instagram Tester creation as a production solution.
- Do not claim tester access fixed the issue before the post-accept retest.
- Do not make further OAuth code changes until the old working flow is compared.

## Exact resume action

There are two valid next actions, depending on what the historical comparison shows:

### A. Historical comparison first — current preferred path
Identify the last known-working Instagram Connect implementation and explain the exact diff/reason before any more changes.

### B. Controlled retest after comparison
Repeat `Connect Instagram` for `genp23t` now that tester invite is accepted, then inspect Railway callback evidence.

Interpretation:
- if success: tester access materially changed the result, but production/App Review/access model still needs separate resolution;
- if failure: tester hypothesis is disproven and debugging continues from token/app-flow differences.

## Product-owner context

The product owner recalls that an earlier ReplyHalo version could connect Instagram directly. Later work added the requirement that Instagram Connect is allowed only after a paid/activated ReplyHalo key. The key question now is whether a later change accidentally altered the previously working OAuth behavior, or whether prior successful tests used an account that already had app role access.
