const MILLISECOND_TIMESTAMP_THRESHOLD = 10_000_000_000;

type CouponTimestamps = {
  start_time: number;
  expire_time: number;
};

export function isMillisecondTimestamp(value: number | undefined) {
  return Number.isFinite(value) && value! >= MILLISECOND_TIMESTAMP_THRESHOLD;
}

export function couponTimestampToMilliseconds(value: number | undefined) {
  if (!value) return 0;
  return isMillisecondTimestamp(value) ? value : value * 1000;
}

export function couponExpirationToEndOfDay(value: number | undefined) {
  const timestamp = couponTimestampToMilliseconds(value);
  if (!timestamp) return 0;

  const expiration = new Date(timestamp);
  expiration.setHours(23, 59, 59, 999);
  return expiration.getTime();
}

export function normalizeCouponTimestampsForApi<
  T extends Partial<CouponTimestamps>,
>(coupon: T): T {
  // Billing checkout compares coupon windows with UnixMilli. Converting here
  // also upgrades coupons saved as seconds by older frontend versions. The
  // date-only expiration picker represents an inclusive day, so persist its
  // final millisecond rather than midnight at the start of that day.
  return {
    ...coupon,
    start_time: couponTimestampToMilliseconds(coupon.start_time),
    expire_time: couponExpirationToEndOfDay(coupon.expire_time),
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
