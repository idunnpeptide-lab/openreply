# Instagram Staging QA Checkpoint — 2026-09-18

## Status

**Instagram staging QA: PASSED.**

This checkpoint records the live ReplyHalo staging verification performed against the separate Instagram Professional test account `@traffictiktok11` and the separate published **ReplyHalo Staging** Meta App. The legacy production OpenReply Meta App and `@online.robota.affiliate` were not used or modified.

## Live scenarios verified

- Comment keyword `Інфо` triggers the campaign.
- Public reply is delivered under the Instagram post/reel.
- Private reply is delivered through Instagram Direct / Message Requests as allowed by Meta.
- Follow Gate works for a user who is already following.
- Follow Gate blocks information for a user who is not following.
- After the user follows and presses the confirmation button, the information/reveal message is delivered.
- Tracked links redirect correctly.
- Link clicks are recorded and CTR is calculated from live staging traffic.
- Configured 60-minute follow-up is delivered.
- Repeat follow-up after a later interaction from the same Instagram user is delivered correctly.
- Dashboard counters, DM Logs and Recent Activity reflect the live tests.
- Direct-message keyword trigger works when `Інфо` is sent directly in Instagram DM without a comment.
- Instagram disconnect/reconnect succeeds without deleting campaign/history data.
- After reconnect, webhook processing, public reply and DM automation resume successfully.
- Exact webhook/message replay is deduped: staging diagnostic returned `PASS — duplicate event was deduped` for the same retained Meta message ID.

## Bugs found and fixed during QA

### Follow-up missing for already-following/direct-reveal path
Fixed so configured follow-up is scheduled after actual information delivery even when Follow Gate is bypassed because the user already follows.

OpenReply main checkpoint:
- `3ca7ca56ddb6de87f2e970413119eea07fad3213`

### Repeat follow-up blocked for returning users
BullMQ retained terminal follow-up jobs with a deterministic campaign+user job ID, preventing a future follow-up for the same user. Terminal follow-up jobs are now safely recycled/removed while pending/delayed/active jobs still dedupe duplicate events.

OpenReply main checkpoint:
- `940674886d8aa47d086d8a88db040ca36a1e2294`

### Instagram Disconnect was destructive
The original Disconnect path deleted `InstagramAccount`, which could cascade-delete campaigns, logs, link clicks and follower history. Disconnect is now a soft disconnect: credentials/webhook state are cleared while the account record and related campaign/history data remain preserved. Reconnect updates the existing account record.

OpenReply main checkpoint:
- `b5453b0b2fefe85f3b624fb07c4b07def29ef207`

A staging release marker was added to verify Railway had deployed the safe disconnect version before performing the live test:
- `29938e7251855de89bf1338ad5801e26173fbaad`

### Controlled webhook replay QA
A staging-only, authenticated admin diagnostic was added to replay the latest retained inbound Instagram DM with the exact same Meta message ID/job ID. It refuses to run unless the original completed queue job is still retained, avoiding accidental duplicate delivery. Live staging result: `PASS — duplicate event was deduped`.

OpenReply main checkpoint:
- `3a7021fb2a7739b070a3d1363798d9baab88be1e`

CI and Security were green before the related PRs were merged.

## Data-preservation proof from live disconnect/reconnect

Before disconnect, campaign `Test 1` contained live runs/sends/clicks/CTR data. After safe disconnect:

- Instagram connection showed `Not connected` / `0 connected`.
- `Test 1` still existed and remained active.
- Campaign run/send/click/CTR history remained present.
- DM Magnet workspace license remained Active / SOLO / 1-of-1 binding context.

After reconnecting the same `@traffictiktok11` through Meta OAuth:

- Instagram showed Connected / Webhook ready.
- Existing campaign/history remained present.
- A fresh `Інфо` comment again produced the public reply and private messages.

## Known non-blocking staging observations

- Instagram can route first-contact private replies to Message Requests or Hidden Requests. ReplyHalo cannot force primary-inbox placement.
- Diagnostics still contains an older failed private-reply record from September 10–11 (`IGApiException code=100 sub=2534025`). It predates the 2026-09-18 QA and did not reproduce in the current passing scenarios.
- Customer-facing branding/copy still contains some legacy OpenReply/DM Magnet/Self-hosted wording and should be handled in the rebrand/polish phase.

## Resume point

Do **not** repeat the completed Instagram staging QA unless a regression is introduced.

Next product phase:

1. Customer-facing ReplyHalo rebrand and UX polish.
2. Improve public-reply copy/variants so users know to check Requests / Hidden Requests when necessary.
3. Review/remove staging-only QA surfaces before production launch as appropriate.
4. Continue commercial readiness/security backlog work.
5. TikTok remains a later provider-separated implementation; do not mix it into the stable Instagram provider flow.
