import type { ProtocolSelectorConfig } from "@workspace/ui/services/protocol-config";
import type { SubscriptionRewriterPublicConfig } from "@workspace/ui/services/subscription-rewriter";

const CACHE_KEY = "ppanel:optional-config-cache:v1";

export const OPTIONAL_CONFIG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry<T> = {
  data: T;
  updatedAt: number;
};

type StoredOptionalConfigCache = {
  version: 1;
  protocolConfig?: CacheEntry<ProtocolSelectorConfig>;
  rewriterConfig?: CacheEntry<SubscriptionRewriterPublicConfig>;
};

export type OptionalConfigSnapshot = {
  protocolConfig?: ProtocolSelectorConfig;
  rewriterConfig?: SubscriptionRewriterPublicConfig;
};

type CacheStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

function browserStorage(): CacheStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function isProtocolConfig(value: unknown): value is ProtocolSelectorConfig {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !(
      isOptionalString(value.default_protocol) &&
      isOptionalString(value.recommended_protocol) &&
      isOptionalString(value.selector_style)
    )
  ) {
    return false;
  }

  return (
    value.protocol_options === undefined ||
    (Array.isArray(value.protocol_options) &&
      value.protocol_options.every(
        (option) =>
          isRecord(option) &&
          typeof option.value === "string" &&
          typeof option.label === "string" &&
          isOptionalString(option.description) &&
          isOptionalString(option.icon) &&
          (option.enabled === undefined || typeof option.enabled === "boolean")
      ))
  );
}

function isRewriterConfig(
  value: unknown
): value is SubscriptionRewriterPublicConfig {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOptionalString(value.public_base_url) &&
    (value.public_base_urls === undefined ||
      (Array.isArray(value.public_base_urls) &&
        value.public_base_urls.every((url) => typeof url === "string")))
  );
}

function isFresh(updatedAt: unknown, now: number) {
  if (typeof updatedAt !== "number" || !Number.isFinite(updatedAt)) {
    return false;
  }

  const age = now - updatedAt;
  return age >= 0 && age <= OPTIONAL_CONFIG_CACHE_TTL_MS;
}

function parseStoredCache(
  raw: string | null,
  now: number
): StoredOptionalConfigCache {
  if (!raw) {
    return { version: 1 };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!(isRecord(parsed) && parsed.version === 1)) {
      return { version: 1 };
    }

    const result: StoredOptionalConfigCache = { version: 1 };
    if (
      isRecord(parsed.protocolConfig) &&
      isFresh(parsed.protocolConfig.updatedAt, now) &&
      isProtocolConfig(parsed.protocolConfig.data)
    ) {
      result.protocolConfig = {
        data: parsed.protocolConfig.data,
        updatedAt: parsed.protocolConfig.updatedAt as number,
      };
    }
    if (
      isRecord(parsed.rewriterConfig) &&
      isFresh(parsed.rewriterConfig.updatedAt, now) &&
      isRewriterConfig(parsed.rewriterConfig.data)
    ) {
      result.rewriterConfig = {
        data: parsed.rewriterConfig.data,
        updatedAt: parsed.rewriterConfig.updatedAt as number,
      };
    }

    return result;
  } catch {
    return { version: 1 };
  }
}

export function readOptionalConfigCache(
  storage: CacheStorage | undefined = browserStorage(),
  now = Date.now()
): OptionalConfigSnapshot {
  if (!storage) {
    return {};
  }

  try {
    const cache = parseStoredCache(storage.getItem(CACHE_KEY), now);
    return {
      protocolConfig: cache.protocolConfig?.data,
      rewriterConfig: cache.rewriterConfig?.data,
    };
  } catch {
    return {};
  }
}

export function updateOptionalConfigCache(
  update: OptionalConfigSnapshot,
  storage: CacheStorage | undefined = browserStorage(),
  now = Date.now()
) {
  if (!storage) {
    return;
  }

  try {
    const cache = parseStoredCache(storage.getItem(CACHE_KEY), now);
    if (update.protocolConfig !== undefined) {
      cache.protocolConfig = {
        data: update.protocolConfig,
        updatedAt: now,
      };
    }
    if (update.rewriterConfig !== undefined) {
      cache.rewriterConfig = {
        data: update.rewriterConfig,
        updatedAt: now,
      };
    }

    if (cache.protocolConfig || cache.rewriterConfig) {
      storage.setItem(CACHE_KEY, JSON.stringify(cache));
    } else {
      storage.removeItem(CACHE_KEY);
    }
  } catch {
    // Local storage may be unavailable or full; remote config still works.
  }
}
