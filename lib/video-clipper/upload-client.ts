"use client";

export type UploadProgress = {
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
};

type Authorization = {
  storage?: string;
  video_path: string;
  uploadId: string;
  partSize?: number;
  parts?: Array<{ partNumber: number; url: string }>;
};

async function jsonOrThrow(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({})) as { error?: string; detail?: string };
  if (!response.ok) throw new Error(payload.detail || payload.error || fallback);
  return payload;
}

export async function uploadVideoToClipper(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const authorizationResponse = await fetch("/api/video-clipper/upload/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    }),
  });
  const authorization = await jsonOrThrow(
    authorizationResponse,
    "Could not authorize video upload"
  ) as Authorization;

  if (
    authorization.storage !== "s3" ||
    !authorization.video_path ||
    !authorization.uploadId ||
    !authorization.partSize ||
    !Array.isArray(authorization.parts) ||
    authorization.parts.length === 0
  ) {
    throw new Error("Direct video storage is unavailable");
  }

  const payload = {
    video_path: authorization.video_path,
    uploadId: authorization.uploadId,
  };
  const completedParts: Array<{ partNumber: number; etag: string }> = [];
  let uploadedBytes = 0;
  let cursor = 0;
  let failure: unknown;
  const controller = new AbortController();

  function report() {
    onProgress?.({
      uploadedBytes,
      totalBytes: file.size,
      percent: file.size > 0 ? Math.min(100, Math.round((uploadedBytes / file.size) * 100)) : 0,
    });
  }
  report();

  const workers = Array.from(
    { length: Math.min(3, authorization.parts.length) },
    async () => {
      while (!controller.signal.aborted) {
        const index = cursor++;
        if (index >= authorization.parts!.length) return;
        const part = authorization.parts![index];
        const start = (part.partNumber - 1) * authorization.partSize!;
        const end = Math.min(file.size, start + authorization.partSize!);
        const body = file.slice(start, end);
        let partUrl = part.url;

        try {
          let response: Response | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            response = await fetch(partUrl, {
              method: "PUT",
              body,
              signal: controller.signal,
            });
            if (response.ok) break;

            if (response.status === 403 && attempt < 2) {
              const refresh = await fetch("/api/video-clipper/upload/parts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...payload, partNumbers: [part.partNumber] }),
                signal: controller.signal,
              });
              const refreshed = await jsonOrThrow(refresh, "Could not refresh upload URL") as {
                parts?: Array<{ partNumber: number; url: string }>;
              };
              const next = refreshed.parts?.find((item) => item.partNumber === part.partNumber);
              if (!next?.url) throw new Error("Could not refresh upload URL");
              partUrl = next.url;
              continue;
            }

            if (attempt === 2 || response.status < 500) {
              throw new Error("Video upload failed");
            }
          }

          const etag = response?.headers.get("ETag");
          if (!response?.ok || !etag) throw new Error("Video upload failed");
          completedParts.push({ partNumber: part.partNumber, etag });
          uploadedBytes += body.size;
          report();
        } catch (error) {
          failure ??= error;
          controller.abort();
          return;
        }
      }
    }
  );

  await Promise.all(workers);

  try {
    if (failure) throw failure;
    const completeResponse = await fetch("/api/video-clipper/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        parts: completedParts.sort((a, b) => a.partNumber - b.partNumber),
      }),
    });
    const completed = await jsonOrThrow(
      completeResponse,
      "Could not complete video upload"
    ) as { video_path?: string };

    if (!completed.video_path) throw new Error("Upload finished without a video path");
    uploadedBytes = file.size;
    report();
    return completed.video_path;
  } catch (error) {
    await fetch("/api/video-clipper/upload/abort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
    throw error;
  }
}
