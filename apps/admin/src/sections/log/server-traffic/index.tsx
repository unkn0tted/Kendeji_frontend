"use client";

import { Link, useSearch } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ProTable } from "@workspace/ui/composed/pro-table/pro-table";
import { filterServerTrafficLog } from "@workspace/ui/services/admin/log";
import { formatBytes } from "@workspace/ui/utils/formatting";
import { useTranslation } from "react-i18next";
import { useServer } from "@/stores/server";
import {
  isCompletedTrafficDate,
  latestCompletedTrafficDate,
} from "@/utils/traffic-date";

export default function ServerTrafficLogPage() {
  const { t } = useTranslation("log");
  const sp = useSearch({ strict: false }) as Record<string, string | undefined>;
  const { getServerName } = useServer();

  const latestDate = latestCompletedTrafficDate();

  const initialFilters = {
    date: isCompletedTrafficDate(sp.date) ? sp.date : latestDate,
    server_id: sp.server_id ? Number(sp.server_id) : undefined,
  };
  return (
    <div className="space-y-4">
      <ProTable<API.ServerTrafficLog, { date?: string; server_id?: number }>
        actions={{
          render: (row) => [
            <Button asChild key="detail">
              <Link
                search={{ date: row.date, server_id: row.server_id }}
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
            accessorKey: "server_id",
            header: t("column.server", "Server"),
            cell: ({ row }) => (
              <div className="flex items-center gap-2">
                <Badge>{row.original.server_id}</Badge>
                <span>{getServerName(row.original.server_id)}</span>
              </div>
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
          { accessorKey: "date", header: t("column.date", "Date") },
        ]}
        header={{ title: t("title.serverTraffic", "Server Traffic Log") }}
        initialFilters={initialFilters}
        mobileRowRender={(row) => (
          <article className="min-w-0 space-y-3 rounded-md border bg-card p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <h3 className="min-w-0 break-words font-semibold text-base">
                {getServerName(row.server_id) || `#${row.server_id}`}
              </h3>
              <span className="shrink-0 text-muted-foreground text-xs">
                {row.date}
              </span>
            </div>
            <dl className="grid grid-cols-[minmax(5rem,34%)_minmax(0,1fr)] gap-x-3 gap-y-2 border-t pt-3 text-sm">
              <dt className="text-muted-foreground">
                {t("column.server", "Server")}
              </dt>
              <dd>#{row.server_id}</dd>
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
                search={{ date: row.date, server_id: row.server_id }}
                to="/dashboard/log/traffic-details"
              >
                {t("detail", "Detail")}
              </Link>
            </Button>
          </article>
        )}
        params={[
          { key: "date", type: "date", max: latestDate },
          { key: "server_id", placeholder: t("column.serverId", "Server ID") },
        ]}
        request={async (pagination, filter) => {
          if (!isCompletedTrafficDate(filter.date)) {
            throw new Error("TRAFFIC_DATE_REQUIRED");
          }
          const { data } = await filterServerTrafficLog(
            {
              page: pagination.page,
              size: pagination.size,
              date: filter.date,
              server_id: filter.server_id,
            },
            {
              timeout: 10_000,
              skipErrorHandler: true,
            }
          );
          const list = (data?.data?.list || []) as any[];
          const total = Number(data?.data?.total || list.length);
          return { list, total };
        }}
        requestErrorMessage={(error) =>
          error instanceof Error && error.message === "TRAFFIC_DATE_REQUIRED"
            ? t("historicalDateRequired")
            : undefined
        }
      />
    </div>
  );
}
