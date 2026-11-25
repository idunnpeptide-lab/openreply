# ReplyHalo Mobile Studio — isolated Android proof of concept

**Status: prototype code only, not a deployed or verified Android device.** This directory does not touch any production Instagram webhook, DM automation, token or worker.

## Host prerequisites

- A dedicated Ubuntu x86_64 machine or VPS with /dev/kvm, nested virtualization where necessary and enough memory (recommend 8+ GB host RAM; single Android container limited to 6 GB).
- Docker Engine / Compose v2 on the host. Do not deploy the Android container on Railway: /dev/kvm is unavailable there.
- Python 3.11+ for the restricted, single-device gateway. Never publish noVNC, ADB, Docker daemon or the gateway's unencrypted HTTP port to the internet.

Check KVM first: `test -r /dev/kvm && test -w /dev/kvm && echo KVM_OK`. If this fails, stop and use a different host.

## Start one Android

```sh
cd services/mobile-studio
docker compose up -d
docker exec replyhalo-mobile-android adb devices
```

Open the browser viewer securely from your own workstation:

```sh
ssh -N -L 6080:127.0.0.1:6080 user@YOUR_ANDROID_HOST
```

Then visit `http://127.0.0.1:6080`. The browser viewer is the one built into Docker-Android. `serve-emu` is a candidate for the subsequent multi-device phase, **not installed by this first prototype**. Do not expose 6080 publicly.

## Start the restricted gateway

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: use a randomly generated MOBILE_STUDIO_TOKEN
set -a; . ./.env; set +a
python3 -m uvicorn gateway:app --host 127.0.0.1 --port 8788
```

A successful local `GET /health` confirms only gateway availability. `GET /device` checks ADB. This gateway uses a fixed Android container name and allowlisted commands, **no arbitrary shell execution**.

## What the first stage permits

- Authenticated Android status and ADB readiness checks.
- Upload one MP4 (max 150 MB) into Android Movies, with media scanner notification.
- Open allowlisted Instagram, TikTok or YouTube apps if **actually installed** on the emulator.
- View and interact with the real Android screen using noVNC **manually**.
- **No automatic publishing, scheduling, CAPTCHA handling, spoofing, proxy rotation or stealth features**. The person reviews music, caption and the final Post/Publish action inside the app.
- Social apps are not pre-installed. Google Play availability, ARM compatibility, login/security verification, media picker and music libraries **must be tested on the chosen host**. An Android emulator is not a physical phone and may be detected as virtualized.

## Connect to ReplyHalo staging

The staging UI `/trend-watch/mobile-studio` and server-only `/api/mobile-studio/*` proxy require:
```
MOBILE_STUDIO_API_URL=https://YOUR_AUTHENTICATED_GATEWAY_HOST
MOBILE_STUDIO_API_TOKEN=<same random token from host>
```

Route HTTPS privately with access controls and TLS (a gateway/Tailscale-access arrangement reachable from the hosting service). A loopback-only gateway cannot be reached from Railway without a secure tunnel, and an unauthenticated public tunnel is **not** acceptable. The token stays on the ReplyHalo server, never in browser JS. Only workspace ADMIN/OWNER may use the proxy. Do not set these variables until a real KVM host has been provisioned and secured.

## Acceptance checklist

1. /dev/kvm works; container `adb devices` returns an emulator.
2. Browser viewer shows actual booted Android and accepts touches.
3. Upload a test MP4 with gateway; file appears in Android gallery.
4. Verify which official social apps can be installed and logged into on this emulator; don't assume Play Store support.
5. Manually test media selection, caption, music, and publication only after explicit confirmation.
6. Compare similar original videos under comparable timing; no claim of improved reach.
7. Add Appium / ReplyHalo MCP actions only after permissions, audit logging and genuine device tests are verified.

Related OSS: https://github.com/budtmo/docker-android , https://github.com/jiunshinn/serve-emu , https://github.com/appium/appium , https://github.com/maeek/rebroid .
