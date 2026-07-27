"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { Progress } from "@workspace/ui/components/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { ProTable } from "@workspace/ui/composed/pro-table/pro-table";
import { filterSubscribeLog } from "@workspace/ui/services/admin/log";
import { getUserSubscribeById } from "@workspace/ui/services/admin/user";
import { formatBytes } from "@workspace/ui/utils/formatting";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { IpLink } from "@/components/ip-link";
import { UserDetail, UserSubscribeDetail } from "@/sections/user/user-detail";
import { fetchAllPaginated } from "@/stores/pagination";
import { formatDate, todayInTimezone } from "@/utils/common";
import {
  type EnrichedSubscribeLog,
  enumerateDateRange,
  filterSubscribeLogsBySubscriptionId,
  mapWithConcurrency,
  paginateSubscribeLogs,
  parseSubscriptionIdSelector,
  type SubscriptionIdSelector,
  SubscriptionIdSelectorError,
  sortSubscribeLogs,
} from "./subscribe-log-data";

const DATE_REQUEST_CONCURRENCY = 3;
const DETAIL_REQUEST_CONCURRENCY = 6;
const RANGE_CACHE_LIMIT = 3;

type SubscribeLogFilters = {
  end_date?: string;
  start_date?: string;
  user_id?: number;
  user_subscribe_id?: string;
};

function toOptionalId(value: unknown): number | undefined {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function cacheRangeRequest<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  request: Promise<T>
): Promise<T> {
  request.catch(() => {
    if (cache.get(key) === request) {
      cache.delete(key);
    }
  });
  cache.set(key, request);

  while (cache.size > RANGE_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }

  return request;
}

