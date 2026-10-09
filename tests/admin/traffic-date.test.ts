import { describe, expect, test } from "bun:test";
import {
  isCompletedTrafficDate,
  latestCompletedTrafficDate,
} from "../../apps/admin/src/utils/traffic-date";

describe("completed traffic dates", () => {
  test("only exposes dates completed in every time zone", () => {
    const now = new Date("2026-10-02T11:59:59Z");
    expect(latestCompletedTrafficDate(now)).toBe("2026-09-30");
    expect(isCompletedTrafficDate("2026-09-30", now)).toBe(true);
    expect(isCompletedTrafficDate("2026-10-01", now)).toBe(false);
  });

  test("advances after the last time zone finishes the day", () => {
    const now = new Date("2026-10-02T12:00:00Z");
    expect(latestCompletedTrafficDate(now)).toBe("2026-10-01");
    expect(isCompletedTrafficDate("2026-10-01", now)).toBe(true);
  });

  test("rejects missing, malformed and impossible dates", () => {
    const now = new Date("2026-10-02T12:00:00Z");
    for (const value of [
      undefined,
      "",
      "2026-2-01",
      "2026-02-30",
      "2026-10-02",
      "2026-10-03",
    ]) {
      expect(isCompletedTrafficDate(value, now)).toBe(false);
    }
  });
});
