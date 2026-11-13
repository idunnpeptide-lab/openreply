import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/env";
import {
  getBearerToken,
  verifyAccessToken,
} from "@/lib/mcp/auth";
import {
  assertMcpMembership,
  callMcpTool,
  MCP_TOOLS,
} from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, any>;
};

function rpcResult(id: JsonRpcRequest["id"], result: unknown, status = 200) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? null, result },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "MCP-Protocol-Version": "2025-11-25",
      },
    }
  );
}

function rpcError(
  id: JsonRpcRequest["id"],
  code: number,
  message: string,
  status = 200,
  data?: unknown
) {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code, message, ...(data === undefined ? {} : { data }) },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "MCP-Protocol-Version": "2025-11-25",
      },
    }
  );
}

function unauthorized(description = "OAuth access token required") {
  const base = getBaseUrl().replace(/\/$/, "");
  const metadata = base + "/.well-known/oauth-protected-resource/mcp";
  return NextResponse.json(
    { error: "unauthorized", error_description: description },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer resource_metadata="${metadata}"`,
        "Cache-Control": "no-store",
      },
    }
  );
}

async function authenticate(request: Request) {
  const token = getBearerToken(request);
  if (!token) return null;
  const claims = verifyAccessToken(token);
  if (!claims) return null;
  if (!(await assertMcpMembership(claims))) return null;
  return claims;
}

export async function POST(request: NextRequest) {
  const claims = await authenticate(request);
  if (!claims) return unauthorized();

  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, "Parse error", 400);
  }

  if (body.jsonrpc !== "2.0" || !body.method) {
    return rpcError(body.id, -32600, "Invalid Request", 400);
  }

  if (body.method === "notifications/initialized") {
    return new NextResponse(null, { status: 202 });
  }

  if (body.method === "initialize") {
    const requestedVersion =
      typeof body.params?.protocolVersion === "string"
        ? body.params.protocolVersion
        : "2025-11-25";
    const supported = ["2025-11-25", "2025-06-18", "2025-03-26"];
    const protocolVersion = supported.includes(requestedVersion)
      ? requestedVersion
      : "2025-11-25";

    return rpcResult(body.id, {
      protocolVersion,
      capabilities: {
        tools: { listChanged: false },
      },
      serverInfo: {
        name: "ReplyHalo MCP",
        version: "0.1.0",
      },
      instructions:
        "ReplyHalo MCP exposes read-only workspace tools. Never reveal access tokens, secrets, license keys or internal credentials.",
    });
  }

  if (body.method === "ping") {
    return rpcResult(body.id, {});
  }

  if (body.method === "tools/list") {
    return rpcResult(body.id, { tools: MCP_TOOLS });
  }

  if (body.method === "tools/call") {
    const name =
      typeof body.params?.name === "string" ? body.params.name : "";
    const args =
      body.params?.arguments && typeof body.params.arguments === "object"
        ? (body.params.arguments as Record<string, unknown>)
        : {};

    if (!name) {
      return rpcError(body.id, -32602, "Tool name is required");
    }
    if (!MCP_TOOLS.some((tool) => tool.name === name)) {
      return rpcError(body.id, -32601, "Unknown tool");
    }

    try {
      const data = await callMcpTool(claims, name, args);
      return rpcResult(body.id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(data),
          },
        ],
        structuredContent: data,
        isError: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Tool call failed";
      if (message === "INSUFFICIENT_SCOPE") {
        return rpcError(body.id, -32001, "Insufficient OAuth scope");
      }
      return rpcResult(body.id, {
        content: [{ type: "text", text: message }],
        isError: true,
      });
    }
  }

  return rpcError(body.id, -32601, "Method not found");
}

export async function GET(request: NextRequest) {
  const claims = await authenticate(request);
  if (!claims) return unauthorized();
  return new NextResponse(
    "ReplyHalo MCP uses Streamable HTTP POST requests. Standalone SSE GET is not enabled in stateless v1.",
    {
      status: 405,
      headers: {
        Allow: "POST",
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function DELETE(request: NextRequest) {
  const claims = await authenticate(request);
  if (!claims) return unauthorized();
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
