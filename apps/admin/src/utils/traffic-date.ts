const DAY_MS = 24 * 60 * 60 * 1000;

// UTC-12 is the last time zone to finish a calendar day. This remains safe
// even when the browser and backend use different time zones.
export function latestCompletedTrafficDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Etc/GMT+12",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now.getTime() - DAY_MS));
}

export function isCompletedTrafficDate(
  value: unknown,
  now = new Date()
): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= latestCompletedTrafficDate(now)
  );
}
