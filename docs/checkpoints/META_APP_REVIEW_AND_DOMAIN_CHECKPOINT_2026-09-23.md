# ReplyHalo — Meta App Review + custom domain checkpoint

**Date:** 2026-09-23  
**Purpose:** persistent project checkpoint so work can resume tomorrow without repeating completed steps.  
**Branch:** `checkpoint/instagram-oauth-2026-09-22`  
**Draft checkpoint PR:** #82 — do not merge just for checkpointing.

## CURRENT RESUME POINT

Instagram OAuth staging control test is already proven working for tester account `genp23t`.

The active blocker is now **commercial Meta App Review / Advanced Access + Business Verification**, not OAuth code.

At the end of this session:
- Meta App Review request contains exactly the three core permissions needed for the current ReplyHalo comment-to-DM flow;
- Business Verification has been started for the company behind ReplyHalo;
- `replyhalo.com` and `www.replyhalo.com` have been attached to Railway staging and DNS records were configured in ADM.tools;
- Railway still shows `Waiting for DNS update` for both custom domains;
- HTTPS/SSL is not ready yet, so Meta website verification must not continue until the domains provision successfully.

## META APP REVIEW — COMPLETED STEPS

Opened Meta Developers -> ReplyHalo Staging -> Instagram API -> Permissions and Features.

Confirmed relevant Instagram permissions were present and testable.

Started App Review / Tech Provider path. Meta displayed that becoming a technology provider requires business verification / access verification / app review.

The App Review request was cleaned up so it now contains exactly:

- `instagram_business_basic`
- `instagram_business_manage_comments`
- `instagram_business_manage_messages`

Removed from the review request:

- legacy / wrong `instagram_manage_comments`
- `public_profile`
- `instagram_business_manage_insights`

Do not re-add these unless a future product requirement explicitly needs them.

## PR #83 — MINIMAL OAUTH SCOPE

PR #83 was created specifically to keep OAuth scopes aligned with App Review.

Result:
- CI: SUCCESS
- Security: SUCCESS
- merged to `main`
- merge commit: `af81bcd685871a770ef5fd135fdc266f6d3b3d77`
- Railway staging web deployment: SUCCESS
- Railway staging worker deployment: SUCCESS

Effect:
- `instagram_business_manage_insights` was removed from the OAuth scope;
- current app review request and runtime OAuth are aligned around the three core permissions above.

## BUSINESS VERIFICATION — COMPLETED STEPS

Meta App Review -> Verification was opened.

Business Portfolio shown by Meta: `ТрафікМагніт`.

Meta status before starting verification: business portfolio was eligible for verification but not yet verified.

Verification flow started with:
- Country: United States
- Company type: Private company
- Legal company used for verification: `Bodypare LLC`
- Alternative/public-facing name entered: `ReplyHalo`
- US Delaware company address was entered from company documents
- EIN / tax-registration field was filled from company records

Sensitive values such as the EIN, phone number and full verification tokens are intentionally not copied into this repository checkpoint.

Important rule:
- legal company name/address must continue to match the accepted official company documents exactly;
- do not switch mid-verification to an unrelated Ukrainian entity unless deliberately restarting the verification strategy.

The flow then requested company contact information and website.

Decision: use the product domain `replyhalo.com` for Meta, but only after the domain is fully live with valid HTTPS.

## REPLYHALO.COM — RAILWAY SETUP

Railway project: `dm-magnet-system`

Environment: `staging`

Service: `replyhalo-web`

Railway-generated staging domain remains:
- `replyhalo-web-staging.up.railway.app`

Two custom domains were attached to `replyhalo-web`:
- `replyhalo.com`
- `www.replyhalo.com`

Railway Hobby plan custom-domain limit is now reached. Do not add more custom domains unless the plan/architecture changes.

## ADM.TOOLS DNS — CURRENT STATE

Current intended DNS state after cleanup:

### Root domain

`replyhalo.com`
- Type: `ALIAS`
- Target: `yliz1i4i.up.railway.app`

