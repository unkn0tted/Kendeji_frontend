import { parseDocument } from "yaml";
import type {
  HostCount,
  HostMapping,
  RewriteResult,
  RewriteRule,
} from "./types";

type RewriteContext = {
  subscriberId: number;
  rules: RewriteRule[];
  hosts: Map<string, number>;
  hostMappings: Map<
    string,
    {
      sourceHost: string;
      resultHost: string;
      count: number;
      rewritten: boolean;
    }
  >;
  replacements: number;
};

type StructuredRewrite = {
  recognized: boolean;
  body: string;
  changed: boolean;
  format: string;
  context: RewriteContext;
};

const uriPattern =
  /^(\s*[A-Za-z][A-Za-z0-9+.-]*:\/\/(?:[^/?#\s]*@)?)(\[[^\]]+\]|[^:/?#\s]+)(:\d+)?(.*)$/;
const base64Pattern = /^[A-Za-z0-9+/_-]+={0,2}$/;

function normalizeHost(host: string): string {
  return host
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
}

function addHost(context: RewriteContext, host: string) {
  const normalized = normalizeHost(host);
  context.hosts.set(normalized, (context.hosts.get(normalized) || 0) + 1);
}

function addHostMapping(
  context: RewriteContext,
  sourceHost: string,
  resultHost: string,
  rewritten: boolean
) {
  const normalizedSource = normalizeHost(sourceHost);
  const normalizedResult = normalizeHost(resultHost);
  const key = `${normalizedSource}\u0000${normalizedResult}`;
  const current = context.hostMappings.get(key);
  context.hostMappings.set(key, {
    sourceHost: normalizedSource,
    resultHost: normalizedResult,
    count: (current?.count || 0) + 1,
    rewritten,
  });
}

function getReplacement(context: RewriteContext, host: string): string | null {
  const normalized = normalizeHost(host);
  const matchingRules = context.rules
    .filter(
      (rule) =>
        rule.enabled &&
        context.subscriberId >= rule.start_id &&
        context.subscriberId <= rule.end_id &&
        normalizeHost(rule.source_host) === normalized
    )
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        left.start_id - right.start_id ||
        left.id.localeCompare(right.id)
    );

  return matchingRules[0]?.target_host || null;
}

function rewriteHost(context: RewriteContext, host: string): string {
  addHost(context, host);
  const replacement = getReplacement(context, host);
  if (!replacement || normalizeHost(replacement) === normalizeHost(host)) {
    addHostMapping(context, host, host, false);
    return host;
  }

  addHostMapping(context, host, replacement, true);
  context.replacements += 1;
  return replacement.includes(":") ? `[${replacement}]` : replacement;
}

function createContext(
  rules: RewriteRule[],
  subscriberId: number
): RewriteContext {
  return {
    subscriberId,
    rules,
    hosts: new Map(),
    hostMappings: new Map(),
    replacements: 0,
  };
}

function rewriteUriLine(line: string, context: RewriteContext): string {
  const match = line.match(uriPattern);
  if (!match) {
    return line;
  }

  const [, prefix = "", host = "", port = "", suffix = ""] = match;
  const replacement = rewriteHost(context, host);
  return `${prefix}${replacement}${port}${suffix}`;
}

function rewriteUriList(
  body: string,
  rules: RewriteRule[],
  subscriberId: number
): StructuredRewrite {
  const context = createContext(rules, subscriberId);
  let recognizedLines = 0;
  const parts = body.split(/(\r?\n)/);

  for (let index = 0; index < parts.length; index += 2) {
    const line = parts[index] || "";
    if (uriPattern.test(line)) {
      recognizedLines += 1;
      parts[index] = rewriteUriLine(line, context);
    }
  }

  const nextBody = parts.join("");
  return {
    recognized: recognizedLines > 0,
    body: nextBody,
    changed: context.replacements > 0,
    format: "uri-list",
    context,
  };
}

function isNodeObject(value: unknown): value is Record<string, unknown> {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return false;
  }
  const object = value as Record<string, unknown>;
  return (
    typeof object.server === "string" &&
    (typeof object.type === "string" ||
      typeof object.name === "string" ||
      "server_port" in object ||
      "port" in object)
  );
}

function collectNodePaths(
  value: unknown,
  paths: Array<Array<string | number>>,
  path: Array<string | number> = [],
  insideNodeCollection = false
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectNodePaths(
        item,
        paths,
        [...path, index],
        insideNodeCollection || path.length === 0
      );
    });
    return;
  }

  if (!(value && typeof value === "object")) {
    return;
  }

  if (insideNodeCollection && isNodeObject(value)) {
    paths.push([...path, "server"]);
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "server" && insideNodeCollection && isNodeObject(value)) {
      continue;
    }
    collectNodePaths(
      child,
      paths,
      [...path, key],
      ["proxies", "outbounds", "endpoints"].includes(key)
    );
  }
}

