import { describe, expect, test } from "bun:test";
import {
  canGenerateSubscriptionLinks,
  getConfiguredPublicSubscriptionUrls,
  hasConfiguredPublicSubscriptionUrls,
} from "../../apps/user/src/config/subscription-link-policy";

describe("subscription link policy", () => {
  test("blocks every link generator until configuration is ready", () => {
    expect(canGenerateSubscriptionLinks("loading")).toBe(false);
    expect(canGenerateSubscriptionLinks("retrying")).toBe(false);
    expect(canGenerateSubscriptionLinks("ready")).toBe(true);
  });

  test("normalizes and deduplicates configured public URLs", () => {
    expect(
      getConfiguredPublicSubscriptionUrls({
        public_base_url: "https://legacy.example.com/api/linkon",
        public_base_urls: [
          " https://public.example.com/api/linkon ",
          "https://public.example.com/api/linkon",
          "",
        ],
      })
    ).toEqual(["https://public.example.com/api/linkon"]);
  });

  test("uses the legacy public URL only when the URL list is empty", () => {
    expect(
      getConfiguredPublicSubscriptionUrls({
        public_base_url: " https://public.example.com/api/linkon ",
        public_base_urls: ["", "  "],
      })
    ).toEqual(["https://public.example.com/api/linkon"]);
  });

  test("does not treat an empty or whitespace-only cache as safe", () => {
    expect(
      hasConfiguredPublicSubscriptionUrls({
        public_base_url: " ",
        public_base_urls: ["", "  "],
      })
    ).toBe(false);
    expect(hasConfiguredPublicSubscriptionUrls(undefined)).toBe(false);
  });
});
