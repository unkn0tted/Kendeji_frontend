"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
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
import { RefreshCw } from "lucide-react";
import { lazy, memo, Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RevenueStatisticsCard } from "./revenue-statistics-card";
import SystemVersionCard from "./system-version-card";
import type { TrafficRankDatum } from "./traffic-rank-chart";
import { UserStatisticsCard } from "./user-statistics-card";

// Chart rendering is split into a lazy leaf so recharts stays out of the
// dashboard landing chunk; stat numbers/headers paint first.
const TrafficRankChart = lazy(() => import("./traffic-rank-chart"));

function formatOptionalBytes(value: number | undefined) {
  return value === undefined || value === null ? "-" : formatBytes(value);
}

function formatOptionalNumber(value: number | undefined) {
  return value === undefined || value === null ? "-" : value;
}

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

  const {
    data: TicketTotal,
    error: ticketError,
    isFetched: hasFetchedTickets,
  } = useQuery({
    queryKey: ["queryTicketWaitReply"],
    queryFn: async () => {
      const { data } = await queryTicketWaitReply();
      return data.data?.count;
    },
  });
  const {
    data: ServerTotal,
    error: serverStatsError,
    isFetching: isLoadingServerStats,
    isFetched: hasFetchedServerStats,
    refetch: refetchServerStats,
  } = useQuery({
    queryKey: ["queryServerTotalData"],
    queryFn: async () => {
      const { data } = await queryServerTotalData({
        timeout: 10_000,
        skipErrorHandler: true,
      });
      return data.data;
    },
    enabled: false,
    retry: false,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
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
      <Alert className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <AlertTitle>
            {serverStatsError
              ? t("serverStatsUnavailable", "Server statistics unavailable")
              : hasFetchedServerStats
                ? t("serverStatsLoaded", "Server statistics loaded")
                : t(
                    "serverStatsManual",
                    "Server statistics are loaded on demand"
                  )}
          </AlertTitle>
          <AlertDescription>
            {serverStatsError
              ? t(
                  "serverStatsUnavailableDescription",
                  "The heavy traffic query timed out or failed. Other admin functions remain available."
                )
              : t(
                  "serverStatsManualDescription",
                  "Traffic rankings and online counts are not refreshed in the background to protect the database."
                )}
          </AlertDescription>
        </div>
        <Button
          disabled={isLoadingServerStats}
          onClick={() => refetchServerStats()}
          type="button"
          variant="outline"
        >
          <RefreshCw className={isLoadingServerStats ? "animate-spin" : ""} />
          {isLoadingServerStats
            ? t("loadingServerStats", "Loading")
            : t("loadServerStats", "Load statistics")}
        </Button>
      </Alert>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: t("onlineUsersCount", "Online Users"),
            value: formatOptionalNumber(ServerTotal?.online_users),
            subtitle: t("currentlyOnline", "Currently Online"),
            icon: "uil:users-alt",
            href: "/dashboard/servers",
            chip: "bg-primary/10 text-primary",
          },

          {
            title: t("todayTraffic", "Today Traffic"),
            value: formatOptionalBytes(
              ServerTotal
                ? ServerTotal.today_upload + ServerTotal.today_download
                : undefined
            ),
            subtitle: ServerTotal
              ? `Up ${formatBytes(ServerTotal.today_upload)} / Down ${formatBytes(ServerTotal.today_download)}`
              : t("notLoaded", "Not loaded"),
            icon: "uil:exchange-alt",
            href: "/dashboard/log/server-traffic",
            search: { date: todayDate },
            chip: "bg-chart-2/10 text-chart-2",
          },
          {
            title: isMonthlyDataIncomplete
              ? t("retainedTraffic", "Available Traffic")
              : t("monthTraffic", "Month Traffic"),
            value: formatOptionalBytes(
              ServerTotal
                ? ServerTotal.monthly_upload + ServerTotal.monthly_download
                : undefined
            ),
            subtitle: isMonthlyDataIncomplete
              ? t(
                  "retainedDays",
                  "Only the latest {{days}} days are retained",
                  {
                    days: logSetting?.clear_days,
                  }
                )
              : ServerTotal
                ? `Up ${formatBytes(ServerTotal.monthly_upload)} / Down ${formatBytes(ServerTotal.monthly_download)}`
                : t("notLoaded", "Not loaded"),
            icon: "uil:cloud-data-connection",
            href: "/dashboard/log/server-traffic",
            search: { month: currentMonth },
            chip: "bg-chart-3/10 text-chart-3",
          },
          {
            title: t("totalServers", "Total Servers"),
            value: formatOptionalNumber(
              ServerTotal
                ? ServerTotal.online_servers + ServerTotal.offline_servers
                : undefined
            ),
            subtitle: ServerTotal
              ? `${t("online", "Online")} ${ServerTotal.online_servers} ${t("offline", "Offline")} ${ServerTotal.offline_servers}`
              : t("notLoaded", "Not loaded"),
            icon: "uil:server-network",
            href: "/dashboard/servers",
            chip: "bg-chart-4/10 text-chart-4",
          },
          {
            title: t("pendingTickets", "Pending Tickets"),
            value: ticketError || !hasFetchedTickets ? "-" : TicketTotal || 0,
            subtitle: ticketError
              ? t("unavailable", "Unavailable")
              : t("pending", "Pending"),
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
