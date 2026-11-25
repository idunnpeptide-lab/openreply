import { describe, expect, it } from "vitest";
import { MCP_ALLOWED_SCOPES, normalizeRequestedScopes } from "@/lib/mcp/auth";
import { MCP_TOOLS } from "@/lib/mcp/tools";

const definitions = new Map(MCP_TOOLS.map((tool) => [tool.name, tool]));

describe("MCP Trend Watch write tools", () => {
  it("publishes the four new commands with correct annotations", () => {
    for (const name of [
      "replyhalo_analyze_video", "replyhalo_rewrite_script",
      "replyhalo_sync_competitor", "replyhalo_get_top_reels",
    ]) {
      expect(definitions.has(name)).toBe(true);
      expect(definitions.get(name)?.inputSchema.required).toBeDefined();
    }
    expect(definitions.get("replyhalo_get_top_reels")?.annotations.readOnlyHint).toBe(true);
    for (const name of [
      "replyhalo_analyze_video", "replyhalo_rewrite_script",
      "replyhalo_sync_competitor",
    ]) {
      expect(definitions.get(name)?.annotations.readOnlyHint).toBe(false);
      expect(definitions.get(name)?.annotations.destructiveHint).toBe(false);
    }
  });

  it("requires explicit write grant, keeping a read-only connection read-only", () => {
    expect(MCP_ALLOWED_SCOPES).toContain("mcp:trendwatch:write");
    expect(normalizeRequestedScopes("mcp:trendwatch:read")).toEqual(["mcp:trendwatch:read"]);
    expect(normalizeRequestedScopes("mcp:trendwatch:read mcp:trendwatch:write"))
      .toContain("mcp:trendwatch:write");
  });

  it("keeps existing nine MCP tools available", () => {
    expect(MCP_TOOLS).toHaveLength(20);
    expect(definitions.has("replyhalo_get_video_analysis")).toBe(true);
    expect(definitions.has("replyhalo_get_outliers")).toBe(true);
  });
});
