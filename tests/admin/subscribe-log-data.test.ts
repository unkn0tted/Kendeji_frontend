import { describe, expect, test } from "bun:test";
import {
  type EnrichedSubscribeLog,
  enumerateDateRange,
  filterSubscribeLogsBySubscriptionId,
  mapWithConcurrency,
  matchesSubscriptionIdSelector,
  paginateSubscribeLogs,
  parseSubscriptionIdSelector,
  SubscriptionIdSelectorError,
  sortSubscribeLogs,
} from "../../apps/admin/src/sections/log/subscribe/subscribe-log-data";

function createLog(
  userSubscribeId: number,
  subscriptionUsed: number | undefined,
  timestamp: number
): EnrichedSubscribeLog {
  return {
    client_ip: "127.0.0.1",
    subscription_used: subscriptionUsed,
    timestamp,
    token: "",
    user_agent: "",
    user_id: 1,
    user_subscribe_id: userSubscribeId,
  };
}

describe("subscription log date range", () => {
  test("enumerates every date in an inclusive range", () => {
    expect(enumerateDateRange("2024-02-28", "2024-03-01")).toEqual([
      "2024-02-28",
      "2024-02-29",
      "2024-03-01",
    ]);
  });

  test("rejects reversed and invalid ranges", () => {
    expect(() => enumerateDateRange("2024-03-02", "2024-03-01")).toThrow();
    expect(() => enumerateDateRange("2024-02-30", "2024-03-01")).toThrow();
  });
});

describe("subscription ID selector", () => {
  test("parses, sorts, deduplicates, and merges IDs and ranges", () => {
    const selector = parseSubscriptionIdSelector(
      "2000, 1003, 1000-1002, 2000, 5000-, -10"
    );

    expect(selector).toEqual({
      canonical: "-10,1000-1003,2000,5000-",
      intervals: [
        { end: 10, start: 1 },
        { end: 1003, start: 1000 },
        { end: 2000, start: 2000 },
        { end: Number.MAX_SAFE_INTEGER, start: 5000 },
      ],
      singleId: undefined,
    });
  });

  test("accepts common separators and range dash variants", () => {
    const selector = parseSubscriptionIdSelector(
      "4546\uFF0C4550\u30014565; 4566\n4654 \u2013 4746"
    );

    expect(selector.canonical).toBe("4546,4550,4565-4566,4654-4746");
  });

  test("treats an open lower range as positive IDs up to the limit", () => {
    expect(parseSubscriptionIdSelector("-1000")).toEqual(
      parseSubscriptionIdSelector("1-1000")
    );
  });

  test("keeps a single exact ID eligible for server-side filtering", () => {
    expect(parseSubscriptionIdSelector(" 4550 ")).toEqual({
      canonical: "4550",
      intervals: [{ end: 4550, start: 4550 }],
      singleId: 4550,
    });
  });

  test("handles a large discrete ID group without expanding ranges", () => {
    const ids = Array.from({ length: 153 }, (_, index) => 4546 + index * 2);
    const selector = parseSubscriptionIdSelector(ids.join(", "));

    expect(selector.intervals).toHaveLength(153);
    expect(selector.singleId).toBeUndefined();
    expect(matchesSubscriptionIdSelector(selector, ids.at(-1))).toBe(true);
    expect(matchesSubscriptionIdSelector(selector, 4547)).toBe(false);
  });

  test("rejects malformed, non-positive, unsafe, and reversed values", () => {
    for (const value of [
      "0",
      "12.5",
      "abc",
      "5000-4000",
      "-",
      "9007199254740992",
    ]) {
      expect(() => parseSubscriptionIdSelector(value)).toThrow(
        SubscriptionIdSelectorError
      );
    }
  });

  test("filters logs against combined discrete IDs and ranges", () => {
    const selector = parseSubscriptionIdSelector("10,20-30,100-");
    const logs = [
      createLog(9, 0, 1),
      createLog(10, 0, 2),
      createLog(25, 0, 3),
      createLog(31, 0, 4),
      createLog(100, 0, 5),
    ];

    expect(
      filterSubscribeLogsBySubscriptionId(logs, selector).map(
        (log) => log.user_subscribe_id
      )
    ).toEqual([10, 25, 100]);
  });
});

describe("subscription log client-side sorting", () => {
  const logs = [
    createLog(30, 300, 100),
    createLog(10, undefined, 300),
    createLog(20, 100, 200),
  ];

  test("sorts the full result by subscription usage", () => {
    expect(
      sortSubscribeLogs(logs, [{ id: "subscription_used", desc: true }]).map(
        (log) => log.user_subscribe_id
      )
    ).toEqual([30, 20, 10]);
  });

  test("sorts by subscription number in either direction", () => {
    expect(
      sortSubscribeLogs(logs, [{ id: "user_subscribe_id", desc: false }]).map(
        (log) => log.user_subscribe_id
      )
    ).toEqual([10, 20, 30]);
    expect(
      sortSubscribeLogs(logs, [{ id: "user_subscribe_id", desc: true }]).map(
        (log) => log.user_subscribe_id
      )
    ).toEqual([30, 20, 10]);
  });

  test("defaults to newest log first and paginates after sorting", () => {
    const sorted = sortSubscribeLogs(logs, []);
    expect(sorted.map((log) => log.timestamp)).toEqual([300, 200, 100]);
    expect(paginateSubscribeLogs(sorted, 2, 2)).toEqual([sorted[2]]);
  });
});

describe("bounded request concurrency", () => {
  test("preserves input order and respects the worker limit", async () => {
    let active = 0;
    let maximumActive = 0;

    const result = await mapWithConcurrency([1, 2, 3, 4], 2, async (value) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return value * 2;
    });

    expect(result).toEqual([2, 4, 6, 8]);
    expect(maximumActive).toBe(2);
  });
});
