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

app = FastAPI(title="ReplyHalo Mobile Studio", docs_url=None, redoc_url=None, openapi_url=None)

TOKEN = os.environ.get("MOBILE_STUDIO_TOKEN", "")
CONTAINER = os.environ.get("MOBILE_STUDIO_CONTAINER", "replyhalo-mobile-android")
ADB_SERIAL = os.environ.get("MOBILE_STUDIO_ADB_SERIAL", "emulator-5554")
MAX_VIDEO_BYTES = 150 * 1024 * 1024
APP_PACKAGES = {
    "instagram": "com.instagram.android",
    "tiktok": "com.zhiliaoapp.musically",
    "youtube": "com.google.android.youtube",
}
if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}", CONTAINER):
    raise RuntimeError("Invalid Android container name")
if not re.fullmatch(r"[a-zA-Z0-9_.:-]{3,80}", ADB_SERIAL):
    raise RuntimeError("Invalid ADB serial")


def require_token(authorization: str | None = Header(default=None)):
    if not TOKEN or len(TOKEN) < 32:
        raise HTTPException(503, "Mobile Studio is not configured")
    supplied = (authorization or "").removeprefix("Bearer ")
    if not hmac.compare_digest(supplied, TOKEN):
        raise HTTPException(401, "Unauthorized")


def docker_exec(*args: str, timeout: int = 30, allow_failure: bool = False) -> subprocess.CompletedProcess:
    try:
        result = subprocess.run(
            ["docker", "exec", CONTAINER, "adb", "-s", ADB_SERIAL, *args],
            capture_output=True, text=True, timeout=timeout, check=False,
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
    return {"ready": state == "device", "platform": "android", "serial": ADB_SERIAL, "apps": apps}


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
