import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RewriteRule, RewriterConfig } from "./types";

const defaultConfig: RewriterConfig = {
  public_base_url: "",
  public_base_urls: [],
  origin_base_url: "",
  rules: [],
};

type LegacyPublicLink = {
  base_url?: unknown;
  enabled?: unknown;
};

type ConfigInput = Partial<RewriterConfig> & {
  public_links?: LegacyPublicLink[];
};

function normalizeUrl(value: unknown): string {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }

  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS subscription URLs are supported");
  }

  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

function normalizeHost(value: unknown): string {
  const host = String(value || "")
    .trim()
    .replace(/\.$/, "")
    .toLowerCase();

  if (!host || /[/?#@\s]/.test(host)) {
    throw new Error(`Invalid hostname: ${host || "(empty)"}`);
  }

  return host;
}

function normalizeInteger(value: unknown, fallback = 0): number {
  const number = Number(value);
  if (!(Number.isSafeInteger(number) && number >= 0)) {
    return fallback;
  }
  return number;
}

export function normalizeRule(
  value: Partial<RewriteRule>,
  existingId?: string
): RewriteRule {
  const startId = normalizeInteger(value.start_id);
  const endId = normalizeInteger(value.end_id);
  if (endId < startId) {
    throw new Error(
      "The ending subscription ID must not be smaller than the starting ID"
    );
  }

  return {
    id: existingId || value.id || crypto.randomUUID(),
    name: String(value.name || "").trim(),
    start_id: startId,
    end_id: endId,
    source_host: normalizeHost(value.source_host),
    target_host: normalizeHost(value.target_host),
    enabled: value.enabled !== false,
    priority: normalizeInteger(value.priority, 100),
  };
}

export function normalizeConfig(value: ConfigInput = {}): RewriterConfig {
  const configuredPublicUrls = Array.isArray(value.public_base_urls)
    ? value.public_base_urls
    : [];
  const legacyRuleUrls = Array.isArray(value.public_links)
    ? value.public_links
        .filter((publicLink) => publicLink.enabled !== false)
        .map((publicLink) => publicLink.base_url)
    : [];
  const legacyDefaultUrl = normalizeUrl(value.public_base_url);
  const publicBaseUrls = [
    ...new Set(
      [...configuredPublicUrls, ...legacyRuleUrls, legacyDefaultUrl]
        .map(normalizeUrl)
        .filter(Boolean)
    ),
  ];
  if (configuredPublicUrls.length === 0 && value.public_base_urls) {
    publicBaseUrls.length = 0;
  }

  const ruleIds = new Set<string>();
  const rules: RewriteRule[] = [];

  for (const input of Array.isArray(value.rules) ? value.rules : []) {
    const rule = normalizeRule(input, input.id);
    if (ruleIds.has(rule.id)) {
      throw new Error(`Duplicate rule ID: ${rule.id}`);
    }
    ruleIds.add(rule.id);
    rules.push(rule);
  }

  return {
    public_base_url: publicBaseUrls[0] || "",
    public_base_urls: publicBaseUrls,
    origin_base_url: normalizeUrl(value.origin_base_url),
    rules,
  };
}

export class ConfigStore {
  private readonly file: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(file: string) {
    this.file = file;
  }

  async read(): Promise<RewriterConfig> {
    try {
      const raw = await readFile(this.file, "utf8");
      return normalizeConfig(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Failed to read subscription rewriter config:", error);
      }
      return defaultConfig;
    }
  }

  async write(config: RewriterConfig): Promise<RewriterConfig> {
    const normalized = normalizeConfig(config);

    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(dirname(this.file), { recursive: true });
      const temporaryFile = `${this.file}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(
        temporaryFile,
        `${JSON.stringify(normalized, null, 2)}\n`,
        { mode: 0o600 }
      );
      await rename(temporaryFile, this.file);
    });

    await this.writeQueue;
    return normalized;
  }

  async update(
    mutate: (config: RewriterConfig) => RewriterConfig
  ): Promise<RewriterConfig> {
    const current = await this.read();
    return this.write(mutate(current));
  }
}
