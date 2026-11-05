import hmac
import json
import math
import os
import statistics
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
import psycopg
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from psycopg.rows import dict_row
from pydantic import BaseModel

from analyzer import analyze as analyze_video

DATABASE_URL = os.environ.get("DATABASE_URL", "")
INTERNAL_TOKEN = os.environ.get("TRENDWATCH_INTERNAL_TOKEN", "")
SCRAPER_URL = os.environ.get("SCRAPER_URL", "http://instagram-scraper:8000").rstrip("/")
REFRESH_HOURS = float(os.environ.get("TW_REFRESH_HOURS", "6"))
REEL_PAGES = int(os.environ.get("TW_REEL_PAGES", "3"))
REQUEST_DELAY = float(os.environ.get("TW_REQUEST_DELAY", "1.5"))
SMOKE_USERNAME = os.environ.get("TW_SMOKE_USERNAME", "").strip()

app = FastAPI(title="ReplyHalo Trend Watch", version="0.1.0")

SCHEMA = """
CREATE TABLE IF NOT EXISTS tw_niches (
  id BIGSERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS tw_accounts (
  workspace_id TEXT NOT NULL,
  username TEXT NOT NULL,
  niche_id BIGINT,
  full_name TEXT,
  profile_pic TEXT,
  followers BIGINT,
  median_plays DOUBLE PRECISION,
  reel_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  error TEXT,
  last_synced TIMESTAMPTZ,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, username)
);

CREATE INDEX IF NOT EXISTS tw_accounts_workspace_niche
  ON tw_accounts(workspace_id, niche_id);

CREATE TABLE IF NOT EXISTS tw_reels (
  workspace_id TEXT NOT NULL,
  code TEXT NOT NULL,
  username TEXT NOT NULL,
  link TEXT,
  caption TEXT,
  published_at TIMESTAMPTZ,
  image TEXT,
  video_url TEXT,
  duration DOUBLE PRECISION,
  plays BIGINT,
  likes BIGINT,
  comments BIGINT,
  audio_title TEXT,
  audio_link TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  outlier DOUBLE PRECISION,
  velocity DOUBLE PRECISION,
  er DOUBLE PRECISION,
  virality DOUBLE PRECISION,
  score DOUBLE PRECISION,
  saved BOOLEAN NOT NULL DEFAULT FALSE,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (workspace_id, code)
);

CREATE INDEX IF NOT EXISTS tw_reels_workspace_username
  ON tw_reels(workspace_id, username);
CREATE INDEX IF NOT EXISTS tw_reels_workspace_score
  ON tw_reels(workspace_id, score DESC);

CREATE TABLE IF NOT EXISTS tw_snapshots (
  workspace_id TEXT NOT NULL,
  code TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  plays BIGINT,
  likes BIGINT,
  comments BIGINT,
  PRIMARY KEY (workspace_id, code, ts)
);

CREATE TABLE IF NOT EXISTS tw_trends (
  id BIGSERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  section TEXT,
  section_title TEXT,
  rank INTEGER,
  type TEXT,
  keyword TEXT,
  username TEXT,
  media_count BIGINT,
  thumb TEXT,
  reel_link TEXT
);

CREATE INDEX IF NOT EXISTS tw_trends_workspace
  ON tw_trends(workspace_id, rank);

CREATE TABLE IF NOT EXISTS tw_analyses (
  workspace_id TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  step TEXT,
  error TEXT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, code)
);

CREATE TABLE IF NOT EXISTS tw_events (
  id BIGSERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL
);
"""

_scraper = httpx.Client(timeout=90, follow_redirects=True)
_scraper_lock = threading.Lock()
_last_scraper_call = 0.0
_sync_lock = threading.Lock()
_syncing_workspaces: set[str] = set()
_analysis_lock = threading.Lock()
_analyzing: set[tuple[str, str]] = set()


class NicheIn(BaseModel):
    name: str


class AccountsIn(BaseModel):
    usernames: list[str]
    niche_id: Optional[int] = None


