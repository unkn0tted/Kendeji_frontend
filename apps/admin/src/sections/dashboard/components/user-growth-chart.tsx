"use client";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
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

export type UserGrowthChartConfig = {
  register: { label: string; color: string };
  new_purchase: { label: string; color: string };
  repurchase: { label: string; color: string };
};

export default function UserGrowthChart({
  variant,
  data,
  config,
  locale,
}: {
  variant: "today" | "month" | "total";
  data?: API.UserStatistics;
  config: UserGrowthChartConfig;
  locale: string;
}) {
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
                type: "register",
                value: data?.register || 0,
                fill: "var(--color-register)",
              },
              {
                type: "new_purchase",
                value: data?.new_order_users || 0,
                fill: "var(--color-new_purchase)",
              },
              {
                type: "repurchase",
                value: data?.renewal_order_users || 0,
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
                  const total =
                    (data?.register || 0) +
                    (data?.new_order_users || 0) +
                    (data?.renewal_order_users || 0);
                  return (
                    <text
                      dominantBaseline="middle"
                      textAnchor="middle"
                      x={viewBox.cx}
                      y={viewBox.cy}
                    >
                      <tspan
                        className="fill-foreground font-bold text-3xl"
                        x={viewBox.cx}
                        y={viewBox.cy}
                      >
                        {total}
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
      register: item.register,
      new_purchase: item.new_order_users,
      repurchase: item.renewal_order_users,
    })) || [];

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
            dataKey="register"
            fill="var(--color-register)"
            radius={[0, 0, 4, 4]}
            stackId="a"
          />
          <Bar
            dataKey="new_purchase"
            fill="var(--color-new_purchase)"
            radius={0}
            stackId="a"
          />
          <Bar
            dataKey="repurchase"
            fill="var(--color-repurchase)"
            radius={[4, 4, 0, 0]}
            stackId="a"
          />
          <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
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
        <ChartTooltip
          content={<ChartTooltipContent indicator="dot" />}
          cursor={false}
        />
        <Area
          dataKey="register"
          fill="var(--color-register)"
          fillOpacity={0.4}
          stackId="a"
          stroke="var(--color-register)"
          type="natural"
        />
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
