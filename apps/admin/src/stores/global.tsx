import { currentUser } from "@workspace/ui/services/admin/user";
import { isBrowser } from "@workspace/ui/utils/index";
import {
  DEFAULT_SUBSCRIPTION_PROTOCOL_OPTIONS,
  normalizeSubscriptionProtocol,
  normalizeSubscriptionProtocolOptions,
} from "@workspace/ui/utils/subscription-protocol";
import { create } from "zustand";

export interface GlobalStore {
  common: API.GetGlobalConfigResponse;
  user?: API.User;
  setCommon: (common: Partial<API.GetGlobalConfigResponse>) => void;
  setUser: (user?: API.User) => void;
  getUserInfo: () => Promise<void>;
  getUserSubscribe: (
    short: string,
    token: string,
    protocol?: string
  ) => string[];
  getAppSubLink: (url: string, schema?: string) => string;
}

function normalizeSubscribePath(path?: string): string {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

function createSubscribeUrl({
  domain,
  short,
  token,
  protocol,
  defaultProtocol,
  protocolOptions,
  panDomain,
  subscribePath,
}: {
  domain: string;
  short: string;
  token: string;
  protocol?: string;
  defaultProtocol?: string;
  protocolOptions?: API.SubscribeConfig["protocol_options"];
  panDomain?: boolean;
  subscribePath?: string;
}): string | null {
  try {
    const hostname = panDomain ? `${short}.${domain}` : domain;
    const url = new URL(
      `https://${hostname}${normalizeSubscribePath(subscribePath)}`
    );

    url.searchParams.set("token", token);
    url.searchParams.set(
      "protocol",
      normalizeSubscriptionProtocol(
        protocol || defaultProtocol,
        protocolOptions
      )
    );

    return url.toString();
  } catch {
    return null;
  }
}

function createPublicSubscribeUrl(
  baseUrl: string,
  token: string,
  protocol: string
): string | null {
  try {
    const normalized = /^https?:\/\//i.test(baseUrl)
      ? baseUrl
      : `https://${baseUrl}`;
    const url = new URL(normalized);
    url.searchParams.set("token", token);
    url.searchParams.set("protocol", protocol);
    return url.toString();
  } catch {
    return null;
  }
}

function selectPublicSubscribeUrls(
  defaultUrl: string | undefined,
  configuredUrls: API.SubscribeConfig["public_subscribe_urls"]
) {
  const urls = configuredUrls?.length
    ? configuredUrls
    : defaultUrl?.trim()
      ? [defaultUrl.trim()]
      : [];
  return [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
}

function replaceQueryPlaceholder(
  template: string,
  placeholder: "url" | "name",
  value: string
): string {
  const pattern = new RegExp(
    `([?&][^=]+)=\\$\\{${placeholder}\\}(?=(&|#|$))`,
    "g"
  );

  return template.replace(
    pattern,
    (_match, prefix) => `${prefix}=${encodeURIComponent(value)}`
  );
}

/**
 * Resolves a whitelisted `${...}` template expression without eval.
 * Supported forms: `url`, `name`, `encodeURIComponent(<expr>)`,
 * `btoa(<expr>)` / `window.btoa(<expr>)` (arbitrarily nested, e.g.
 * `encodeURIComponent(btoa(url))`), and the Quantumult X style
 * `JSON.stringify({server_remote: [url + ", tag=" + name]})`.
 * Returns null when the expression is not recognized or fails to encode.
 */
function resolveTemplateExpression(
  expression: string,
  url: string,
  name: string
): string | null {
  const expr = expression.trim();
  if (expr === "url") return url;
  if (expr === "name") return name;

  const call = expr.match(/^(encodeURIComponent|window\.btoa|btoa)\((.*)\)$/s);
  if (call) {
    const inner = resolveTemplateExpression(call[2] ?? "", url, name);
    if (inner === null) return null;
    try {
      if (call[1] === "encodeURIComponent") return encodeURIComponent(inner);
      return isBrowser() ? window.btoa(inner) : inner;
    } catch {
      return null;
    }
  }

  if (/^JSON\.stringify\(.*\)$/s.test(expr) && expr.includes("server_remote")) {
    return JSON.stringify({ server_remote: [`${url}, tag=${name}`] });
  }

  return null;
}

/**
 * Replaces every `${...}` placeholder in a schema template via
 * resolveTemplateExpression. Returns null when any placeholder cannot be
 * resolved, so callers can fall back to the raw subscription url.
 */
function resolveSchemaTemplate(
  template: string,
  url: string,
  name: string
): string | null {
  let result = "";
  let index = 0;
  while (index < template.length) {
    const start = template.indexOf("${", index);
    if (start === -1) {
      result += template.slice(index);
      break;
    }
    result += template.slice(index, start);
    let cursor = start + 2;
    let depth = 1;
    while (cursor < template.length && depth > 0) {
      const char = template[cursor];
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      cursor += 1;
    }
    if (depth !== 0) return null;
    const resolved = resolveTemplateExpression(
      template.slice(start + 2, cursor - 1),
      url,
      name
    );
    if (resolved === null) return null;
    result += resolved;
    index = cursor;
  }
  return result;
}

/**
 * Extracts the full domain or root domain from a URL.
 *
 * @param url - The URL to extract the domain from.
 * @param extractRoot - If true, extracts the root domain (e.g., example.com). If false, extracts the full domain (e.g., sub.example.com).
 * @returns The extracted domain or root domain, or null if the URL is invalid.
 */
export function extractDomain(url: string, extractRoot = true): string | null {
  try {
    const { hostname } = new URL(url);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return hostname;
    }
    const domainParts = hostname.split(".").filter(Boolean);
    if (extractRoot && domainParts.length > 2) {
      return domainParts.slice(-2).join(".");
    }
    return hostname;
  } catch (error) {
    console.error("Invalid URL:", error);
    return null;
  }
}

export const useGlobalStore = create<GlobalStore>((set, get) => ({
  common: {
    site: {
      host: "",
      site_name: "",
      site_desc: "",
      site_logo: "",
      keywords: "",
      custom_html: "",
      custom_data: "",
    },
    verify: {
      turnstile_site_key: "",
      enable_login_verify: false,
      enable_register_verify: false,
      enable_reset_password_verify: false,
    },
    auth: {
      mobile: {
        enable: false,
        enable_whitelist: false,
        whitelist: [],
      },
      email: {
        enable: false,
        enable_verify: false,
        enable_domain_suffix: false,
        domain_suffix_list: "",
      },
      register: {
        stop_register: false,
        enable_ip_register_limit: false,
        ip_register_limit: 0,
        ip_register_limit_duration: 0,
      },
      device: {
        enable: false,
        show_ads: false,
        enable_security: false,
        only_real_device: false,
      },
    },
    invite: {
      forced_invite: false,
      referral_percentage: 0,
      only_first_purchase: false,
    },
    currency: {
      currency_unit: "USD",
      currency_symbol: "$",
    },
    subscribe: {
      single_model: false,
      subscribe_path: "",
      subscribe_domain: "",
      public_subscribe_url: "",
      public_subscribe_urls: [],
      pan_domain: false,
      user_agent_limit: false,
      user_agent_list: "",
      default_protocol: "tuic",
      recommended_protocol: "tuic",
      selector_style: "cards",
      protocol_options: normalizeSubscriptionProtocolOptions(
        DEFAULT_SUBSCRIPTION_PROTOCOL_OPTIONS
      ),
    },
    verify_code: {
      verify_code_expire_time: 5,
      verify_code_limit: 15,
      verify_code_interval: 60,
    },
    oauth_methods: [],
    web_ad: false,
  },
  user: undefined,
  setCommon: (common) =>
    set((state) => ({
      common: {
        ...state.common,
        ...common,
      },
    })),
  setUser: (user) => set({ user }),
  getUserInfo: async () => {
    try {
      const { data } = await currentUser();
      set({ user: data.data });
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  },
  getUserSubscribe: (short: string, token: string, protocol?: string) => {
    const {
      default_protocol,
      pan_domain,
      public_subscribe_url,
      public_subscribe_urls,
      subscribe_domain,
      subscribe_path,
    } = get().common.subscribe || {};
    const protocolOptions = get().common.subscribe?.protocol_options;
    const normalizedProtocol = normalizeSubscriptionProtocol(
      protocol || default_protocol,
      protocolOptions
    );
    const publicUrls = selectPublicSubscribeUrls(
      public_subscribe_url,
      public_subscribe_urls
    );
    if (publicUrls.length > 0) {
      const result = publicUrls
        .map((baseUrl) =>
          createPublicSubscribeUrl(baseUrl, token, normalizedProtocol)
        )
        .filter((url): url is string => Boolean(url));
      if (result.length > 0) {
        return result;
      }
    }
    const fallbackDomain = extractDomain(window.location.origin, pan_domain);
    const domains = subscribe_domain
      ? subscribe_domain
          .split("\n")
          .map((domain) => domain.trim())
          .filter(Boolean)
      : fallbackDomain
        ? [fallbackDomain]
        : [];

    return domains
      .map((domain) =>
        createSubscribeUrl({
          domain,
          short,
          token,
          protocol,
          defaultProtocol: normalizedProtocol,
          protocolOptions,
          panDomain: pan_domain,
          subscribePath: subscribe_path,
        })
      )
      .filter((url): url is string => Boolean(url));
  },
  getAppSubLink: (url: string, schema?: string) => {
    const name = get().common?.site?.site_name || "";

    if (!schema) return url;
    // Query-position `?x=${url}` / `?x=${name}` placeholders are URL-encoded
    // first; the remaining `${...}` expressions are resolved by the whitelist
    // resolver (no eval). Supported: url, name, encodeURIComponent(...),
    // btoa(...) / window.btoa(...), JSON.stringify({server_remote: ...}).
    // Any unrecognized expression falls back to the raw subscription url.
    let result = replaceQueryPlaceholder(schema, "url", url);
    result = replaceQueryPlaceholder(result, "name", name);
    return resolveSchemaTemplate(result, url, name) ?? url;
  },
}));

// Narrow selector hooks. Prefer these over a bare `useGlobalStore()` call:
// zustand v5 subscribes bare calls to the whole store, re-rendering the
// component on every store mutation. Action hooks select stable function
// references, so they never trigger re-renders.
export const useCommon = () => useGlobalStore((state) => state.common);
export const useUser = () => useGlobalStore((state) => state.user);
export const useSetCommon = () => useGlobalStore((state) => state.setCommon);
export const useGetUserInfo = () =>
  useGlobalStore((state) => state.getUserInfo);
export const useGetUserSubscribe = () =>
  useGlobalStore((state) => state.getUserSubscribe);
