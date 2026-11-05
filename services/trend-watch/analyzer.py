import base64
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

import httpx

DATA_DIR = Path(os.environ.get("TW_DATA_DIR", "/data")).resolve()
ANALYSES_DIR = DATA_DIR / "analyses"
ANALYSES_DIR.mkdir(parents=True, exist_ok=True)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.environ.get("TW_AI_MODEL", "claude-sonnet-4-5")
AI_LANGUAGE = os.environ.get("TW_AI_LANGUAGE", "English")
MY_NICHE = os.environ.get("TW_MY_NICHE", "")

PTS_RE = re.compile(r"pts_time:([0-9.]+)")


def safe_workspace(workspace_id: str):
    return re.sub(r"[^a-zA-Z0-9_-]", "_", workspace_id)


def workdir(workspace_id: str, code: str):
    path = ANALYSES_DIR / safe_workspace(workspace_id) / re.sub(
        r"[^a-zA-Z0-9_-]", "_", code
    )
    path.mkdir(parents=True, exist_ok=True)
    return path


def run(cmd, timeout=300):
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout or "command failed")[-1200:])
    return proc


def metadata(video: Path):
    proc = run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=width,height",
            "-of",
            "json",
            str(video),
        ],
        timeout=60,
    )
    payload = json.loads(proc.stdout)
    streams = payload.get("streams") or []
    video_stream = next(
        (stream for stream in streams if stream.get("width") and stream.get("height")),
        {},
    )
    return {
        "duration_seconds": float(
            (payload.get("format") or {}).get("duration") or 0
        ),
        "width": video_stream.get("width"),
        "height": video_stream.get("height"),
    }


def extract_scene_frames(video: Path, out: Path, max_frames=40):
    out.mkdir(parents=True, exist_ok=True)
    pattern = str(out / "scene_%03d.jpg")
    proc = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            str(video),
            "-vf",
            "select='gt(scene,0.30)',showinfo,scale=480:-2",
            "-vsync",
            "vfr",
            "-frames:v",
            str(max_frames),
            "-q:v",
            "3",
            pattern,
            "-y",
        ],
        capture_output=True,
        text=True,
        timeout=300,
    )
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or "ffmpeg scene extraction failed")[-1200:])

    timestamps = [float(value) for value in PTS_RE.findall(proc.stderr or "")]
    files = sorted(out.glob("scene_*.jpg"))
    return [
        {
            "file": file.name,
            "timestamp_seconds": timestamps[index]
            if index < len(timestamps)
            else None,
            "source": "scene-change",
        }
        for index, file in enumerate(files)
    ]


def extract_uniform_frames(video: Path, out: Path, fps=1.0, max_frames=40):
    out.mkdir(parents=True, exist_ok=True)
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            str(video),
            "-vf",
            "fps=" + str(fps) + ",scale=480:-2",
            "-frames:v",
            str(max_frames),
            "-q:v",
            "3",
            str(out / "frame_%03d.jpg"),
            "-y",
        ],
        timeout=300,
    )
    files = sorted(out.glob("frame_*.jpg"))
    return [
        {
            "file": file.name,
            "timestamp_seconds": round(index / fps, 3),
            "source": "uniform",
        }
        for index, file in enumerate(files)
    ]


def extract_hook_frames(video: Path, out: Path):
    out.mkdir(parents=True, exist_ok=True)
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-ss",
            "0",
            "-t",
            "10",
            "-i",
            str(video),
            "-vf",
            "fps=2,scale=480:-2",
            "-frames:v",
            "20",
            "-q:v",
            "3",
            str(out / "hook_%03d.jpg"),
            "-y",
        ],
        timeout=120,
    )
    files = sorted(out.glob("hook_*.jpg"))
    return [
        {
            "file": file.name,
            "timestamp_seconds": round(index * 0.5, 3),
            "source": "hook-2fps",
        }
        for index, file in enumerate(files)
    ]


def pacing(scene_frames, duration):
    times = [
        frame.get("timestamp_seconds")
        for frame in scene_frames
        if frame.get("timestamp_seconds") is not None
    ]
    if not times:
        return {
            "shot_count": None,
            "cuts_per_minute": None,
            "mean_shot_length": None,
        }

    shot_count = max(len(times), 1)
    cuts_per_minute = (
        round((shot_count - 1) / max(duration, 0.001) * 60, 2)
        if duration
        else None
    )
    mean_shot_length = (
        round(duration / shot_count, 2) if duration and shot_count else None
    )
    return {
        "shot_count": shot_count,
        "cuts_per_minute": cuts_per_minute,
        "mean_shot_length": mean_shot_length,
    }


def extract_audio(video: Path, audio: Path):
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            str(video),
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-b:a",
            "64k",
            str(audio),
            "-y",
        ],
        timeout=180,
    )


