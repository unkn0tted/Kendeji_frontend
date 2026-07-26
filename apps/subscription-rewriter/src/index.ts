import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { ConfigStore, normalizeConfig, normalizeRule } from "./config";
import {
  closeDatabase,
  findSubscriberId,
  findSubscriberToken,
} from "./database";
import {
  resolveForwardedClientIp,
  setForwardedClientIp,
  trustProxyHeadersEnabled,
} from "./proxy-ip";
import { rewriteSubscription } from "./rewrite";
import { ruleMatchesSubscriber } from "./rules";
import type { InspectionResult, RewriteRule, RewriterConfig } from "./types";

type ApiResponse<T = unknown> = {
  code: number;
  message: string;
  data?: T;
};

const port = Number(process.env.PORT || "3003");
const host = process.env.HOST || "0.0.0.0";
const configFile =
  process.env.CONFIG_FILE || "/data/subscription-rewriter.json";
const publicPath = process.env.PUBLIC_PATH || "/api/linkon";
const ppanelApiBase = String(process.env.PPANEL_API_BASE || "").replace(
  /\/+$/,
  ""
);
const ppanelAdminCurrentPath =
  process.env.PPANEL_ADMIN_CURRENT_PATH || "/v1/admin/user/current";
const corsOrigin = process.env.CORS_ORIGIN || "*";
const upstreamTimeout = Number(process.env.UPSTREAM_TIMEOUT_MS || "15000");
const maxResponseBytes = Number(
  process.env.MAX_RESPONSE_BYTES || String(8 * 1024 * 1024)
);
const trustProxyHeaders = trustProxyHeadersEnabled(
  process.env.TRUST_PROXY_HEADERS
);
const store = new ConfigStore(configFile);

const forwardedRequestHeaders = [
  "accept",
  "accept-language",
  "cache-control",
  "if-modified-since",
  "if-none-match",
  "user-agent",
] as const;

const excludedResponseHeaders = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function requestUrl(request: IncomingMessage) {
  return new URL(request.url || "/", "http://localhost");
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Origin": corsOrigin,
    "Cache-Control": "no-store",
  };
}

