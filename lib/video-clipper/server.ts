import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { ensureWorkspaceForUser } from "@/lib/workspace";

export async function requireVideoClipperContext() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  const workspace = await ensureWorkspaceForUser(session.user.id, session.user.email);
  return { userId: session.user.id, workspaceId: workspace.id };
}

export async function getOwnedVideoClipperTask(localTaskId: string, workspaceId: string) {
  const task = await prisma.videoClipperTask.findFirst({
    where: { id: localTaskId, workspaceId },
  });
  if (!task) throw new Error("NOT_FOUND");
  return task;
}

export function normalizeEngineStatus(value: unknown) {
  return typeof value === "string" && value ? value : "unknown";
}

export function normalizeEngineProgress(value: unknown) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
