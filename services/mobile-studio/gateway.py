"""Restricted, single-device ReplyHalo Mobile Studio gateway.

Install on an independently managed KVM-enabled Linux host. Bind localhost only.
No automatic social posting or generic shell/ADB command execution.
"""
import hmac
import os
import re
import subprocess
import tempfile
import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import Response
from agent_ui import TapInput, SwipeInput, TypeInput, ui_snapshot, ui_tap, ui_swipe, ui_type, ui_back
from runs import RunApproval, approve_run, check_run, close_run
from content_queue import list_content, import_content

app = FastAPI(title="ReplyHalo Mobile Studio", docs_url=None, redoc_url=None, openapi_url=None)

TOKEN = os.environ.get("MOBILE_STUDIO_TOKEN", "")
MODE = os.environ.get("MOBILE_STUDIO_DEVICE_MODE", "docker").strip().lower()
ADB_PATH = os.environ.get("MOBILE_STUDIO_ADB_PATH", "adb").strip()
CONTAINER = os.environ.get("MOBILE_STUDIO_CONTAINER", "replyhalo-mobile-android")
ADB_SERIAL = os.environ.get("MOBILE_STUDIO_ADB_SERIAL", "emulator-5554")
MAX_VIDEO_BYTES = 150 * 1024 * 1024
APP_PACKAGES = {
    "instagram": "com.instagram.android",
    "tiktok": "com.zhiliaoapp.musically",
    "youtube": "com.google.android.youtube",
    "x": "com.twitter.android",
}
if MODE not in ("docker", "physical"):
    raise RuntimeError("MOBILE_STUDIO_DEVICE_MODE must be docker or physical")
if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}", CONTAINER):
    raise RuntimeError("Invalid Android container name")
if not re.fullmatch(r"[a-zA-Z0-9_.:-]{3,80}", ADB_SERIAL):
    raise RuntimeError("Invalid ADB serial")


def require_token(
    authorization: str | None = Header(default=None),
    x_replyhalo_workspace_id: str | None = Header(default=None),
):
    workspace_id = os.getenv("MOBILE_STUDIO_WORKSPACE_ID", "")
    if not TOKEN or len(TOKEN) < 32 or not workspace_id:
        raise HTTPException(503, "Mobile Studio is not configured")
    supplied = (authorization or "").removeprefix("Bearer ")
    if not hmac.compare_digest(supplied, TOKEN):
        raise HTTPException(401, "Unauthorized")
    if not hmac.compare_digest(x_replyhalo_workspace_id or "", workspace_id):
        raise HTTPException(403, "Device is not assigned to this workspace")


