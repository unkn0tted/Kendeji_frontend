import { useQuery } from "@tanstack/react-query";
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
import { queryServerTotalData } from "@workspace/ui/services/admin/console";
import { getLogSetting } from "@workspace/ui/services/admin/log";
import { formatBytes } from "@workspace/ui/utils/formatting";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

function formatValue(value: number | undefined) {
  return value === undefined || value === null ? "-" : formatBytes(value);
}

export function MonthlyTrafficCard({ month }: { month: string }) {
  const { t } = useTranslation("dashboard");
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = month === currentMonth;

  const { data: logSetting } = useQuery({
    queryKey: ["getLogSetting"],
    queryFn: async () => {
      const { data } = await getLogSetting();
      return data.data;
    },
    staleTime: 60_000,
  });

  const {
    data: serverTotal,
    error,
    isFetching,
    isFetched,
    refetch,
  } = useQuery({
    queryKey: ["monthlyServerTraffic", month],
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

  const upload = isCurrentMonth ? serverTotal?.monthly_upload : undefined;
  const download = isCurrentMonth ? serverTotal?.monthly_download : undefined;
  const total =
    upload === undefined || download === undefined
      ? undefined
      : upload + download;
  const isIncomplete = Boolean(
    logSetting?.auto_clear && logSetting.clear_days < now.getDate()
  );

  return (
    <Card>
      <CardHeader className="!flex-row flex items-center justify-between gap-3">
        <CardTitle>
          {t("dailyTrafficTitle", "Monthly Traffic")} · {month}
        </CardTitle>
        <Button
          disabled={isFetching || !isCurrentMonth}
          onClick={() => refetch()}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCw className={isFetching ? "animate-spin" : ""} />
          {isFetching
            ? t("loadingDailyTraffic", "Loading")
            : t("loadMonthlyTraffic", "Load month")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>
              {t("monthlyTrafficUnavailable", "Monthly traffic unavailable")}
            </AlertTitle>
            <AlertDescription>
              {t(
                "monthlyTrafficRequestFailed",
                "The request timed out or failed. No traffic data was changed."
              )}
            </AlertDescription>
          </Alert>
        ) : isCurrentMonth ? (
          isFetched ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground text-xs">
                  {t("upload", "Upload")}
                </div>
                <div className="mt-1 font-semibold text-lg tabular-nums">
                  {formatValue(upload)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground text-xs">
                  {t("download", "Download")}
                </div>
                <div className="mt-1 font-semibold text-lg tabular-nums">
                  {formatValue(download)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground text-xs">
                  {t("total", "Total")}
                </div>
                <div className="mt-1 font-semibold text-lg tabular-nums">
                  {formatValue(total)}
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTitle>
                {t("monthlyTrafficNotLoaded", "Monthly traffic not loaded")}
              </AlertTitle>
              <AlertDescription>
                {t(
                  "monthlyTrafficManualDescription",
                  "Load this summary only when needed. It is not refreshed automatically."
                )}
              </AlertDescription>
            </Alert>
          )
        ) : (
          <Alert>
            <AlertTitle>
              {t(
                "historicalTrafficUnavailable",
                "Historical month unavailable"
              )}
            </AlertTitle>
            <AlertDescription>
              {t(
                "historicalTrafficDescription",
                "This backend endpoint only exposes the current month summary. The frontend will not label it as historical data."
              )}
            </AlertDescription>
          </Alert>
        )}
        {isCurrentMonth && isIncomplete && !error ? (
          <p className="text-muted-foreground text-xs">
            {t(
              "trafficRetentionWarning",
              "Only the latest {{days}} days are retained, so this month total may be incomplete.",
              { days: logSetting?.clear_days }
            )}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
