import { describe, expect, test } from "bun:test";
import {
  type EnrichedSubscribeLog,
  enumerateDateRange,
  mapWithConcurrency,
  paginateSubscribeLogs,
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
