import { describe, expect, test } from "bun:test";
import {
  couponExpirationToEndOfDay,
  couponTimestampToMilliseconds,
  normalizeCouponTimestampsForApi,
  normalizeCouponTimestampsForPicker,
} from "../../apps/admin/src/sections/coupon/timestamps";

describe("coupon timestamp compatibility", () => {
  test("converts legacy API seconds to milliseconds", () => {
    expect(couponTimestampToMilliseconds(1_785_024_000)).toBe(
      1_785_024_000_000
    );
    expect(couponTimestampToMilliseconds(1_785_024_000_000)).toBe(
      1_785_024_000_000
    );
  });

  test("preserves empty timestamp values", () => {
    expect(couponTimestampToMilliseconds(undefined)).toBe(0);
    expect(couponTimestampToMilliseconds(0)).toBe(0);
    expect(couponExpirationToEndOfDay(undefined)).toBe(0);
  });

  test("stores the selected expiration date through the end of the day", () => {
    const selectedDate = new Date(2026, 6, 31).getTime();
    const expiration = new Date(couponExpirationToEndOfDay(selectedDate));

    expect(expiration.getFullYear()).toBe(2026);
    expect(expiration.getMonth()).toBe(6);
    expect(expiration.getDate()).toBe(31);
    expect(expiration.getHours()).toBe(23);
    expect(expiration.getMinutes()).toBe(59);
    expect(expiration.getSeconds()).toBe(59);
    expect(expiration.getMilliseconds()).toBe(999);
  });

  test("sends picker timestamps to the API in milliseconds", () => {
    const startTime = new Date(2026, 6, 31).getTime();
    const expireTime = new Date(2026, 7, 31).getTime();
    const pickerCoupon = {
      id: 1,
      start_time: startTime,
      expire_time: expireTime,
    };

    expect(normalizeCouponTimestampsForApi(pickerCoupon)).toEqual({
      ...pickerCoupon,
      expire_time: couponExpirationToEndOfDay(expireTime),
    });
  });

  test("upgrades legacy second timestamps when a coupon is saved", () => {
    const legacyCoupon = {
      id: 1,
      start_time: 1_785_024_000,
      expire_time: 1_787_616_000,
    };
    const pickerCoupon = {
      id: 1,
      start_time: 1_785_024_000_000,
      expire_time: 1_787_616_000_000,
    };

    expect(normalizeCouponTimestampsForApi(legacyCoupon)).toEqual({
      ...pickerCoupon,
      expire_time: couponExpirationToEndOfDay(pickerCoupon.expire_time),
    });
    expect(normalizeCouponTimestampsForPicker(legacyCoupon)).toEqual(
      pickerCoupon
    );
  });
});