export default function SubscribeLogPage() {
  const { t } = useTranslation("log");
  const sp = useSearch({ strict: false }) as Record<string, string | undefined>;
  const queryClient = useQueryClient();
  const rawRangeCache = useRef(new Map<string, Promise<API.SubscribeLog[]>>());
  const rangeCache = useRef(new Map<string, Promise<EnrichedSubscribeLog[]>>());

  const today = todayInTimezone();

  const initialFilters = {
    start_date: sp.start_date || sp.date || today,
    end_date: sp.end_date || sp.date || today,
    user_id: sp.user_id ? Number(sp.user_id) : undefined,
    user_subscribe_id: sp.user_subscribe_id || undefined,
  };

  const loadRawRange = async (
    filter: SubscribeLogFilters,
    serverSubscriptionId?: number
  ): Promise<API.SubscribeLog[]> => {
    const startDate = filter.start_date || today;
    const endDate = filter.end_date || startDate;
    const userId = toOptionalId(filter.user_id);
    const dates = enumerateDateRange(startDate, endDate);

    const dailyLogs = await mapWithConcurrency(
      dates,
      DATE_REQUEST_CONCURRENCY,
      (date) =>
        fetchAllPaginated<API.SubscribeLog>((pagination) =>
          filterSubscribeLog({
            ...pagination,
            date,
            user_id: userId,
            user_subscribe_id: serverSubscriptionId,
          })
        )
    );
    return dailyLogs.flat();
  };

  const getRawRange = (
    filter: SubscribeLogFilters,
    serverSubscriptionId?: number
  ): Promise<API.SubscribeLog[]> => {
    const key = JSON.stringify({
      end_date: filter.end_date || filter.start_date || today,
      start_date: filter.start_date || today,
      user_id: toOptionalId(filter.user_id),
      user_subscribe_id: serverSubscriptionId,
    });
    const cached = rawRangeCache.current.get(key);
    if (cached) return cached;

    return cacheRangeRequest(
      rawRangeCache.current,
      key,
      loadRawRange(filter, serverSubscriptionId)
    );
  };

  const loadRange = async (
    filter: SubscribeLogFilters,
    selector: SubscriptionIdSelector,
    force: boolean
  ): Promise<EnrichedSubscribeLog[]> => {
    const rawLogs = await getRawRange(filter, selector.singleId);
    const logs = filterSubscribeLogsBySubscriptionId(rawLogs, selector);
    const subscriptionIds = [
      ...new Set(
        logs
          .map((log) => Number(log.user_subscribe_id))
          .filter((id) => Number.isInteger(id) && id > 0)
      ),
    ];

    const detailEntries = await mapWithConcurrency(
      subscriptionIds,
      DETAIL_REQUEST_CONCURRENCY,
      async (id) => {
        try {
          const detail = await queryClient.fetchQuery({
            queryKey: ["getUserSubscribeById", id],
            queryFn: async () => {
              const { data } = await getUserSubscribeById({ id });
              return data.data || null;
            },
            staleTime: force ? 0 : 60_000,
          });
          return [id, detail] as const;
        } catch {
          return [id, null] as const;
        }
      }
    );
    const details = new Map(detailEntries);

    return logs.map((log) => {
      const detail = details.get(Number(log.user_subscribe_id));
      if (!detail) return log;

      return {
        ...log,
        subscription_limit: Number(detail.traffic || 0),
        subscription_name: detail.subscribe?.name,
        subscription_used:
          Number(detail.upload || 0) + Number(detail.download || 0),
      };
    });
  };

  const getRange = (
    filter: SubscribeLogFilters,
    force: boolean
  ): Promise<EnrichedSubscribeLog[]> => {
    const selector = parseSubscriptionIdSelector(filter.user_subscribe_id);
    const key = JSON.stringify({
      end_date: filter.end_date || filter.start_date || today,
      start_date: filter.start_date || today,
      user_id: toOptionalId(filter.user_id),
      user_subscribe_id: selector.canonical,
    });

    if (force) {
      rawRangeCache.current.clear();
      rangeCache.current.clear();
    }

    const cached = rangeCache.current.get(key);
    if (cached) return cached;

    return cacheRangeRequest(
      rangeCache.current,
      key,
      loadRange(filter, selector, force)
    );
  };

  return (
    <ProTable<EnrichedSubscribeLog, SubscribeLogFilters>
      columns={[
        {
          accessorKey: "user",
          header: t("column.user", "User"),
          cell: ({ row }) => <UserDetail id={Number(row.original.user_id)} />,
        },
        {
          accessorKey: "user_subscribe_id",
          enableSorting: true,
          header: t("column.subscribeNumber", "Subscription No."),
          cell: ({ row }) => (
            <div className="flex min-w-40 items-center gap-2 whitespace-nowrap">
              <span className="font-mono text-muted-foreground text-xs">
                #{row.original.user_subscribe_id}
              </span>
              <UserSubscribeDetail
                enabled
                hoverCard
                id={Number(row.original.user_subscribe_id)}
              />
            </div>
          ),
        },
        {
          accessorKey: "subscription_used",
          enableSorting: true,
          header: t("column.currentUsage", "Current Usage"),
          cell: ({ row }) => {
            const used = row.original.subscription_used;
            const limit = row.original.subscription_limit;
            if (used === undefined || limit === undefined) return "--";

            if (limit === 0) {
              return (
                <span className="whitespace-nowrap">
                  {formatBytes(used)} / {t("usage.unlimited", "Unlimited")}
                </span>
              );
            }

            const percentage = (used / limit) * 100;
            return (
              <div className="min-w-44 space-y-1.5">
                <div className="flex items-center justify-between gap-3 whitespace-nowrap text-xs">
                  <span>
                    {formatBytes(used)} / {formatBytes(limit)}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(percentage)}%
                  </span>
                </div>
                <Progress
                  aria-label={t("column.currentUsage", "Current Usage")}
                  className="h-1.5"
                  value={Math.min(100, percentage)}
                />
              </div>
            );
          },
        },
        {
          accessorKey: "client_ip",
          header: t("column.ip", "IP"),
          cell: ({ row }) => (
            <IpLink ip={String((row.original as any).client_ip || "")} />
          ),
        },
        {
          accessorKey: "user_agent",
          header: t("column.userAgent", "User Agent"),
          cell: ({ row }) => {
            const userAgent = String(row.original.user_agent || "");
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="max-w-48 cursor-help truncate">
                      {userAgent}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="wrap-break-word max-w-md">{userAgent}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          },
        },
        {
          accessorKey: "timestamp",
          header: t("column.time", "Time"),
          cell: ({ row }) => formatDate(row.original.timestamp),
        },
      ]}
      header={{ title: t("title.subscribe", "Subscribe Log") }}
      initialFilters={initialFilters}
      params={[
        {
          key: "start_date",
          label: t("filter.startDate", "From"),
          type: "date",
        },
        {
          key: "end_date",
          label: t("filter.endDate", "To"),
          type: "date",
        },
        { key: "user_id", placeholder: t("column.userId", "User ID") },
        {
          key: "user_subscribe_id",
          inputClassName: "min-w-64 sm:min-w-80",
          placeholder: t(
            "filter.subscribeIdSelector",
            "Subscription ID / range"
          ),
        },
      ]}
      request={async (pagination, filter, context) => {
        const logs = await getRange(filter, context.force);
        const sortedLogs = sortSubscribeLogs(logs, context.sorting);
        return {
          list: paginateSubscribeLogs(
            sortedLogs,
            pagination.page,
            pagination.size
          ),
          total: sortedLogs.length,
        };
      }}
      requestDebounceMs={350}
      requestErrorMessage={(error) =>
        error instanceof SubscriptionIdSelectorError
          ? t("filter.invalidSubscribeIdSelector", {
              defaultValue: "Invalid subscription ID expression: {{value}}",
              value:
                error.token.length > 40
                  ? `${error.token.slice(0, 40)}...`
                  : error.token,
            })
          : undefined
      }
    />
  );
}