def docker_exec(*args: str, timeout: int = 30, allow_failure: bool = False) -> subprocess.CompletedProcess:
    try:
        command = (
            [ADB_PATH, "-s", ADB_SERIAL, *args]
            if MODE == "physical"
            else ["docker", "exec", CONTAINER, "adb", "-s", ADB_SERIAL, *args]
        )
        result = subprocess.run(
            command, capture_output=True, text=True, timeout=timeout, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        raise HTTPException(503, "Android device is not responding")
    if result.returncode and not allow_failure:
        raise HTTPException(503, "Android command failed; check emulator readiness")
    return result


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/v1/device", dependencies=[Depends(require_token)])
def device():
    state = docker_exec("get-state", timeout=12).stdout.strip()
    apps = {}
    if state == "device":
        for app_name, package in APP_PACKAGES.items():
            found = docker_exec("shell", "pm", "path", package, timeout=15, allow_failure=True).stdout.strip()
            apps[app_name] = bool(found)
    return {"ready": state == "device", "platform": "android", "mode": MODE, "serial": ADB_SERIAL, "apps": apps}


@app.post("/v1/apps/{app_name}/open", dependencies=[Depends(require_token)])
def open_app(app_name: str):
    package = APP_PACKAGES.get(app_name)
    if not package:
        raise HTTPException(404, "Unknown application")
    docker_exec("shell", "monkey", "-p", package, "-c",
                "android.intent.category.LAUNCHER", "1", timeout=25)
    return {"opened": app_name, "posted": False, "requires_human_confirmation": True}


@app.post("/v1/media", dependencies=[Depends(require_token)])
async def upload_media(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    if not filename.endswith(".mp4"):
        raise HTTPException(415, "Only MP4 video is accepted")
    media_id = uuid.uuid4().hex
    remote_tmp = "/tmp/replyhalo-" + media_id + ".mp4"
    remote_media = "/sdcard/Movies/ReplyHalo/" + media_id + ".mp4"
    with tempfile.TemporaryDirectory(prefix="mobile-studio-") as directory:
        path = Path(directory) / (media_id + ".mp4")
        size = 0
        with path.open("wb") as output:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_VIDEO_BYTES:
                    raise HTTPException(413, "Video exceeds 150 MB")
                output.write(chunk)
        with path.open("rb") as source:
            header = source.read(12)
        if size < 12 or header[4:8] != b"ftyp":
            raise HTTPException(415, "Invalid MP4 video")
        try:
            if MODE == "physical":
                docker_exec("shell", "mkdir", "-p", "/sdcard/Movies/ReplyHalo")
                docker_exec("push", str(path), remote_media, timeout=120)
            else:
                subprocess.run(
                    ["docker", "cp", str(path), CONTAINER + ":" + remote_tmp],
                    capture_output=True, timeout=45, check=True,
                )
                docker_exec("shell", "mkdir", "-p", "/sdcard/Movies/ReplyHalo")
                docker_exec("push", remote_tmp, remote_media, timeout=120)
            docker_exec("shell", "am", "broadcast", "-a",
                        "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
                        "-d", "file://" + remote_media, timeout=20)
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
            raise HTTPException(503, "Could not transfer video into Android")
        finally:
            if MODE != "physical":
                try:
                    subprocess.run(
                        ["docker", "exec", CONTAINER, "rm", "-f", remote_tmp],
                        capture_output=True, timeout=15, check=False,
                    )
                except (OSError, subprocess.TimeoutExpired):
                    pass
    return {
        "media_id": media_id, "bytes": size, "android_path": remote_media,
        "published": False, "next_step": "Review video in the mobile app and publish manually",
    }

# AI device operations are enabled only for a user-approved batch.
# An MCP client is deliberately unable to create/approve a run.
@app.post("/v1/runs/approve", dependencies=[Depends(require_token)])
def approve_batch(body: RunApproval):
    return approve_run(body)


@app.get("/v1/runs/{run_id}", dependencies=[Depends(require_token)])
def get_run(run_id: str):
    return check_run(run_id, count_action=False)


@app.post("/v1/runs/{run_id}/close", dependencies=[Depends(require_token)])
def finish_run(run_id: str):
    return close_run(run_id)


@app.get("/v1/runs/{run_id}/ui", dependencies=[Depends(require_token)])
def agent_ui_snapshot(run_id: str):
    run = check_run(run_id, count_action=False)
    return {"run": run, "ui": ui_snapshot(docker_exec)}


@app.post("/v1/runs/{run_id}/ui/tap", dependencies=[Depends(require_token)])
def agent_ui_tap(run_id: str, body: TapInput):
    check_run(run_id)
    return ui_tap(docker_exec, body)


@app.post("/v1/runs/{run_id}/ui/swipe", dependencies=[Depends(require_token)])
def agent_ui_swipe(run_id: str, body: SwipeInput):
    check_run(run_id)
    return ui_swipe(docker_exec, body)


@app.post("/v1/runs/{run_id}/ui/type", dependencies=[Depends(require_token)])
def agent_ui_type(run_id: str, body: TypeInput):
    check_run(run_id)
    return ui_type(docker_exec, body)


@app.post("/v1/runs/{run_id}/ui/back", dependencies=[Depends(require_token)])
def agent_ui_go_back(run_id: str):
    check_run(run_id)
    return ui_back(docker_exec)




@app.get("/v1/preview/screenshot", dependencies=[Depends(require_token)])
def preview_android_screen():
    """Admin diagnostic preview, safe without an AI publishing run."""
        try:
            screenshot = subprocess.run(
                ([ADB_PATH, "-s", ADB_SERIAL, "exec-out", "screencap", "-p"]
                 if MODE == "physical" else
                 ["docker", "exec", CONTAINER, "adb", "-s", ADB_SERIAL,
                  "exec-out", "screencap", "-p"]),
                capture_output=True, timeout=15, check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            raise HTTPException(503, "Could not capture Android screen")
        if screenshot.returncode != 0 or not screenshot.stdout.startswith(b"\\x89PNG\\r\\n\\x1a\\n"):
            raise HTTPException(503, "Android screenshot is unavailable")
        if len(screenshot.stdout) > 8 * 1024 * 1024:
            raise HTTPException(413, "Android screen image is too large")
        return Response(
            content=screenshot.stdout, media_type="image/png",
            headers={"Cache-Control": "no-store"},
        )


@app.post("/v1/preview/tap", dependencies=[Depends(require_token)])
def preview_android_tap(body: TapInput):
    """Explicit manual browser touch from a logged-in admin; no MCP approval."""
    return ui_tap(docker_exec, body)


@app.post("/v1/preview/back", dependencies=[Depends(require_token)])
def preview_android_back():
    return ui_back(docker_exec)


@app.get("/v1/runs/{run_id}/screenshot", dependencies=[Depends(require_token)])
def agent_screenshot(run_id: str):
    """Real screenshot from the authorized Android; not exposed publicly."""
    check_run(run_id, count_action=False)
    try:
        screenshot = subprocess.run(
            ([ADB_PATH, "-s", ADB_SERIAL, "exec-out", "screencap", "-p"]
             if MODE == "physical" else
             ["docker", "exec", CONTAINER, "adb", "-s", ADB_SERIAL,
              "exec-out", "screencap", "-p"]),
            capture_output=True, timeout=15, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        raise HTTPException(503, "Could not capture Android screen")
    if screenshot.returncode != 0 or not screenshot.stdout.startswith(b"\\x89PNG\\r\\n\\x1a\\n"):
        raise HTTPException(503, "Android screenshot is unavailable")
    if len(screenshot.stdout) > 8 * 1024 * 1024:
        raise HTTPException(413, "Android screen image is too large")
    return Response(
        content=screenshot.stdout, media_type="image/png",
        headers={"Cache-Control": "no-store"},
    )


@app.get("/v1/content", dependencies=[Depends(require_token)])
def get_prepared_content():
    return list_content()


@app.post("/v1/runs/{run_id}/content/{content_id}/import", dependencies=[Depends(require_token)])
def import_approved_content(run_id: str, content_id: str):
    run = check_run(run_id)
    if content_id not in run["content_ids"]:
        raise HTTPException(403, "Content item is not included in this approved batch")
    return import_content(content_id, CONTAINER, ADB_SERIAL)