Railway UI describes the routing requirement as root `CNAME @ -> yliz1i4i.up.railway.app`; ADM.tools does not allow root CNAME, so its supported `ALIAS` record is being used for the apex/root equivalent.

### WWW

`www.replyhalo.com`
- Type: `CNAME`
- Target: `8qhbw8l4.up.railway.app`

The old `www` A record was removed before adding the CNAME.

### Railway verification TXT records

Both Railway verification TXT records were added in ADM.tools:

- `railway-verify.replyhalo.com` — TXT verification value for root domain
- `railway-verify.www.replyhalo.com` — TXT verification value for `www`

Full token values are intentionally omitted from this checkpoint.

Two accidental A records created for these `railway-verify...` names were removed. Only the TXT verification records should remain.

### Existing records intentionally left unchanged

- wildcard `*.replyhalo.com` A record still points to the old hosting IP `185.68.16.113`
- root MX mail record remains
- existing root SPF TXT remains

Do not delete MX/SPF records while finishing web domain provisioning.

## DOMAIN STATUS AT STOPPING POINT

After about 20 minutes, Railway still showed:

- `replyhalo.com` — `Waiting for DNS update`
- `www.replyhalo.com` — `Waiting for DNS update`

Browser symptoms before propagation completed:
- `https://replyhalo.com` could reach a Railway `Not Found` provisioning page;
- Chrome also showed `NET::ERR_CERT_COMMON_NAME_INVALID` / not-secure because the final certificate had not yet been issued.

This is consistent with routing beginning to reach Railway while DNS verification / certificate provisioning is still incomplete.

ADM.tools notes DNS/cache changes may take multiple hours and up to 24 hours in some cases.

## EXACT NEXT STEP TOMORROW

1. Check Railway -> `dm-magnet-system` -> staging -> `replyhalo-web` -> Settings -> Networking.
2. Inspect both custom domains:
   - `replyhalo.com`
   - `www.replyhalo.com`
3. If both no longer show `Waiting for DNS update`, test:
   - `https://replyhalo.com`
   - `https://www.replyhalo.com`
4. Confirm both load ReplyHalo without SSL/certificate warnings.
5. Only after HTTPS is valid, return to Meta Business Verification and enter `https://replyhalo.com` as the company/product website.
6. Continue the Meta verification and then complete the remaining App Review sections:
   - App Settings
   - Allowed Usage
   - Data Handling
   - Reviewer Instructions
7. After Advanced Access/App Review is approved, perform a fresh external Instagram Business/Creator connection test with an account that has NO Meta app role/tester access.

## IF RAILWAY STILL SAYS WAITING TOMORROW

Do not immediately change DNS again.

First verify the exact records Railway currently shows under `Show DNS records` for each domain and compare them against ADM.tools.

Then verify externally whether DNS is publicly resolving:
- apex routing / ALIAS result for `replyhalo.com`;
- CNAME for `www.replyhalo.com`;
- TXT `railway-verify`;
- TXT `railway-verify.www`.

Only change DNS if one of those public records is actually missing or incorrect.

## DO NOT DO

- Do not remove the working `www` CNAME.
- Do not remove the root ALIAS unless Railway/ADM.tools evidence proves it is wrong.
- Do not delete mail MX/SPF records.
- Do not add more custom domains while the Hobby-plan limit is reached.
- Do not re-add `instagram_business_manage_insights` to OAuth/App Review unless a real product feature requires it.
- Do not re-add legacy `instagram_manage_comments` or `public_profile` to this App Review request.
- Do not touch production Instagram `@online.robota.affiliate` for staging QA.
- Do not treat tester-only OAuth success as commercial readiness.

## RESUME PHRASE

`Resume ReplyHalo from PR #82, META_APP_REVIEW_AND_DOMAIN_CHECKPOINT_2026-09-23.md. First check Railway custom-domain DNS/SSL status; do not redo completed Meta/OAuth steps.`
