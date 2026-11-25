"""Isolated tests for an explicitly approved autonomous mobile publishing batch."""
import os
from pathlib import Path
from tempfile import TemporaryDirectory

os.environ.setdefault("MOBILE_STUDIO_TOKEN", "test-" + "x" * 44)
os.environ.setdefault("MOBILE_STUDIO_WORKSPACE_ID", "test-workspace")
os.environ.setdefault("MOBILE_STUDIO_RUNS_DB", "/tmp/mobile-studio-tests-" + str(os.getpid()) + ".sqlite3")

from fastapi import HTTPException
from fastapi.testclient import TestClient

from gateway import app
from runs import RunApproval, approve_run, check_run, close_run
import content_queue

AUTH = {
    "Authorization": "Bearer " + os.environ["MOBILE_STUDIO_TOKEN"],
    "X-ReplyHalo-Workspace-Id": os.environ["MOBILE_STUDIO_WORKSPACE_ID"],
}
client = TestClient(app)


def test_rejects_unapproved_batch():
    try:
        approve_run(RunApproval(
            platform="instagram", account="test", content_ids=["video_001"],
            confirm_publish=False,
        ))
        assert False, "Approval must be denied"
    except HTTPException as error:
        assert error.status_code == 422


def test_batch_allows_only_selected_video():
    grant = approve_run(RunApproval(
        platform="instagram", account="test_account", content_ids=["video_001"],
        confirm_publish=True,
    ))
    run_id = grant["run_id"]
    assert check_run(run_id, "instagram", False)["content_ids"] == ["video_001"]
    try:
        check_run(run_id, "tiktok", False)
        assert False
    except HTTPException as error:
        assert error.status_code == 403
    with TemporaryDirectory() as directory:
        path = Path(directory)
        (path / "video_001.mp4").write_bytes(b"\x00\x00\x00\x18ftypisom")
        previous = content_queue.CONTENT_ROOT
        content_queue.CONTENT_ROOT = path
        try:
            assert client.post("/v1/runs/" + run_id + "/content/video_002/import", headers=AUTH).status_code == 403
            listing = client.get("/v1/content", headers=AUTH)
            assert listing.status_code == 200
            assert listing.json()["items"][0]["id"] == "video_001"
        finally:
            content_queue.CONTENT_ROOT = previous
    assert close_run(run_id)["status"] == "closed"
    try:
        check_run(run_id)
        assert False
    except HTTPException as error:
        assert error.status_code == 403


def test_ai_cannot_approve_batch_without_endpoint():
    # The web dashboard uses the authenticated route; MCP lacks this action.
    response = client.post("/v1/runs/approve", headers=AUTH, json={
        "platform":"instagram","account":"test","content_ids":["video_001"],
        "confirm_publish":False,
    })
    assert response.status_code == 422


def test_invalid_coordinates_cannot_run():
    grant = approve_run(RunApproval(
        platform="instagram", account="test", content_ids=["video_001"], confirm_publish=True
    ))
    response = client.post("/v1/runs/" + grant["run_id"] + "/ui/tap", headers=AUTH, json={"x":-5,"y":4000})
    assert response.status_code == 422
