import type { QueryClientConfig } from "@tanstack/react-query";

type QueryError = {
  code?: unknown;
  data?: {
    code?: unknown;
  };
  response?: {
    data?: {
      code?: unknown;
    };
    status?: unknown;
  };
  status?: unknown;
};

const TRANSIENT_API_CODES = new Set([500, 10_001]);
const TRANSIENT_NETWORK_CODES = new Set(["ERR_NETWORK"]);

function getNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

export function shouldRetryAdminQuery(
  failureCount: number,
  error: unknown
): boolean {
  if (failureCount >= 1 || !error || typeof error !== "object") return false;

  const queryError = error as QueryError;
  const status = getNumber(queryError.response?.status ?? queryError.status);
  if (status && status >= 400 && status < 500) return false;

  const apiCode = getNumber(
    queryError.response?.data?.code ?? queryError.data?.code
  );
  if (apiCode !== undefined) return TRANSIENT_API_CODES.has(apiCode);
  if (status && status >= 500) return true;

  return (
    typeof queryError.code === "string" &&
    TRANSIENT_NETWORK_CODES.has(queryError.code)
  );
}

export const adminQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: shouldRetryAdminQuery,
      retryDelay: 500,
      staleTime: 30_000,
    },
  },
};
