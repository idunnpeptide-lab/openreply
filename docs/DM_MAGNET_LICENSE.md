# DM Magnet License Integration

This fork can use the central DM Magnet License Server to control social-account slots in a shared multi-tenant SaaS. Instagram is the implemented provider today; the license API is platform-aware so TikTok can be added later without another licensing redesign.

## Deployment environment

Set the central License Server URL on both the web service and worker:

```env
DM_MAGNET_LICENSE_URL=https://dm-magnet-system-production.up.railway.app
```

There is intentionally no deployment-wide `DM_MAGNET_LICENSE_KEY`.

Each customer workspace enters its own License Key in **Settings → DM Magnet License**. The key is validated against the central server before it is stored. OpenReply stores only:

- an AES-256-GCM encrypted copy of the License Key, protected by `ENCRYPTION_KEY`;
- a SHA-256 fingerprint used to prevent the same key being assigned to two workspaces in the same SaaS database;
- a masked prefix for customer-facing status display.

The plaintext License Key is never committed to Git and is never stored in plaintext in PostgreSQL.

## Customer/workspace flow

1. A customer signs in and gets a Workspace.
2. A workspace owner/admin enters the DM Magnet License Key in Settings.
3. OpenReply validates that key against the central DM Magnet License Server.
4. If valid, OpenReply encrypts it and stores it on that Workspace.
5. The owner/admin clicks **Connect Instagram**.
6. OpenReply validates that workspace's license before starting Meta OAuth.
7. Meta OAuth returns the Instagram professional Account ID (`user_id`).
8. Before storing the account locally, OpenReply calls DM Magnet's generic bind endpoint using that workspace's License Key.
9. DM Magnet either:
   - binds `INSTAGRAM + Account ID` to the license;
   - recognizes the same account as already bound; or
   - rejects the connection because the license is invalid or the account limit has been reached.
10. Only after the central binding succeeds does OpenReply persist/update the Instagram account inside that same Workspace.

## Worker enforcement

Before a DM queue job can send through Meta, the worker resolves the job's Instagram account to its Workspace and validates that Workspace's DM Magnet license.

Validation is cached for 60 seconds per workspace to reduce central License Server traffic.

If the workspace license is suspended, revoked, expired, missing, invalid, or the central service is unavailable, that workspace's send path fails closed. Other workspaces use their own licenses and are isolated from it.

## Plan limits

The License Server currently defaults to:

- SOLO — 1 social account
- CREATOR — 3 social accounts
- AGENCY — 10 social accounts

The actual server-side `maxAccounts` value remains authoritative.

## License uniqueness inside the shared SaaS

OpenReply stores a unique SHA-256 fingerprint of each configured License Key. The same License Key cannot be assigned to two separate Workspaces in the same SaaS database.

This local uniqueness is an additional SaaS isolation guard. DM Magnet License Server remains the entitlement source of truth.

## Account replacement

Disconnecting an Instagram account inside OpenReply does not automatically free its central DM Magnet activation. This prevents customers from rotating a limited license freely between accounts.

Use DM Magnet Admin License Control to reset activations when a legitimate account replacement is needed.

## Backwards compatibility

If `DM_MAGNET_LICENSE_URL` is absent, the fork behaves like the original self-hosted OpenReply build and no DM Magnet licensing is enforced.

If the URL is present, each workspace must configure its own valid License Key before Instagram OAuth or worker sends are allowed.

## Multi-platform preparation

The Instagram module binds through DM Magnet's generic `/api/licenses/bind-account` endpoint with `platform: "INSTAGRAM"`.

Shared social-platform types live in `lib/social/platform.ts`. TikTok functionality is not enabled yet; the architecture only reserves the provider boundary.
