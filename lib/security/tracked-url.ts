import { isIP } from "node:net";

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized)
  );
}

export function isAllowedTrackedDestinationUrl(
  value: string,
  options?: { allowHttp?: boolean }
) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  const allowHttp = options?.allowHttp ?? process.env.NODE_ENV !== "production";
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    return false;
  }

  if (url.username || url.password) {
    return false;
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "metadata.google.internal"
  ) {
    return false;
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4 && isPrivateIpv4(hostname)) {
    return false;
  }
  if (ipVersion === 6 && isPrivateIpv6(hostname)) {
    return false;
  }

  return true;
}
