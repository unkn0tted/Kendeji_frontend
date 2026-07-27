"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import Empty from "@workspace/ui/composed/empty";
import { Icon } from "@workspace/ui/composed/icon";
import { cn } from "@workspace/ui/lib/utils";
import { querySubscribeList } from "@workspace/ui/services/user/subscribe";
import type { TFunction } from "i18next";
import { type CSSProperties, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Display } from "@/components/display";
import { parseDescription } from "@/utils/parse-description";
import { isSubscribeSellable, isSubscribeVisible } from "@/utils/subscribe";
import Purchase from "./purchase";

type PlanTheme = {
  accent: string;
  accentDeep: string;
  accentSoft: string;
  shadow: string;
  icon: string;
};

const PLAN_THEMES: PlanTheme[] = [
  {
    accent: "oklch(0.72 0.18 12)",
    accentDeep: "oklch(0.63 0.17 6)",
    accentSoft: "oklch(0.89 0.1 12 / 0.38)",
    shadow: "oklch(0.68 0.18 11 / 0.42)",
    icon: "lucide:zap",
  },
  {
    accent: "oklch(0.73 0.16 338)",
    accentDeep: "oklch(0.64 0.15 331)",
    accentSoft: "oklch(0.88 0.09 338 / 0.34)",
    shadow: "oklch(0.66 0.16 336 / 0.4)",
    icon: "lucide:radar",
  },
  {
    accent: "oklch(0.78 0.14 42)",
    accentDeep: "oklch(0.69 0.14 31)",
    accentSoft: "oklch(0.92 0.09 40 / 0.36)",
    shadow: "oklch(0.72 0.13 34 / 0.42)",
    icon: "lucide:package",
  },
  {
    accent: "oklch(0.73 0.15 200)",
    accentDeep: "oklch(0.64 0.13 215)",
    accentSoft: "oklch(0.88 0.08 205 / 0.34)",
    shadow: "oklch(0.66 0.12 210 / 0.38)",
    icon: "lucide:server",
  },
  {
    accent: "oklch(0.74 0.15 155)",
    accentDeep: "oklch(0.64 0.13 162)",
    accentSoft: "oklch(0.88 0.08 156 / 0.34)",
    shadow: "oklch(0.66 0.12 160 / 0.38)",
    icon: "lucide:rocket",
  },
];

function getPricing(subscribe: API.Subscribe) {
  const primaryDiscount = subscribe.discount?.[0];
  const bundleQuantity = Math.max(primaryDiscount?.quantity ?? 1, 1);
  const bundleOriginalPrice = primaryDiscount
    ? subscribe.unit_price * bundleQuantity
    : undefined;
  const bundleTotal = primaryDiscount
    ? Math.round(
        subscribe.unit_price *
          bundleQuantity *
          ((primaryDiscount.discount ?? 100) / 100)
      )
    : undefined;
  const shouldShowOriginal = subscribe.show_original_price !== false;
  const hasSavings =
    bundleOriginalPrice !== undefined &&
    bundleTotal !== undefined &&
    bundleTotal < bundleOriginalPrice;

  return {
    bundleOriginalPrice,
    bundleTotal,
    discountPercent:
      hasSavings && primaryDiscount
        ? Math.max(0, 100 - (primaryDiscount.discount ?? 100))
        : 0,
    displayPrice:
      shouldShowOriginal || bundleTotal === undefined
        ? subscribe.unit_price
        : bundleTotal,
    displayQuantity:
      shouldShowOriginal || primaryDiscount === undefined ? 1 : bundleQuantity,
    hasSavings,
    shouldShowOriginal,
  };
}

