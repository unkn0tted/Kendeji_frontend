import { describe, expect, test } from "bun:test";
import { rewriteSubscription } from "./rewrite";
import type { RewriteRule } from "./types";

const rule: RewriteRule = {
  id: "rule-1",
  name: "group A",
  match_mode: "range",
  start_id: 1,
  end_id: 1000,
  subscriber_ids: [],
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
    expect(result.host_mappings).toEqual([
      {
        source_host: "old.example.com",
        result_host: "new.example.com",
        count: 1,
        rewritten: true,
      },
    ]);
  });

  test("keeps subscriptions outside the configured ID range unchanged", () => {
    const body = "vless://uuid@old.example.com:443?security=tls";
    const result = rewriteSubscription(body, [rule], 1001);

    expect(result.body).toBe(body);
    expect(result.changed).toBe(false);
    expect(result.hosts).toEqual([{ host: "old.example.com", count: 1 }]);
  });

  test("keeps inclusive range boundaries unchanged from the legacy behavior", () => {
    const body = "vless://uuid@old.example.com:443?security=tls";

    expect(rewriteSubscription(body, [rule], 1).changed).toBe(true);
    expect(rewriteSubscription(body, [rule], 1000).changed).toBe(true);
    expect(rewriteSubscription(body, [rule], 0).changed).toBe(false);
    expect(rewriteSubscription(body, [rule], 1001).changed).toBe(false);
  });

  test("rewrites only explicitly listed subscription IDs", () => {
    const explicitRule: RewriteRule = {
      ...rule,
      id: "explicit-rule",
      match_mode: "ids",
      start_id: 0,
      end_id: 0,
      subscriber_ids: [1, 2, 37, 89],
    };
    const body = "vless://uuid@old.example.com:443?security=tls";

    for (const subscriberId of [1, 2, 37, 89]) {
      expect(
        rewriteSubscription(body, [explicitRule], subscriberId).changed
      ).toBe(true);
    }
    expect(rewriteSubscription(body, [explicitRule], 3).changed).toBe(false);
    expect(rewriteSubscription(body, [explicitRule], 88).changed).toBe(false);
  });

  test("prefers an explicit-ID rule over a range at the same priority", () => {
    const explicitRule: RewriteRule = {
      ...rule,
      id: "explicit-rule",
      match_mode: "ids",
      start_id: 0,
      end_id: 0,
      subscriber_ids: [37],
      target_host: "specific.example.com",
    };
    const body = "vless://uuid@old.example.com:443?security=tls";

    expect(rewriteSubscription(body, [rule, explicitRule], 37).body).toContain(
      "@specific.example.com:443"
    );
    expect(rewriteSubscription(body, [rule, explicitRule], 38).body).toContain(
      "@new.example.com:443"
    );
  });

  test("keeps priority above match specificity", () => {
    const explicitRule: RewriteRule = {
      ...rule,
      id: "explicit-rule",
      match_mode: "ids",
      start_id: 0,
      end_id: 0,
      subscriber_ids: [37],
      target_host: "specific.example.com",
      priority: 99,
    };
    const body = "vless://uuid@old.example.com:443?security=tls";

    expect(rewriteSubscription(body, [rule, explicitRule], 37).body).toContain(
      "@new.example.com:443"
    );
  });

  test("does not apply disabled explicit-ID rules", () => {
    const explicitRule: RewriteRule = {
      ...rule,
      id: "disabled-explicit-rule",
      match_mode: "ids",
      start_id: 0,
      end_id: 0,
      subscriber_ids: [37],
      enabled: false,
    };
    const body = "vless://uuid@old.example.com:443?security=tls";

    expect(rewriteSubscription(body, [explicitRule], 37).body).toBe(body);
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

  test("reports aligned rewritten and unchanged host mappings", () => {
    const body = [
      "anytls://password@old.example.com:443#one",
      "anytls://password@old.example.com:443#two",
      "anytls://password@unchanged.example.com:443#three",
    ].join("\n");

    const result = rewriteSubscription(body, [rule], 97);

    expect(result.host_mappings).toEqual([
      {
        source_host: "old.example.com",
        result_host: "new.example.com",
        count: 2,
        rewritten: true,
      },
      {
        source_host: "unchanged.example.com",
        result_host: "unchanged.example.com",
        count: 1,
        rewritten: false,
      },
    ]);
  });
});
