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
import { queryUserStatistics } from "@workspace/ui/services/admin/console";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

// Chart rendering is split into a lazy leaf so recharts stays out of the
// dashboard landing chunk; stat numbers/headers paint first.
const UserGrowthChart = lazy(() => import("./user-growth-chart"));

export function UserStatisticsCard() {
  const { t, i18n } = useTranslation("dashboard");
  const locale = i18n.language;

  const UserStatisticsConfig = {
    register: {
      label: t("register", "Register"),
      color: "var(--color-chart-1)",
    },
    new_purchase: {
      label: t("newPurchase", "New Purchase"),
      color: "var(--color-chart-2)",
    },
    repurchase: {
      label: t("repurchase", "Repurchase"),
      color: "var(--color-chart-3)",
    },
  };

  const { data: UserStatistics } = useQuery({
    queryKey: ["queryUserStatistics"],
    queryFn: async () => {
      const { data } = await queryUserStatistics();
      return data.data;
    },
  });

  return (
    <Tabs defaultValue="today">
      <Card className="h-full pb-0">
        <CardHeader className="!flex-row flex items-center justify-between">
          <CardTitle>{t("userTitle", "User Statistics")}</CardTitle>
          <TabsList>
            <TabsTrigger value="today">{t("today", "Today")}</TabsTrigger>
            <TabsTrigger value="month">{t("month", "Month")}</TabsTrigger>
            <TabsTrigger value="total">{t("total", "Total")}</TabsTrigger>
          </TabsList>
        </CardHeader>

        <TabsContent className="h-full" value="today">
          <CardContent className="h-80">
            {UserStatistics?.today.register ||
            UserStatistics?.today.new_order_users ||
            UserStatistics?.today.renewal_order_users ? (
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <UserGrowthChart
                  config={UserStatisticsConfig}
                  data={UserStatistics?.today}
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
          <CardFooter className="!py-5 flex flex-row border-t">
            <div className="flex w-full items-center gap-2">
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {UserStatisticsConfig.register.label}
                </div>
                <div className="font-bold text-xl tabular-nums leading-none">
                  {UserStatistics?.today.register}
                </div>
              </div>
              <Separator className="!h-10 mx-2 w-px" orientation="vertical" />
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {UserStatisticsConfig.new_purchase.label}
                </div>
                <div className="font-bold text-xl tabular-nums leading-none">
                  {UserStatistics?.today.new_order_users}
                </div>
              </div>
              <Separator className="!h-10 mx-2 w-px" orientation="vertical" />
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {UserStatisticsConfig.repurchase.label}
                </div>
                <div className="font-bold text-xl tabular-nums leading-none">
                  {UserStatistics?.today.renewal_order_users}
                </div>
              </div>
            </div>
          </CardFooter>
        </TabsContent>

        <TabsContent className="h-full" value="month">
          <CardContent className="h-80">
            {UserStatistics?.monthly.list &&
            UserStatistics?.monthly.list.length > 0 ? (
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <UserGrowthChart
                  config={UserStatisticsConfig}
                  data={UserStatistics?.monthly}
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
          <CardFooter className="!py-5 flex flex-row border-t">
            <div className="flex w-full items-center gap-2">
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {UserStatisticsConfig.register.label}
                </div>
                <div className="font-bold text-xl tabular-nums leading-none">
                  {UserStatistics?.monthly.register}
                </div>
              </div>
              <Separator className="!h-10 mx-2 w-px" orientation="vertical" />
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {UserStatisticsConfig.new_purchase.label}
                </div>
                <div className="font-bold text-xl tabular-nums leading-none">
                  {UserStatistics?.monthly.new_order_users}
                </div>
              </div>
              <Separator className="!h-10 mx-2 w-px" orientation="vertical" />
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {UserStatisticsConfig.repurchase.label}
                </div>
                <div className="font-bold text-xl tabular-nums leading-none">
                  {UserStatistics?.monthly.renewal_order_users}
                </div>
              </div>
            </div>
          </CardFooter>
        </TabsContent>

        <TabsContent className="h-full" value="total">
          <CardContent className="h-80">
            {UserStatistics?.all.list && UserStatistics?.all.list.length > 0 ? (
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <UserGrowthChart
                  config={UserStatisticsConfig}
                  data={UserStatistics?.all}
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
          <CardFooter className="!py-5 flex flex-row border-t">
            <div className="flex w-full items-center gap-2">
              <div className="grid flex-1 auto-rows-min gap-0.5">
                <div className="text-muted-foreground text-xs">
                  {UserStatisticsConfig.register.label}
                </div>
                <div className="font-bold text-xl tabular-nums leading-none">
                  {UserStatistics?.all.register}
                </div>
              </div>
            </div>
          </CardFooter>
        </TabsContent>
      </Card>
    </Tabs>
  );
}
