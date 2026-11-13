import {
  GET as apiGet,
  POST as apiPost,
  DELETE as apiDelete,
} from "@/app/api/mcp/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiGet;
export const POST = apiPost;
export const DELETE = apiDelete;
