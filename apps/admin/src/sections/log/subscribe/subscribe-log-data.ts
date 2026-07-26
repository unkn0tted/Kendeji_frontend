export type EnrichedSubscribeLog = API.SubscribeLog & {
  subscription_limit?: number;
  subscription_name?: string;
  subscription_used?: number;
};

export type SubscribeLogSort = {
  desc: boolean;
  id: string;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseDateInput(value: string): number {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid date: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date: ${value}`);
  }

  return timestamp;
}

function formatDateInput(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function enumerateDateRange(
  startDate: string,
  endDate: string
): string[] {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);

  if (start > end) {
    throw new Error("Start date must not be later than end date");
  }

  const dates: string[] = [];
  for (let timestamp = start; timestamp <= end; timestamp += DAY_IN_MS) {
    dates.push(formatDateInput(timestamp));
  }
  return dates;
}

function compareOptionalNumbers(
  left: number | undefined,
  right: number | undefined,
  descending: boolean
): number {
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;

  return (left - right) * (descending ? -1 : 1);
}

export function sortSubscribeLogs(
  logs: EnrichedSubscribeLog[],
  sorting: SubscribeLogSort[]
): EnrichedSubscribeLog[] {
  const activeSort = sorting[0];

  return [...logs].sort((left, right) => {
    let result = 0;

    if (activeSort?.id === "user_subscribe_id") {
      result = compareOptionalNumbers(
        left.user_subscribe_id,
        right.user_subscribe_id,
        activeSort.desc
      );
    } else if (activeSort?.id === "subscription_used") {
      result = compareOptionalNumbers(
        left.subscription_used,
        right.subscription_used,
        activeSort.desc
      );
    }

    if (result !== 0) return result;
    return right.timestamp - left.timestamp;
  });
}

export function paginateSubscribeLogs(
  logs: EnrichedSubscribeLog[],
  page: number,
  size: number
): EnrichedSubscribeLog[] {
  const normalizedPage = Math.max(1, Math.trunc(page));
  const normalizedSize = Math.max(1, Math.trunc(size));
  const start = (normalizedPage - 1) * normalizedSize;
  return logs.slice(start, start + normalizedSize);
}

export async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<TResult>
): Promise<TResult[]> {
  if (items.length === 0) return [];

  const results = new Array<TResult>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(
    items.length,
    Math.max(1, Math.trunc(concurrency))
  );

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]!, currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}