def transcribe(video: Path, out: Path):
    if not GROQ_API_KEY and not OPENAI_API_KEY:
        return {"enabled": False, "text": None, "segments": [], "provider": None}

    audio = out / "audio.mp3"
    extract_audio(video, audio)

    if GROQ_API_KEY:
        endpoint = "https://api.groq.com/openai/v1/audio/transcriptions"
        key = GROQ_API_KEY
        model = "whisper-large-v3"
        provider = "groq"
    else:
        endpoint = "https://api.openai.com/v1/audio/transcriptions"
        key = OPENAI_API_KEY
        model = "whisper-1"
        provider = "openai"

    with audio.open("rb") as handle:
        response = httpx.post(
            endpoint,
            headers={"Authorization": "Bearer " + key},
            files={"file": ("audio.mp3", handle, "audio/mpeg")},
            data={
                "model": model,
                "response_format": "verbose_json",
                "timestamp_granularities[]": "segment",
            },
            timeout=180,
        )
    if response.status_code >= 400:
        raise RuntimeError(
            provider + " Whisper failed: " + response.text[:500]
        )

    payload = response.json()
    return {
        "enabled": True,
        "text": payload.get("text"),
        "segments": payload.get("segments") or [],
        "provider": provider,
    }


def image_block(path: Path):
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": base64.b64encode(path.read_bytes()).decode(),
        },
    }


def ai_breakdown(result, reel, out: Path):
    if not ANTHROPIC_API_KEY:
        return None

    content = []
    hook_files = [out / "hook" / frame["file"] for frame in result["hook_frames"]]
    scene_files = [out / "frames" / frame["file"] for frame in result["frames"]]

    selected = hook_files[::4][:5]
    if scene_files:
        step = max(1, len(scene_files) // 6)
        selected += scene_files[::step][:6]

    for frame in selected:
        if frame.exists():
            content.append(image_block(frame))

    stats = {
        "username": reel.get("username"),
        "plays": reel.get("plays"),
        "likes": reel.get("likes"),
        "comments": reel.get("comments"),
        "outlier": reel.get("outlier"),
        "velocity": reel.get("velocity"),
        "er": reel.get("er"),
        "caption": (reel.get("caption") or "")[:1500],
        "audio_title": reel.get("audio_title"),
        "duration": result.get("meta", {}).get("duration_seconds"),
        "pacing": result.get("pacing"),
        "transcript": result.get("transcript", {}).get("text"),
    }

    prompt = (
        "Analyze this viral short-form video using the supplied frames, "
        "transcript and performance data. Respond in " + AI_LANGUAGE + ".\n\n"
        "Performance and content data:\n" +
        json.dumps(stats, ensure_ascii=False, default=str) +
        "\n\nReturn concise Markdown with these sections:\n"
        "## Why it worked\n"
        "## Hook (0-3s)\n"
        "## Structure timeline\n"
        "## Editing and visual tactics\n"
        "## Repeatable formula\n"
        "## Adaptation for my niche\n"
        "Give 3 hook variants and one 20-40 second script."
    )
    if MY_NICHE:
        prompt += "\nMy niche: " + MY_NICHE

    content.append({"type": "text", "text": prompt})

    response = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": ANTHROPIC_MODEL,
            "max_tokens": 3000,
            "messages": [{"role": "user", "content": content}],
        },
        timeout=180,
    )
    if response.status_code >= 400:
        raise RuntimeError("Anthropic analysis failed: " + response.text[:500])
    payload = response.json()
    return "".join(
        block.get("text", "")
        for block in payload.get("content") or []
        if block.get("type") == "text"
    )


def download_video(video_url: str, destination: Path):
    with httpx.stream(
        "GET",
        video_url,
        timeout=120,
        follow_redirects=True,
    ) as response:
        response.raise_for_status()
        with destination.open("wb") as handle:
            for chunk in response.iter_bytes(1 << 16):
                handle.write(chunk)


def analyze(workspace_id: str, code: str, reel: dict, fresh_video_url: str | None):
    out = workdir(workspace_id, code)
    video = out / "video.mp4"

    if fresh_video_url:
        download_video(fresh_video_url, video)
    elif reel.get("video_url"):
        download_video(reel["video_url"], video)
    else:
        raise RuntimeError("No downloadable video URL is available for this Reel")

    meta = metadata(video)
    frames_dir = out / "frames"
    hook_dir = out / "hook"

    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    if hook_dir.exists():
        shutil.rmtree(hook_dir)

    frames = extract_scene_frames(video, frames_dir)
    if len(frames) < 3:
        shutil.rmtree(frames_dir, ignore_errors=True)
        frames = extract_uniform_frames(video, frames_dir, fps=1.0)

    hook_frames = extract_hook_frames(video, hook_dir)
    transcript = transcribe(video, out)
    result = {
        "meta": meta,
        "sampling": frames[0]["source"] if frames else "none",
        "frames": frames,
        "hook_frames": hook_frames,
        "pacing": pacing(frames, meta.get("duration_seconds") or 0),
        "transcript": transcript,
    }
    result["ai_markdown"] = ai_breakdown(result, reel, out)
    return result
