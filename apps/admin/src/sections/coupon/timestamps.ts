const MILLISECOND_TIMESTAMP_THRESHOLD = 10_000_000_000;

type CouponTimestamps = {
  start_time: number;
  expire_time: number;
};

export function isMillisecondTimestamp(value: number | undefined) {
  return Number.isFinite(value) && value! >= MILLISECOND_TIMESTAMP_THRESHOLD;
}

export function couponTimestampToSeconds(value: number | undefined) {
  if (!value) return 0;
  return isMillisecondTimestamp(value)
    ? Math.floor(value / 1000)
    : Math.floor(value);
}

export function couponTimestampToMilliseconds(value: number | undefined) {
  if (!value) return 0;
  return isMillisecondTimestamp(value) ? value : value * 1000;
}

export function normalizeCouponTimestampsForApi<
  T extends Partial<CouponTimestamps>,
>(coupon: T): T {
  return {
    ...coupon,
    start_time: couponTimestampToSeconds(coupon.start_time),
    expire_time: couponTimestampToSeconds(coupon.expire_time),
  };
}

export function normalizeCouponTimestampsForPicker<
  T extends Partial<CouponTimestamps>,
>(coupon: T): T {
  return {
    ...coupon,
    start_time: couponTimestampToMilliseconds(coupon.start_time),
    expire_time: couponTimestampToMilliseconds(coupon.expire_time),
  };
}
