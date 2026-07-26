import { describe, expect, test } from "bun:test";
import {
  OPTIONAL_CONFIG_CACHE_TTL_MS,
  readOptionalConfigCache,
  updateOptionalConfigCache,
} from "../../apps/user/src/config/optional-config-cache";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("optional config cache", () => {
  test("stores and restores both optional configs", () => {
    const storage = new MemoryStorage();

    updateOptionalConfigCache(
      {
        protocolConfig: {
          default_protocol: "tuic",
          selector_style: "cards",
        },
        rewriterConfig: {
          public_base_url: "https://subscribe.example.com/api/linkon",
          public_base_urls: [
            "https://subscribe.example.com/api/linkon",
            "https://backup.example.com/api/linkon",
          ],
        },
      },
      storage,
      1000
    );

    expect(readOptionalConfigCache(storage, 2000)).toEqual({
      protocolConfig: {
        default_protocol: "tuic",
        selector_style: "cards",
      },
      rewriterConfig: {
        public_base_url: "https://subscribe.example.com/api/linkon",
        public_base_urls: [
          "https://subscribe.example.com/api/linkon",
          "https://backup.example.com/api/linkon",
        ],
      },
    });
  });

  test("expires each service independently", () => {
    const storage = new MemoryStorage();

    updateOptionalConfigCache(
      { protocolConfig: { default_protocol: "tuic" } },
      storage,
      1000
    );
    updateOptionalConfigCache(
      { rewriterConfig: { public_base_url: "" } },
      storage,
      OPTIONAL_CONFIG_CACHE_TTL_MS - 1000
    );

    expect(
      readOptionalConfigCache(storage, OPTIONAL_CONFIG_CACHE_TTL_MS + 2000)
    ).toEqual({
      rewriterConfig: { public_base_url: "" },
    });
  });

  test("ignores malformed cache data and storage failures", () => {
    const malformedStorage = new MemoryStorage();
    malformedStorage.setItem(
      "ppanel:optional-config-cache:v1",
      '{"version":1,"protocolConfig":{"updatedAt":1,"data":{"protocol_options":"invalid"}}}'
    );

    expect(readOptionalConfigCache(malformedStorage, 2)).toEqual({});

    const unavailableStorage = {
      getItem() {
        throw new Error("unavailable");
      },
      removeItem() {
        throw new Error("unavailable");
      },
      setItem() {
        throw new Error("unavailable");
      },
    };

    expect(readOptionalConfigCache(unavailableStorage, 2)).toEqual({});
    expect(() =>
      updateOptionalConfigCache(
        { protocolConfig: { default_protocol: "tuic" } },
        unavailableStorage,
        2
      )
    ).not.toThrow();
  });
});
