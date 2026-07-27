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
  mapWithConcurrency,
  paginateSubscribeLogs,
  sortSubscribeLogs,
} from "./subscribe-log-data";

const DATE_REQUEST_CONCURRENCY = 3;
const DETAIL_REQUEST_CONCURRENCY = 6;
const RANGE_CACHE_LIMIT = 3;

type SubscribeLogFilters = {
  end_date?: string;
  start_date?: string;
  user_id?: number;
  user_subscribe_id?: number;
};

function toOptionalId(value: unknown): number | undefined {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export default function SubscribeLogPage() {
  const { t } = useTranslation("log");
  const sp = useSearch({ strict: false }) as Record<string, string | undefined>;
  const queryClient = useQueryClient();
  const rangeCache = useRef(new Map<string, Promise<EnrichedSubscribeLog[]>>());

  const today = todayInTimezone();

  const initialFilters = {
    start_date: sp.start_date || sp.date || today,
    end_date: sp.end_date || sp.date || today,
    user_id: sp.user_id ? Number(sp.user_id) : undefined,
    user_subscribe_id: sp.user_subscribe_id
      ? Number(sp.user_subscribe_id)
      : undefined,
  };

  const loadRange = async (
    filter: SubscribeLogFilters,
    force: boolean
  ): Promise<EnrichedSubscribeLog[]> => {
    const startDate = filter.start_date || today;
    const endDate = filter.end_date || startDate;
    const userId = toOptionalId(filter.user_id);
    const userSubscribeId = toOptionalId(filter.user_subscribe_id);
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
            user_subscribe_id: userSubscribeId,
          })
        )
    );
    const logs = dailyLogs.flat();
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
    const key = JSON.stringify({
      end_date: filter.end_date || filter.start_date || today,
      start_date: filter.start_date || today,
      user_id: toOptionalId(filter.user_id),
      user_subscribe_id: toOptionalId(filter.user_subscribe_id),
    });

    if (force) {
      rangeCache.current.delete(key);
    }

    const cached = rangeCache.current.get(key);
    if (cached) return cached;

    const request = loadRange(filter, force);
    request.catch(() => {
      if (rangeCache.current.get(key) === request) {
        rangeCache.current.delete(key);
      }
    });
    rangeCache.current.set(key, request);

    while (rangeCache.current.size > RANGE_CACHE_LIMIT) {
      const oldestKey = rangeCache.current.keys().next().value;
      if (oldestKey === undefined) break;
      rangeCache.current.delete(oldestKey);
    }

    return request;
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
          placeholder: t("column.subscribeId", "Subscribe ID"),
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
    />
  );
}
