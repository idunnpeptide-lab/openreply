"""Durable, explicitly approved autonomous publishing run grants.

Only a logged-in ReplyHalo admin via the web proxy can approve a run.
MCP can operate an approved run but cannot approve itself. A run expires
after 6 hours, is bound to one social app and has a bounded action budget.
"""
import os
import sqlite3
import threading
import time
import uuid
from fastapi import HTTPException
from pydantic import BaseModel, Field

DB_PATH = os.getenv("MOBILE_STUDIO_RUNS_DB", "/srv/replyhalo-content/runs.sqlite3")
LOCK = threading.RLock()
MAX_ACTIONS = 180
MAX_RUN_SECONDS = 6 * 3600


class RunApproval(BaseModel):
    platform: str
    account: str = Field(min_length=1, max_length=80)
    content_ids: list[str] = Field(min_length=1, max_length=20)
    publish_mode: str = Field(default="now", pattern=r"^(now|draft|schedule)$")
    confirm_publish: bool = False


def connect():
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """CREATE TABLE IF NOT EXISTS runs(
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        account TEXT NOT NULL,
        content_ids TEXT NOT NULL,
        publish_mode TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        actions INTEGER NOT NULL DEFAULT 0,
        last_action_at INTEGER
        )"""
    )
    conn.commit()
    return conn


def approve_run(body: RunApproval):
    if not body.confirm_publish:
        raise HTTPException(422, "Explicit batch publication approval is required")
    if body.platform not in ("instagram", "tiktok", "youtube", "x"):
        raise HTTPException(422, "Unsupported platform")
    if len(set(body.content_ids)) != len(body.content_ids):
        raise HTTPException(422, "Duplicate content IDs")
    if not all(isinstance(x, str) and len(x) <= 80 and x.isascii() and x.replace("-", "").replace("_", "").isalnum() for x in body.content_ids):
        raise HTTPException(422, "Invalid content identifier")
    now = int(time.time())
    run_id = uuid.uuid4().hex
    with LOCK, connect() as db:
        db.execute(
            "INSERT INTO runs(id, platform, account, content_ids, publish_mode, status, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?)",
            (run_id, body.platform, body.account, ",".join(body.content_ids), body.publish_mode, "approved", now, now + MAX_RUN_SECONDS),
        )
    return {"run_id": run_id, "status": "approved", "expires_at": now + MAX_RUN_SECONDS, "action_limit": MAX_ACTIONS}


def check_run(run_id: str, requested_platform: str | None = None, count_action: bool = True):
    now = int(time.time())
    with LOCK, connect() as db:
        row = db.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Approved run not found")
        if row["status"] != "approved" or row["expires_at"] <= now or row["actions"] >= MAX_ACTIONS:
            raise HTTPException(403, "Run is expired, closed, or exhausted")
        if requested_platform and row["platform"] != requested_platform:
            raise HTTPException(403, "App is outside this approved run")
        if count_action:
            db.execute("UPDATE runs SET actions=actions+1, last_action_at=? WHERE id=?", (now, run_id))
        return {
            "run_id": row["id"], "platform": row["platform"],
            "account": row["account"], "content_ids": row["content_ids"].split(","),
            "publish_mode": row["publish_mode"], "remaining_actions": MAX_ACTIONS - row["actions"] - (1 if count_action else 0),
            "expires_at": row["expires_at"],
        }


def close_run(run_id: str):
    with LOCK, connect() as db:
        updated = db.execute("UPDATE runs SET status='closed' WHERE id=?", (run_id,)).rowcount
    if not updated:
        raise HTTPException(404, "Run not found")
    return {"run_id": run_id, "status": "closed"}
