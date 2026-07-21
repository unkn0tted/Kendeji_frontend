import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { getLogSetting } from "@workspace/ui/services/admin/log";
import { useTranslation } from "react-i18next";

export function MonthlyTrafficCard({ month }: { month: string }) {
  const { t } = useTranslation("dashboard");
  const { data: logSetting } = useQuery({
    queryKey: ["getLogSetting"],
    queryFn: async () => {
      const { data } = await getLogSetting();
      return data.data;
    },
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("dailyTrafficTitle", "Daily Traffic")} · {month}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertTitle>
            {t(
              "monthlyTrafficUnavailable",
              "Complete monthly data unavailable"
            )}
          </AlertTitle>
          <AlertDescription>
            {logSetting?.auto_clear
              ? t(
                  "trafficRetentionWarning",
                  "Traffic logs are retained for only {{days}} days. Earlier daily data has already been removed, so a complete monthly chart cannot be generated.",
                  { days: logSetting.clear_days }
                )
              : t(
                  "trafficHistoryApiWarning",
                  "The current server traffic history API does not correctly apply its date filter. The monthly chart is disabled to prevent excessive database load and misleading results."
                )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
