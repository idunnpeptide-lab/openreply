"""No real Android host is needed for isolated gateway safety tests."""
import importlib
import os
from unittest.mock import patch
from subprocess import CompletedProcess

from fastapi.testclient import TestClient

os.environ["MOBILE_STUDIO_TOKEN"] = "test-" + "x" * 44
gateway = importlib.import_module("gateway")
client = TestClient(gateway.app)
AUTH = {"Authorization": "Bearer " + os.environ["MOBILE_STUDIO_TOKEN"]}


def fake_docker(command, **kwargs):
    if "get-state" in command:
        return CompletedProcess(command, 0, stdout="device\n", stderr="")
    if "pm" in command and "path" in command:
        return CompletedProcess(command, 1, stdout="", stderr="not installed")
    return CompletedProcess(command, 0, stdout="ok\n", stderr="")


def test_health_has_no_secrets():
    response = client.get("/health")
    assert response.status_code == 200
    assert os.environ["MOBILE_STUDIO_TOKEN"] not in response.text


def test_all_device_actions_require_auth():
    assert client.get("/v1/device").status_code == 401
    assert client.post("/v1/apps/instagram/open").status_code == 401
    assert client.post("/v1/media", files={"file": ("x.mp4", b"fake")}).status_code == 401


def test_device_status_handles_uninstalled_apps():
    with patch.object(gateway.subprocess, "run", side_effect=fake_docker):
        response = client.get("/v1/device", headers=AUTH)
    assert response.status_code == 200
    assert response.json()["ready"] is True
    assert response.json()["apps"]["instagram"] is False


def test_unknown_app_is_never_executed():
    with patch.object(gateway.subprocess, "run") as runner:
        response = client.post("/v1/apps/anything/open", headers=AUTH)
        assert response.status_code == 404
        runner.assert_not_called()


def test_manual_app_launch_never_publishes():
    with patch.object(gateway.subprocess, "run", side_effect=fake_docker) as runner:
        response = client.post("/v1/apps/instagram/open", headers=AUTH)
    assert response.status_code == 200
    assert response.json()["posted"] is False
    assert runner.call_count == 1
    assert "monkey" in runner.call_args.args[0]


def test_non_mp4_media_is_rejected():
    with patch.object(gateway.subprocess, "run") as runner:
        response = client.post(
            "/v1/media", headers=AUTH,
            files={"file": ("payload.txt", b"arbitrary content", "text/plain")},
        )
        assert response.status_code == 415
        runner.assert_not_called()


def test_mp4_signature_is_required():
    with patch.object(gateway.subprocess, "run") as runner:
        response = client.post(
            "/v1/media", headers=AUTH,
            files={"file": ("video.mp4", b"not a real mp4", "video/mp4")},
        )
        assert response.status_code == 415
        runner.assert_not_called()


def test_valid_mp4_import_pushes_only_to_movies():
    mp4 = b"\x00\x00\x00\x18ftypisom" + (b"\x00" * 24)
    with patch.object(gateway.subprocess, "run", side_effect=fake_docker) as runner:
        response = client.post(
            "/v1/media", headers=AUTH,
            files={"file": ("clip.mp4", mp4, "video/mp4")},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["published"] is False
    assert data["android_path"].startswith("/sdcard/Movies/ReplyHalo/")
    assert any("push" in call.args[0] for call in runner.call_args_list)
