"use client";

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { EnhancedInput } from "@workspace/ui/composed/enhanced-input";
import { Icon } from "@workspace/ui/composed/icon";
import { cn } from "@workspace/ui/lib/utils";
import { prePurchaseOrder, purchase } from "@workspace/ui/services/user/portal";
import { useDebounce } from "ahooks";
import { LoaderCircle } from "lucide-react";
import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useTranslation } from "react-i18next";
import { SubscribeBilling } from "@/sections/subscribe/billing";
import CouponInput from "@/sections/subscribe/coupon-input";
import { SubscribeDetail } from "@/sections/subscribe/detail";
import DurationSelector from "@/sections/subscribe/duration-selector";
import PaymentMethods from "@/sections/subscribe/payment-methods";
import { useGlobalStore } from "@/stores/global";
import {
  getEmailDomainWhitelist,
  isEmailDomainAllowed,
} from "@/utils/email-domain";
import { getMinimumPurchaseQuantity } from "@/utils/purchase-duration";
import { isSubscribePurchasable } from "@/utils/subscribe";

export default function Content({
  subscription,
}: {
  subscription?: API.Subscribe;
}) {
  const { t } = useTranslation("subscribe");
  const unitTimeMap: Record<string, string> = {
    Day: t("Day", "Day"),
    Hour: t("Hour", "Hour"),
    Minute: t("Minute", "Minute"),
    Month: t("Month", "Month"),
    NoLimit: t("NoLimit", "No Limit"),
    Year: t("Year", "Year"),
  };
  const checkoutTags = [
    t("purchaseDuration", "Purchase Duration"),
    t("coupon", "Coupon"),
    t("paymentMethod", "Payment Method"),
  ];
  const fieldClassName = "rose-surface";
  const { common } = useGlobalStore();
  const domainWhitelist = useMemo(
    () => getEmailDomainWhitelist(common.auth.email.domain_suffix_list),
    [common.auth.email.domain_suffix_list]
  );
  const navigate = useNavigate();
  const canPurchase = isSubscribePurchasable(subscription);
  const [params, setParams] = useState<
    Omit<API.PortalPurchaseRequest, "payment"> & { payment?: number }
  >({
    quantity: 1,
    subscribe_id: 0,
    payment: undefined,
    coupon: "",
    auth_type: "email",
    identifier: "",
    password: "",
  });
  const [loading, startTransition] = useTransition();
  const [isEmailValid, setIsEmailValid] = useState({
    valid: false,
    message: "",
  });
  const debouncedCoupon = useDebounce(params.coupon, { wait: 400 });

  const { data: order } = useQuery({
    enabled: canPurchase && !!subscription?.id && params.payment !== undefined,
    queryKey: [
      "prePurchaseOrder",
      subscription?.id,
      debouncedCoupon,
      params.quantity,
      params.payment,
    ],
    queryFn: async () => {
      try {
        const { data } = await prePurchaseOrder(
          {
            ...params,
            coupon: debouncedCoupon,
            subscribe_id: subscription?.id as number,
          } as API.PrePurchaseOrderRequest,
          { skipErrorHandler: true }
        );
        const result = data.data;
        return result;
      } catch (_error) {
        return;
      }
    },
    retry: false,
  });

  useEffect(() => {
    if (subscription) {
      setParams((prev) => ({
        ...prev,
        quantity: getMinimumPurchaseQuantity(subscription),
        subscribe_id: subscription?.id,
      }));
    }
  }, [subscription]);

  const handleChange = useCallback(
    (field: keyof typeof params, value: string | number) => {
      setParams((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!canPurchase || params.payment === undefined) return;

    startTransition(async () => {
      try {
        const { data } = await purchase(params as API.PortalPurchaseRequest);
        const { order_no } = data.data!;
        if (order_no) {
          localStorage.setItem(
            order_no,
            JSON.stringify({
              auth_type: params.auth_type,
              identifier: params.identifier,
            })
          );
          navigate({ to: "/purchasing/order", search: { order_no } });
        }
      } catch (error) {
        console.log(error);
      }
    });
  }, [canPurchase, params, navigate]);

  if (!subscription) {
    return (
      <div className="rose-panel mx-auto mt-8 max-w-xl p-8 text-center">
        {t("subscriptionNotFound", "Subscription not found")}
      </div>
    );
  }

  return (
    <div className="rose-form mx-auto mt-4 max-w-6xl space-y-6 sm:mt-6">
      <motion.section
        className="rose-shell px-6 py-7 sm:px-8 lg:px-10 lg:py-9"
        initial={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.4 }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <div className="rose-grid" />
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
          <div>
            <span className="rose-pill">
              {t("buySubscription", "Buy Subscription")}
            </span>
            <h1 className="mt-6 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">
              <span className="rose-section-title">{subscription.name}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground leading-8">
              {t(
                "emailInputTitle",
                "Enter the email address for your {{siteName}} account",
                {
                  siteName: common.site.site_name,
                }
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 lg:justify-end">
            {checkoutTags.map((item) => (
              <span
                className="rose-surface rounded-md px-3.5 py-2 font-medium text-foreground/90 text-sm"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-[1.04fr_0.96fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <motion.section
            className="rose-panel p-6 sm:p-7"
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.16em]">
              {t("buySubscription", "Buy Subscription")}
            </p>
            <h2 className="mt-3 font-display text-2xl leading-tight">
              {t(
                "emailInputTitle",
                "Enter the email address for your {{siteName}} account",
                {
                  siteName: common.site.site_name,
                }
              )}
            </h2>
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <EnhancedInput
                  className={cn(fieldClassName, {
                    "border-destructive":
                      !isEmailValid.valid && params.identifier !== "",
                  })}
                  onValueChange={(value: string) => {
                    const email = value as string;
                    setParams((prev) => ({
                      ...prev,
                      identifier: email,
                    }));
                    const reg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!reg.test(email)) {
                      setIsEmailValid({
                        valid: false,
                        message: t(
                          "invalidEmail",
                          "Please enter a valid email address"
                        ),
                      });
                      return;
                    }
                    if (common.auth.email.enable_domain_suffix) {
                      const isValid = isEmailDomainAllowed(
                        email,
                        domainWhitelist
                      );
                      if (!isValid) {
                        setIsEmailValid({
                          valid: false,
                          message: t(
                            "emailDomainNotAllowed",
                            "Email domain is not in the whitelist"
                          ),
                        });
                        return;
                      }
                    }

                    setIsEmailValid({
                      valid: true,
                      message: "",
                    });
                  }}
                  placeholder="Email"
                  required
                  type="email"
                  value={params.identifier || ""}
                />
                <p
                  className={cn("text-muted-foreground text-xs", {
                    "text-destructive":
                      !isEmailValid.valid && params.identifier !== "",
                  })}
                >
                  {isEmailValid.message ||
                    t("emailRequired", "Please enter your email address.")}
                </p>
              </div>
              {params.identifier && isEmailValid.valid && (
                <div className="flex flex-col gap-2">
                  <EnhancedInput
                    className={fieldClassName}
                    onValueChange={(value: string) =>
                      handleChange("password", value)
                    }
                    placeholder="Password"
                    type="password"
                    value={params.password || ""}
                  />
                  <p className="text-muted-foreground text-xs">
                    {t(
                      "passwordHint",
                      "If you do not enter a password, we will automatically generate one and send it to your email."
                    )}
                  </p>
                </div>
              )}
            </div>
          </motion.section>

          <motion.section
            className="rose-panel p-6 sm:p-7"
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.16em]">
              {t("detail.productDetail", "Product Details")}
            </p>
            <h2 className="mt-3 font-display text-2xl leading-tight">
              {subscription.name}
            </h2>
            <ul className="mt-6 flex flex-col gap-3 text-sm">
              {(() => {
                let parsedDescription: {
                  description: string;
                  features: Array<{
                    icon: string;
                    label: string;
                    type: "default" | "success" | "destructive";
                  }>;
                };
                try {
                  parsedDescription = JSON.parse(subscription.description);
                } catch {
                  parsedDescription = { description: "", features: [] };
                }

                const { description, features } = parsedDescription;
                return (
                  <>
                    {description && (
                      <li className="text-muted-foreground">{description}</li>
                    )}
                    {features?.map(
                      (
                        feature: {
                          icon: string;
                          label: string;
                          type: "default" | "success" | "destructive";
                        },
                        index: number
                      ) => (
                        <li
                          className={cn("flex items-center gap-2", {
                            "text-muted-foreground line-through":
                              feature.type === "destructive",
                          })}
                          key={index}
                        >
                          {feature.icon && (
                            <Icon
                              className={cn("size-5 text-primary", {
                                "text-green-500": feature.type === "success",
                                "text-destructive":
                                  feature.type === "destructive",
                              })}
                              icon={feature.icon}
                            />
                          )}
                          {feature.label}
                        </li>
                      )
                    )}
                  </>
                );
              })()}
            </ul>
            <div className="mt-6">
              <SubscribeDetail
                subscribe={{
                  ...subscription,
                  quantity: params.quantity,
                }}
              />
            </div>
          </motion.section>
        </div>

        <motion.section
          className="rose-panel p-6 sm:p-7 lg:sticky lg:top-28"
          initial={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.16em]">
            {t("buyNow", "Buy Now")}
          </p>
          <h2 className="mt-3 font-display text-2xl leading-tight">
            {t("paymentMethod", "Payment Method")}
          </h2>
          {canPurchase ? (
            <div className="mt-6 grid gap-6">
              <DurationSelector
                discounts={subscription?.discount}
                minimumQuantity={getMinimumPurchaseQuantity(subscription)}
                onChange={(value: number) => handleChange("quantity", value)}
                quantity={params.quantity!}
                showOriginalPrice={subscription?.show_original_price}
                unitTime={
                  unitTimeMap[subscription.unit_time!] || subscription.unit_time
                }
              />
              <CouponInput
                coupon={params.coupon}
                onChange={(value: string) => handleChange("coupon", value)}
              />
              <PaymentMethods
                balance={false}
                onChange={(value: number) => handleChange("payment", value)}
                value={params.payment}
              />
            </div>
          ) : (
            <div className="mt-6 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-destructive text-sm">
              {t(
                "subscriptionUnavailableDescription",
                "This subscription is no longer available for purchase."
              )}
            </div>
          )}
          <div className="mt-6 h-px bg-gradient-to-r from-primary/10 via-primary/35 to-transparent" />
          <div className="mt-6">
            <SubscribeBilling
              order={{
                ...order,
                quantity: params.quantity,
                unit_price: subscription?.unit_price,
                discount_rules: subscription?.discount,
                unit_time: subscription?.unit_time,
                show_original_price: subscription?.show_original_price,
              }}
            />
          </div>
          <Button
            className="mt-6 h-12 w-full font-semibold shadow-lg shadow-primary/20"
            disabled={
              !(canPurchase && isEmailValid.valid) ||
              loading ||
              params.payment === undefined
            }
            onClick={handleSubmit}
            size="lg"
          >
            {loading && <LoaderCircle className="mr-2 animate-spin" />}
            {canPurchase
              ? t("buyNow", "Buy Now")
              : t("subscriptionUnavailable", "Not available for purchase")}
          </Button>
        </motion.section>
      </div>
    </div>
  );
}
