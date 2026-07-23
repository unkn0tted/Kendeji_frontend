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
});
