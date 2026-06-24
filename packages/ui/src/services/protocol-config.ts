import request from "@workspace/ui/lib/request";
import type { AxiosRequestConfig } from "axios";

export type ProtocolSelectorConfig = {
  default_protocol?: string;
  recommended_protocol?: string;
  selector_style?: string;
};

const PROTOCOL_CONFIG_PATH = "/protocol-config";

type RequestOptions = AxiosRequestConfig & {
  skipErrorHandler?: boolean;
};

function getProtocolConfigUrl() {
  const baseUrl = import.meta.env.VITE_PROTOCOL_CONFIG_BASE_URL;
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, "")}${PROTOCOL_CONFIG_PATH}`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${PROTOCOL_CONFIG_PATH}`;
  }

  return PROTOCOL_CONFIG_PATH;
}

export async function getProtocolConfig(options?: RequestOptions) {
  return request<API.Response & { data?: ProtocolSelectorConfig }>(
    getProtocolConfigUrl(),
    {
      method: "GET",
      skipErrorHandler: true,
      ...(options || {}),
    }
  );
}

export async function updateProtocolConfig(
  body: ProtocolSelectorConfig,
  options?: RequestOptions
) {
  return request<API.Response & { data?: ProtocolSelectorConfig }>(
    getProtocolConfigUrl(),
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}
