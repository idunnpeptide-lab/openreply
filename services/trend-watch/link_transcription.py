"""Public Instagram/TikTok URL -> locally transcribed speech.

Only explicit social-video hostnames are accepted. Use yt-dlp extractors rather
than arbitrary HTTP downloads. Never accept credentials, private URLs or
operator-provided downloader options.
"""
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

from analyzer import DATA_DIR, extract_audio, metadata, transcribe_local, transcribe

MAX_VIDEO_BYTES = 150 * 1024 * 1024
MAX_DURATION_SECONDS = 600

INSTAGRAM_HOSTS = {"instagram.com", "www.instagram.com"}
TIKTOK_HOSTS = {"tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"}


def validate_social_url(value: str) -> tuple[str, str]:
    if not isinstance(value, str) or len(value) > 2048:
        raise ValueError("Paste a valid public Instagram or TikTok video link")
    try:
        u = urlsplit(value.strip())
        host = (u.hostname or "").lower().rstrip(".")
        if u.scheme != "https" or u.username or u.password or u.port not in (None, 443):
            raise ValueError("Only public HTTPS Instagram and TikTok links are allowed")
    except ValueError as error:
        raise ValueError("Only public HTTPS Instagram and TikTok links are allowed") from error
    if host in INSTAGRAM_HOSTS:
        if not re.match(r"^/(reel|reels|p|tv)/[A-Za-z0-9_-]{5,40}(?:/|$)", u.path):
            raise ValueError("Please provide a direct Instagram Reel or post URL")
        return "instagram", value.strip()
    if host in TIKTOK_HOSTS:
        if not (
            re.search(r"/video/[0-9]{8,25}(?:/|$)", u.path)
            or (host in {"vm.tiktok.com", "vt.tiktok.com"} and re.fullmatch(r"/[A-Za-z0-9]+/?", u.path))
        ):
            raise ValueError("Please provide a direct TikTok video URL")
        return "tiktok", value.strip()
    raise ValueError("Only public Instagram and TikTok video links are supported")


def transcribe_public_video(source_url: str) -> dict:
    platform, link = validate_social_url(source_url)
    with tempfile.TemporaryDirectory(prefix="tw-link-", dir=str(DATA_DIR)) as temp:
        directory = Path(temp)
        target = directory / "source.%(ext)s"
        command = [
            "yt-dlp", "--no-config", "--no-playlist", "--no-progress",
            "--no-warnings", "--no-check-certificates",  # yt-dlp must use validated HTTPS hosts
            "--socket-timeout", "20", "--retries", "2",
            "--fragment-retries", "2", "--max-filesize", "150M",
            "--output", str(target),
            "--format", "best[ext=mp4]/best",
            "--print", "after_move:filepath",
            link,
        ]
        # Do not allow unlimited downloads or downloader shell execution.
        try:
            process = subprocess.run(command, capture_output=True, text=True, timeout=240, check=False)
        except subprocess.TimeoutExpired as error:
            raise RuntimeError("Video download timed out. Try a shorter public video.") from error
        if process.returncode:
            raise RuntimeError("Could not access this public video. It may be private, blocked, or unavailable.")
        paths = [Path(line.strip()) for line in process.stdout.splitlines() if line.strip()]
        video = next((file for file in reversed(paths) if file.is_file() and file.resolve().is_relative_to(directory.resolve())), None)
        if video is None:
            video = next((file for file in directory.glob("source.*") if file.is_file()), None)
        if video is None or video.stat().st_size == 0:
            raise RuntimeError("Video downloader did not return a playable file.")
        if video.stat().st_size > MAX_VIDEO_BYTES:
            raise RuntimeError("This video exceeds the 150 MB limit.")
        details = metadata(video)
        duration = float(details.get("duration_seconds") or 0)
        if duration <= 0 or duration > MAX_DURATION_SECONDS:
            raise RuntimeError("Video duration must be between 1 second and 10 minutes.")
        transcript = transcribe(video, directory)
        return {
            "platform": platform,
            "source_url": link,
            "duration_seconds": duration,
            "transcript": transcript,
        }