class SyncIn(BaseModel):
    usernames: Optional[list[str]] = None


class SavedIn(BaseModel):
    saved: bool = True


def utcnow():
    return datetime.now(timezone.utc)


def connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is required")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def query_all(sql: str, params=()):
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return list(cur.fetchall())


def query_one(sql: str, params=()):
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()


def execute(sql: str, params=()):
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)


def log_event(workspace_id: str, message: str, level: str = "info"):
    execute(
        "INSERT INTO tw_events(workspace_id, level, message) VALUES (%s, %s, %s)",
        (workspace_id, level, message[:1000]),
    )


def require_workspace(
    authorization: str = Header(default=""),
    x_replyhalo_workspace_id: str = Header(default=""),
):
    if not INTERNAL_TOKEN:
        raise HTTPException(503, "TRENDWATCH_INTERNAL_TOKEN is not configured")
    expected = "Bearer " + INTERNAL_TOKEN
    if not hmac.compare_digest(authorization, expected):
        raise HTTPException(401, "Unauthorized")
    workspace_id = x_replyhalo_workspace_id.strip()
    if not workspace_id:
        raise HTTPException(400, "Missing X-ReplyHalo-Workspace-Id")
    return workspace_id


def scraper_get(path: str, **params):
    global _last_scraper_call
    with _scraper_lock:
        wait = REQUEST_DELAY - (time.time() - _last_scraper_call)
        if wait > 0:
            time.sleep(wait)
        try:
            response = _scraper.get(
                SCRAPER_URL + path,
                params={k: v for k, v in params.items() if v is not None},
            )
        finally:
            _last_scraper_call = time.time()

    try:
        payload = response.json()
    except ValueError as exc:
        raise RuntimeError(
            path + ": Instagram scraper returned non-JSON HTTP " + str(response.status_code)
        ) from exc

    if response.status_code != 200:
        message = payload.get("error") if isinstance(payload, dict) else None
        raise RuntimeError(message or path + ": HTTP " + str(response.status_code))
    return payload


def clean_username(raw: str):
    value = (raw or "").strip().strip("/").split("?")[0]
    if "instagram.com/" in value:
        value = value.split("instagram.com/", 1)[1].split("/", 1)[0]
    return value.lstrip("@").lower()


