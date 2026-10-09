"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import Empty from "@workspace/ui/composed/empty";
import { queryRevenueStatistics } from "@workspace/ui/services/admin/console";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Display } from "@/components/display";

// Chart rendering is split into a lazy leaf so recharts stays out of the
// dashboard landing chunk; stat numbers/headers paint first.
const RevenueChart = lazy(() => import("./revenue-chart"));

export function RevenueStatisticsCard() {
  const { t, i18n } = useTranslation("dashboard");
  const locale = i18n.language;

  const IncomeStatisticsConfig = {
    new_purchase: {
      label: t("newPurchase", "New Purchase"),
      color: "var(--color-chart-1)",
    },
    repurchase: {
      label: t("repurchase", "Repurchase"),
      color: "var(--color-chart-2)",
    },
    total: {
      label: t("totalIncome", "Total Income"),
      color: "var(--color-chart-3)",
    },
  };

  const { data: RevenueStatistics } = useQuery({
    queryKey: ["queryRevenueStatistics"],
    queryFn: async () => {
      const { data } = await queryRevenueStatistics({
        timeout: 10_000,
        skipErrorHandler: true,
      });
      return data.data;
    },
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 60_000,
  });

  return (
    <Tabs defaultValue="today">
      <Card className="h-full min-w-0 pb-0">
        <CardHeader className="!flex-col sm:!flex-row flex items-start justify-between gap-3 sm:items-center">
          <CardTitle>{t("revenueTitle", "Revenue Statistics")}</CardTitle>
          <TabsList className="grid w-full grid-cols-3 sm:flex sm:w-auto">
            <TabsTrigger value="today">{t("today", "Today")}</TabsTrigger>
            <TabsTrigger value="month">{t("month", "Month")}</TabsTrigger>
            <TabsTrigger value="total">{t("total", "Total")}</TabsTrigger>
          </TabsList>
        </CardHeader>
        <TabsContent className="h-full" value="today">
          <CardContent className="h-60 min-w-0 sm:h-80">
            {RevenueStatistics?.today.new_order_amount ||
            RevenueStatistics?.today.renewal_order_amount ? (
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <RevenueChart
                  config={IncomeStatisticsConfig}
                  data={RevenueStatistics?.today}
                  locale={locale}
                  variant="today"
                />
              </Suspense>
            ) : (
              <div className="flex h-full items-center justify-center">
                <Empty />
              </div>
            )}
          </CardContent>
          <CardFooter className="!py-5 flex flex-row border-t sm:h-20">
            <div className="grid w-full gap-3 sm:flex sm:items-center sm:gap-2">
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {t("totalIncome", "Total Income")}
                </div>
                <div className="break-all font-bold text-lg tabular-nums leading-tight sm:text-xl">
                  <Display
                    type="currency"
                    value={RevenueStatistics?.today.amount_total}
                  />
                </div>
              </div>
              <Separator
                className="!h-10 mx-2 hidden w-px sm:block"
                orientation="vertical"
              />
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {IncomeStatisticsConfig.new_purchase.label}
                </div>
                <div className="break-all font-bold text-lg tabular-nums leading-tight sm:text-xl">
                  <Display
                    type="currency"
                    value={RevenueStatistics?.today.new_order_amount}
                  />
                </div>
              </div>
              <Separator
                className="!h-10 mx-2 hidden w-px sm:block"
                orientation="vertical"
              />
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {IncomeStatisticsConfig.repurchase.label}
                </div>
                <div className="break-all font-bold text-lg tabular-nums leading-tight sm:text-xl">
                  <Display
                    type="currency"
                    value={RevenueStatistics?.today.renewal_order_amount}
                  />
                </div>
              </div>
            </div>
          </CardFooter>
        </TabsContent>

        <TabsContent className="h-full" value="month">
          <CardContent className="h-60 min-w-0 sm:h-80">
            {RevenueStatistics?.monthly.list &&
            RevenueStatistics?.monthly.list.length > 0 ? (
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <RevenueChart
                  config={IncomeStatisticsConfig}
                  data={RevenueStatistics?.monthly}
                  locale={locale}
                  variant="month"
                />
              </Suspense>
            ) : (
              <div className="flex h-full items-center justify-center">
                <Empty />
              </div>
            )}
          </CardContent>
          <CardFooter className="!py-5 flex flex-row border-t sm:h-20">
            <div className="grid w-full gap-3 sm:flex sm:items-center sm:gap-2">
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {t("totalIncome", "Total Income")}
                </div>
                <div className="break-all font-bold text-lg tabular-nums leading-tight sm:text-xl">
                  <Display
                    type="currency"
                    value={RevenueStatistics?.monthly.amount_total}
                  />
                </div>
              </div>
              <Separator
                className="!h-10 mx-2 hidden w-px sm:block"
                orientation="vertical"
              />
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {IncomeStatisticsConfig.new_purchase.label}
                </div>
                <div className="break-all font-bold text-lg tabular-nums leading-tight sm:text-xl">
                  <Display
                    type="currency"
                    value={RevenueStatistics?.monthly.new_order_amount}
                  />
                </div>
              </div>
              <Separator
                className="!h-10 mx-2 hidden w-px sm:block"
                orientation="vertical"
              />
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {IncomeStatisticsConfig.repurchase.label}
                </div>
                <div className="break-all font-bold text-lg tabular-nums leading-tight sm:text-xl">
                  <Display
                    type="currency"
                    value={RevenueStatistics?.monthly.renewal_order_amount}
                  />
                </div>
              </div>
            </div>
          </CardFooter>
        </TabsContent>

        <TabsContent className="h-full" value="total">
          <CardContent className="h-60 min-w-0 sm:h-80">
            {RevenueStatistics?.all.list &&
            RevenueStatistics?.all.list.length > 0 ? (
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <RevenueChart
                  config={IncomeStatisticsConfig}
                  data={RevenueStatistics?.all}
                  locale={locale}
                  variant="total"
                />
              </Suspense>
            ) : (
              <div className="flex h-full items-center justify-center">
                <Empty />
              </div>
            )}
          </CardContent>
          <CardFooter className="!py-5 flex flex-row border-t sm:h-20">
            <div className="grid w-full gap-3 sm:flex sm:items-center sm:gap-2">
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {t("totalIncome", "Total Income")}
                </div>
                <div className="break-all font-bold text-lg tabular-nums leading-tight sm:text-xl">
                  <Display
                    type="currency"
                    value={RevenueStatistics?.all.amount_total}
                  />
                </div>
              </div>
            </div>
          </CardFooter>
        </TabsContent>
      </Card>
    </Tabs>
  );
}
