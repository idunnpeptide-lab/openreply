export const TIKTOK_BUSINESS_API_BASE_URL =
  "https://business-api.tiktok.com/open_api";
export const TIKTOK_BUSINESS_API_VERSION = "v1.3";
export const TIKTOK_BUSINESS_AUTHORIZATION_URL =
  "https://ads.tiktok.com/marketing_api/auth";

export const TIKTOK_SHORT_TERM_TOKEN_ENDPOINT =
  `${TIKTOK_BUSINESS_API_BASE_URL}/${TIKTOK_BUSINESS_API_VERSION}/tt_user/oauth2/token/`;
export const TIKTOK_REFRESH_TOKEN_ENDPOINT =
  `${TIKTOK_BUSINESS_API_BASE_URL}/${TIKTOK_BUSINESS_API_VERSION}/tt_user/oauth2/refresh_token/`;
export const TIKTOK_REVOKE_TOKEN_ENDPOINT =
  `${TIKTOK_BUSINESS_API_BASE_URL}/${TIKTOK_BUSINESS_API_VERSION}/tt_user/oauth2/revoke/`;

export const REPLYHALO_TIKTOK_DESIRED_SCOPES = [
  "user.info.basic",
  "user.info.username",
  "video.list",
  "comment.list",
  "comment.list.manage",
  "message.list.read",
  "message.list.send",
  "message.list.manage",
] as const;

type TikTokBusinessEnv = {
  TIKTOK_BUSINESS_APP_ID?: string;
  TIKTOK_BUSINESS_APP_SECRET?: string;
  TIKTOK_BUSINESS_REDIRECT_URI?: string;
  TIKTOK_BUSINESS_SCOPES?: string;
};

export type TikTokBusinessConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scopes: string[];
};

/**
 * Server-side configuration helper. Keep this module out of client components:
 * it may read the TikTok developer app secret from process.env.
 */
export function getTikTokBusinessConfig(
  env: TikTokBusinessEnv = process.env
): TikTokBusinessConfig | null {
  const appId = env.TIKTOK_BUSINESS_APP_ID?.trim();
  const appSecret = env.TIKTOK_BUSINESS_APP_SECRET?.trim();
  const redirectUri = env.TIKTOK_BUSINESS_REDIRECT_URI?.trim();

  if (!appId || !appSecret || !redirectUri) return null;

  const scopes = (env.TIKTOK_BUSINESS_SCOPES ?? "")
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);

  return {
    appId,
    appSecret,
    redirectUri,
    scopes:
      scopes.length > 0 ? scopes : [...REPLYHALO_TIKTOK_DESIRED_SCOPES],
  };
}

export function buildTikTokBusinessAuthorizationUrl(input: {
  appId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
}) {
  const url = new URL(TIKTOK_BUSINESS_AUTHORIZATION_URL);
  url.searchParams.set("app_id", input.appId);
  url.searchParams.set("state", input.state);
  url.searchParams.set("redirect_uri", input.redirectUri);

  if (input.scopes?.length) {
    url.searchParams.set("scope", input.scopes.join(","));
  }

  return url.toString();
}