function sendJson<T>(
  response: ServerResponse,
  body: ApiResponse<T>,
  status = 200
) {
  response.writeHead(status, {
    ...corsHeaders(),
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1024 * 1024) {
      throw new Error("Request body is too large");
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : null;
}

function authorization(request: IncomingMessage) {
  const value = request.headers.authorization;
  return Array.isArray(value) ? value[0] || "" : value || "";
}

async function verifyAdmin(request: IncomingMessage) {
  const value = authorization(request);
  if (!(value && ppanelApiBase)) {
    return false;
  }

  try {
    const response = await fetch(`${ppanelApiBase}${ppanelAdminCurrentPath}`, {
      headers: { Authorization: value },
      signal: AbortSignal.timeout(upstreamTimeout),
    });
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json().catch(() => null)) as {
      code?: number;
    } | null;
    return payload?.code === 0 || payload?.code === 200;
  } catch (error) {
    console.error("Failed to verify administrator:", error);
    return false;
  }
}

async function requireAdmin(
  request: IncomingMessage,
  response: ServerResponse
) {
  if (await verifyAdmin(request)) {
    return true;
  }
  sendJson(
    response,
    { code: 40_005, message: "Admin authorization failed" },
    403
  );
  return false;
}

function upstreamUrl(config: RewriterConfig, incoming: URL) {
  if (!config.origin_base_url) {
    throw new Error("The origin subscription URL is not configured");
  }
  const url = new URL(config.origin_base_url);
  url.search = incoming.search;
  return url;
}

function buildUpstreamHeaders(
  headers: IncomingHttpHeaders,
  clientIp: string | null = null
) {
  const result = new Headers();
  for (const name of forwardedRequestHeaders) {
    const value = headers[name];
    if (Array.isArray(value)) {
      result.set(name, value.join(", "));
    } else if (value) {
      result.set(name, value);
    }
  }
  setForwardedClientIp(result, clientIp);
  return result;
}

async function fetchOrigin(
  config: RewriterConfig,
  incoming: URL,
  headers: IncomingHttpHeaders,
  clientIp: string | null = null
) {
  return fetch(upstreamUrl(config, incoming), {
    headers: buildUpstreamHeaders(headers, clientIp),
    redirect: "manual",
    signal: AbortSignal.timeout(upstreamTimeout),
  });
}

async function responseBody(response: Response) {
  const length = Number(response.headers.get("content-length") || "0");
  if (length > maxResponseBytes) {
    throw new Error("Origin subscription response is too large");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxResponseBytes) {
    throw new Error("Origin subscription response is too large");
  }
  return buffer;
}

function copyResponseHeaders(upstream: Response, bodyLength: number) {
  const headers = new Headers();
  upstream.headers.forEach((value, name) => {
    if (!excludedResponseHeaders.has(name.toLowerCase())) {
      headers.set(name, value);
    }
  });
  headers.set("content-length", String(bodyLength));
  headers.set("cache-control", "private, no-store");
  headers.set("x-subscription-rewriter", "1");
  return Object.fromEntries(headers.entries());
}

function maskToken(token: string) {
  if (token.length < 8) {
    return "[redacted]";
  }
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

async function handleSubscription(
  request: IncomingMessage,
  response: ServerResponse,
  incoming: URL
) {
  const config = await store.read();
  const token = incoming.searchParams.get("token") || "";
  const clientIp = resolveForwardedClientIp(
    request.headers,
    request.socket.remoteAddress,
    trustProxyHeaders
  );
  const subscriberLookup = token
    ? findSubscriberId(token).catch((error) => {
        console.error(
          `Subscription lookup failed for ${maskToken(
            token
          )}; returning the origin response:`,
          error
        );
        return null;
      })
    : Promise.resolve(null);

  const [upstreamResult, subscriberId] = await Promise.all([
    fetchOrigin(config, incoming, request.headers, clientIp)
      .then((upstream) => ({ upstream, error: null }))
      .catch((error: unknown) => ({ upstream: null, error })),
    subscriberLookup,
  ]);
  if (!upstreamResult.upstream) {
    console.error("Failed to fetch origin subscription:", upstreamResult.error);
    return sendJson(
      response,
      { code: 502, message: "Origin subscription request failed" },
      502
    );
  }
  const upstream = upstreamResult.upstream;

  let originalBody: Buffer;
  try {
    originalBody = await responseBody(upstream);
  } catch (error) {
    console.error("Failed to read origin subscription:", error);
    return sendJson(
      response,
      { code: 502, message: "Origin subscription response is invalid" },
      502
    );
  }

  let outgoingBody = originalBody;
  let replacements = 0;
  let format = "uninspected";
  if (
    subscriberId !== null &&
    upstream.ok &&
    originalBody.length > 0 &&
    config.rules.some((rule) => ruleMatchesSubscriber(rule, subscriberId))
  ) {
    const rewritten = rewriteSubscription(
      originalBody.toString("utf8"),
      config.rules,
      subscriberId
    );
    format = `${rewritten.wrapped === "base64" ? "base64/" : ""}${
      rewritten.format
    }`;
    replacements = rewritten.replacements;
    if (rewritten.changed) {
      outgoingBody = Buffer.from(rewritten.body, "utf8");
    }
  }

  response.writeHead(
    upstream.status,
    copyResponseHeaders(upstream, outgoingBody.length)
  );
  response.end(outgoingBody);

  if (replacements > 0) {
    console.info(
      `Rewrote ${replacements} subscription endpoint(s) for subscriber ${subscriberId} (${format})`
    );
  }
}

async function inspectSubscription(
  subscriberId: number,
  protocol: string,
  userAgent: string
): Promise<InspectionResult> {
  if (!(Number.isSafeInteger(subscriberId) && subscriberId >= 0)) {
    throw new Error("A valid subscription ID is required");
  }

  const token = await findSubscriberToken(subscriberId);
  if (!token) {
    throw new Error("Subscription ID was not found");
  }

  const config = await store.read();
  const incoming = new URL(publicPath, "http://localhost");
  incoming.searchParams.set("token", token);
  if (protocol.trim()) {
    incoming.searchParams.set("protocol", protocol.trim());
  }

  const upstream = await fetchOrigin(config, incoming, {
    accept: "*/*",
    "user-agent":
      userAgent.trim() || "ppanel-subscription-rewriter-inspector/1.0",
  });
  if (!upstream.ok) {
    throw new Error(`Origin subscription returned HTTP ${upstream.status}`);
  }
  const body = (await responseBody(upstream)).toString("utf8");
  const source = rewriteSubscription(body, [], subscriberId);
  const result = rewriteSubscription(body, config.rules, subscriberId);
  const resultInspection = rewriteSubscription(result.body, [], subscriberId);

  return {
    subscriber_id: subscriberId,
    format: result.format,
    wrapped: result.wrapped,
    replacements: result.replacements,
    source_hosts: source.hosts,
    result_hosts: resultInspection.hosts,
    host_mappings: result.host_mappings,
  };
}

async function handleAdminApi(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL
) {
  if (!(await requireAdmin(request, response))) {
    return;
  }

  if (url.pathname === "/subscription-rewriter/config") {
    if (request.method === "GET") {
      return sendJson(response, {
        code: 200,
        message: "ok",
        data: await store.read(),
      });
    }
    if (request.method === "PUT") {
      const input = (await readJson(request)) as Partial<RewriterConfig>;
      const current = await store.read();
      const config = normalizeConfig({
        ...current,
        public_base_url: input?.public_base_url,
        public_base_urls: input?.public_base_urls,
        origin_base_url: input?.origin_base_url,
      });
      return sendJson(response, {
        code: 200,
        message: "ok",
        data: await store.write(config),
      });
    }
  }

  if (url.pathname === "/subscription-rewriter/rules") {
    if (request.method === "GET") {
      const config = await store.read();
      return sendJson(response, {
        code: 200,
        message: "ok",
        data: config.rules,
      });
    }
    if (request.method === "POST") {
      const input = (await readJson(request)) as Partial<RewriteRule>;
      const rule = normalizeRule(input || {});
      const config = await store.update((current) => ({
        ...current,
        rules: [...current.rules, rule],
      }));
      return sendJson(response, {
        code: 200,
        message: "ok",
        data: config.rules.find((item) => item.id === rule.id),
      });
    }
  }

  const ruleMatch = url.pathname.match(
    /^\/subscription-rewriter\/rules\/([^/]+)$/
  );
  if (ruleMatch) {
    const ruleId = decodeURIComponent(ruleMatch[1] || "");
    if (request.method === "PUT") {
      const input = (await readJson(request)) as Partial<RewriteRule>;
      const config = await store.update((current) => {
        if (!current.rules.some((rule) => rule.id === ruleId)) {
          throw new Error("Rewrite rule was not found");
        }
        return {
          ...current,
          rules: current.rules.map((rule) =>
            rule.id === ruleId ? normalizeRule(input || {}, ruleId) : rule
          ),
        };
      });
      return sendJson(response, {
        code: 200,
        message: "ok",
        data: config.rules.find((rule) => rule.id === ruleId),
      });
    }
    if (request.method === "DELETE") {
      await store.update((current) => ({
        ...current,
        rules: current.rules.filter((rule) => rule.id !== ruleId),
      }));
      return sendJson(response, { code: 200, message: "ok" });
    }
  }

  if (
    url.pathname === "/subscription-rewriter/inspect" &&
    request.method === "POST"
  ) {
    const input = (await readJson(request)) as {
      subscriber_id?: number;
      protocol?: string;
      user_agent?: string;
    };
    const inspection = await inspectSubscription(
      Number(input?.subscriber_id),
      String(input?.protocol || ""),
      String(input?.user_agent || "")
    );
    return sendJson(response, {
      code: 200,
      message: "ok",
      data: inspection,
    });
  }

  return sendJson(response, { code: 404, message: "Not found" }, 404);
}

const server = createServer(async (request, response) => {
  try {
    const url = requestUrl(request);
    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders());
      return response.end();
    }
    if (url.pathname === "/health") {
      return sendJson(response, {
        code: 200,
        message: "ok",
        data: { service: "subscription-rewriter" },
      });
    }
    if (
      url.pathname === "/subscription-rewriter/public-config" &&
      request.method === "GET"
    ) {
      const config = await store.read();
      return sendJson(response, {
        code: 200,
        message: "ok",
        data: {
          public_base_url: config.public_base_url,
          public_base_urls: config.public_base_urls,
        },
      });
    }
    if (url.pathname === publicPath && request.method === "GET") {
      return await handleSubscription(request, response, url);
    }
    if (url.pathname.startsWith("/subscription-rewriter/")) {
      return await handleAdminApi(request, response, url);
    }
    return sendJson(response, { code: 404, message: "Not found" }, 404);
  } catch (error) {
    console.error("Subscription rewriter request failed:", error);
    return sendJson(
      response,
      {
        code: 500,
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      500
    );
  }
});

server.listen(port, host, () => {
  console.info(`Subscription rewriter listening on ${host}:${port}`);
  console.info(
    `Trusted proxy header forwarding is ${
      trustProxyHeaders ? "enabled" : "disabled"
    }`
  );
});

async function shutdown() {
  server.close();
  await closeDatabase();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
