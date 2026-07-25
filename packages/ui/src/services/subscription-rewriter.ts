import request from "@workspace/ui/lib/request";
import type { AxiosRequestConfig } from "axios";

export type SubscriptionRewriteRule = {
  id: string;
  name: string;
  match_mode: "range" | "ids";
  start_id: number;
  end_id: number;
  subscriber_ids: number[];
  source_host: string;
  target_host: string;
  enabled: boolean;
  priority: number;
};

export type SubscriptionRewriterConfig = {
  public_base_url: string;
  public_base_urls: string[];
  origin_base_url: string;
  rules: SubscriptionRewriteRule[];
};

export type SubscriptionHostCount = {
  host: string;
  count: number;
};

export type SubscriptionHostMapping = {
  source_host: string;
  result_host: string;
  count: number;
  rewritten: boolean;
};

export type SubscriptionInspection = {
  subscriber_id: number;
  format: string;
  wrapped: "base64" | "none";
  replacements: number;
  source_hosts: SubscriptionHostCount[];
  result_hosts: SubscriptionHostCount[];
  host_mappings?: SubscriptionHostMapping[];
};

type RequestOptions = AxiosRequestConfig & {
  skipErrorHandler?: boolean;
};

const API_PATH = "/subscription-rewriter";

function getBaseUrl() {
  const configured = import.meta.env.VITE_SUBSCRIPTION_REWRITER_BASE_URL;
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

function url(path: string) {
  return `${getBaseUrl()}${API_PATH}${path}`;
}

export async function getSubscriptionRewriterPublicConfig(
  options?: RequestOptions
) {
  return request<
    API.Response & {
      data?: {
        public_base_url?: string;
        public_base_urls?: string[];
      };
    }
  >(url("/public-config"), {
    method: "GET",
    skipErrorHandler: true,
    ...(options || {}),
  });
}

export async function getSubscriptionRewriterConfig(options?: RequestOptions) {
  return request<API.Response & { data?: SubscriptionRewriterConfig }>(
    url("/config"),
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

export async function updateSubscriptionRewriterConfig(
  body: Pick<
    SubscriptionRewriterConfig,
    "public_base_url" | "public_base_urls" | "origin_base_url"
  >,
  options?: RequestOptions
) {
  return request<API.Response & { data?: SubscriptionRewriterConfig }>(
    url("/config"),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      data: body,
      ...(options || {}),
    }
  );
}

export async function getSubscriptionRewriteRules(options?: RequestOptions) {
  return request<API.Response & { data?: SubscriptionRewriteRule[] }>(
    url("/rules"),
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

export async function createSubscriptionRewriteRule(
  body: Omit<SubscriptionRewriteRule, "id">,
  options?: RequestOptions
) {
  return request<API.Response & { data?: SubscriptionRewriteRule }>(
    url("/rules"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: body,
      ...(options || {}),
    }
  );
}

export async function updateSubscriptionRewriteRule(
  id: string,
  body: Omit<SubscriptionRewriteRule, "id">,
  options?: RequestOptions
) {
  return request<API.Response & { data?: SubscriptionRewriteRule }>(
    url(`/rules/${encodeURIComponent(id)}`),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      data: body,
      ...(options || {}),
    }
  );
}

export async function deleteSubscriptionRewriteRule(
  id: string,
  options?: RequestOptions
) {
  return request<API.Response>(url(`/rules/${encodeURIComponent(id)}`), {
    method: "DELETE",
    ...(options || {}),
  });
}

export async function inspectSubscriptionRewrite(
  body: {
    subscriber_id: number;
    protocol?: string;
    user_agent?: string;
  },
  options?: RequestOptions
) {
  return request<API.Response & { data?: SubscriptionInspection }>(
    url("/inspect"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: body,
      ...(options || {}),
    }
  );
}
