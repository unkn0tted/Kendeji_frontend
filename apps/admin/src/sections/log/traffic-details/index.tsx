"use client";

import { useSearch } from "@tanstack/react-router";
import { ProTable } from "@workspace/ui/composed/pro-table/pro-table";
import { filterTrafficLogDetails } from "@workspace/ui/services/admin/log";
import { formatBytes } from "@workspace/ui/utils/formatting";
import { useTranslation } from "react-i18next";
import { UserDetail, UserSubscribeDetail } from "@/sections/user/user-detail";
import { useServer } from "@/stores/server";
import { formatDate } from "@/utils/common";
import {
  isCompletedTrafficDate,
  latestCompletedTrafficDate,
} from "@/utils/traffic-date";

export default function TrafficDetailsPage() {
  const { t } = useTranslation("log");
  const sp = useSearch({ strict: false }) as Record<string, string | undefined>;
  const { getServerName } = useServer();

  const latestDate = latestCompletedTrafficDate();

  const initialFilters = {
    date: isCompletedTrafficDate(sp.date) ? sp.date : latestDate,
    server_id: sp.server_id ? Number(sp.server_id) : undefined,
    user_id: sp.user_id ? Number(sp.user_id) : undefined,
    subscribe_id: sp.subscribe_id ? Number(sp.subscribe_id) : undefined,
  };
  return (
    <ProTable<
      API.TrafficLogDetails,
      {
        date?: string;
        server_id?: string | number;
        user_id?: string | number;
        subscribe_id?: string | number;
      }
    >
      autoLoad={false}
      columns={[
        {
          accessorKey: "server_id",
          header: t("column.server", "Server"),
          cell: ({ row }) => (
            <span>
              {getServerName(row.original.server_id)} ({row.original.server_id})
            </span>
          ),
        },
        {
          accessorKey: "user_id",
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
          accessorKey: "timestamp",
          header: t("column.time", "Time"),
          cell: ({ row }) => formatDate(row.original.timestamp),
        },
      ]}
      header={{ title: t("title.trafficDetails", "Traffic Details") }}
      initialFilters={initialFilters}
      params={[
        { key: "date", type: "date", max: latestDate },
        { key: "server_id", placeholder: t("column.serverId", "Server ID") },
        { key: "user_id", placeholder: t("column.userId", "User ID") },
        {
          key: "subscribe_id",
          placeholder: t("column.subscribeId", "Subscribe ID"),
        },
      ]}
      request={async (pagination, filter) => {
        if (!isCompletedTrafficDate(filter.date)) {
          throw new Error("TRAFFIC_DATE_REQUIRED");
        }
        const serverId = Number(filter.server_id || 0);
        const userId = Number(filter.user_id || 0);
        const subscribeId = Number(filter.subscribe_id || 0);
        if (
          ![serverId, userId, subscribeId].some(
            (id) => Number.isSafeInteger(id) && id > 0
          )
        ) {
          throw new Error("TRAFFIC_SCOPE_REQUIRED");
        }
        const { data } = await filterTrafficLogDetails(
          {
            page: pagination.page,
            size: pagination.size,
            date: filter.date,
            server_id: serverId || undefined,
            user_id: userId || undefined,
            subscribe_id: subscribeId || undefined,
          },
          { timeout: 10_000, skipErrorHandler: true }
        );
        const list = (data?.data?.list || []) as any[];
        const total = Number(data?.data?.total || list.length);
        return { list, total };
      }}
      requestErrorMessage={(error) => {
        if (!(error instanceof Error)) return;
        if (error.message === "TRAFFIC_DATE_REQUIRED") {
          return t("historicalDateRequired");
        }
        if (error.message === "TRAFFIC_SCOPE_REQUIRED") {
          return t("trafficScopeRequired");
        }
      }}
    />
  );
}
