import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Icon } from "@workspace/ui/composed/icon";
import { cn } from "@workspace/ui/lib/utils";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Display } from "@/components/display";
import { SubscribeDetail } from "@/sections/subscribe/detail";
import { useGlobalStore } from "@/stores/global";
import { isSubscribeSellable, isSubscribeVisible } from "@/utils/subscribe";
import { cardReveal, sectionReveal, sectionViewport } from "../motion";

interface ProductShowcaseProps {
  subscriptionData: API.Subscribe[];
}

type ParsedFeature = {
  icon?: string;
  label: ReactNode;
  type?: "default" | "success" | "destructive";
};

type ParsedDescription = {
  description: string;
  features: ParsedFeature[];
};

function parseSubscriptionDescription(value: unknown): ParsedDescription {
  if (typeof value !== "string" || !value.trim()) {
    return { description: "", features: [] };
  }

  try {
    const parsed = JSON.parse(value) as Partial<ParsedDescription>;
    return {
      description:
        typeof parsed.description === "string" ? parsed.description : "",
      features: Array.isArray(parsed.features) ? parsed.features : [],
    };
  } catch {
    return {
      description: value,
      features: [],
    };
  }
}

export function Content({ subscriptionData }: ProductShowcaseProps) {
  const { t } = useTranslation("main");
  const { user } = useGlobalStore();
  const visibleSubscriptionData = subscriptionData.filter(isSubscribeVisible);
  const highlightedIndex = (() => {
    const discountedIndex = visibleSubscriptionData.findIndex(
      (item) => (item.discount?.length ?? 0) > 0
    );

    return discountedIndex >= 0
      ? discountedIndex
      : Math.min(1, visibleSubscriptionData.length - 1);
  })();

  const unitTimeMap: Record<string, string> = {
    Day: t("Day", "Day"),
    Hour: t("Hour", "Hour"),
    Minute: t("Minute", "Minute"),
    Month: t("Month", "Month"),
    NoLimit: t("NoLimit", "No Limit"),
    Year: t("Year", "Year"),
  };

  if (visibleSubscriptionData.length === 0) return null;

  return (
    <motion.section
      className="rose-shell isolate hidden px-6 py-7 sm:block sm:px-8 lg:px-10 lg:py-9"
      initial="hidden"
      variants={sectionReveal}
      viewport={sectionViewport}
      whileInView="visible"
    >
      <div className="rose-grid" />
      <div className="mb-9 grid gap-5 xl:grid-cols-[0.68fr_0.32fr] xl:items-end">
        <div>
          <span className="rose-pill">
            {t("product_showcase_badge", "Plans")}
          </span>
          <h2 className="mt-6 max-w-3xl font-display text-3xl leading-tight sm:text-4xl">
            <span className="rose-section-title">
              {t(
                "product_showcase_title",
                "Choose a plan that matches your actual use."
              )}
            </span>
          </h2>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground leading-8">
            {t(
              "product_showcase_description",
              "Duration, traffic, devices, and price are grouped so you can compare without jumping between pages."
            )}
          </p>
        </div>
      </div>
      <div className="mx-auto grid w-full gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleSubscriptionData.map((item, index) => (
          <motion.div
            className="w-full"
            custom={index}
            key={item.id}
            variants={cardReveal}
          >
            {(() => {
              const parsedDescription = parseSubscriptionDescription(
                item.description
              );
              const isHighlighted = index === highlightedIndex;
              const canPurchase = isSubscribeSellable(item);

              return (
                <article
                  className={cn(
                    "rose-panel main-plan-card group hover:-translate-y-1 flex h-full flex-col p-6 transition-all duration-300",
                    isHighlighted &&
                      "main-plan-card--highlight border-primary/28 bg-primary/8 shadow-[0_18px_44px_-34px_oklch(0.64_0.16_11_/0.52)] dark:bg-primary/10"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.16em]">
                        0{index + 1}
                      </p>
                      <h3 className="mt-3 font-display text-2xl leading-none">
                        {item.name}
                      </h3>
                    </div>
                    {isHighlighted && (
                      <span className="shrink-0 rounded-md border border-primary/18 bg-primary/10 px-3 py-1 font-semibold text-[0.72rem] text-primary uppercase tracking-[0.12em]">
                        {t("product_showcase_highlight", "Balanced Pick")}
                      </span>
                    )}
                  </div>
                  {parsedDescription.description && (
                    <p className="mt-5 max-w-sm text-foreground/72 text-sm leading-7">
                      {parsedDescription.description}
                    </p>
                  )}
                  {parsedDescription.features.length > 0 && (
                    <div className="rose-surface mt-6 rounded-md p-4">
                      <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">
                        {t("product_showcase_feature_label", "Included")}
                      </p>
                      <ul className="mt-4 flex flex-col gap-3 text-sm">
                        {parsedDescription.features.map((feature, key) => (
                          <li
                            className={cn("flex items-center gap-3", {
                              "text-muted-foreground line-through":
                                feature.type === "destructive",
                            })}
                            key={key}
                          >
                            {feature.icon ? (
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <Icon
                                  className={cn("size-4", {
                                    "text-green-500":
                                      feature.type === "success",
                                    "text-destructive":
                                      feature.type === "destructive",
                                  })}
                                  icon={feature.icon}
                                />
                              </div>
                            ) : (
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/45" />
                            )}
                            <span className="leading-6">{feature.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="rose-surface mt-4 rounded-md p-4">
                    <SubscribeDetail
                      subscribe={{
                        ...item,
                        name: undefined,
                      }}
                      title={t("product_showcase_detail_label", "Core Details")}
                    />
                  </div>
                  <div className="mt-6 h-px bg-gradient-to-r from-primary/12 via-primary/34 to-transparent" />
                  <div className="mt-6 flex flex-col gap-5">
                    {(() => {
                      const hasDiscount =
                        item.discount && item.discount.length > 0;
                      const shouldShowOriginal =
                        item.show_original_price !== false;

                      const displayPrice =
                        shouldShowOriginal || !hasDiscount
                          ? item.unit_price
                          : Math.round(
                              item.unit_price *
                                (item.discount?.[0]?.quantity ?? 1) *
                                ((item.discount?.[0]?.discount ?? 100) / 100)
                            );

                      const displayQuantity =
                        shouldShowOriginal || !hasDiscount
                          ? 1
                          : (item.discount?.[0]?.quantity ?? 1);

                      const unitTime =
                        unitTimeMap[item.unit_time!] ||
                        t(item.unit_time || "Month", item.unit_time || "Month");

                      return (
                        <div className="space-y-2">
                          <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.16em]">
                            {t(
                              "product_showcase_price_label",
                              "Reference Price"
                            )}
                          </p>
                          <h2 className="font-display text-3xl leading-none">
                            <Display type="currency" value={displayPrice} />
                            <span className="font-medium text-base text-foreground/75">
                              {displayQuantity === 1
                                ? `/${unitTime}`
                                : `/${displayQuantity} ${unitTime}`}
                            </span>
                          </h2>
                        </div>
                      );
                    })()}
                    <div className="mt-auto flex justify-end">
                      <Button
                        asChild={canPurchase}
                        className={cn(
                          "w-full font-semibold shadow-sm sm:w-auto sm:min-w-36",
                          isHighlighted
                            ? "shadow-primary/15"
                            : "rose-surface-interactive text-foreground"
                        )}
                        disabled={!canPurchase}
                        variant={isHighlighted ? "default" : "outline"}
                      >
                        {canPurchase ? (
                          <Link
                            search={user ? undefined : { id: item.id }}
                            to={user ? "/subscribe" : "/purchasing"}
                          >
                            {t("product_showcase_action", "View Plan")}
                          </Link>
                        ) : (
                          <span>
                            {t("product_showcase_sales_closed", "Sales Closed")}
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })()}
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
