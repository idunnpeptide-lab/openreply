"""Physical-USB Android bridge regression tests without requiring a phone."""
import os
from pathlib import Path
from subprocess import CompletedProcess
from tempfile import TemporaryDirectory
from unittest.mock import patch

os.environ.setdefault("MOBILE_STUDIO_TOKEN", "test-" + "x" * 44)
os.environ.setdefault("MOBILE_STUDIO_WORKSPACE_ID", "test-workspace")
os.environ.setdefault("MOBILE_STUDIO_RUNS_DB", "/tmp/mobile-studio-physical-tests-" + str(os.getpid()) + ".sqlite3")

import gateway
import content_queue
from fastapi.testclient import TestClient

client = TestClient(gateway.app)
AUTH = {
    "Authorization": "Bearer " + os.environ["MOBILE_STUDIO_TOKEN"],
    "X-ReplyHalo-Workspace-Id": os.environ["MOBILE_STUDIO_WORKSPACE_ID"],
}
PNG = b"\x89PNG\r\n\x1a\n" + b"test-png"


def test_physical_mode_adb_without_docker():
    def fake_run(command, **kwargs):
        if command[-1] == "get-state":
            return CompletedProcess(command, 0, "device\n", "")
        if "pm" in command:
            return CompletedProcess(command, 0, "package:/data/app/base.apk\n", "")
        return CompletedProcess(command, 0, "ok\n", "")
    with patch.object(gateway, "MODE", "physical"), patch.object(gateway, "ADB_PATH", "adb.exe"), patch.object(gateway, "ADB_SERIAL", "USB123"):
        with patch.object(gateway.subprocess, "run", side_effect=fake_run) as run:
            response = client.get("/v1/device", headers=AUTH)
        assert response.status_code == 200
        assert response.json()["mode"] == "physical"
        assert response.json()["ready"] is True
        assert all(call.args[0][0] == "adb.exe" for call in run.call_args_list)
        assert all("docker" not in call.args[0] for call in run.call_args_list)


def test_real_png_preview_requires_workspace_token():
    assert client.get("/v1/preview/screenshot").status_code == 401
    with patch.object(gateway, "MODE", "physical"), patch.object(gateway, "ADB_PATH", "adb.exe"):
        with patch.object(gateway.subprocess, "run", return_value=CompletedProcess([], 0, PNG, b"")) as run:
            result = client.get("/v1/preview/screenshot", headers=AUTH)
        assert result.status_code == 200
        assert result.headers["content-type"] == "image/png"
        assert result.content == PNG
        assert "docker" not in run.call_args.args[0]


def test_browser_tap_uses_usb_adb_only():
    with patch.object(gateway, "MODE", "physical"), patch.object(gateway, "ADB_PATH", "adb.exe"):
        with patch.object(gateway.subprocess, "run", return_value=CompletedProcess([], 0, "ok", "")) as run:
            result = client.post("/v1/preview/tap", headers=AUTH, json={"x": 250, "y": 550})
        assert result.status_code == 200
        args = run.call_args.args[0]
        assert args[:3] == ["adb.exe", "-s", gateway.ADB_SERIAL]
        assert args[-4:] == ["input", "tap", "250", "550"]


def test_import_mp4_directly_without_docker():
    with TemporaryDirectory() as tmp:
        directory = Path(tmp)
        (directory / "clip_01.mp4").write_bytes(b"\x00\x00\x00\x18ftypisom" + b"test")
        old = content_queue.CONTENT_ROOT
        content_queue.CONTENT_ROOT = directory
        try:
            calls = []
            def run(command, **kwargs):
                calls.append(command)
                return CompletedProcess(command, 0, "", "")
            with patch.dict(os.environ, {
                "MOBILE_STUDIO_DEVICE_MODE": "physical",
                "MOBILE_STUDIO_ADB_PATH": "adb.exe"
            }):
                result = content_queue.import_content("clip_01", "unused-docker", "USB123", runner=run)
            assert result["ready"] is True
            assert all(call[0] == "adb.exe" for call in calls)
            assert any("push" in call for call in calls)
            assert any("MEDIA_SCANNER_SCAN_FILE" in call for call in calls)
        finally:
            content_queue.CONTENT_ROOT = old


def test_physical_mode_rejects_unauthorized_usb_device():
    with patch.object(gateway, "MODE", "physical"):
        with patch.object(gateway.subprocess, "run", return_value=CompletedProcess([], 1, "", "device unauthorized")):
            result = client.get("/v1/device", headers=AUTH)
        assert result.status_code == 503
