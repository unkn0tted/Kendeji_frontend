"use client";

import { Link, useSearch } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { ProTable } from "@workspace/ui/composed/pro-table/pro-table";
import { filterUserSubscribeTrafficLog } from "@workspace/ui/services/admin/log";
import { formatBytes } from "@workspace/ui/utils/formatting";
import { useTranslation } from "react-i18next";
import { UserDetail, UserSubscribeDetail } from "@/sections/user/user-detail";
import {
  isCompletedTrafficDate,
  latestCompletedTrafficDate,
} from "@/utils/traffic-date";

export default function SubscribeTrafficLogPage() {
  const { t } = useTranslation("log");
  const sp = useSearch({ strict: false }) as Record<string, string | undefined>;

  const latestDate = latestCompletedTrafficDate();

  const initialFilters = {
    date: isCompletedTrafficDate(sp.date) ? sp.date : latestDate,
    user_id: sp.user_id ? Number(sp.user_id) : undefined,
    user_subscribe_id: sp.user_subscribe_id
      ? Number(sp.user_subscribe_id)
      : undefined,
  };
  return (
    <ProTable<
      API.UserSubscribeTrafficLog,
      { date?: string; user_id?: number; user_subscribe_id?: number }
    >
      actions={{
        render: (row) => [
          <Button asChild key="detail">
            <Link
              search={{
                date: row.date,
                user_id: row.user_id,
                subscribe_id: row.subscribe_id,
              }}
              to="/dashboard/log/traffic-details"
            >
              {t("detail", "Detail")}
            </Link>
          </Button>,
        ],
      }}
      autoLoad={false}
      columns={[
        {
          accessorKey: "user",
          header: t("column.user", "User"),
          cell: ({ row }) => <UserDetail id={Number(row.original.user_id)} />,
        },
        {
          accessorKey: "subscribe_id",
          header: t("column.subscribe", "Subscribe"),
          cell: ({ row }) => (
            <UserSubscribeDetail
              enabled
              hoverCard
              id={Number(row.original.subscribe_id)}
            />
          ),
        },
        {
          accessorKey: "upload",
          header: t("column.upload", "Upload"),
          cell: ({ row }) => formatBytes(row.original.upload),
        },
        {
          accessorKey: "download",
          header: t("column.download", "Download"),
          cell: ({ row }) => formatBytes(row.original.download),
        },
        {
          accessorKey: "total",
          header: t("column.total", "Total"),
          cell: ({ row }) => formatBytes(row.original.total),
        },
        {
          accessorKey: "date",
          header: t("column.date", "Date"),
        },
      ]}
      header={{ title: t("title.subscribeTraffic", "Subscribe Traffic Log") }}
      initialFilters={initialFilters}
      mobileRowRender={(row) => (
        <article className="min-w-0 space-y-3 rounded-md border bg-card p-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <h3 className="min-w-0 break-words font-semibold text-base">
              {t("column.subscribe", "Subscribe")} #{row.subscribe_id}
            </h3>
            <span className="shrink-0 text-muted-foreground text-xs">
              {row.date}
            </span>
          </div>
          <dl className="grid grid-cols-[minmax(5rem,34%)_minmax(0,1fr)] gap-x-3 gap-y-2 border-t pt-3 text-sm">
            <dt className="text-muted-foreground">
              {t("column.user", "User")}
            </dt>
            <dd className="min-w-0 break-all">#{row.user_id}</dd>
            <dt className="text-muted-foreground">
              {t("column.upload", "Upload")}
            </dt>
            <dd>{formatBytes(row.upload)}</dd>
            <dt className="text-muted-foreground">
              {t("column.download", "Download")}
            </dt>
            <dd>{formatBytes(row.download)}</dd>
            <dt className="text-muted-foreground">
              {t("column.total", "Total")}
            </dt>
            <dd className="font-medium">{formatBytes(row.total)}</dd>
          </dl>
          <Button asChild size="sm" variant="outline">
            <Link
              search={{
                date: row.date,
                user_id: row.user_id,
                subscribe_id: row.subscribe_id,
              }}
              to="/dashboard/log/traffic-details"
            >
              {t("detail", "Detail")}
            </Link>
          </Button>
        </article>
      )}
      params={[
        { key: "date", type: "date", max: latestDate },
        { key: "user_id", placeholder: t("column.userId", "User ID") },
        {
          key: "user_subscribe_id",
          placeholder: t("column.subscribeId", "Subscribe ID"),
        },
      ]}
      request={async (pagination, filter) => {
        if (!isCompletedTrafficDate(filter.date)) {
          throw new Error("TRAFFIC_DATE_REQUIRED");
        }
        const { data } = await filterUserSubscribeTrafficLog(
          {
            page: pagination.page,
            size: pagination.size,
            date: filter.date,
            user_id: filter.user_id,
            user_subscribe_id: filter.user_subscribe_id,
          },
          { timeout: 10_000, skipErrorHandler: true }
        );
        const list =
          ((data?.data?.list || []) as API.UserSubscribeTrafficLog[]) || [];
        const total = Number(data?.data?.total || list.length);
        return { list, total };
      }}
      requestErrorMessage={(error) =>
        error instanceof Error && error.message === "TRAFFIC_DATE_REQUIRED"
          ? t("historicalDateRequired")
          : undefined
      }
    />
  );
}
