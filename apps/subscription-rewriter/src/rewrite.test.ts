import { describe, expect, test } from "bun:test";
import { rewriteSubscription } from "./rewrite";
import type { RewriteRule } from "./types";

const rule: RewriteRule = {
  id: "rule-1",
  name: "group A",
  start_id: 1,
  end_id: 1000,
  source_host: "old.example.com",
  target_host: "new.example.com",
  enabled: true,
  priority: 100,
};

describe("rewriteSubscription", () => {
  test("rewrites only the URI authority hostname", () => {
    const body =
      "anytls://secret@old.example.com:443?security=tls&sni=old.example.com#Node";
    const result = rewriteSubscription(body, [rule], 500);

    expect(result.body).toBe(
      "anytls://secret@new.example.com:443?security=tls&sni=old.example.com#Node"
    );
    expect(result.replacements).toBe(1);
    expect(result.format).toBe("uri-list");
  });

  test("keeps subscriptions outside the configured ID range unchanged", () => {
    const body = "vless://uuid@old.example.com:443?security=tls";
    const result = rewriteSubscription(body, [rule], 1001);

    expect(result.body).toBe(body);
    expect(result.changed).toBe(false);
    expect(result.hosts).toEqual([{ host: "old.example.com", count: 1 }]);
  });

  test("preserves a Base64 wrapper", () => {
    const source = "tuic://user:pass@old.example.com:443?sni=tls.example.com";
    const body = Buffer.from(source).toString("base64");
    const result = rewriteSubscription(body, [rule], 10);

    expect(result.wrapped).toBe("base64");
    expect(Buffer.from(result.body, "base64").toString()).toContain(
      "@new.example.com:443"
    );
  });

  test("rewrites YAML node servers without changing SNI", () => {
    const body = `proxies:
  - name: HK
    type: anytls
    server: old.example.com
    port: 443
    sni: old.example.com
`;
    const result = rewriteSubscription(body, [rule], 10);

    expect(result.format).toBe("yaml");
    expect(result.body).toContain("server: new.example.com");
    expect(result.body).toContain("sni: old.example.com");
  });

  test("rewrites JSON node servers without changing TLS server_name", () => {
    const body = JSON.stringify({
      outbounds: [
        {
          type: "anytls",
          server: "old.example.com",
          server_port: 443,
          tls: { server_name: "old.example.com" },
        },
      ],
    });
    const result = rewriteSubscription(body, [rule], 10);
    const parsed = JSON.parse(result.body);

    expect(parsed.outbounds[0].server).toBe("new.example.com");
    expect(parsed.outbounds[0].tls.server_name).toBe("old.example.com");
  });

  test("does not rewrite unrelated JSON server objects", () => {
    const body = JSON.stringify({
      dns: {
        servers: [
          {
            type: "udp",
            server: "old.example.com",
            server_port: 53,
          },
        ],
      },
      outbounds: [
        {
          type: "anytls",
          server: "old.example.com",
          server_port: 443,
        },
      ],
    });
    const result = rewriteSubscription(body, [rule], 10);
    const parsed = JSON.parse(result.body);

    expect(parsed.dns.servers[0].server).toBe("old.example.com");
    expect(parsed.outbounds[0].server).toBe("new.example.com");
    expect(result.replacements).toBe(1);
  });

  test("rewrites common CONF proxy lines", () => {
    const body =
      "[Proxy]\nHK = anytls, old.example.com, 443, sni=old.example.com\n";
    const result = rewriteSubscription(body, [rule], 10);

    expect(result.format).toBe("conf");
    expect(result.body).toContain(
      "HK = anytls, new.example.com, 443, sni=old.example.com"
    );
  });

  test("passes unknown formats through byte-for-byte", () => {
    const body = "this is not a subscription";
    const result = rewriteSubscription(body, [rule], 10);

    expect(result.body).toBe(body);
    expect(result.format).toBe("unknown");
    expect(result.changed).toBe(false);
  });
});
