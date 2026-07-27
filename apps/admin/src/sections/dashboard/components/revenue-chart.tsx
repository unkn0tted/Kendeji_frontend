"use client";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import { unitConversion } from "@workspace/ui/utils/unit-conversions";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Pie,
  PieChart,
  XAxis,
} from "recharts";

export type RevenueChartConfig = {
  new_purchase: { label: string; color: string };
  repurchase: { label: string; color: string };
  total: { label: string; color: string };
};

export default function RevenueChart({
  variant,
  data,
  config,
  locale,
}: {
  variant: "today" | "month" | "total";
  data?: API.OrdersStatistics;
  config: RevenueChartConfig;
  locale: string;
}) {
  const { t } = useTranslation("dashboard");

  if (variant === "today") {
    return (
      <ChartContainer className="mx-auto max-h-80" config={config}>
        <PieChart>
          <ChartLegend content={<ChartLegendContent />} />
          <ChartTooltip
            content={<ChartTooltipContent hideLabel />}
            cursor={false}
          />
          <Pie
            data={[
              {
                type: "new_purchase",
                value: unitConversion("centsToDollars", data?.new_order_amount),
                fill: "var(--color-new_purchase)",
              },
              {
                type: "repurchase",
                value: unitConversion(
                  "centsToDollars",
                  data?.renewal_order_amount
                ),
                fill: "var(--color-repurchase)",
              },
            ]}
            dataKey="value"
            innerRadius={50}
            nameKey="type"
            strokeWidth={5}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      dominantBaseline="middle"
                      textAnchor="middle"
                      x={viewBox.cx}
                      y={viewBox.cy}
                    >
                      <tspan
                        className="fill-foreground font-bold text-2xl"
                        x={viewBox.cx}
                        y={viewBox.cy}
                      >
                        {unitConversion("centsToDollars", data?.amount_total)}
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    );
  }

  const list =
    data?.list?.map((item) => ({
      date: item.date,
      new_purchase: unitConversion("centsToDollars", item.new_order_amount),
      repurchase: unitConversion("centsToDollars", item.renewal_order_amount),
      total: unitConversion(
        "centsToDollars",
        item.new_order_amount + item.renewal_order_amount
      ),
    })) || [];

  const tooltip = (
    <ChartTooltip
      content={
        <ChartTooltipContent
          formatter={(value, name, item, index) => (
            <>
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-[--color-bg]"
                style={
                  {
                    "--color-bg": `var(--color-${name})`,
                  } as React.CSSProperties
                }
              />
              {config[name as keyof RevenueChartConfig]?.label || name}
              <div className="ml-auto flex items-baseline gap-0.5 font-medium font-mono text-foreground tabular-nums">
                {value}
              </div>
              {index === 1 && (
                <div className="flex basis-full items-center border-t pt-1.5 font-medium text-foreground text-xs">
                  {t("totalIncome", "Total Income")}
                  <div className="ml-auto flex items-baseline gap-0.5 font-medium font-mono text-foreground tabular-nums">
                    {item.payload.total}
                  </div>
                </div>
              )}
            </>
          )}
        />
      }
      cursor={false}
    />
  );

  if (variant === "month") {
    return (
      <ChartContainer className="max-h-80 w-full" config={config}>
        <BarChart accessibilityLayer data={list}>
          <CartesianGrid vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="date"
            tickFormatter={(value) => {
              const [year, month, day] = value.split("-");
              return new Date(year, month - 1, day).toLocaleDateString(locale, {
                month: "short",
                day: "numeric",
              });
            }}
            tickLine={false}
            tickMargin={10}
          />
          <Bar
            dataKey="new_purchase"
            fill="var(--color-new_purchase)"
            radius={[0, 0, 4, 4]}
            stackId="a"
          />
          <Bar
            dataKey="repurchase"
            fill="var(--color-repurchase)"
            radius={[4, 4, 0, 0]}
            stackId="a"
          />
          {tooltip}
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer className="max-h-80 w-full" config={config}>
      <AreaChart
        accessibilityLayer
        data={list}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="date"
          tickFormatter={(value) => {
            const [year, month] = value.split("-");
            return new Date(year, month - 1).toLocaleDateString(locale, {
              month: "short",
            });
          }}
          tickLine={false}
        />
        {tooltip}
        <Area
          dataKey="new_purchase"
          fill="var(--color-new_purchase)"
          fillOpacity={0.4}
          stackId="a"
          stroke="var(--color-new_purchase)"
          type="natural"
        />
        <Area
          dataKey="repurchase"
          fill="var(--color-repurchase)"
          fillOpacity={0.4}
          stackId="a"
          stroke="var(--color-repurchase)"
          type="natural"
        />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
