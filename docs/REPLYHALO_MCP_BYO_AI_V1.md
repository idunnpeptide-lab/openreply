# ReplyHalo MCP — BYO-AI v1

## Goal
Expose ReplyHalo as a remote MCP server so customers can connect their own ChatGPT / Claude-compatible MCP client.

ReplyHalo must NOT pay for customer AI tokens.

## Cost model
- Customer pays for their own ChatGPT / Claude plan or API usage.
- ReplyHalo pays only for MCP hosting, database reads/writes, scraper usage, storage and normal backend traffic.
- No OpenAI or Anthropic API key is stored by ReplyHalo for customer MCP usage.

## Architecture
Client AI (ChatGPT / Claude)
  -> OAuth 2.1 + PKCE
  -> https://mcp.replyhalo.com/mcp
  -> ReplyHalo MCP authorization/resource layer
  -> authenticated ReplyHalo workspace
  -> existing ReplyHalo services / Trend Watch backend

## Security principles
1. Never expose Instagram access tokens, Meta secrets, database credentials, license keys or internal service tokens through MCP.
2. Every MCP request resolves to one authenticated ReplyHalo user and one authorized workspace.
3. Tools use existing ReplyHalo service logic; they do not query arbitrary SQL supplied by the model.
4. Start read-only.
5. Write tools require explicit scopes and are added only after read-only QA.
6. Every tool call is audit logged with workspace, user, tool, timestamp and result status.
7. Existing Instagram OAuth/webhook/DM worker flow is not modified.

## v1 read-only tools
- replyhalo_list_instagram_accounts
- replyhalo_get_account_reels
- replyhalo_search_reels
- replyhalo_get_outliers
- replyhalo_get_instagram_trends
- replyhalo_get_similar_accounts
- replyhalo_get_saved_ideas
- replyhalo_get_video_analysis
- replyhalo_get_campaigns
- replyhalo_get_inbox_summary

## v2 write tools
Only after v1 QA:
- replyhalo_save_idea
- replyhalo_add_competitor
- replyhalo_run_trend_sync
- replyhalo_create_campaign
- replyhalo_update_campaign
- replyhalo_reply_to_message

## OAuth
Use OAuth 2.1 authorization-code flow with PKCE.
MCP resource server validates access tokens and scopes.
ChatGPT / Claude never receive ReplyHalo internal credentials.

Suggested scopes:
- mcp:trendwatch:read
- mcp:instagram:read
- mcp:campaigns:read
- mcp:inbox:read
- later: mcp:trendwatch:write
- later: mcp:campaigns:write
- later: mcp:inbox:write

## Public endpoint
Target:
https://mcp.replyhalo.com/mcp

Staging:
https://mcp-staging.replyhalo.com/mcp
or a Railway public staging domain during development.

## Initial product UX
Settings -> AI & MCP
- Connect ChatGPT
- Connect Claude / Other MCP client
- Show MCP server URL
- Show connection status
- Revoke connection
- List granted scopes
- Audit log of AI tool calls

## OpenAI compatibility
Remote MCP server must support public HTTPS and Streamable HTTP or SSE.
OAuth is required for customer-specific ReplyHalo data.

## Development plan
Phase 1:
- remote MCP endpoint
- tool discovery
- OAuth resource metadata
- workspace-safe read-only tools
- audit log
- staging test with ChatGPT

Phase 2:
- Claude test
- settings UI
- connection/revocation UI
- rate limits

Phase 3:
- carefully gated write tools
- per-tool permissions
- explicit confirmations / approval UX

## Safety boundary
Do not modify:
- Instagram OAuth flow
- Meta webhook processing
- DM worker
- campaign execution pipeline
- production Redis / worker
- existing connected Instagram accounts

MCP is an additive access layer only.
