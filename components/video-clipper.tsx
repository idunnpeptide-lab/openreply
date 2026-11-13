"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/locale-provider";

type LocalTask = {
  id: string;
  sourceUrl: string;
  workflow: string;
  clipLength: string;
  status: string;
  progress: number;
  progressMessage?: string | null;
  errorCode?: string | null;
  title?: string | null;
  clipsCount: number;
  createdAt: string;
};

type Clip = {
  id: string;
  text?: string;
  reasoning?: string;
  duration?: number;
  start_time?: string;
  end_time?: string;
  clip_order?: number;
  virality_score?: number;
  hook_score?: number;
  engagement_score?: number;
  value_score?: number;
  shareability_score?: number;
  hook_title?: string | null;
  hook_type?: string | null;
};

type StatusPayload = {
  configured: boolean;
  connected: boolean;
  apiUrl?: string | null;
  latencyMs?: number;
  error?: string | null;
};

const terminal = new Set(["completed", "complete", "done", "error", "failed", "cancelled"]);

export default function VideoClipper() {
  const { t } = useLocale();
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<LocalTask | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [workflow, setWorkflow] = useState("highlights");
  const [clipLength, setClipLength] = useState("auto");
  const [topic, setTopic] = useState("");
  const [instructions, setInstructions] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    const response = await fetch("/api/video-clipper/status", { cache: "no-store" });
    const payload = await response.json();
    setStatus(payload);
  }

  async function loadTasks() {
    const response = await fetch("/api/video-clipper/tasks", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    setTasks(payload.tasks ?? []);
  }

  async function loadTask(id: string) {
    const response = await fetch(`/api/video-clipper/tasks/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.detail || payload.error || "Could not load video task");
      return null;
    }
    setActiveTask(payload.task);
    setClips(Array.isArray(payload.clips) ? payload.clips : []);
    setTasks((current) =>
      current.map((task) => (task.id === payload.task.id ? payload.task : task))
    );
    return payload.task as LocalTask;
  }

  useEffect(() => {
    void Promise.all([loadStatus(), loadTasks()]);
  }, []);

  useEffect(() => {
    if (!activeTaskId) return;
    const taskId = activeTaskId;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      const task = await loadTask(taskId);
      if (cancelled || !task) return;
      if (!terminal.has(String(task.status || "").toLowerCase())) {
        timer = setTimeout(tick, 3000);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeTaskId]);

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/video-clipper/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl,
          workflow,
          clipLength,
          topic: workflow === "topic" ? topic : undefined,
          instructions,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || payload.error || "Could not create task");
      setTasks((current) => [payload.task, ...current.filter((task) => task.id !== payload.task.id)]);
      setActiveTaskId(payload.task.id);
      setActiveTask(payload.task);
      setClips([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    } finally {
      setCreating(false);
    }
  }

  const activeStatus = String(activeTask?.status || "").toLowerCase();
  const isProcessing = activeTask && !terminal.has(activeStatus);
  const score = useMemo(() => {
    if (!clips.length) return null;
    return Math.max(...clips.map((clip) => Number(clip.virality_score || 0)));
  }, [clips]);

  return (
    <div className="space-y-6">
      <section className="panel rounded p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("AI video clipping")}</p>
            <h1 className="mt-1 text-2xl font-semibold">{t("Video Clipper")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {t("Turn a long video into vertical short-form clips with AI-selected moments, virality scoring, face-aware 9:16 reframing, subtitles and hook titles.")}
            </p>
          </div>
          <div className="rounded border border-border bg-surface px-3 py-2 text-xs">
            {!status ? (
              <span className="text-muted">{t("Checking engine…")}</span>
            ) : !status.configured ? (
              <span className="text-warning">{t("Engine not configured")}</span>
            ) : status.connected ? (
              <span className="text-success">{t("Video engine connected")}</span>
            ) : (
              <span className="text-danger">{t("Video engine unavailable")}</span>
            )}
          </div>
        </div>

        {!status?.configured && status !== null && (
          <div className="mt-4 rounded border border-warning/30 bg-warning/5 p-3 text-xs text-muted">
            {t("Set SUPOCLIP_API_URL and SUPOCLIP_API_KEY on the ReplyHalo service before starting a render.")}
          </div>
        )}

        <form onSubmit={createTask} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("Source video URL")}</label>
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-muted"
              required
            />
            <p className="mt-1.5 text-xs text-muted">
              {t("Start with a supported URL. Direct large-file upload will use a separate storage flow in the next phase.")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("Workflow")}</label>
              <select
                value={workflow}
                onChange={(event) => setWorkflow(event.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="highlights">Highlights — 3–7 strongest moments</option>
                <option value="topic">Topic — clips about one topic</option>
                <option value="series">Series — Part 1..N</option>
                <option value="recap">Recap — one summary clip</option>
                <option value="trailer">Trailer — teaser without payoff</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("Clip length")}</label>
              <select
                value={clipLength}
                onChange={(event) => setClipLength(event.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="auto">Auto</option>
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>
          </div>

          {workflow === "topic" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("Topic")}</label>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                maxLength={120}
                placeholder="pricing, startup grants, TikTok Shop..."
                className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("Editorial instructions")}</label>
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t("Example: skip sponsor reads, prioritize strong hooks and practical advice.")}
              className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm"
            />
          </div>

          {error && (
            <div className="rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</div>
          )}

          <button
            type="submit"
            disabled={creating || !status?.connected}
            className="rounded bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? t("Creating…") : t("Generate clips")}
          </button>
        </form>
      </section>

      {activeTask && (
        <section className="panel rounded p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{activeTask.title || t("Current video task")}</h2>
              <p className="mt-1 max-w-2xl truncate text-xs text-muted">{activeTask.sourceUrl}</p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium">
              {activeTask.status}
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded bg-surface-hover">
            <div
              className="h-full bg-foreground transition-all"
              style={{ width: `${Math.max(2, Number(activeTask.progress || 0))}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between gap-4 text-xs text-muted">
            <span>{activeTask.progressMessage || (isProcessing ? t("Processing video…") : t("Processing finished"))}</span>
            <span>{activeTask.progress || 0}%</span>
          </div>

          {activeTask.errorCode && (
            <div className="mt-4 rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {t("Video processing failed")}: {activeTask.errorCode}
            </div>
          )}

          {clips.length > 0 && (
            <div className="mt-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">{clips.length} {t("generated clips")}</h3>
                {score !== null && <span className="text-xs text-muted">{t("Best virality score")}: {score}/100</span>}
              </div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {clips
                  .slice()
                  .sort((a, b) => Number(b.virality_score || 0) - Number(a.virality_score || 0))
                  .map((clip) => {
                    const fileUrl = `/api/video-clipper/tasks/${activeTask.id}/clips/${clip.id}/file`;
                    return (
                      <article key={clip.id} className="overflow-hidden rounded border border-border bg-surface">
                        <video
                          src={fileUrl}
                          controls
                          preload="metadata"
                          playsInline
                          className="aspect-[9/16] w-full bg-black object-contain"
                        />
                        <div className="space-y-3 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold">
                              {clip.hook_title || `Clip #${clip.clip_order || ""}`}
                            </span>
                            <span className="rounded bg-surface-hover px-2 py-1 text-xs font-semibold">
                              {Number(clip.virality_score || 0)}/100
                            </span>
                          </div>
                          {clip.text && <p className="line-clamp-3 text-xs leading-5 text-muted">{clip.text}</p>}
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                            <span>Hook: {Number(clip.hook_score || 0)}</span>
                            <span>Engagement: {Number(clip.engagement_score || 0)}</span>
                            <span>Value: {Number(clip.value_score || 0)}</span>
                            <span>Share: {Number(clip.shareability_score || 0)}</span>
                          </div>
                          <a
                            href={fileUrl + "?download=1"}
                            className="inline-flex rounded border border-border px-3 py-2 text-xs font-semibold hover:bg-surface-hover"
                          >
                            {t("Download clip")}
                          </a>
                        </div>
                      </article>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="panel rounded p-4 sm:p-6">
        <h2 className="text-base font-semibold">{t("Recent video tasks")}</h2>
        <div className="mt-4 space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted">{t("No video clipping tasks yet.")}</p>
          ) : (
            tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setActiveTaskId(task.id)}
                className="flex w-full items-center justify-between gap-4 rounded border border-border px-3 py-3 text-left hover:bg-surface-hover"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.title || task.sourceUrl}</p>
                  <p className="mt-1 text-xs text-muted">{task.workflow} · {task.clipLength} · {task.progress}%</p>
                </div>
                <span className="shrink-0 text-xs text-muted">{task.status}</span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
