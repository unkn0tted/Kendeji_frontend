import { describe, expect, test } from "bun:test";
import {
  couponTimestampToMilliseconds,
  couponTimestampToSeconds,
  normalizeCouponTimestampsForApi,
  normalizeCouponTimestampsForPicker,
} from "../../apps/admin/src/sections/coupon/timestamps";

describe("coupon timestamp compatibility", () => {
  test("converts picker milliseconds to API seconds", () => {
    expect(couponTimestampToSeconds(1_785_024_000_000)).toBe(1_785_024_000);
    expect(couponTimestampToSeconds(1_785_024_000)).toBe(1_785_024_000);
  });

  test("converts API seconds to picker milliseconds", () => {
    expect(couponTimestampToMilliseconds(1_785_024_000)).toBe(
      1_785_024_000_000
    );
    expect(couponTimestampToMilliseconds(1_785_024_000_000)).toBe(
      1_785_024_000_000
    );
  });

  test("preserves empty timestamp values", () => {
    expect(couponTimestampToSeconds(undefined)).toBe(0);
    expect(couponTimestampToMilliseconds(0)).toBe(0);
  });

  test("normalizes coupon timestamps across API and picker boundaries", () => {
    const coupon = {
      id: 1,
      start_time: 1_785_024_000_000,
      expire_time: 1_787_616_000_000,
    };

    expect(normalizeCouponTimestampsForApi(coupon)).toEqual({
      id: 1,
      start_time: 1_785_024_000,
      expire_time: 1_787_616_000,
    });
    expect(
      normalizeCouponTimestampsForPicker(
        normalizeCouponTimestampsForApi(coupon)
      )
    ).toEqual(coupon);
  });
});