def parse_ts(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def age_hours(value, now=None):
    dt = parse_ts(value)
    if not dt:
        return None
    current = now or utcnow()
    return max((current - dt).total_seconds() / 3600, 0.25)


def freshness(hours):
    if hours is None:
        return 0.5
    days = hours / 24
    if days <= 3:
        return 1.0
    return max(0.35, 1.0 - 0.65 * math.log(days / 3) / math.log(10))


def compute_score(reel, median, followers, prev_snapshot=None, now=None):
    plays = reel.get("plays") or 0
    likes = reel.get("likes") or 0
    comments = reel.get("comments") or 0
    hours = age_hours(reel.get("published_at"), now)

    outlier = round(plays / median, 2) if median and plays else None
    er = round((likes + comments) / plays, 4) if plays else None
    virality = round(plays / followers, 3) if followers and plays else None

    velocity = None
    if prev_snapshot and prev_snapshot.get("plays") is not None:
        t0 = parse_ts(prev_snapshot.get("ts"))
        delta_hours = (
            ((now or utcnow()) - t0).total_seconds() / 3600 if t0 else 0
        )
        if delta_hours >= 0.5:
            velocity = round(max(plays - prev_snapshot["plays"], 0) / delta_hours, 1)
    if velocity is None and hours:
        velocity = round(plays / hours, 1)

    score = None
    if outlier is not None:
        strength = min(1.0, math.log(1 + outlier) / math.log(51))
        score = round(100 * strength * freshness(hours), 1)

    return {
        "outlier": outlier,
        "er": er,
        "virality": virality,
        "velocity": velocity,
        "score": score,
    }


def normalized_reel(raw):
    stats = raw.get("stats") or {}
    audio = raw.get("audio") or {}
    video = raw.get("video") or {}
    plays = stats.get("play_count") or stats.get("view_count")
    code = raw.get("code")
    return {
        "code": code,
        "link": raw.get("link") or (
            "https://www.instagram.com/reel/" + str(code) + "/" if code else None
        ),
        "caption": raw.get("caption") or "",
        "published_at": parse_ts(raw.get("published_at")),
        "image": raw.get("image"),
        "video_url": video.get("link") if isinstance(video, dict) else None,
        "duration": (
            video.get("duration_seconds") if isinstance(video, dict) else None
        )
        or raw.get("duration_seconds"),
        "plays": plays,
        "likes": stats.get("like_count"),
        "comments": stats.get("comment_count"),
        "audio_title": " — ".join(
            str(x) for x in (audio.get("title"), audio.get("artist")) if x
        )
        or None,
        "audio_link": audio.get("link"),
        "is_pinned": bool(raw.get("is_pinned")),
        "is_paid": bool(raw.get("is_paid_partnership")),
    }


def scraper_reels(username: str):
    output = []
    cursor = None
    user = None
    for _ in range(max(1, REEL_PAGES)):
        payload = scraper_get("/users/reels", user=username, cursor=cursor)
        user = user or payload.get("user")
        output.extend(payload.get("reels") or [])
        cursor = payload.get("next_cursor")
        if not payload.get("has_more") or not cursor:
            break
    return user, output


def rescore_account(workspace_id: str, username: str):
    account = query_one(
        "SELECT * FROM tw_accounts WHERE workspace_id=%s AND username=%s",
        (workspace_id, username),
    )
    if not account:
        return

    recent = query_all(
        """
        SELECT plays, published_at
        FROM tw_reels
        WHERE workspace_id=%s AND username=%s
          AND is_pinned=FALSE AND plays IS NOT NULL
        ORDER BY published_at DESC NULLS LAST
        LIMIT 36
        """,
        (workspace_id, username),
    )
    now = utcnow()
    matured = [
        row["plays"]
        for row in recent
        if (age_hours(row.get("published_at"), now) or 0) >= 48
    ]
    baseline = matured if len(matured) >= 5 else [row["plays"] for row in recent]
    values = [value for value in baseline if value]
    median = float(statistics.median(values)) if values else None

    execute(
        """
        UPDATE tw_accounts
        SET median_plays=%s
        WHERE workspace_id=%s AND username=%s
        """,
        (median, workspace_id, username),
    )

    reels = query_all(
        "SELECT * FROM tw_reels WHERE workspace_id=%s AND username=%s",
        (workspace_id, username),
    )
    for reel in reels:
        snapshots = query_all(
            """
            SELECT ts, plays
            FROM tw_snapshots
            WHERE workspace_id=%s AND code=%s
            ORDER BY ts DESC
            LIMIT 2
            """,
            (workspace_id, reel["code"]),
        )
        prev = snapshots[1] if len(snapshots) > 1 else None
        score = compute_score(
            reel,
            median,
            account.get("followers"),
            prev_snapshot=prev,
            now=now,
        )
        execute(
            """
            UPDATE tw_reels
            SET outlier=%s, velocity=%s, er=%s, virality=%s, score=%s
            WHERE workspace_id=%s AND code=%s
            """,
            (
                score["outlier"],
                score["velocity"],
                score["er"],
                score["virality"],
                score["score"],
                workspace_id,
                reel["code"],
            ),
        )


def sync_account(workspace_id: str, username: str):
    username = clean_username(username)
    stamp = utcnow()
    try:
        profile = scraper_get("/users/profile", user=username)
        _, raw_reels = scraper_reels(username)
    except Exception as exc:
        execute(
            """
            UPDATE tw_accounts
            SET status='error', error=%s, last_synced=%s
            WHERE workspace_id=%s AND username=%s
            """,
            (str(exc)[:500], stamp, workspace_id, username),
        )
        log_event(workspace_id, "@" + username + ": " + str(exc), "error")
        return

    if profile.get("is_private"):
        execute(
            """
            UPDATE tw_accounts
            SET status='private', error='Private account', last_synced=%s
            WHERE workspace_id=%s AND username=%s
            """,
            (stamp, workspace_id, username),
        )
        return

    execute(
        """
        UPDATE tw_accounts
        SET full_name=%s, profile_pic=%s, followers=%s, status='ok',
            error=NULL, last_synced=%s
        WHERE workspace_id=%s AND username=%s
        """,
        (
            profile.get("full_name"),
            profile.get("profile_picture"),
            profile.get("follower_count"),
            stamp,
            workspace_id,
            username,
        ),
    )

    new_count = 0
    for raw in raw_reels:
        reel = normalized_reel(raw)
        if not reel["code"]:
            continue

        existing = query_one(
            "SELECT 1 FROM tw_reels WHERE workspace_id=%s AND code=%s",
            (workspace_id, reel["code"]),
        )
        if not existing:
            new_count += 1

        execute(
            """
            INSERT INTO tw_reels(
              workspace_id, code, username, link, caption, published_at, image,
              video_url, duration, plays, likes, comments, audio_title,
              audio_link, is_pinned, is_paid, updated_at
            )
            VALUES(
              %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
            ON CONFLICT(workspace_id, code) DO UPDATE SET
              username=EXCLUDED.username,
              link=EXCLUDED.link,
              caption=EXCLUDED.caption,
              published_at=EXCLUDED.published_at,
              image=EXCLUDED.image,
              video_url=EXCLUDED.video_url,
              duration=EXCLUDED.duration,
              plays=EXCLUDED.plays,
              likes=EXCLUDED.likes,
              comments=EXCLUDED.comments,
              audio_title=EXCLUDED.audio_title,
              audio_link=EXCLUDED.audio_link,
              is_pinned=EXCLUDED.is_pinned,
              is_paid=EXCLUDED.is_paid,
              updated_at=EXCLUDED.updated_at
            """,
            (
                workspace_id,
                reel["code"],
                username,
                reel["link"],
                reel["caption"],
                reel["published_at"],
                reel["image"],
                reel["video_url"],
                reel["duration"],
                reel["plays"],
                reel["likes"],
                reel["comments"],
                reel["audio_title"],
                reel["audio_link"],
                reel["is_pinned"],
                reel["is_paid"],
                stamp,
            ),
        )
        execute(
            """
            INSERT INTO tw_snapshots(workspace_id, code, ts, plays, likes, comments)
            VALUES (%s,%s,%s,%s,%s,%s)
            ON CONFLICT(workspace_id, code, ts) DO NOTHING
            """,
            (
                workspace_id,
                reel["code"],
                stamp,
                reel["plays"],
                reel["likes"],
                reel["comments"],
            ),
        )

    execute(
        """
        UPDATE tw_accounts
        SET reel_count=(
          SELECT COUNT(*)
          FROM tw_reels
          WHERE workspace_id=%s AND username=%s
        )
        WHERE workspace_id=%s AND username=%s
        """,
        (workspace_id, username, workspace_id, username),
    )
    rescore_account(workspace_id, username)
    log_event(
        workspace_id,
        "@" + username + ": " + str(len(raw_reels)) + " reels, " + str(new_count) + " new",
    )


def refresh_trends(workspace_id: str):
    payload = scraper_get("/explore/trending")
    sections = payload.get("sections") or []
    execute("DELETE FROM tw_trends WHERE workspace_id=%s", (workspace_id,))
    for section in sections:
        for entry in section.get("entries") or []:
            featured = entry.get("featured_reel") or {}
            user = entry.get("user") or {}
            execute(
                """
                INSERT INTO tw_trends(
                  workspace_id, fetched_at, section, section_title, rank, type,
                  keyword, username, media_count, thumb, reel_link
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    workspace_id,
                    utcnow(),
                    section.get("section"),
                    section.get("title") or section.get("section"),
                    entry.get("rank"),
                    entry.get("type"),
                    entry.get("keyword") or entry.get("display_name"),
                    user.get("username") or entry.get("username"),
                    entry.get("media_count") or user.get("follower_count"),
                    entry.get("thumbnail") or user.get("profile_picture"),
                    featured.get("link") or entry.get("link") or user.get("link"),
                ),
            )


def sync_workspace(workspace_id: str, usernames=None):
    with _sync_lock:
        if workspace_id in _syncing_workspaces:
            return
        _syncing_workspaces.add(workspace_id)

    try:
        if usernames is None:
            usernames = [
                row["username"]
                for row in query_all(
                    """
                    SELECT username
                    FROM tw_accounts
                    WHERE workspace_id=%s
                    ORDER BY last_synced NULLS FIRST
                    """,
                    (workspace_id,),
                )
            ]

        for username in usernames:
            sync_account(workspace_id, username)

        try:
            refresh_trends(workspace_id)
        except Exception as exc:
            log_event(workspace_id, "Instagram trends: " + str(exc), "error")
    finally:
        with _sync_lock:
            _syncing_workspaces.discard(workspace_id)


def run_analysis_job(workspace_id: str, code: str):
    key = (workspace_id, code)
    with _analysis_lock:
        if key in _analyzing:
            return
        _analyzing.add(key)

    try:
        execute(
            """
            INSERT INTO tw_analyses(workspace_id, code, status, step, error, updated_at)
            VALUES (%s,%s,'running','Preparing video',NULL,NOW())
            ON CONFLICT(workspace_id, code) DO UPDATE SET
              status='running', step='Preparing video', error=NULL, updated_at=NOW()
            """,
            (workspace_id, code),
        )

        reel = query_one(
            """
            SELECT r.*, a.followers, a.median_plays
            FROM tw_reels r
            LEFT JOIN tw_accounts a
              ON a.workspace_id=r.workspace_id AND a.username=r.username
            WHERE r.workspace_id=%s AND r.code=%s
            """,
            (workspace_id, code),
        )
        if not reel:
            raise RuntimeError("Reel is not available in this workspace")

        fresh_video_url = None
        try:
            details = scraper_get("/posts/details", post=code)
            video = details.get("video") or {}
            if isinstance(video, dict):
                fresh_video_url = video.get("link")
        except Exception:
            pass

        execute(
            """
            UPDATE tw_analyses
            SET step='Frames, pacing, hook and transcript', updated_at=NOW()
            WHERE workspace_id=%s AND code=%s
            """,
            (workspace_id, code),
        )

        result = analyze_video(workspace_id, code, reel, fresh_video_url)
        execute(
            """
            UPDATE tw_analyses
            SET status='done', step='Ready', data=%s::jsonb,
                error=NULL, updated_at=NOW()
            WHERE workspace_id=%s AND code=%s
            """,
            (json.dumps(result, ensure_ascii=False, default=str), workspace_id, code),
        )
        log_event(workspace_id, "Video analysis ready: " + code)
    except Exception as exc:
        execute(
            """
            INSERT INTO tw_analyses(workspace_id, code, status, step, error, updated_at)
            VALUES (%s,%s,'error','Failed',%s,NOW())
            ON CONFLICT(workspace_id, code) DO UPDATE SET
              status='error', step='Failed', error=EXCLUDED.error, updated_at=NOW()
            """,
            (workspace_id, code, str(exc)[:1200]),
        )
        log_event(workspace_id, "Video analysis failed " + code + ": " + str(exc), "error")
    finally:
        with _analysis_lock:
            _analyzing.discard(key)


def startup_smoke():
    if not SMOKE_USERNAME:
        return
    try:
        profile = scraper_get("/users/profile", user=clean_username(SMOKE_USERNAME))
        username = profile.get("username") or clean_username(SMOKE_USERNAME)
        followers = profile.get("follower_count")
        print(
            "TRENDWATCH_SMOKE_OK username=@"
            + str(username)
            + " followers="
            + str(followers)
        )
    except Exception as exc:
        print("TRENDWATCH_SMOKE_ERROR " + str(exc))


def scheduler():
    while True:
        time.sleep(60)
        if REFRESH_HOURS <= 0:
            continue
        cutoff = utcnow() - timedelta(hours=REFRESH_HOURS)
        workspaces = query_all(
            """
            SELECT DISTINCT workspace_id
            FROM tw_accounts
            WHERE last_synced IS NULL OR last_synced < %s
            """,
            (cutoff,),
        )
        for row in workspaces:
            workspace_id = row["workspace_id"]
            with _sync_lock:
                busy = workspace_id in _syncing_workspaces
            if not busy:
                threading.Thread(
                    target=sync_workspace,
                    args=(workspace_id,),
                    daemon=True,
                ).start()


@app.on_event("startup")
def startup():
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA)
    threading.Thread(target=scheduler, daemon=True).start()
    if SMOKE_USERNAME:
        threading.Thread(target=startup_smoke, daemon=True).start()


@app.get("/health")
def health():
    database_ok = False
    scraper_ok = False
    try:
        database_ok = bool(query_one("SELECT 1 AS ok"))
    except Exception:
        pass
    try:
        scraper_get("/health")
        scraper_ok = True
    except Exception:
        pass
    return {
        "ok": database_ok,
        "database_ok": database_ok,
        "scraper_ok": scraper_ok,
    }


@app.get("/v1/status")
def status(workspace_id: str = Depends(require_workspace)):
    counts = query_one(
        """
        SELECT
          (SELECT COUNT(*) FROM tw_accounts WHERE workspace_id=%s) AS accounts,
          (SELECT COUNT(*) FROM tw_reels WHERE workspace_id=%s) AS reels,
          (SELECT COUNT(*) FROM tw_niches WHERE workspace_id=%s) AS niches,
          (SELECT COUNT(*) FROM tw_reels
             WHERE workspace_id=%s AND outlier>=3 AND is_pinned=FALSE) AS outliers
        """,
        (workspace_id, workspace_id, workspace_id, workspace_id),
    )
    with _sync_lock:
        running = workspace_id in _syncing_workspaces
    return {"items": counts or {}, "sync_running": running}


@app.get("/v1/niches")
def niches(workspace_id: str = Depends(require_workspace)):
    items = query_all(
        """
        SELECT n.id, n.name,
          (SELECT COUNT(*) FROM tw_accounts a
           WHERE a.workspace_id=n.workspace_id AND a.niche_id=n.id) AS accounts
        FROM tw_niches n
        WHERE n.workspace_id=%s
        ORDER BY n.name
        """,
        (workspace_id,),
    )
    return {"items": items}


@app.post("/v1/niches")
def add_niche(body: NicheIn, workspace_id: str = Depends(require_workspace)):
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "Niche name is required")
    execute(
        """
        INSERT INTO tw_niches(workspace_id, name)
        VALUES (%s,%s)
        ON CONFLICT(workspace_id, name) DO NOTHING
        """,
        (workspace_id, name),
    )
    item = query_one(
        "SELECT id, name FROM tw_niches WHERE workspace_id=%s AND name=%s",
        (workspace_id, name),
    )
    return {"item": item}


@app.delete("/v1/niches/{niche_id}")
def delete_niche(
    niche_id: int,
    workspace_id: str = Depends(require_workspace),
):
    execute(
        """
        UPDATE tw_accounts SET niche_id=NULL
        WHERE workspace_id=%s AND niche_id=%s
        """,
        (workspace_id, niche_id),
    )
    execute(
        "DELETE FROM tw_niches WHERE workspace_id=%s AND id=%s",
        (workspace_id, niche_id),
    )
    return {"ok": True}


@app.get("/v1/accounts")
def accounts(workspace_id: str = Depends(require_workspace)):
    items = query_all(
        """
        SELECT a.*, n.name AS niche,
          (SELECT MAX(r.outlier)
           FROM tw_reels r
           WHERE r.workspace_id=a.workspace_id
             AND r.username=a.username
             AND r.is_pinned=FALSE) AS best_outlier,
          (SELECT COUNT(*)
           FROM tw_reels r
           WHERE r.workspace_id=a.workspace_id
             AND r.username=a.username
             AND r.outlier>=3
             AND r.is_pinned=FALSE) AS outliers
        FROM tw_accounts a
        LEFT JOIN tw_niches n
          ON n.workspace_id=a.workspace_id AND n.id=a.niche_id
        WHERE a.workspace_id=%s
        ORDER BY a.username
        """,
        (workspace_id,),
    )
    return {"items": items}


@app.post("/v1/accounts")
def add_accounts(
    body: AccountsIn,
    background: BackgroundTasks,
    workspace_id: str = Depends(require_workspace),
):
    added = []
    for raw in body.usernames:
        for part in raw.replace(",", "\n").split():
            username = clean_username(part)
            if not username or username in added:
                continue
            execute(
                """
                INSERT INTO tw_accounts(workspace_id, username, niche_id)
                VALUES (%s,%s,%s)
                ON CONFLICT(workspace_id, username) DO UPDATE SET
                  niche_id=COALESCE(EXCLUDED.niche_id, tw_accounts.niche_id)
                """,
                (workspace_id, username, body.niche_id),
            )
            added.append(username)

    if added:
        background.add_task(sync_workspace, workspace_id, added)
    return {"added": added, "sync_started": bool(added)}


@app.delete("/v1/accounts/{username}")
def delete_account(
    username: str,
    workspace_id: str = Depends(require_workspace),
):
    username = clean_username(username)
    execute(
        "DELETE FROM tw_snapshots WHERE workspace_id=%s AND code IN "
        "(SELECT code FROM tw_reels WHERE workspace_id=%s AND username=%s)",
        (workspace_id, workspace_id, username),
    )
    execute(
        "DELETE FROM tw_reels WHERE workspace_id=%s AND username=%s",
        (workspace_id, username),
    )
    execute(
        "DELETE FROM tw_accounts WHERE workspace_id=%s AND username=%s",
        (workspace_id, username),
    )
    return {"ok": True}


@app.get("/v1/similar/{username}")
def similar(username: str, workspace_id: str = Depends(require_workspace)):
    payload = scraper_get("/users/similar", user=clean_username(username))
    tracked = {
        row["username"]
        for row in query_all(
            "SELECT username FROM tw_accounts WHERE workspace_id=%s",
            (workspace_id,),
        )
    }
    items = []
    for user in payload.get("similar_users") or []:
        username_value = user.get("username")
        if not username_value:
            continue
        items.append(
            {
                "username": username_value,
                "full_name": user.get("full_name"),
                "is_verified": user.get("is_verified"),
                "profile_picture": user.get("profile_picture"),
                "tracked": username_value in tracked,
            }
        )
    return {"items": items}


@app.post("/v1/sync")
def sync(
    body: SyncIn,
    background: BackgroundTasks,
    workspace_id: str = Depends(require_workspace),
):
    with _sync_lock:
        if workspace_id in _syncing_workspaces:
            return {"started": False, "reason": "already_running"}
    usernames = [clean_username(x) for x in body.usernames] if body.usernames else None
    background.add_task(sync_workspace, workspace_id, usernames)
    return {"started": True}


@app.get("/v1/outliers")
def outliers(
    period: str = "30d",
    min_outlier: float = 3,
    sort: str = "score",
    workspace_id: str = Depends(require_workspace),
):
    days_map = {"7d": 7, "30d": 30, "90d": 90, "all": None}
    days = days_map.get(period, 30)
    sort_map = {
        "score": "score DESC NULLS LAST",
        "outlier": "outlier DESC NULLS LAST",
        "plays": "plays DESC NULLS LAST",
        "velocity": "velocity DESC NULLS LAST",
        "er": "er DESC NULLS LAST",
        "new": "published_at DESC NULLS LAST",
    }
    order_by = sort_map.get(sort, sort_map["score"])

    where = [
        "r.workspace_id=%s",
        "r.is_pinned=FALSE",
        "COALESCE(r.outlier, 0) >= %s",
    ]
    params = [workspace_id, min_outlier]
    if days is not None:
        where.append("r.published_at >= %s")
        params.append(utcnow() - timedelta(days=days))

    items = query_all(
        """
        SELECT r.code, r.username, r.link, r.caption, r.published_at,
               r.image AS thumb, r.image, r.plays, r.likes, r.comments,
               r.audio_title, r.outlier, r.velocity, r.er, r.virality,
               r.score, r.saved, a.followers, a.median_plays
        FROM tw_reels r
        LEFT JOIN tw_accounts a
          ON a.workspace_id=r.workspace_id AND a.username=r.username
        WHERE """ + " AND ".join(where) + """
        ORDER BY """ + order_by + """
        LIMIT 300
        """,
        tuple(params),
    )
    return {"items": items}


@app.patch("/v1/reels/{code}/saved")
def save_reel(
    code: str,
    body: SavedIn,
    workspace_id: str = Depends(require_workspace),
):
    execute(
        "UPDATE tw_reels SET saved=%s WHERE workspace_id=%s AND code=%s",
        (body.saved, workspace_id, code),
    )
    return {"ok": True, "saved": body.saved}


@app.get("/v1/saved")
def saved(workspace_id: str = Depends(require_workspace)):
    items = query_all(
        """
        SELECT code, username, link, caption, published_at, image AS thumb,
               plays, outlier, velocity, er, score
        FROM tw_reels
        WHERE workspace_id=%s AND saved=TRUE
        ORDER BY updated_at DESC NULLS LAST, first_seen DESC
        """,
        (workspace_id,),
    )
    return {"items": items}


@app.get("/v1/trends")
def trends(workspace_id: str = Depends(require_workspace)):
    items = query_all(
        """
        SELECT id, fetched_at, section, section_title, rank, type, keyword,
               username, media_count, thumb, reel_link
        FROM tw_trends
        WHERE workspace_id=%s
        ORDER BY rank NULLS LAST, id
        """,
        (workspace_id,),
    )
    return {"items": items}


@app.post("/v1/analysis/{code}")
def start_analysis(
    code: str,
    background: BackgroundTasks,
    workspace_id: str = Depends(require_workspace),
):
    reel = query_one(
        "SELECT code FROM tw_reels WHERE workspace_id=%s AND code=%s",
        (workspace_id, code),
    )
    if not reel:
        raise HTTPException(404, "Reel not found in this workspace")

    existing = query_one(
        "SELECT status FROM tw_analyses WHERE workspace_id=%s AND code=%s",
        (workspace_id, code),
    )
    if existing and existing.get("status") == "running":
        return {"status": "running"}

    execute(
        """
        INSERT INTO tw_analyses(workspace_id, code, status, step, error, updated_at)
        VALUES (%s,%s,'queued','Queued',NULL,NOW())
        ON CONFLICT(workspace_id, code) DO UPDATE SET
          status='queued', step='Queued', error=NULL, updated_at=NOW()
        """,
        (workspace_id, code),
    )
    background.add_task(run_analysis_job, workspace_id, code)
    return {"status": "queued"}


@app.get("/v1/analysis/{code}")
def get_analysis(code: str, workspace_id: str = Depends(require_workspace)):
    row = query_one(
        """
        SELECT code, status, step, error, data, created_at, updated_at
        FROM tw_analyses
        WHERE workspace_id=%s AND code=%s
        """,
        (workspace_id, code),
    )
    if not row:
        return {"item": None}
    return {"item": row}


@app.get("/v1/events")
def events(workspace_id: str = Depends(require_workspace)):
    items = query_all(
        """
        SELECT id, ts, level, message
        FROM tw_events
        WHERE workspace_id=%s
        ORDER BY id DESC
        LIMIT 100
        """,
        (workspace_id,),
    )
    return {"items": items}
