const AUTH_CALLBACK_PREFIX = "/api/auth/callback/";
export const AUTH_CONFIRM_PATH = "/auth/confirm";

export type PreviewSafeMagicLink = {
  provider: string;
  token: string;
  email: string;
  callbackUrl?: string;
};

function firstString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Rewrites Auth.js' one-time callback URL to an inert confirmation page.
 * Link-preview scanners may GET the confirmation page safely; the one-time
 * verification token is consumed only after the customer explicitly continues.
 */
export function toPreviewSafeMagicLink(url: string): string {
  const direct = new URL(url);
  if (!direct.pathname.startsWith(AUTH_CALLBACK_PREFIX)) {
    throw new Error("Unexpected Auth.js verification callback path");
  }

  const provider = direct.pathname.slice(AUTH_CALLBACK_PREFIX.length);
  const token = direct.searchParams.get("token");
  const email = direct.searchParams.get("email");
  if (!provider || !token || !email) {
    throw new Error("Incomplete Auth.js verification callback URL");
  }

  const safe = new URL(AUTH_CONFIRM_PATH, direct.origin);
  safe.searchParams.set("provider", provider);
  safe.searchParams.set("token", token);
  safe.searchParams.set("email", email);

  const callbackUrl = direct.searchParams.get("callbackUrl");
  if (callbackUrl) {
    safe.searchParams.set("callbackUrl", callbackUrl);
  }

  return safe.toString();
}

export function parsePreviewSafeMagicLink(
  params: Record<string, string | string[] | undefined>,
  expectedProvider: string
): PreviewSafeMagicLink | null {
  const provider = firstString(params.provider);
  const token = firstString(params.token);
  const email = firstString(params.email);
  const callbackUrl = firstString(params.callbackUrl);

  if (!provider || provider !== expectedProvider || !token || !email) {
    return null;
  }

  return { provider, token, email, callbackUrl };
}

/**
 * Builds the real Auth.js callback as a relative path so the browser performs
 * the token-consuming GET only after a deliberate confirmation POST.
 */
export function buildAuthCallbackPath(link: PreviewSafeMagicLink): string {
  const params = new URLSearchParams();
  if (link.callbackUrl) {
    params.set("callbackUrl", link.callbackUrl);
  }
  params.set("token", link.token);
  params.set("email", link.email);

  return `${AUTH_CALLBACK_PREFIX}${encodeURIComponent(link.provider)}?${params.toString()}`;
}
