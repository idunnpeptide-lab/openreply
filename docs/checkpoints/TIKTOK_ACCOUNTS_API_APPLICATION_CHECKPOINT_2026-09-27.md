# ReplyHalo — TikTok Accounts API Application Checkpoint

Date: 2026-09-27

## Current status

ReplyHalo TikTok integration is now at the external TikTok review stage.

- TikTok for Business developer profile registration: submitted / pending review.
- TikTok developer app: `ReplyHalo`.
- App verification status: `Pending`.
- App is not Online yet.
- App ID and Secret are not available yet (`--`) while review is pending.
- Do not create a duplicate app, do not delete the pending app, and do not enable Online until approval and staging QA are complete.

## Developer profile registration values used

- Company: `Bodypare LLC`
- Company website: `https://replyhalo.com`
- Developer type: `Technology Company`
- Primary developer location: Poland
- Services: `Accounts`
- Vertical: `Technology`
- Regions served: `EMEA`, `North America`
- Estimated yearly revenue from TikTok: `0 USD` (pre-launch)
- Communication email: `info@replyhalo.com`

## TikTok app configuration

App name:
- `ReplyHalo`

Scope selected:
- `TikTok accounts`

Do not add unrelated Marketing API scopes just for future-proofing. Organic comment moderation, insights, and publishing are intended to sit under TikTok Accounts API. TikTok Shop should remain a separate future provider/integration through TikTok Shop Partner APIs.

Redirect URLs used:
- Advertiser redirect URL: `https://replyhalo-web-staging.up.railway.app/api/tiktok/callback`
- TikTok account holder redirect URL: `https://replyhalo-web-staging.up.railway.app/api/tiktok/callback`

App description / intended product scope includes:
- authorized TikTok account connection
- owned-content access
- comment management
- rule-based public replies
- future scheduled organic publishing
- future account/post analytics

## Accounts API Access Application Form

Status:
- Submitted successfully in TikTok/Feishu form.

Business verification method used:
- `Submit An Acceptable Document for Business Verification`

Supporting document:
- Bodypare LLC formation/registration document (`Bodypare LLC 7388297.pdf` / Certificate of Formation package).

Use case submitted describes ReplyHalo as a SaaS platform where users explicitly authorize their own TikTok accounts and ReplyHalo provides:
- owned-video retrieval
- comment management
- keyword/rule-based public replies
- scheduled organic publishing
- account/content analytics
- centralized SaaS workflows that require Accounts API access

Data-use position submitted:
- only access accounts explicitly authorized by their owners
- use TikTok data only for user-requested ReplyHalo functionality
- do not sell TikTok data
- do not use it for unrelated profiling/advertising

Estimated account count selected:
- `1,001 - 10,000`

Developer account type selected:
- `Technology Company`

Usage acknowledgement:
- agreed to TikTok Accounts API allowed-use/revocation terms.

## TikTok review prototype created

A dedicated staging-only review route was created for TikTok Accounts API review:

`https://replyhalo-web-staging.up.railway.app/tiktok/review-demo`

Purpose:
- provide a reviewer-friendly prototype flow for the Accounts API application while real TikTok credentials/access are still pending.

Prototype flow demonstrates:
1. Connect an authorized TikTok account (prototype OAuth step).
2. Show connected demo account.
3. Retrieve/select owned content.
4. Configure keyword (`INFO`).
5. Configure public reply.
6. Save comment automation (prototype only).
7. Show scheduled publishing flow.
8. Show account/content analytics preview.

Safety properties:
- staging-only route
- local demo data only
- no TikTok API calls
- no real comments/messages/posts sent
- route is blocked in production
- Instagram code and behavior were not changed
- TikTok live execution gates remain locked

## Code / GitHub changes

PR #85:
- Title: `Add staging-only TikTok Accounts API review demo`
- Merged into `main`.
- Merge commit: `31134a3a8aba969d4e6a36de8e31b1840d85c5af`
- CI: PASS
- Security: PASS

Files added:
- `app/(dashboard)/tiktok/review-demo/page.tsx`
- `components/tiktok-review-demo.tsx`
- `lib/tiktok/review-demo.ts`
- `__tests__/tiktok-review-demo.test.ts`

Railway staging deployment for PR #85:
- service: `replyhalo-web`
- environment: `staging`
- deployment status: SUCCESS

## Previous TikTok staging checkpoint still relevant

Previous checkpoint:
- `docs/checkpoints/TIKTOK_STAGING_CHECKPOINT_2026-09-26.md`

Previous Phase 1 OAuth scope work remains in place from PR #84:
- `user.info.basic`
- `user.info.username`
- `video.list`
- `comment.list`
- `comment.list.manage`

Instagram remains isolated and must not be modified while continuing TikTok work.

## TikTok Shop future plan

Do not mix TikTok Shop into the current Accounts API app review just for future-proofing.

Future architecture should add a separate TikTok Shop provider/module for:
- creator/shop authorization
- showcase/product data
- shoppable/product-linked video flows
- TikTok Shop/affiliate analytics

This should live beside the Accounts API integration rather than replacing it.

## Exact continuation point

Wait for TikTok review of the `ReplyHalo` developer app and Accounts API request.

When TikTok approves and App ID / Secret become available:
1. Verify app status and granted Accounts API access.
2. Add TikTok App ID / Secret to Railway staging only (do not post secrets in chat/public support).
3. Confirm callback URL matches staging.
4. Run real TikTok OAuth with a controlled test account.
5. Verify authorized account retrieval.
6. Verify owned-video retrieval.
7. Verify comment read/list flow.
8. Verify public-reply flow under controlled staging gates.
9. Keep `TIKTOK_LIVE_EXECUTION_ENABLED=false` until explicit approval to open live execution.
10. Keep Instagram behavior untouched throughout TikTok QA.

While TikTok review is pending, safe work can continue on internal implementation that does not require live TikTok credentials, including comment ingestion architecture, automation engine, scheduled publishing architecture, analytics models, and provider abstractions.

## Continuation prompt

`Continue ReplyHalo from docs/checkpoints/TIKTOK_ACCOUNTS_API_APPLICATION_CHECKPOINT_2026-09-27.md. First verify current main, PR #85 merge, Railway staging status, and TikTok app review status. Do not modify Instagram and do not enable TikTok live-send gates without explicit approval.`
