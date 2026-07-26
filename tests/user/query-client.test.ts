import { describe, expect, test } from "bun:test";
import { shouldRetryUserQuery } from "../../apps/user/src/config/query-client";

describe("shouldRetryUserQuery", () => {
  test("retries a network error only once", () => {
    const error = { code: "ERR_NETWORK" };

    expect(shouldRetryUserQuery(0, error)).toBe(true);
    expect(shouldRetryUserQuery(1, error)).toBe(false);
  });

  test("does not retry timeouts but retries server errors", () => {
    expect(shouldRetryUserQuery(0, { code: "ETIMEDOUT" })).toBe(false);
    expect(shouldRetryUserQuery(0, { code: "ECONNABORTED" })).toBe(false);
    expect(
      shouldRetryUserQuery(0, {
        response: { status: 503 },
      })
    ).toBe(true);
  });

  test("retries transient API errors", () => {
    expect(
      shouldRetryUserQuery(0, {
        data: { code: 10_001 },
        status: 200,
      })
    ).toBe(true);
    expect(
      shouldRetryUserQuery(0, {
        response: { data: { code: 500 }, status: 200 },
      })
    ).toBe(true);
  });

  test("does not retry client or non-transient business errors", () => {
    expect(
      shouldRetryUserQuery(0, {
        response: { status: 403 },
      })
    ).toBe(false);
    expect(
      shouldRetryUserQuery(0, {
        data: { code: 10_002 },
        status: 200,
      })
    ).toBe(false);
  });

  test("does not retry cancellations or unknown errors", () => {
    expect(shouldRetryUserQuery(0, { code: "ERR_CANCELED" })).toBe(false);
    expect(shouldRetryUserQuery(0, new Error("render failed"))).toBe(false);
  });
});