function getAtPath(value: unknown, path: Array<string | number>): unknown {
  let current = value;
  for (const segment of path) {
    if (!(current && typeof current === "object")) {
      return;
    }
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

function setAtPath(
  value: unknown,
  path: Array<string | number>,
  nextValue: unknown
) {
  let current = value as Record<string | number, unknown>;
  for (let index = 0; index < path.length - 1; index += 1) {
    current = current[path[index]!] as Record<string | number, unknown>;
  }
  current[path.at(-1)!] = nextValue;
}

function rewriteJson(
  body: string,
  rules: RewriteRule[],
  subscriberId: number
): StructuredRewrite {
  const context = createContext(rules, subscriberId);
  const trimmed = body.trimStart();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return { recognized: false, body, changed: false, format: "json", context };
  }

  try {
    const value: unknown = JSON.parse(body);
    const paths: Array<Array<string | number>> = [];
    collectNodePaths(value, paths);
    if (paths.length === 0) {
      return {
        recognized: false,
        body,
        changed: false,
        format: "json",
        context,
      };
    }

    for (const path of paths) {
      const host = getAtPath(value, path);
      if (typeof host === "string") {
        setAtPath(value, path, rewriteHost(context, host));
      }
    }

    return {
      recognized: true,
      body:
        context.replacements > 0
          ? `${JSON.stringify(value, null, 2)}${
              body.endsWith("\n") ? "\n" : ""
            }`
          : body,
      changed: context.replacements > 0,
      format: "json",
      context,
    };
  } catch {
    return { recognized: false, body, changed: false, format: "json", context };
  }
}

function rewriteYaml(
  body: string,
  rules: RewriteRule[],
  subscriberId: number
): StructuredRewrite {
  const context = createContext(rules, subscriberId);
  if (!/(^|\n)\s*(proxies|outbounds|endpoints)\s*:/m.test(body)) {
    return { recognized: false, body, changed: false, format: "yaml", context };
  }

  try {
    const document = parseDocument(body, { keepSourceTokens: true });
    if (document.errors.length > 0) {
      return {
        recognized: false,
        body,
        changed: false,
        format: "yaml",
        context,
      };
    }

    const value = document.toJS();
    const paths: Array<Array<string | number>> = [];
    collectNodePaths(value, paths);
    if (paths.length === 0) {
      return {
        recognized: false,
        body,
        changed: false,
        format: "yaml",
        context,
      };
    }

    for (const path of paths) {
      const host = getAtPath(value, path);
      if (typeof host === "string") {
        document.setIn(path, rewriteHost(context, host));
      }
    }

    return {
      recognized: true,
      body: context.replacements > 0 ? document.toString() : body,
      changed: context.replacements > 0,
      format: "yaml",
      context,
    };
  } catch {
    return { recognized: false, body, changed: false, format: "yaml", context };
  }
}

function rewriteConf(
  body: string,
  rules: RewriteRule[],
  subscriberId: number
): StructuredRewrite {
  const context = createContext(rules, subscriberId);
  const parts = body.split(/(\r?\n)/);
  let section = "";
  let recognizedLines = 0;

  for (let index = 0; index < parts.length; index += 2) {
    const line = parts[index] || "";
    const sectionMatch = line.match(/^\s*\[([^\]]+)]\s*$/);
    if (sectionMatch) {
      section = (sectionMatch[1] || "").trim().toLowerCase();
      continue;
    }

    const proxyLine = line.match(
      /^(\s*[^#;=\r\n]+\s*=\s*[^,\r\n]+,\s*)(\[[^\]]+\]|[^,:\s]+)(\s*,.*)$/
    );
    if (section.includes("proxy") && proxyLine) {
      recognizedLines += 1;
      parts[index] = `${proxyLine[1]}${rewriteHost(
        context,
        proxyLine[2] || ""
      )}${proxyLine[3]}`;
      continue;
    }

    const protocolLine = line.match(
      /^(\s*(?:anytls|hysteria2?|tuic|trojan|vless|vmess|shadowsocks|ss)\s*=\s*)(\[[^\]]+\]|[^,:\s]+)(:\d+)(.*)$/i
    );
    if (protocolLine) {
      recognizedLines += 1;
      parts[index] = `${protocolLine[1]}${rewriteHost(
        context,
        protocolLine[2] || ""
      )}${protocolLine[3]}${protocolLine[4]}`;
      continue;
    }

    const serverLine = line.match(
      /^(\s*(?:server|address|endpoint)\s*=\s*)(\[[^\]]+\]|[^,:\s]+)(:\d+)?(\s*(?:[#;].*)?)$/i
    );
    if (serverLine && /(proxy|outbound|node|server)/.test(section)) {
      recognizedLines += 1;
      parts[index] = `${serverLine[1]}${rewriteHost(
        context,
        serverLine[2] || ""
      )}${serverLine[3] || ""}${serverLine[4] || ""}`;
    }
  }

  return {
    recognized: recognizedLines > 0,
    body: parts.join(""),
    changed: context.replacements > 0,
    format: "conf",
    context,
  };
}

function decodeBase64(body: string): string | null {
  const compact = body.replace(/\s+/g, "");
  if (
    compact.length < 16 ||
    compact.length % 4 === 1 ||
    !base64Pattern.test(compact)
  ) {
    return null;
  }

  try {
    const normalized = compact.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    if (!decoded || decoded.includes("\uFFFD")) {
      return null;
    }
    const printable = [...decoded].filter(
      (character) =>
        character === "\n" ||
        character === "\r" ||
        character === "\t" ||
        character.charCodeAt(0) >= 32
    ).length;
    return printable / decoded.length >= 0.95 ? decoded : null;
  } catch {
    return null;
  }
}

function tryStructuredRewrite(
  body: string,
  rules: RewriteRule[],
  subscriberId: number
): StructuredRewrite {
  const adapters = [rewriteJson, rewriteYaml, rewriteConf, rewriteUriList];
  for (const adapter of adapters) {
    const result = adapter(body, rules, subscriberId);
    if (result.recognized) {
      return result;
    }
  }

  return {
    recognized: false,
    body,
    changed: false,
    format: "unknown",
    context: createContext(rules, subscriberId),
  };
}

function toHostCounts(hosts: Map<string, number>): HostCount[] {
  return [...hosts.entries()]
    .map(([host, count]) => ({ host, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.host.localeCompare(right.host)
    );
}

function toHostMappings(context: RewriteContext): HostMapping[] {
  return [...context.hostMappings.values()]
    .map(({ sourceHost, resultHost, count, rewritten }) => ({
      source_host: sourceHost,
      result_host: resultHost,
      count,
      rewritten,
    }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.source_host.localeCompare(right.source_host) ||
        left.result_host.localeCompare(right.result_host)
    );
}

export function rewriteSubscription(
  body: string,
  rules: RewriteRule[],
  subscriberId: number
): RewriteResult {
  const direct = tryStructuredRewrite(body, rules, subscriberId);
  if (direct.recognized) {
    return {
      body: direct.body,
      format: direct.format,
      wrapped: "none",
      changed: direct.changed,
      replacements: direct.context.replacements,
      hosts: toHostCounts(direct.context.hosts),
      host_mappings: toHostMappings(direct.context),
    };
  }

  const decoded = decodeBase64(body);
  if (decoded !== null) {
    const inner = tryStructuredRewrite(decoded, rules, subscriberId);
    if (inner.recognized) {
      return {
        body: inner.changed
          ? Buffer.from(inner.body, "utf8").toString("base64")
          : body,
        format: inner.format,
        wrapped: "base64",
        changed: inner.changed,
        replacements: inner.context.replacements,
        hosts: toHostCounts(inner.context.hosts),
        host_mappings: toHostMappings(inner.context),
      };
    }
  }

  return {
    body,
    format: "unknown",
    wrapped: "none",
    changed: false,
    replacements: 0,
    hosts: [],
    host_mappings: [],
  };
}
