# ReplyHalo Video Clipper — SupoClip engine integration

## Purpose

ReplyHalo integrates with SupoClip as a separate video-processing engine over its REST API.

The ReplyHalo application does **not** copy SupoClip source code into the proprietary ReplyHalo codebase. The integration boundary is HTTP/API based.

## Why the engine stays separate

SupoClip is licensed under GNU AGPL-3.0. Keeping the engine as an independent service avoids mixing its AGPL-covered source directly into ReplyHalo.

If ReplyHalo operates a modified SupoClip service for users over a network, the modified SupoClip source must be made available as required by AGPL-3.0. Do not remove SupoClip copyright/license notices.

Repository:
https://github.com/FujiwaraChoki/supoclip

License:
GNU AGPL-3.0

## ReplyHalo v1 functionality

The ReplyHalo side currently supports:

- workspace-owned video processing tasks;
- source video URL input;
- SupoClip workflows:
  - highlights
  - topic
  - series
  - recap
  - trailer
- clip length presets:
  - auto
  - short
  - medium
  - long
- editorial instructions;
- task progress/status;
- task errors;
- completed clip retrieval;
- protected video preview through ReplyHalo;
- protected clip download;
- virality score;
- hook score;
- engagement score;
- value score;
- shareability score;
- hook title and transcript excerpt display.

The default product UX is intentionally centered on **Highlights** first.

## Required ReplyHalo variables

Preferred internal Railway service authentication:

```env
SUPOCLIP_API_URL=http://supoclip-api-staging.railway.internal:8000
SUPOCLIP_AUTH_SECRET=<same BACKEND_AUTH_SECRET used by the SupoClip backend>
SUPOCLIP_USER_ID=replyhalo-service
```

ReplyHalo signs every server-to-server request with HMAC-SHA256 using the SupoClip-compatible headers
`x-supoclip-user-id`, `x-supoclip-ts`, and `x-supoclip-signature`.

A SupoClip API key remains supported as a fallback:

```env
SUPOCLIP_API_KEY=sk_...
```

Neither the HMAC secret nor an API key is ever sent to the browser.

## SupoClip engine requirements

SupoClip itself requires:

- PostgreSQL
- Redis
- backend API
- ARQ worker
- persistent/object media storage
- FFmpeg and media dependencies
- transcription provider
- LLM provider

The upstream default quick start uses AssemblyAI plus one LLM provider. A fully local Whisper/Ollama mode also exists upstream but is significantly heavier.

Typical upstream variables include:

```env
ASSEMBLY_AI_API_KEY=...
LLM=google-gla:gemini-3-flash-preview
GOOGLE_API_KEY=...
```

or another supported LLM provider.

## Request flow

```text
ReplyHalo browser
  -> ReplyHalo /api/video-clipper/*
  -> workspace/session ownership check
  -> SupoClip REST API using server-only HMAC service auth
  -> SupoClip Redis queue
  -> SupoClip worker
  -> generated clips
  -> ReplyHalo protected video proxy
```

## Isolation

Every SupoClip engine task created through ReplyHalo is persisted in the ReplyHalo database as a `VideoClipperTask` owned by one workspace.

ReplyHalo never accepts a raw SupoClip task ID from the browser as authorization. All task and clip requests first resolve a workspace-owned local task.

This prevents one ReplyHalo workspace from retrieving another workspace's clip merely by knowing an engine task ID.

## Current limitation

Large local uploads are not proxied through the ReplyHalo Next.js service in v1.

A production upload flow should upload directly to video-engine/object storage using a signed/direct upload mechanism. This avoids routing multi-hundred-megabyte video files through the ReplyHalo web process.

## Recommended deployment

Use a separate service group for SupoClip:

- `replyhalo-video-api`
- `replyhalo-video-worker`
- `replyhalo-video-redis`
- `replyhalo-video-postgres`
- persistent media volume or S3-compatible object storage

Do not merge the SupoClip worker into the existing ReplyHalo Instagram worker.

## Future phases

### v2
- direct upload;
- caption-template selector;
- font selector;
- B-roll toggle;
- queued Reels/TikTok/Shorts export presets;
- clip editor operations;
- regenerate captions;
- split/merge clips.

### v3
- send a Trend Watch Reel directly into Video Clipper analysis/adaptation;
- convert winning Reel structures into a new original clip plan;
- optional publishing into ReplyHalo-connected social accounts;
- performance feedback loop.


## Current staging deployment

Railway contains an isolated SupoClip staging stack:

- `supoclip-api-staging` — FastAPI backend, 2 vCPU / 4 GB;
- `supoclip-worker-staging` — ARQ video worker, 4 vCPU / 8 GB;
- `supoclip-postgres-staging` — persistent PostgreSQL volume;
- `supoclip-redis-staging` — persistent Redis volume;
- `supoclip-ollama-staging` — local `qwen3:4b` model with persistent model volume.

The staging stack is configured without paid transcription/LLM API keys:

```env
TRANSCRIPTION_PROVIDER=whisper
WHISPER_MODEL_SIZE=tiny
LLM=ollama:qwen3:4b
SELF_HOST=true
BACKEND_CPU_ONLY=true
```

This is intentionally slower than AssemblyAI/Gemini/Claude but allows end-to-end QA without external API credentials.

The ReplyHalo Video Clipper staging service connects to this engine over Railway private networking and uses HMAC service authentication.
