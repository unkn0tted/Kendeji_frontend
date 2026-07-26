import { describe, expect, test } from "bun:test";
import {
  resolveForwardedClientIp,
  setForwardedClientIp,
  trustProxyHeadersEnabled,
} from "./proxy-ip";

describe("trusted proxy client IP forwarding", () => {
  test("recognizes explicit enabled values", () => {
    expect(trustProxyHeadersEnabled("true")).toBe(true);
    expect(trustProxyHeadersEnabled("YES")).toBe(true);
    expect(trustProxyHeadersEnabled("1")).toBe(true);
    expect(trustProxyHeadersEnabled("off")).toBe(false);
    expect(trustProxyHeadersEnabled(undefined)).toBe(false);
  });

  test("does not forward proxy headers unless trust is enabled", () => {
    expect(
      resolveForwardedClientIp(
        {
          "x-real-ip": "203.0.113.10",
          "x-forwarded-for": "198.51.100.20",
        },
        "127.0.0.1",
        false
      )
    ).toBeNull();
  });

  test("prefers the trusted X-Real-IP over a forwarded chain", () => {
    expect(
      resolveForwardedClientIp(
        {
          "x-real-ip": "203.0.113.10",
          "x-forwarded-for": "192.0.2.99, 203.0.113.10",
        },
        "127.0.0.1",
        true
      )
    ).toBe("203.0.113.10");
  });

  test("uses the first valid forwarded address when X-Real-IP is absent", () => {
    expect(
      resolveForwardedClientIp(
        {
          "x-forwarded-for": "unknown, 2001:db8::25, 203.0.113.10",
        },
        "127.0.0.1",
        true
      )
    ).toBe("2001:db8::25");
  });

  test("normalizes IPv4-mapped socket addresses", () => {
    expect(resolveForwardedClientIp({}, "::ffff:127.0.0.1", true)).toBe(
      "127.0.0.1"
    );
  });

  test("writes a single canonical IP to both upstream headers", () => {
    const headers = new Headers({
      "x-forwarded-for": "192.0.2.99, 203.0.113.10",
    });

    setForwardedClientIp(headers, "203.0.113.10");

    expect(headers.get("x-real-ip")).toBe("203.0.113.10");
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.10");
  });
});
