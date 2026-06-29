import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { dirname } from "node:path";

const SUPPORTED_PROTOCOLS = ["tuic", "anytls"] as const;
const SELECTOR_STYLES = ["cards", "compact"] as const;

type SupportedProtocol = (typeof SUPPORTED_PROTOCOLS)[number];
type SelectorStyle = (typeof SELECTOR_STYLES)[number];

type ProtocolConfig = {
  default_protocol: SupportedProtocol;
  recommended_protocol: SupportedProtocol;
  selector_style: SelectorStyle;
};

type ApiResponse<T = unknown> = {
  code: number;
  message: string;
  data?: T;
};

const defaultConfig: ProtocolConfig = {
  default_protocol: "tuic",
  recommended_protocol: "tuic",
  selector_style: "cards",
};

const port = Number(process.env.PORT || "3002");
const configFile = process.env.CONFIG_FILE || "/data/protocol-config.json";
const ppanelApiBase = (process.env.PPANEL_API_BASE || "").replace(/\/+$/, "");
const ppanelAdminCurrentPath =
  process.env.PPANEL_ADMIN_CURRENT_PATH || "/v1/admin/user/current";
const corsOrigin = process.env.CORS_ORIGIN || "*";

function isSupportedProtocol(value: unknown): value is SupportedProtocol {
  return (
    typeof value === "string" &&
    SUPPORTED_PROTOCOLS.includes(value as SupportedProtocol)
  );
}

function isSelectorStyle(value: unknown): value is SelectorStyle {
  return (
    typeof value === "string" &&
    SELECTOR_STYLES.includes(value as SelectorStyle)
  );
}

function normalizeConfig(value: Partial<ProtocolConfig> = {}): ProtocolConfig {
  return {
    default_protocol: isSupportedProtocol(value.default_protocol)
      ? value.default_protocol
      : defaultConfig.default_protocol,
    recommended_protocol: isSupportedProtocol(value.recommended_protocol)
      ? value.recommended_protocol
      : defaultConfig.recommended_protocol,
    selector_style: isSelectorStyle(value.selector_style)
      ? value.selector_style
      : defaultConfig.selector_style,
  };
}

function getRequestUrl(request: IncomingMessage) {
  return new URL(request.url || "/", "http://localhost");
}

async function readConfig(): Promise<ProtocolConfig> {
  try {
    const raw = await readFile(configFile, "utf-8");
    return normalizeConfig(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to read protocol config:", error);
    }

    return defaultConfig;
  }
}

async function writeConfig(config: ProtocolConfig) {
  await mkdir(dirname(configFile), { recursive: true });
  await writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`);
}

function sendJson<T>(
  response: ServerResponse,
  body: ApiResponse<T>,
  status = 200
) {
  response.writeHead(status, {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Origin": corsOrigin,
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function getAuthorization(request: IncomingMessage) {
  const authorization = request.headers.authorization;
  if (Array.isArray(authorization)) {
    return authorization[0] || "";
  }

  return authorization || "";
}

async function verifyAdmin(request: IncomingMessage) {
  const authorization = getAuthorization(request);

  if (!authorization) {
    return false;
  }

  if (!ppanelApiBase) {
    console.warn("PPANEL_API_BASE is not set; refusing admin write request.");
    return false;
  }

  try {
    const response = await fetch(`${ppanelApiBase}${ppanelAdminCurrentPath}`, {
      headers: {
        Authorization: authorization,
      },
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json().catch(() => null)) as {
      code?: number;
    } | null;

    return payload?.code === 0 || payload?.code === 200;
  } catch (error) {
    console.error("Failed to verify admin token:", error);
    return false;
  }
}

async function readJson(request: IncomingMessage) {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const raw = Buffer.concat(chunks).toString("utf-8");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function handleProtocolConfig(
  request: IncomingMessage,
  response: ServerResponse
) {
  if (request.method === "OPTIONS") {
    return sendJson(response, { code: 200, message: "ok" });
  }

  if (request.method === "GET") {
    return sendJson(response, {
      code: 200,
      message: "ok",
      data: await readConfig(),
    });
  }

  if (request.method === "PUT") {
    if (!(await verifyAdmin(request))) {
      return sendJson(
        response,
        { code: 40_005, message: "Admin authorization failed" },
        403
      );
    }

    const body = await readJson(request);
    if (!body || typeof body !== "object") {
      return sendJson(
        response,
        { code: 400, message: "Invalid JSON request body" },
        400
      );
    }

    const nextConfig = normalizeConfig(body as Partial<ProtocolConfig>);
    await writeConfig(nextConfig);

    return sendJson(response, { code: 200, message: "ok", data: nextConfig });
  }

  return sendJson(response, { code: 405, message: "Method not allowed" }, 405);
}

const server = createServer(async (request, response) => {
  const url = getRequestUrl(request);

  if (url.pathname === "/health") {
    return sendJson(response, { code: 200, message: "ok" });
  }

  if (
    url.pathname === "/api/protocol-config" ||
    url.pathname === "/protocol-config"
  ) {
    return handleProtocolConfig(request, response);
  }

  return sendJson(response, { code: 404, message: "Not found" }, 404);
});

server.listen(port, () => {
  console.log(`Protocol config service listening on http://0.0.0.0:${port}`);
});
