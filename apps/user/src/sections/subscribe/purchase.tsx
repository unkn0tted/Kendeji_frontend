"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Separator } from "@workspace/ui/components/separator";
import { preCreateOrder, purchase } from "@workspace/ui/services/user/order";
import { useDebounce } from "ahooks";
import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import CouponInput from "@/sections/subscribe/coupon-input";
import DurationSelector from "@/sections/subscribe/duration-selector";
import PaymentMethods from "@/sections/subscribe/payment-methods";
import { useGetUserInfo } from "@/stores/global";
import { getMinimumPurchaseQuantity } from "@/utils/purchase-duration";
import { isSubscribePurchasable } from "@/utils/subscribe";
import { SubscribeBilling } from "./billing";
import { SubscribeDetail } from "./detail";

interface PurchaseProps {
  subscribe?: API.Subscribe;
  setSubscribe: (subscribe?: API.Subscribe) => void;
}

export default function Purchase({
  subscribe,
  setSubscribe,
}: Readonly<PurchaseProps>) {
  const { t } = useTranslation("subscribe");
  const getUserInfo = useGetUserInfo();
  const router = useRouter();
  const canPurchase = isSubscribePurchasable(subscribe);
  const [params, setParams] = useState<Partial<API.PurchaseOrderRequest>>({
    quantity: 1,
    subscribe_id: 0,
    payment: undefined,
    coupon: "",
  });
  const [loading, startTransition] = useTransition();
  const debouncedCoupon = useDebounce(params.coupon, { wait: 400 });

  const { data: order } = useQuery({
    enabled: canPurchase && !!subscribe?.id && params.payment !== undefined,
    queryKey: [
      "preCreateOrder",
      "purchase",
      subscribe?.id,
      params.quantity,
      params.payment,
      debouncedCoupon,
    ],
    queryFn: async () => {
      try {
        const { data } = await preCreateOrder(
          {
            ...params,
            coupon: debouncedCoupon,
            subscribe_id: subscribe?.id as number,
          } as API.PurchaseOrderRequest,
          { skipErrorHandler: true }
        );
        const result = data.data;
        return result ?? null;
      } catch (_error) {
        return null;
      }
    },
    retry: false,
  });

  useEffect(() => {
    if (subscribe) {
      const defaultQuantity = getMinimumPurchaseQuantity(subscribe);
      setParams((prev) => ({
        ...prev,
        quantity: defaultQuantity,
        subscribe_id: subscribe?.id,
      }));
    }
  }, [subscribe]);

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
        const response = await purchase(params as API.PurchaseOrderRequest);
        const orderNo = response.data.data?.order_no;
        if (orderNo) {
          getUserInfo();
          router.navigate({ to: "/payment", search: { order_no: orderNo } });
        }
      } catch (_error) {
        /* empty */
      }
    });
  }, [canPurchase, params, router, getUserInfo]);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) setSubscribe(undefined);
      }}
      open={!!subscribe?.id}
    >
      <DialogContent className="flex h-full flex-col overflow-hidden border-none p-0 md:h-auto md:max-w-screen-lg">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{t("buySubscription", "Buy Subscription")}</DialogTitle>
        </DialogHeader>
        <div className="grid w-full flex-grow gap-3 overflow-auto p-6 pt-0 lg:grid-cols-2">
          <Card className="border-transparent shadow-none md:border-inherit md:shadow">
            <CardContent className="grid gap-3 text-sm">
              <SubscribeDetail
                subscribe={{
                  ...subscribe,
                  quantity: params.quantity,
                }}
              />
              <Separator />
              <SubscribeBilling
                order={{
                  ...order,
                  quantity: params.quantity,
                  unit_price: subscribe?.unit_price,
                  discount_rules: subscribe?.discount,
                  unit_time: subscribe?.unit_time,
                  show_original_price: subscribe?.show_original_price,
                }}
              />
            </CardContent>
          </Card>
          <div className="flex flex-col justify-between text-sm">
            {canPurchase ? (
              <div className="mb-6 grid gap-3">
                <DurationSelector
                  discounts={subscribe?.discount}
                  minimumQuantity={getMinimumPurchaseQuantity(subscribe)}
                  onChange={(value) => {
                    handleChange("quantity", value);
                  }}
                  quantity={params.quantity as number}
                  showOriginalPrice={subscribe?.show_original_price}
                  unitTime={subscribe?.unit_time}
                />
                <CouponInput
                  coupon={params.coupon}
                  onChange={(value) => handleChange("coupon", value)}
                />
                <PaymentMethods
                  onChange={(value) => {
                    handleChange("payment", value);
                  }}
                  value={params.payment}
                />
              </div>
            ) : (
              <div className="mb-6 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-destructive text-sm">
                {t(
                  "subscriptionUnavailableDescription",
                  "This subscription is no longer available for purchase."
                )}
              </div>
            )}
            <Button
              className="fixed bottom-0 left-0 w-full md:relative md:mt-6"
              disabled={!canPurchase || loading || params.payment === undefined}
              onClick={handleSubmit}
            >
              {loading && <LoaderCircle className="mr-2 animate-spin" />}
              {canPurchase
                ? t("buyNow", "Buy Now")
                : t("subscriptionUnavailable", "Not available for purchase")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
