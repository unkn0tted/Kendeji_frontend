"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import { Separator } from "@workspace/ui/components/separator";
import { formatBytes } from "@workspace/ui/utils/formatting";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import { UserSubscribeDetail } from "@/sections/user/user-detail";

export interface TrafficRankDatum {
  name: string | number;
  traffic: number;
}

export default function TrafficRankChart({
  type,
  data,
}: {
  type: "nodes" | "users";
  data: TrafficRankDatum[];
}) {
  const { t } = useTranslation("dashboard");

  return (
    <ChartContainer
      className="max-h-80"
      config={{
        traffic: {
          label: t("traffic", "Traffic"),
          color: "var(--primary)",
        },
        type: {
          label: t("type", "Type"),
          color: "var(--muted-foreground)",
        },
        label: {
          color: "var(--foreground)",
        },
      }}
    >
      <BarChart data={data} height={400} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          axisLine={false}
          tickFormatter={(value) => formatBytes(value || 0)}
          tickLine={false}
          type="number"
        />
        <YAxis
          axisLine={false}
          dataKey="name"
          interval={0}
          tickFormatter={(_value, index) => String(index + 1)}
          tickLine={false}
          tickMargin={0}
          type="category"
          width={15}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatBytes(Number(value) || 0)}
              label={true}
              labelFormatter={(label, [payload]) =>
                type === "nodes" ? (
                  `${t("nodes", "Nodes")}: ${label}`
                ) : (
                  <>
                    <div className="w-80">
                      <UserSubscribeDetail
                        enabled={true}
                        id={payload?.payload.name}
                      />
                    </div>
                    <Separator className="my-2" />
                    <div>{`${t("users", "Users")}: ${label}`}</div>
                  </>
                )
              }
            />
          }
          trigger="hover"
        />
        <Bar dataKey="traffic" fill="var(--primary)" radius={[0, 4, 4, 0]}>
          <LabelList
            className="fill-foreground"
            dataKey="name"
            fontSize={12}
            offset={8}
            position="insideLeft"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
