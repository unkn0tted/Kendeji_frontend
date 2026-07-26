import type { IncomingHttpHeaders } from "node:http";
import { isIP } from "node:net";

const TRUE_VALUES = new Set(["1", "on", "true", "yes"]);
const IPV4_MAPPED_PREFIX = "::ffff:";

function headerValues(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeIp(value: string | undefined) {
  if (!value) return null;

  const candidate = value.trim();
  if (!candidate) return null;

  const lowerCandidate = candidate.toLowerCase();
  if (lowerCandidate.startsWith(IPV4_MAPPED_PREFIX)) {
    const ipv4 = candidate.slice(IPV4_MAPPED_PREFIX.length);
    return isIP(ipv4) === 4 ? ipv4 : null;
  }

  return isIP(candidate) ? candidate : null;
}

function firstValidIp(values: string[]) {
  for (const value of values) {
    for (const candidate of value.split(",")) {
      const ip = normalizeIp(candidate);
      if (ip) return ip;
    }
  }
  return null;
}

export function trustProxyHeadersEnabled(value: string | undefined) {
  return TRUE_VALUES.has(
    String(value || "")
      .trim()
      .toLowerCase()
  );
}

export function resolveForwardedClientIp(
  headers: IncomingHttpHeaders,
  remoteAddress: string | undefined,
  trustProxyHeaders: boolean
) {
  if (!trustProxyHeaders) return null;

  return (
    firstValidIp(headerValues(headers["x-real-ip"])) ||
    firstValidIp(headerValues(headers["x-forwarded-for"])) ||
    normalizeIp(remoteAddress)
  );
}

export function setForwardedClientIp(
  headers: Headers,
  clientIp: string | null
) {
  if (!clientIp) return;

  headers.set("x-real-ip", clientIp);
  headers.set("x-forwarded-for", clientIp);
}
