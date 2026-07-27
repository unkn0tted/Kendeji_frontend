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
const MAX_SUBSCRIPTION_ID = Number.MAX_SAFE_INTEGER;
const SELECTOR_DASH_PATTERN =
  /[\u2010\u2011\u2012\u2013\u2014\u2212\uFF0D~\uFF5E]/g;
const SELECTOR_SEPARATOR_PATTERN = /[,\uFF0C\u3001;\uFF1B\s]+/;

export type SubscriptionIdInterval = {
  end: number;
  start: number;
};

export type SubscriptionIdSelector = {
  canonical: string;
  intervals: SubscriptionIdInterval[];
  singleId?: number;
};

export class SubscriptionIdSelectorError extends Error {
  readonly token: string;

  constructor(token: string) {
    super(`Invalid subscription ID selector token: ${token}`);
    this.name = "SubscriptionIdSelectorError";
    this.token = token;
  }
}

function parseSubscriptionId(value: string, token: string): number {
  const id = Number(value);
  if (!(Number.isSafeInteger(id) && id > 0)) {
    throw new SubscriptionIdSelectorError(token);
  }
  return id;
}

function formatSubscriptionIdInterval(
  interval: SubscriptionIdInterval
): string {
  if (interval.start === interval.end) return String(interval.start);
  if (interval.start === 1) return `-${interval.end}`;
  if (interval.end === MAX_SUBSCRIPTION_ID) return `${interval.start}-`;
  return `${interval.start}-${interval.end}`;
}

export function parseSubscriptionIdSelector(
  value: unknown
): SubscriptionIdSelector {
  const source = String(value ?? "").trim();
  if (!source) {
    return { canonical: "", intervals: [] };
  }

  const normalized = source
    .replace(SELECTOR_DASH_PATTERN, "-")
    .replace(/\s*-\s*/g, "-");
  const tokens = normalized.split(SELECTOR_SEPARATOR_PATTERN).filter(Boolean);
  if (tokens.length === 0) {
    throw new SubscriptionIdSelectorError(source);
  }

  const intervals = tokens.map((token): SubscriptionIdInterval => {
    if (/^\d+$/.test(token)) {
      const id = parseSubscriptionId(token, token);
      return { end: id, start: id };
    }

    const range = /^(\d*)-(\d*)$/.exec(token);
    if (!(range && (range[1] || range[2]))) {
      throw new SubscriptionIdSelectorError(token);
    }

    const start = range[1] ? parseSubscriptionId(range[1], token) : 1;
    const end = range[2]
      ? parseSubscriptionId(range[2], token)
      : MAX_SUBSCRIPTION_ID;
    if (start > end) {
      throw new SubscriptionIdSelectorError(token);
    }

    return { end, start };
  });

  intervals.sort(
    (left, right) => left.start - right.start || left.end - right.end
  );

  const merged: SubscriptionIdInterval[] = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (
      previous &&
      (previous.end === MAX_SUBSCRIPTION_ID ||
        interval.start <= previous.end + 1)
    ) {
      previous.end = Math.max(previous.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  const onlyInterval = merged.length === 1 ? merged[0] : undefined;

  return {
    canonical: merged.map(formatSubscriptionIdInterval).join(","),
    intervals: merged,
    singleId:
      onlyInterval && onlyInterval.start === onlyInterval.end
        ? onlyInterval.start
        : undefined,
  };
}

export function matchesSubscriptionIdSelector(
  selector: SubscriptionIdSelector,
  value: unknown
): boolean {
  const id = Number(value);
  if (!(Number.isSafeInteger(id) && id > 0)) return false;
  if (selector.intervals.length === 0) return true;

  let low = 0;
  let high = selector.intervals.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const interval = selector.intervals[middle]!;
    if (id < interval.start) {
      high = middle - 1;
    } else if (id > interval.end) {
      low = middle + 1;
    } else {
      return true;
    }
  }

  return false;
}

export function filterSubscribeLogsBySubscriptionId<
  T extends Pick<API.SubscribeLog, "user_subscribe_id">,
>(logs: T[], selector: SubscriptionIdSelector): T[] {
  if (selector.intervals.length === 0) return logs;
  return logs.filter((log) =>
    matchesSubscriptionIdSelector(selector, log.user_subscribe_id)
  );
}

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
