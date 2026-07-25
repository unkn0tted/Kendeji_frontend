import { describe, expect, test } from "bun:test";
import { normalizeConfig } from "./config";

describe("subscription rewriter config", () => {
  test("keeps the legacy single public URL as the default", () => {
    const config = normalizeConfig({
      public_base_url: "https://subscribe.example.com/api/linkon",
      origin_base_url: "https://origin.example.com/api/linkon",
      rules: [],
    });

    expect(config.public_base_url).toBe(
      "https://subscribe.example.com/api/linkon"
    );
    expect(config.public_base_urls).toEqual([
      "https://subscribe.example.com/api/linkon",
    ]);
  });

  test("normalizes multiple user-facing URLs", () => {
    const config = normalizeConfig({
      public_base_url: "",
      origin_base_url: "https://origin.example.com/api/linkon",
      public_base_urls: [
        "https://a.example.com/api/linkon/",
        "https://b.example.com/api/linkon",
      ],
      rules: [],
    });

    expect(config.public_base_urls).toEqual([
      "https://a.example.com/api/linkon",
      "https://b.example.com/api/linkon",
    ]);
    expect(config.public_base_url).toBe("https://a.example.com/api/linkon");
  });

  test("migrates legacy ranged URLs into a shared URL list", () => {
    const config = normalizeConfig({
      public_links: [
        {
          base_url: "https://a.example.com/api/linkon",
          enabled: true,
        },
        {
          base_url: "https://disabled.example.com/api/linkon",
          enabled: false,
        },
      ],
      rules: [],
    });

    expect(config.public_base_urls).toEqual([
      "https://a.example.com/api/linkon",
    ]);
  });

  test("allows an explicit empty URL list to clear the legacy default", () => {
    const config = normalizeConfig({
      public_base_url: "https://legacy.example.com/api/linkon",
      public_base_urls: [],
      rules: [],
    });

    expect(config.public_base_urls).toEqual([]);
    expect(config.public_base_url).toBe("");
  });

  test("keeps existing rules in range mode when match_mode is absent", () => {
    const config = normalizeConfig({
      rules: [
        {
          id: "legacy-range",
          name: "legacy",
          start_id: 1,
          end_id: 1000,
          source_host: "old.example.com",
          target_host: "new.example.com",
          enabled: true,
          priority: 100,
        },
      ],
    });

    expect(config.rules[0]).toMatchObject({
      id: "legacy-range",
      match_mode: "range",
      start_id: 1,
      end_id: 1000,
      subscriber_ids: [],
    });
  });

  test("normalizes, sorts, and deduplicates explicit subscription IDs", () => {
    const config = normalizeConfig({
      rules: [
        {
          id: "explicit-ids",
          name: "selected users",
          match_mode: "ids",
          start_id: 10,
          end_id: 20,
          subscriber_ids: [89, "2", 37, 1, 2, 89],
          source_host: "old.example.com",
          target_host: "new.example.com",
          enabled: true,
          priority: 100,
        },
      ],
    });

    expect(config.rules[0]).toMatchObject({
      match_mode: "ids",
      start_id: 0,
      end_id: 0,
      subscriber_ids: [1, 2, 37, 89],
    });
  });

  test("rejects an empty explicit subscription ID list", () => {
    expect(() =>
      normalizeConfig({
        rules: [
          {
            id: "empty-explicit-ids",
            match_mode: "ids",
            subscriber_ids: [],
            source_host: "old.example.com",
            target_host: "new.example.com",
          },
        ],
      })
    ).toThrow("At least one subscription ID");
  });

  test("rejects invalid explicit subscription IDs", () => {
    expect(() =>
      normalizeConfig({
        rules: [
          {
            id: "invalid-explicit-ids",
            match_mode: "ids",
            subscriber_ids: [1, -2, 3.5],
            source_host: "old.example.com",
            target_host: "new.example.com",
          },
        ],
      })
    ).toThrow("Invalid subscription ID");
  });

  test("rejects unknown match modes instead of widening the rule", () => {
    expect(() =>
      normalizeConfig({
        rules: [
          {
            id: "unknown-match-mode",
            match_mode: "everything",
            start_id: 1,
            end_id: 1000,
            source_host: "old.example.com",
            target_host: "new.example.com",
          },
        ],
      })
    ).toThrow("match mode");
  });
});
