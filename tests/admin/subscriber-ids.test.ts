import { describe, expect, test } from "bun:test";
import { parseSubscriberIds } from "../../apps/admin/src/sections/subscribe/subscriber-ids";

describe("parseSubscriberIds", () => {
  test("accepts common Chinese and English separators", () => {
    expect(parseSubscriberIds("1, 2，37 89\n100、101;102；103")).toEqual([
      1, 2, 37, 89, 100, 101, 102, 103,
    ]);
  });

  test("sorts and deduplicates IDs", () => {
    expect(parseSubscriberIds("89, 2, 37, 1, 2, 89")).toEqual([1, 2, 37, 89]);
  });

  test("returns an empty list for an empty input", () => {
    expect(parseSubscriberIds(" \n ")).toEqual([]);
  });

  test("rejects negative, decimal, and non-numeric IDs", () => {
    expect(parseSubscriberIds("1, -2")).toBeNull();
    expect(parseSubscriberIds("1, 3.5")).toBeNull();
    expect(parseSubscriberIds("1, abc")).toBeNull();
  });

  test("rejects inputs above the per-rule safety limit", () => {
    const input = Array.from({ length: 10_001 }, (_, index) => index).join(",");
    expect(parseSubscriberIds(input)).toBeNull();
  });
});
