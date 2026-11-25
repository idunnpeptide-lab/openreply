# ReplyHalo Mobile Studio — Physical Android over Windows USB

**Scope:** Windows desktop/laptop + your existing signed-in Android. No KVM VPS,
no Android emulator, no fresh installation of Instagram/TikTok required.

## What is implemented

- `start-windows.ps1` prepares the Python gateway, checks one authorized USB
  Android, creates a secret token, and starts localhost:8788.
- Gateway can query installed apps, send MP4s into the actual phone gallery,
  capture real device screenshots and send basic touch/back gestures.
- ReplyHalo `/trend-watch/mobile-studio` contains setup guide, live preview
  (polling screenshots every 2.5s) and manual touch, plus Content queue.
- Existing MCP tools `replyhalo_mobile_device_status`,
  `replyhalo_mobile_screenshot`, `replyhalo_mobile_ui_snapshot`,
  `replyhalo_mobile_import_content`, `replyhalo_mobile_ui_action` work
  after connecting and approving a batch.
- Staging only. This is a USB **bridge**; login/passwords never leave Android.
  It does not bypass Meta/TikTok anti-automation measures.

## 1. Prepare the Android phone

1. Keep the already signed-in social apps as they are.
2. Settings → About phone → tap Build number seven times (wording varies).
3. Settings → Developer options → **USB debugging** ON.
4. Connect Android with a USB data cable to your Windows PC, unlock its screen,
   and explicitly approve your computer's USB debugging RSA fingerprint.
5. When you're done testing, revoke ADB debugging authorization or disable
   USB debugging if it isn't needed.

Do not enable unknown APK install, root, developer unlocking, password sharing
or unrestricted wireless ADB. Android may require OEM USB drivers on Windows.

## 2. Prepare the Windows computer

1. Install Python 3.11+ from python.org (enable Add Python to PATH).
2. Install official Google Android SDK Platform Tools (`adb.exe`):
   https://developer.android.com/tools/releases/platform-tools
3. Ensure `adb devices -l` outputs **exactly one** device with status `device`.
   If it says `unauthorized`, unlock the Android and approve the popup.
4. Open PowerShell in `services/mobile-studio` and run:

```powershell
.\start-windows.ps1
```

If `adb` is not in PATH:
```powershell
.\start-windows.ps1 -AdbPath "C:\Android\platform-tools\adb.exe"
```

On the first run this creates `.env` with a 64-char strong random token and
exits to request the ReplyHalo Workspace ID. **Never commit or share `.env`.**
Open ReplyHalo → Trend Watch → Mobile Studio → Physical Android setup,
copy the workspace ID, and set
`MOBILE_STUDIO_WORKSPACE_ID=<id>` in your local `.env`.

Re-run the same script. It creates `Content\` and opens the gateway at
`http://127.0.0.1:8788`. Verify locally:
```powershell
Invoke-RestMethod http://127.0.0.1:8788/health
```
This check only means the gateway is running, not that ReplyHalo can connect.
Keep the PowerShell process running during testing.

## 3. Expose the gateway safely (outbound Cloudflare Tunnel)

**Never** open Windows firewall ports 5037/5555/6080/8788 or route ADB directly
to the internet. Use a Cloudflare Tunnel with an Access application that
requires a dedicated **service token**; the gateway independently verifies a
random Bearer token AND the assigned workspace ID.

Cloudflare Zero Trust → Networks → Tunnels → Create tunnel → install cloudflared
on Windows → route a hostname such as `android.yourdomain.com` to
`http://localhost:8788`. Configure an Access self-hosted application on that
hostname and an Access policy permitting only your **service-token identity**
for machine-to-machine requests. Official setup:
https://developers.cloudflare.com/tunnel/get-started/

Generate Cloudflare Access **Service Token** with a Client ID and Client Secret.
Copy these directly into Railway variables for `replyhalo-mcp-staging`
(Settings / Variables), not into chats:

```
MOBILE_STUDIO_API_URL=https://android.yourdomain.com
MOBILE_STUDIO_API_TOKEN=<same strong token from local .env>
MOBILE_STUDIO_CF_ACCESS_CLIENT_ID=<Cloudflare service-token client ID>
MOBILE_STUDIO_CF_ACCESS_CLIENT_SECRET=<Cloudflare service-token secret>
```

Use the same protected host for every interaction; these secrets must remain
server-side. Enable Cloudflare logs, restrict the Access policy and rotate
tokens after any exposure. For production use, add independent device pairing,
request expiry and signed request replay prevention.

## 4. Verify the live phone through ReplyHalo

Open `https://replyhalo-mcp-staging-production.up.railway.app/trend-watch/mobile-studio`.
The top card must say **Android connected**, with the installed apps shown.
Then click **Open Android screen**. Your live Android screen should be visible
(in snapshots every 2.5 seconds), and taps on the image should affect the
real phone.

For smoother high-FPS local viewing on Windows, install official scrcpy
https://github.com/Genymobile/scrcpy and use `scrcpy --serial SERIAL`.
Future Remote Browser mode can use WebRTC/scrcpy; the first test uses snapshots
and click events so there are fewer moving parts.

## 5. Content folder, MCP, and posting

Put `reel_001.mp4` in `Content\` on your Windows PC and optionally add
`reel_001.json` based on `Content.example.json`.
Use Mobile Studio to select account, platform, media IDs, mode and grant an
explicit batch approval. Existing Claude/ChatGPT ReplyHalo MCP tools can then
inspect the device and operate the UI within the approved batch.
**Do not approve an arbitrary account or file.** Always confirm music/copyright
rights, stop on unexpected UI/captcha/verification prompts and independently
verify an actual published post URL.

No account changes are made on connection. The phone remains logged into its
own apps; social media services may limit automated interactions.

## Known limitations and acceptance conditions

- A running Windows PC + USB cable + unlocked/authorized phone are required.
- Full one-click publishing flows are **not yet tested against your physical
  Instagram/TikTok app versions**. This is an integration bridge, not proof of
  end-to-end publication.
- Native ADB `input text` cannot reliably input Unicode Ukrainian/Polish/French.
  Add Appium/Unicode IME after phone pairing; do not force invalid caption text.
- Screenshot refresh is 2.5 seconds, not real-time video. For continuous
  high-frame-rate browser streaming, introduce WebRTC/scrcpy later.
- Current batch/run database is local to the Windows host; keep it private.
- The project has not received your PC or phone; you must connect the cable,
  enable debugging and complete Cloudflare + Railway setup yourself.
- First QA milestone: screenshot in ReplyHalo matches actual phone + tap works;
  second: sample MP4 appears in Android gallery; third: a *user-approved*
  test publication verified from the public profile.
