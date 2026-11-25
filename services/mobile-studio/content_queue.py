"""Read approved prepared video assets from a dedicated Content folder.

Files are provided by the owner or an upstream content-creation process.
Only simple MP4 filenames are accepted, no symlinks or arbitrary paths.
"""
import json
import os
import re
import subprocess
from pathlib import Path

from fastapi import HTTPException

CONTENT_ROOT = Path(os.getenv("MOBILE_STUDIO_CONTENT_DIR", "/srv/replyhalo-content/Content"))
IDENTIFIER = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
MAX_BYTES = 150 * 1024 * 1024


def get_asset(identifier: str):
    if not IDENTIFIER.fullmatch(identifier):
        raise HTTPException(400, "Invalid content ID")
    path = CONTENT_ROOT / (identifier + ".mp4")
    if not path.is_file() or path.is_symlink() or path.stat().st_size > MAX_BYTES:
        raise HTTPException(404, "Content MP4 is missing or exceeds 150 MB")
    return path


def list_content():
    if not CONTENT_ROOT.is_dir():
        return {"items": [], "configured": False}
    items = []
    for path in sorted(CONTENT_ROOT.glob("*.mp4"))[:100]:
        identifier = path.stem
        if not IDENTIFIER.fullmatch(identifier):
            continue
        try:
            source = get_asset(identifier)
            manifest = CONTENT_ROOT / (identifier + ".json")
            meta = {}
            if manifest.is_file() and not manifest.is_symlink() and manifest.stat().st_size <= 16000:
                meta = json.loads(manifest.read_text("utf-8"))
                if not isinstance(meta, dict):
                    meta = {}
            items.append({
                "id": identifier,
                "bytes": source.stat().st_size,
                "caption": str(meta.get("caption") or "")[:2200],
                "platforms": [x for x in meta.get("platforms", []) if x in ("instagram","tiktok","youtube","x")][:4] if isinstance(meta.get("platforms"), list) else [],
                "scheduled_at": str(meta.get("scheduled_at") or "")[:35],
                "status": "ready",
            })
        except (ValueError, OSError, UnicodeError):
            continue
    return {"items": items, "configured": True}


def import_content(identifier: str, container: str, serial: str, runner=subprocess.run):
    source = get_asset(identifier)
    tmp_path = "/tmp/replyhalo-content-" + identifier + ".mp4"
    dest_path = "/sdcard/Movies/ReplyHalo/" + identifier + ".mp4"
    try:
        runner(["docker", "cp", str(source), container + ":" + tmp_path], capture_output=True, timeout=60, check=True)
        runner(["docker", "exec", container, "adb", "-s", serial, "shell", "mkdir", "-p", "/sdcard/Movies/ReplyHalo"], capture_output=True, timeout=15, check=True)
        runner(["docker", "exec", container, "adb", "-s", serial, "push", tmp_path, dest_path], capture_output=True, timeout=120, check=True)
        runner(["docker", "exec", container, "adb", "-s", serial, "shell", "am", "broadcast", "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE", "-d", "file://" + dest_path], capture_output=True, timeout=15, check=True)
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        raise HTTPException(503, "Could not import this video into Android")
    finally:
        try:
            runner(["docker", "exec", container, "rm", "-f", tmp_path], capture_output=True, timeout=15, check=False)
        except (OSError, subprocess.TimeoutExpired):
            pass
    return {"content_id": identifier, "android_path": dest_path, "ready": True}
