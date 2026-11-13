import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/env";
import {
  getCurrentOAuthWorkspace,
  issueAuthorizationCode,
  normalizeRequestedScopes,
  verifyClientId,
} from "@/lib/mcp/auth";

type AuthInput = {
  clientId: string;
  redirectUri: string;
  responseType: string | null;
  codeChallenge: string;
  codeChallengeMethod: string | null;
  state: string | null;
  resource: string;
  scopeRaw: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validate(input: AuthInput) {
  const client = verifyClientId(input.clientId);
  if (
    !client ||
    input.responseType !== "code" ||
    input.codeChallengeMethod !== "S256" ||
    !input.codeChallenge
  ) {
    return { ok: false as const, error: "invalid_request" };
  }
  if (!client.redirectUris.includes(input.redirectUri)) {
    return { ok: false as const, error: "invalid_redirect_uri" };
  }
  return { ok: true as const, client };
}

function deniedRedirect(input: AuthInput, issuer: string) {
  const redirect = new URL(input.redirectUri);
  redirect.searchParams.set("error", "access_denied");
  redirect.searchParams.set("iss", issuer);
  if (input.state) redirect.searchParams.set("state", input.state);
  return redirect;
}

function consentHtml(input: AuthInput, clientName: string, scopes: string[]) {
  const hidden: Record<string, string> = {
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: input.responseType || "code",
    code_challenge: input.codeChallenge,
    code_challenge_method: input.codeChallengeMethod || "S256",
    resource: input.resource,
    scope: input.scopeRaw || scopes.join(" "),
    state: input.state || "",
  };
  const fields = Object.entries(hidden)
    .map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`)
    .join("");

  const labels: Record<string, string> = {
    "mcp:trendwatch:read": "Read Trend Watch data, outliers, trends and saved ideas",
    "mcp:instagram:read": "Read connected Instagram account metadata",
    "mcp:campaigns:read": "Read ReplyHalo campaign configuration",
    "mcp:inbox:read": "Read Instagram inbox conversation summaries",
    "offline_access": "Keep the connection active with a refresh token",
  };
  const scopeList = scopes
    .map((scope) => `<li>${escapeHtml(labels[scope] || scope)}</li>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connect to ReplyHalo</title>
<style>
body{margin:0;background:#0b0c10;color:#eceef3;font-family:Inter,system-ui,-apple-system,sans-serif}
main{max-width:620px;margin:8vh auto;padding:24px}
.card{background:#12141a;border:1px solid #262a35;border-radius:18px;padding:28px}
h1{margin:0 0 10px;font-size:24px}p,li{color:#a7adba;line-height:1.55}
ul{padding-left:20px}.actions{display:flex;gap:12px;margin-top:24px}
button{border:0;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer}
.allow{background:#ff3d6e;color:white}.deny{background:#262a35;color:#eceef3}
.small{font-size:12px;color:#737a89;margin-top:18px}
</style>
</head>
<body><main><div class="card">
<h1>Connect ${escapeHtml(clientName)} to ReplyHalo?</h1>
<p>This AI client is requesting read-only access to your ReplyHalo workspace:</p>
<ul>${scopeList}</ul>
<form id="consent-form" method="post" action="/api/mcp/oauth/authorize">${fields}
<div class="actions">
<button class="allow" type="submit" name="decision" value="allow">Allow access</button>
<button class="deny" type="submit" name="decision" value="deny">Deny</button>
</div>
</form>
<p id="consent-status" class="small" aria-live="polite"></p>
<p class="small">ReplyHalo does not give the AI your Instagram access tokens, Meta secrets, database credentials or license keys.</p>
<script>
(() => {
  const form = document.getElementById("consent-form");
  const status = document.getElementById("consent-status");
  const buttons = Array.from(form.querySelectorAll("button[type=submit]"));
  let decision = "allow";

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      decision = button.value || "allow";
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    buttons.forEach((button) => { button.disabled = true; });
    status.textContent = decision === "allow" ? "Connecting to AI client…" : "Cancelling…";

    const data = new FormData(form);
    data.set("decision", decision);

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: data,
        credentials: "same-origin",
        headers: {
          "Accept": "application/json",
          "X-MCP-Consent-Fetch": "1"
        }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.redirect_to) {
        throw new Error(payload.error_description || payload.error || "Authorization failed");
      }
      window.location.assign(payload.redirect_to);
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Authorization failed";
      buttons.forEach((button) => { button.disabled = false; });
    }
  });
})();
</script>
</div></main></body></html>`;
}

async function parseGet(request: NextRequest): Promise<AuthInput> {
  const params = request.nextUrl.searchParams;
  const base = getBaseUrl().replace(/\/$/, "");
  return {
    clientId: params.get("client_id") || "",
    redirectUri: params.get("redirect_uri") || "",
    responseType: params.get("response_type"),
    codeChallenge: params.get("code_challenge") || "",
    codeChallengeMethod: params.get("code_challenge_method"),
    state: params.get("state"),
    resource: params.get("resource") || base + "/mcp",
    scopeRaw: params.get("scope"),
  };
}

async function parsePost(request: NextRequest): Promise<AuthInput & { decision: string }> {
  const form = await request.formData();
  const base = getBaseUrl().replace(/\/$/, "");
  const read = (key: string) => String(form.get(key) || "");
  return {
    clientId: read("client_id"),
    redirectUri: read("redirect_uri"),
    responseType: read("response_type") || null,
    codeChallenge: read("code_challenge"),
    codeChallengeMethod: read("code_challenge_method") || null,
    state: read("state") || null,
    resource: read("resource") || base + "/mcp",
    scopeRaw: read("scope") || null,
    decision: read("decision"),
  };
}

export async function GET(request: NextRequest) {
  const input = await parseGet(request);
  const base = getBaseUrl().replace(/\/$/, "");
  const expectedResource = base + "/mcp";
  if (input.resource !== expectedResource) {
    return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  }

  const checked = validate(input);
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }

  const membership = await getCurrentOAuthWorkspace();
  if (!membership) {
    const callbackUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(base + "/login?callbackUrl=" + callbackUrl);
  }

  const scopes = normalizeRequestedScopes(input.scopeRaw);
  return new NextResponse(
    consentHtml(input, checked.client.clientName || "AI client", scopes),
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const base = getBaseUrl().replace(/\/$/, "");
  const expectedOrigin = new URL(base).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  let sameOrigin = false;

  if (origin) {
    sameOrigin = origin === expectedOrigin;
  } else if (referer) {
    try {
      sameOrigin = new URL(referer).origin === expectedOrigin;
    } catch {
      sameOrigin = false;
    }
  }

  if (!sameOrigin) {
    console.warn("[MCP OAuth] consent rejected: origin mismatch", {
      origin,
      referer,
      expectedOrigin,
    });
    return NextResponse.json(
      { error: "invalid_request", error_description: "Invalid consent origin" },
      { status: 400 }
    );
  }

  const input = await parsePost(request);
  console.info("[MCP OAuth] consent submitted", {
    decision: input.decision,
    hasState: Boolean(input.state),
    redirectHost: (() => {
      try { return new URL(input.redirectUri).host; } catch { return "invalid"; }
    })(),
  });
  const expectedResource = base + "/mcp";
  if (input.resource !== expectedResource) {
    return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  }

  const checked = validate(input);
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }

  const membership = await getCurrentOAuthWorkspace();
  if (!membership) {
    return NextResponse.redirect(base + "/login", 303);
  }

  const wantsJson =
    request.headers.get("x-mcp-consent-fetch") === "1" ||
    request.headers.get("accept")?.includes("application/json") === true;

  if (input.decision !== "allow") {
    const denied = deniedRedirect(input, base);
    if (wantsJson) {
      return NextResponse.json(
        { redirect_to: denied.toString() },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.redirect(denied, 303);
  }

  const scopes = normalizeRequestedScopes(input.scopeRaw);
  const code = issueAuthorizationCode({
    userId: membership.userId,
    workspaceId: membership.workspaceId,
    scopes,
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    codeChallenge: input.codeChallenge,
    resource: input.resource,
  });

  const redirect = new URL(input.redirectUri);
  redirect.searchParams.set("code", code);
  redirect.searchParams.set("iss", base);
  if (input.state) redirect.searchParams.set("state", input.state);

  console.info("[MCP OAuth] consent approved", {
    redirectHost: redirect.host,
    hasState: Boolean(input.state),
    hasIssuer: true,
    responseMode: wantsJson ? "json" : "redirect",
  });

  if (wantsJson) {
    return NextResponse.json(
      { redirect_to: redirect.toString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.redirect(redirect, 303);
}
