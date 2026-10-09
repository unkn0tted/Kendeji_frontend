"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Icon } from "@workspace/ui/composed/icon";
import { queryTicketWaitReply } from "@workspace/ui/services/admin/console";
import { getVersion } from "@workspace/ui/services/admin/tool";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useServer } from "@/stores/server";
import { summarizeServerPresence } from "@/utils/server-presence";
import { RevenueStatisticsCard } from "./revenue-statistics-card";
import { ServiceHealthCard } from "./service-health-card";
import { UserStatisticsCard } from "./user-statistics-card";

function SummaryCard({
  description,
  href,
  icon,
  title,
  value,
}: {
  description: string;
  href: string;
  icon: string;
  title: string;
  value: number | string;
}) {
  return (
    <Link className="h-full" to={href}>
      <div className="rose-surface-interactive group h-full cursor-pointer rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="mb-2 font-medium text-muted-foreground text-sm">
              {title}
            </p>
            <div className="mb-1 font-bold text-2xl tabular-nums">{value}</div>
            <div className="h-4 text-muted-foreground text-xs">
              {description}
            </div>
          </div>
          <div className="rounded-full bg-primary/10 p-3 text-primary transition-transform duration-300 group-hover:scale-110">
            <Icon className="h-6 w-6" icon={icon} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Statistics() {
  const { t } = useTranslation("dashboard");
  const {
    error: serversError,
    loaded: serversLoaded,
    loading: serversLoading,
    servers,
  } = useServer();
  const ticketProbe = useQuery({
    queryKey: ["dashboardTicketProbe"],
    queryFn: async () => {
      const startedAt = performance.now();
      const { data } = await queryTicketWaitReply({
        skipErrorHandler: true,
        timeout: 5000,
      });
      return {
        checkedAt: Date.now(),
        count: data.data?.count || 0,
        latencyMs: Math.round(performance.now() - startedAt),
      };
    },
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 60_000,
  });
  const processProbe = useQuery({
    queryKey: ["dashboardProcessProbe"],
    queryFn: async () => {
      const startedAt = performance.now();
      await getVersion({ skipErrorHandler: true, timeout: 5000 });
      return {
        checkedAt: Date.now(),
        latencyMs: Math.round(performance.now() - startedAt),
      };
    },
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 60_000,
  });

  const onlineSummary = useMemo(
    () => summarizeServerPresence(servers),
    [servers]
  );

  const refreshHealth = async () => {
    await Promise.all([ticketProbe.refetch(), processProbe.refetch()]);
  };
  const ticketTotal = ticketProbe.data?.count;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          description={
            serversLoading
              ? t("loading", "Loading")
              : t(
                  "onlineUsersReported",
                  "Reported by nodes; may lag up to 5 minutes"
                )
          }
          href="/dashboard/servers"
          icon="uil:users-alt"
          title={t("onlineUsersCount", "Online Users")}
          value={
            serversLoaded && !serversError ? onlineSummary.onlineUsers : "—"
          }
        />
        <SummaryCard
          description={t("nodesReported", "Based on recent node reports")}
          href="/dashboard/servers"
          icon="uil:server-network"
          title={t("onlineNodesCount", "Online Nodes")}
          value={
            serversLoaded && !serversError ? onlineSummary.onlineNodes : "—"
          }
        />
        <Link className="h-full" to="/dashboard/ticket">
          <div className="rose-surface-interactive group h-full cursor-pointer rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="mb-2 font-medium text-muted-foreground text-sm">
                  {t("pendingTickets", "Pending Tickets")}
                </p>
                <div className="mb-1 font-bold text-2xl tabular-nums">
                  {ticketProbe.error || !ticketProbe.isFetched
                    ? "—"
                    : ticketTotal}
                </div>
                <div className="h-4 text-muted-foreground text-xs">
                  {ticketProbe.error
                    ? t("unavailable", "Unavailable")
                    : t("pending", "Pending")}
                </div>
              </div>
              <div className="rounded-full bg-chart-5/10 p-3 text-chart-5 transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-6 w-6" icon="uil:clipboard-notes" />
              </div>
            </div>
          </div>
        </Link>
        <ServiceHealthCard
          database={ticketProbe}
          onRefresh={refreshHealth}
          process={processProbe}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <RevenueStatisticsCard />
        <UserStatisticsCard />
      </div>
    </>
  );
}
