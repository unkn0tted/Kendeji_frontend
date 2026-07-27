"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
// (Select imports removed)
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import Empty from "@workspace/ui/composed/empty";
import { Icon } from "@workspace/ui/composed/icon";
import {
  queryServerTotalData,
  queryTicketWaitReply,
} from "@workspace/ui/services/admin/console";
import { getLogSetting } from "@workspace/ui/services/admin/log";
import { formatBytes } from "@workspace/ui/utils/formatting";
import { lazy, memo, Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RevenueStatisticsCard } from "./revenue-statistics-card";
import SystemVersionCard from "./system-version-card";
import type { TrafficRankDatum } from "./traffic-rank-chart";
import { UserStatisticsCard } from "./user-statistics-card";

// Chart rendering is split into a lazy leaf so recharts stays out of the
// dashboard landing chunk; stat numbers/headers paint first.
const TrafficRankChart = lazy(() => import("./traffic-rank-chart"));

const TrafficRankCard = memo(function TrafficRankCard({
  type,
  data,
}: {
  type: "nodes" | "users";
  data: { today: TrafficRankDatum[]; yesterday: TrafficRankDatum[] };
}) {
  const { t } = useTranslation("dashboard");
  const [timeFrame, setTimeFrame] = useState<"today" | "yesterday">("today");
  const currentData = data[timeFrame];

  return (
    <Card>
      <CardHeader className="!flex-row flex items-center justify-between">
        <CardTitle>
          {type === "nodes"
            ? t("nodeTraffic", "Node Traffic")
            : t("userTraffic", "User Traffic")}
        </CardTitle>
        <Tabs
          onValueChange={(value) =>
            setTimeFrame(value as "today" | "yesterday")
          }
          value={timeFrame}
        >
          <TabsList>
            <TabsTrigger value="today">{t("today", "Today")}</TabsTrigger>
            <TabsTrigger value="yesterday">
              {t("yesterday", "Yesterday")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="h-80">
        {currentData.length > 0 ? (
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <TrafficRankChart data={currentData} type={type} />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Empty />
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default function Statistics() {
  const { t } = useTranslation("dashboard");

  const { data: TicketTotal } = useQuery({
    queryKey: ["queryTicketWaitReply"],
    queryFn: async () => {
      const { data } = await queryTicketWaitReply();
      return data.data?.count;
    },
  });
  const { data: ServerTotal } = useQuery({
    queryKey: ["queryServerTotalData"],
    queryFn: async () => {
      const { data } = await queryServerTotalData();
      return data.data;
    },
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });

  const today = new Date();
  const todayDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  const currentMonth = todayDate.slice(0, 7);
  const { data: logSetting } = useQuery({
    queryKey: ["getLogSetting"],
    queryFn: async () => {
      const { data } = await getLogSetting();
      return data.data;
    },
    staleTime: 60_000,
  });
  const isMonthlyDataIncomplete = Boolean(
    logSetting?.auto_clear && logSetting.clear_days < today.getDate()
  );

  const trafficData = useMemo(
    () => ({
      nodes: {
        today:
          ServerTotal?.server_traffic_ranking_today?.map((item) => ({
            name: item.name,
            traffic: item.download + item.upload,
          })) || [],
        yesterday:
          ServerTotal?.server_traffic_ranking_yesterday?.map((item) => ({
            name: item.name,
            traffic: item.download + item.upload,
          })) || [],
      },
      users: {
        today:
          ServerTotal?.user_traffic_ranking_today?.map((item) => ({
            name: item.sid,
            traffic: item.download + item.upload,
          })) || [],
        yesterday:
          ServerTotal?.user_traffic_ranking_yesterday?.map((item) => ({
            name: item.sid,
            traffic: item.download + item.upload,
          })) || [],
      },
    }),
    [ServerTotal]
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: t("onlineUsersCount", "Online Users"),
            value: ServerTotal?.online_users || 0,
            subtitle: t("currentlyOnline", "Currently Online"),
            icon: "uil:users-alt",
            href: "/dashboard/servers",
            chip: "bg-primary/10 text-primary",
          },

          {
            title: t("todayTraffic", "Today Traffic"),
            value: formatBytes(
              (ServerTotal?.today_upload || 0) +
                (ServerTotal?.today_download || 0)
            ),
            subtitle: `↑${formatBytes(ServerTotal?.today_upload || 0)} ↓${formatBytes(ServerTotal?.today_download || 0)}`,
            icon: "uil:exchange-alt",
            href: "/dashboard/log/server-traffic",
            search: { date: todayDate },
            chip: "bg-chart-2/10 text-chart-2",
          },
          {
            title: isMonthlyDataIncomplete
              ? t("retainedTraffic", "Available Traffic")
              : t("monthTraffic", "Month Traffic"),
            value: formatBytes(
              (ServerTotal?.monthly_upload || 0) +
                (ServerTotal?.monthly_download || 0)
            ),
            subtitle: isMonthlyDataIncomplete
              ? t(
                  "retainedDays",
                  "Only the latest {{days}} days are retained",
                  {
                    days: logSetting?.clear_days,
                  }
                )
              : `↑${formatBytes(ServerTotal?.monthly_upload || 0)} ↓${formatBytes(ServerTotal?.monthly_download || 0)}`,
            icon: "uil:cloud-data-connection",
            href: "/dashboard/log/server-traffic",
            search: { month: currentMonth },
            chip: "bg-chart-3/10 text-chart-3",
          },
          {
            title: t("totalServers", "Total Servers"),
            value:
              (ServerTotal?.online_servers || 0) +
              (ServerTotal?.offline_servers || 0),
            subtitle: `${t("online", "Online")} ${ServerTotal?.online_servers || 0} ${t("offline", "Offline")} ${ServerTotal?.offline_servers || 0}`,
            icon: "uil:server-network",
            href: "/dashboard/servers",
            chip: "bg-chart-4/10 text-chart-4",
          },
          {
            title: t("pendingTickets", "Pending Tickets"),
            value: TicketTotal || 0,
            subtitle: t("pending", "Pending"),
            icon: "uil:clipboard-notes",
            href: "/dashboard/ticket",
            chip: "bg-chart-5/10 text-chart-5",
          },
        ].map((item) => (
          <Link
            className={item.href ? "h-full" : "pointer-events-none h-full"}
            key={item.title}
            search={item.search}
            to={item.href || "#"}
          >
            <div
              className={`rose-surface-interactive group h-full rounded-xl p-6 ${item.href ? "cursor-pointer" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="mb-2 font-medium text-muted-foreground text-sm">
                    {item.title}
                  </p>
                  <div className="mb-1 font-bold text-2xl tabular-nums">
                    {item.value}
                  </div>
                  <div className="h-4 text-muted-foreground text-xs">
                    {item.subtitle}
                  </div>
                </div>
                <div
                  className={`rounded-full p-3 ${item.chip} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="h-6 w-6" icon={item.icon} />
                </div>
              </div>
            </div>
          </Link>
        ))}
        <SystemVersionCard />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-2">
        <RevenueStatisticsCard />
        <UserStatisticsCard />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TrafficRankCard data={trafficData.nodes} type="nodes" />
        <TrafficRankCard data={trafficData.users} type="users" />
      </div>
    </>
  );
}