export default function Subscribe() {
  const { t, i18n } = useTranslation("subscribe");
  const unitTimeMap: Record<string, string> = {
    Day: t("Day", "Day"),
    Hour: t("Hour", "Hour"),
    Minute: t("Minute", "Minute"),
    Month: t("Month", "Month"),
    NoLimit: t("NoLimit", "No Limit"),
    Year: t("Year", "Year"),
  };
  const locale = i18n.language;
  const [subscribe, setSubscribe] = useState<API.Subscribe>();

  const { data: subscribeList, isLoading } = useQuery({
    queryKey: ["querySubscribeList", locale],
    queryFn: async () => {
      const { data } = await querySubscribeList({ language: locale });
      return data.data?.list || [];
    },
  });

  const filteredData = subscribeList?.filter(isSubscribeVisible) ?? [];
  const startingPrice =
    filteredData.length > 0
      ? Math.min(...filteredData.map((item) => item.unit_price))
      : undefined;

  return (
    <>
      <div className="space-y-6">
        <section className="rose-shell subscribe-hero px-6 py-6 sm:px-7 sm:py-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rose-pill">
                  <span className="size-2 rounded-[3px] bg-primary shadow-[0_0_18px_var(--primary)]" />
                  {t("buySubscription", "Buy Subscription")}
                </span>
                {filteredData.length > 0 && (
                  <span className="rose-pill border-transparent bg-primary/8 text-foreground/72">
                    {t("showcase.livePlans", "{{count}} live plans", {
                      count: filteredData.length,
                    })}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <h1 className="rose-section-title font-display text-3xl leading-tight sm:text-4xl">
                  {t("showcase.title", "Choose a plan for your usage")}
                </h1>
                <p className="max-w-2xl text-muted-foreground text-sm leading-7 sm:text-base">
                  {t(
                    "showcase.subtitle",
                    "Compare duration, traffic, devices, and price before you purchase."
                  )}
                </p>
              </div>
            </div>
            {startingPrice !== undefined && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="subscribe-hero__metric">
                  <span className="subscribe-hero__metric-label">
                    {t("showcase.metricPlans", "Plans")}
                  </span>
                  <strong className="font-display text-3xl">
                    {filteredData.length}
                  </strong>
                </div>
                <div className="subscribe-hero__metric">
                  <span className="subscribe-hero__metric-label">
                    {t("showcase.metricStart", "Starting at")}
                  </span>
                  <strong className="font-display text-2xl sm:text-3xl">
                    <Display type="currency" value={startingPrice} />
                  </strong>
                </div>
              </div>
            )}
          </div>
        </section>

        {isLoading ? (
          <section className="subscribe-plan-stage p-4 sm:p-5 lg:p-6">
            <div className="subscribe-plan-stage__list">
              {[0, 1, 2].map((index) => (
                <CardPlanSkeleton key={index} />
              ))}
            </div>
          </section>
        ) : filteredData.length > 0 ? (
          <section className="subscribe-plan-stage p-4 sm:p-5 lg:p-6">
            <div className="subscribe-plan-stage__list">
              {filteredData.map((item, index) => (
                <CardPlan
                  index={index}
                  item={item}
                  key={item.id}
                  onPurchase={setSubscribe}
                  t={t}
                  unitTimeMap={unitTimeMap}
                />
              ))}
            </div>
          </section>
        ) : (
          <Empty />
        )}
      </div>
      <Purchase setSubscribe={setSubscribe} subscribe={subscribe} />
    </>
  );
}

function CardPlanSkeleton() {
  return (
    <Card className="subscribe-card h-full gap-0 border-0 bg-transparent py-0 shadow-none">
      <CardContent className="subscribe-card__shell px-5 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
        <div className="subscribe-card__topline">
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="size-11 rounded-xl" />
        </div>
        <div className="mt-5 space-y-3">
          <Skeleton className="h-7 w-2/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="mt-6 h-24 w-full rounded-xl" />
        <Skeleton className="mt-4 h-11 w-full rounded-lg" />
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

interface CardPlanProps {
  index: number;
  item: API.Subscribe;
  onPurchase: (subscribe: API.Subscribe) => void;
  t: TFunction<"subscribe">;
  unitTimeMap: Record<string, string>;
}

function CardPlan({
  index,
  item,
  onPurchase,
  t,
  unitTimeMap,
}: Readonly<CardPlanProps>) {
  const theme = PLAN_THEMES[index % PLAN_THEMES.length] ?? PLAN_THEMES[0]!;
  const { description, features } = parseDescription(item.description);
  const {
    bundleOriginalPrice,
    bundleTotal,
    discountPercent,
    displayPrice,
    displayQuantity,
    hasSavings,
    shouldShowOriginal,
  } = getPricing(item);
  const unitTime =
    unitTimeMap[item.unit_time!] ||
    t(item.unit_time || "Month", item.unit_time || "Month");
  const planFacts: Array<{ label: string; value: ReactNode }> = [
    {
      label: t("detail.availableTraffic", "Available Traffic"),
      value: <Display type="traffic" unlimited value={item.traffic} />,
    },
    {
      label: t("detail.connectionSpeed", "Connection Speed"),
      value: <Display type="trafficSpeed" unlimited value={item.speed_limit} />,
    },
    {
      label: t("detail.connectedDevices", "Connected Devices"),
      value: <Display type="number" unlimited value={item.device_limit} />,
    },
  ];
  const cardStyle = {
    "--plan-accent": theme.accent,
    "--plan-accent-deep": theme.accentDeep,
    "--plan-accent-soft": theme.accentSoft,
    "--plan-shadow": theme.shadow,
    animationDelay: `${index * 90}ms`,
  } as CSSProperties;

  return (
    <Card
      className="subscribe-card fade-in-0 slide-in-from-bottom-6 h-full animate-in gap-0 border-0 bg-transparent py-0 shadow-none duration-700"
      style={cardStyle}
    >
      <CardContent className="subscribe-card__shell px-5 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
        <div className="subscribe-card__topline">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="subscribe-card__badge">
              #{String(index + 1).padStart(2, "0")}
            </span>
            {discountPercent > 0 && (
              <span className="subscribe-card__badge subscribe-card__badge--discount">
                -{discountPercent}%
              </span>
            )}
          </div>
          <div className="subscribe-card__icon-shell">
            <Icon className="size-6" icon={theme.icon} />
          </div>
        </div>

        <div className="subscribe-card__main">
          <section className="subscribe-card__summary">
            <div className="space-y-3">
              <h2 className="subscribe-card__title">{item.name}</h2>
              {description && (
                <p className="subscribe-card__description">{description}</p>
              )}
            </div>
          </section>

          <aside className="subscribe-card__purchase">
            <div className="subscribe-card__price-band">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="subscribe-card__eyebrow">
                    {t("showcase.metricStart", "Starting at")}
                  </span>
                  <div className="mt-1.5 flex flex-wrap items-end gap-2">
                    <span className="subscribe-card__price-display">
                      <Display type="currency" value={displayPrice} />
                    </span>
                    <span className="subscribe-card__price-unit">
                      {displayQuantity === 1
                        ? `/${unitTime}`
                        : `/${displayQuantity} ${unitTime}`}
                    </span>
                  </div>
                  {hasSavings &&
                    shouldShowOriginal &&
                    bundleTotal !== undefined && (
                      <p className="subscribe-card__price-note">
                        {bundleOriginalPrice !== undefined && (
                          <span className="line-through">
                            <Display
                              type="currency"
                              value={bundleOriginalPrice}
                            />
                          </span>
                        )}
                        <span>
                          <Display type="currency" value={bundleTotal} />
                        </span>
                      </p>
                    )}
                </div>
                <div className="subscribe-card__price-badge">
                  <Icon className="size-5" icon={theme.icon} />
                </div>
              </div>
            </div>

            <Button
              className="subscribe-card__button !bg-transparent hover:!bg-transparent w-full"
              disabled={!isSubscribeSellable(item)}
              onClick={() => {
                if (!isSubscribeSellable(item)) {
                  return;
                }
                onPurchase(item);
              }}
            >
              <span className="relative z-10">
                {isSubscribeSellable(item)
                  ? t("showcase.instantAccess", "Instant Access")
                  : t("subscriptionUnavailable", "Not available for purchase")}
              </span>
              <Icon
                className="relative z-10 size-5"
                icon="lucide:arrow-up-right"
              />
            </Button>
          </aside>
        </div>

        {features.length > 0 && (
          <section className="subscribe-card__highlights">
            <div className="subscribe-card__highlights-header">
              <span className="subscribe-card__eyebrow">
                {t("showcase.highlights", "Highlights")}
              </span>
              <span
                className="h-px flex-1 opacity-45"
                style={{
                  background:
                    "linear-gradient(90deg, var(--plan-accent), transparent)",
                }}
              />
            </div>
            <ul className="subscribe-card__feature-list">
              {features.map((feature, index) => {
                const isDestructive = feature.type === "destructive";

                return (
                  <li
                    className={cn("subscribe-card__feature", {
                      "subscribe-card__feature--destructive":
                        feature.type === "destructive",
                      "subscribe-card__feature--success":
                        feature.type === "success",
                    })}
                    key={`${item.id}-${index}-${feature.label}`}
                  >
                    <span
                      className={cn("subscribe-card__feature-icon", {
                        "subscribe-card__feature-icon--destructive":
                          isDestructive,
                        "subscribe-card__feature-icon--positive":
                          !isDestructive,
                      })}
                    >
                      {!isDestructive && (
                        <svg
                          aria-hidden="true"
                          className="subscribe-card__feature-check"
                          fill="none"
                          viewBox="0 0 16 16"
                        >
                          <path
                            d="M3.5 8.25 6.55 11.3 12.5 5.35"
                            pathLength="1"
                          />
                        </svg>
                      )}
                      {isDestructive && (
                        <span
                          aria-hidden="true"
                          className="subscribe-card__feature-cross"
                        >
                          ×
                        </span>
                      )}
                    </span>
                    <span className="subscribe-card__feature-label">
                      {feature.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="subscribe-card__stats-wrap">
          <div className="subscribe-card__stat-grid">
            {planFacts.map((fact) => (
              <div className="subscribe-card__stat-tile" key={fact.label}>
                <span className="subscribe-card__stat-label">{fact.label}</span>
                <span className="subscribe-card__stat-value">{fact.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
