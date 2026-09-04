# DM Magnet License Integration

This fork can use the central DM Magnet License Server to control social-account slots. Instagram is the implemented provider today; the license API is platform-aware so TikTok can be added without another licensing redesign.

## Environment

Set these on both the web service and the worker:

```env
DM_MAGNET_LICENSE_URL=https://dm-magnet-system-production.up.railway.app
DM_MAGNET_LICENSE_KEY=DMM-SOLO-XXXXX-XXXXX-XXXXX-XXXXX
```

The plaintext License Key remains in deployment secret storage and is never committed to Git.

## Connection flow

1. A workspace owner/admin clicks **Connect Instagram**.
2. The web app validates the configured License Key with DM Magnet.
3. Meta OAuth runs normally.
4. OpenReply reads Meta's Instagram professional Account ID (`user_id`).
5. Before storing the account locally, OpenReply calls DM Magnet's bind endpoint.
6. DM Magnet either:
   - binds the account to the license;
   - recognizes the same account as already bound; or
   - rejects the connection because the license is invalid or the account limit has been reached.
7. Only after the license binding succeeds does OpenReply persist the Instagram account.

## Worker enforcement

Before DM queue jobs are processed, the worker validates the License Key. Validation is cached for 60 seconds to avoid a network request per message.

If the central license is suspended, revoked, expired or unavailable, the worker fails closed and does not send a Meta message.

## Plan limits

The License Server currently defaults to:

- SOLO — 1 social account
- CREATOR — 3 social accounts
- AGENCY — 10 social accounts

The actual server-side `maxAccounts` value remains authoritative.

## Important operational note

Disconnecting an Instagram account inside OpenReply does not automatically free its central DM Magnet activation. This is intentional for the first commercial MVP so a License Key cannot be rotated freely between accounts.

Use DM Magnet Admin License Control to reset activations when an account legitimately needs to be replaced.

## Backwards compatibility

If neither DM Magnet environment variable is present, licensing is disabled and the fork behaves like the previous OpenReply build.

If only one variable is present, the integration reports a configuration error.


## Multi-platform preparation

The OpenReply Instagram module now binds through DM Magnet's generic `/api/licenses/bind-account` endpoint with `platform: "INSTAGRAM"`.

Shared social-platform types live in `lib/social/platform.ts`. TikTok functionality is not enabled yet; these types only reserve the provider boundary so the working Instagram implementation does not need to be redesigned later.
