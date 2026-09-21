export type AuthEmailConfig =
  | {
      providerId: "resend";
      transport: "resend";
      from: string;
      senderDomain: string;
      apiKey: string;
    }
  | {
      providerId: "nodemailer";
      transport: "smtp";
      from: string;
      senderDomain: string;
      server: string;
    };

type EmailEnvironment = Readonly<Record<string, string | undefined>>;

const PLACEHOLDER_DOMAINS = new Set(["example.com", "example.org", "example.net"]);
const PLACEHOLDER_RESEND_KEYS = new Set(["re_...", "missing-resend-api-key"]);

function parseSenderAddress(from: string): { from: string; senderDomain: string } {
  const trimmed = from.trim();
  if (!trimmed) {
    throw new Error("EMAIL_FROM environment variable is required");
  }

  const angleMatch = trimmed.match(/<([^<>]+)>\s*$/);
  const address = (angleMatch?.[1] ?? trimmed).trim();
  const parts = address.split("@");

  if (
    parts.length !== 2 ||
    !parts[0] ||
    !parts[1] ||
    /\s|<|>/.test(address)
  ) {
    throw new Error("EMAIL_FROM must contain a valid sender email address");
  }

  const senderDomain = parts[1].toLowerCase();
  if (PLACEHOLDER_DOMAINS.has(senderDomain)) {
    throw new Error("EMAIL_FROM must use a real sender domain, not an example.com placeholder");
  }

  return { from: trimmed, senderDomain };
}

function parseSmtpServer(value: string): string {
  const trimmed = value.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("EMAIL_SERVER must be a valid smtp:// or smtps:// URL");
  }

  if (!(["smtp:", "smtps:"] as string[]).includes(parsed.protocol) || !parsed.hostname) {
    throw new Error("EMAIL_SERVER must be a valid smtp:// or smtps:// URL");
  }

  return trimmed;
}

export function getAuthEmailConfig(
  env: EmailEnvironment = process.env
): AuthEmailConfig {
  const { from, senderDomain } = parseSenderAddress(env.EMAIL_FROM ?? "");
  const smtpServer = env.EMAIL_SERVER?.trim();

  if (smtpServer) {
    return {
      providerId: "nodemailer",
      transport: "smtp",
      from,
      senderDomain,
      server: parseSmtpServer(smtpServer),
    };
  }

  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey || PLACEHOLDER_RESEND_KEYS.has(apiKey)) {
    throw new Error(
      "RESEND_API_KEY environment variable is required when EMAIL_SERVER is not configured"
    );
  }

  return {
    providerId: "resend",
    transport: "resend",
    from,
    senderDomain,
    apiKey,
  };
}
