import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Icon } from "@workspace/ui/composed/icon";
import type { TFunction } from "i18next";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

type ProbeState = {
  data?: {
    checkedAt: number;
    latencyMs?: number;
  };
  error: unknown;
  isFetching: boolean;
  isFetched: boolean;
};

function probeLabel(
  probe: ProbeState,
  t: TFunction,
  kind: "process" | "database"
) {
  if (!probe.isFetched) return t("healthNotChecked", "Not checked");
  if (probe.error) {
    return kind === "process"
      ? t("processUnavailable", "Backend unavailable")
      : t("databaseUnavailable", "Database unavailable");
  }
  if (probe.data?.latencyMs !== undefined && probe.data.latencyMs >= 3000) {
    return kind === "process"
      ? t("processSlow", "Backend is slow")
      : t("databaseSlow", "Database is slow");
  }
  return kind === "process"
    ? t("processHealthy", "Backend responding")
    : t("databaseHealthy", "Database responding");
}

export function ServiceHealthCard({
  database,
  onRefresh,
  process,
}: {
  database: ProbeState;
  onRefresh: () => void;
  process: ProbeState;
}) {
  const { t } = useTranslation("dashboard");
  const isChecking = database.isFetching || process.isFetching;
  const lastChecked = Math.max(
    database.data?.checkedAt || 0,
    process.data?.checkedAt || 0
  );
  const databaseLabel = probeLabel(database, t, "database");
  const processLabel = probeLabel(process, t, "process");
  const isSlow = !database.error && (database.data?.latencyMs || 0) >= 3000;
  const processIsSlow =
    !process.error && (process.data?.latencyMs || 0) >= 3000;

  return (
    <Card className="h-full">
      <CardHeader className="!flex-row flex items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" icon="uil:heartbeat" />
          {t("healthTitle", "Service Health")}
        </CardTitle>
        <Button
          disabled={isChecking}
          onClick={onRefresh}
          size="icon"
          title={t("healthRefresh", "Check now")}
          type="button"
          variant="outline"
        >
          <RefreshCw className={isChecking ? "animate-spin" : ""} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            {t("backendProcess", "Backend process")}
          </span>
          <Badge
            variant={
              process.error
                ? "destructive"
                : processIsSlow
                  ? "outline"
                  : "secondary"
            }
          >
            {processLabel}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            {t("databaseProbe", "Database probe")}
          </span>
          <Badge
            variant={
              database.error ? "destructive" : isSlow ? "outline" : "secondary"
            }
          >
            {databaseLabel}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-muted-foreground text-xs">
          <span>
            {`${t("backendResponseTime", "Backend")}: ${process.data?.latencyMs ?? "—"} ms`}
          </span>
          <span>
            {`${t("databaseResponseTime", "Database API")}: ${database.data?.latencyMs ?? "—"} ms`}
          </span>
          <span>
            {lastChecked
              ? new Date(lastChecked).toLocaleTimeString()
              : t("healthNotChecked", "Not checked")}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          {t(
            "healthDescription",
            "This checks API responsiveness. It does not read or cancel MySQL queries."
          )}
        </p>
      </CardContent>
    </Card>
  );
}
