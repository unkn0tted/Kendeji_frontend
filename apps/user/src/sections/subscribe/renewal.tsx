"use client";

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Separator } from "@workspace/ui/components/separator";
import { preCreateOrder, renewal } from "@workspace/ui/services/user/order";
import { useDebounce } from "ahooks";
import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import CouponInput from "@/sections/subscribe/coupon-input";
import DurationSelector from "@/sections/subscribe/duration-selector";
import PaymentMethods from "@/sections/subscribe/payment-methods";
import { useGlobalStore } from "@/stores/global";
import { getMinimumPurchaseQuantity } from "@/utils/purchase-duration";
import { isSubscribeSellable } from "@/utils/subscribe";
import { SubscribeBilling } from "./billing";
import { SubscribeDetail } from "./detail";

interface RenewalProps {
  id: number;
  subscribe: API.Subscribe;
}

export default function Renewal({ id, subscribe }: Readonly<RenewalProps>) {
  const { t } = useTranslation("subscribe");
  const { getUserInfo } = useGlobalStore();
  const navigate = useNavigate();
  const canRenew = isSubscribeSellable(subscribe);
  const [open, setOpen] = useState<boolean>(false);
  const [params, setParams] = useState<Partial<API.RenewalOrderRequest>>({
    quantity: 1,
    payment: undefined,
    coupon: "",
    user_subscribe_id: id,
  });
  const [loading, startTransition] = useTransition();
  const debouncedCoupon = useDebounce(params.coupon, { wait: 400 });

  const { data: order } = useQuery({
    enabled: canRenew && !!subscribe.id && open && params.payment !== undefined,
    queryKey: [
      "preCreateOrder",
      subscribe.id,
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
            subscribe_id: subscribe.id,
          } as API.PurchaseOrderRequest,
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
    if (subscribe.id && id) {
      const defaultQuantity = getMinimumPurchaseQuantity(subscribe);
      setParams((prev) => ({
        ...prev,
        quantity: defaultQuantity,
        subscribe_id: subscribe.id,
        user_subscribe_id: id,
      }));
    }
  }, [subscribe.id, id]);

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
    if (!canRenew || params.payment === undefined) return;

    startTransition(async () => {
      try {
        const response = await renewal(params as API.RenewalOrderRequest);
        const orderNo = response.data.data?.order_no;
        if (orderNo) {
          getUserInfo();
          navigate({ to: "/payment", search: { order_no: String(orderNo) } });
        }
      } catch (_error) {
        /* empty */
      }
    });
  }, [canRenew, params, getUserInfo, navigate]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button disabled={!canRenew} size="sm">
          {t("renew", "Renew")}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-full flex-col overflow-y-auto md:h-auto md:max-w-screen-lg">
        <DialogHeader>
          <DialogTitle>
            {t("renewSubscription", "Renew Subscription")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid w-full gap-3 lg:grid-cols-2">
          <Card className="border-transparent shadow-none md:border-inherit md:shadow">
            <CardContent className="grid gap-3 p-0 text-sm md:p-6">
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
            {canRenew ? (
              <div className="mb-6 grid gap-3">
                <DurationSelector
                  discounts={subscribe?.discount}
                  minimumQuantity={getMinimumPurchaseQuantity(subscribe)}
                  onChange={(value) => {
                    handleChange("quantity", value);
                  }}
                  quantity={params.quantity!}
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
              className="sticky bottom-0 left-0 w-full md:relative md:mt-6"
              disabled={!canRenew || loading || params.payment === undefined}
              onClick={handleSubmit}
            >
              {loading && <LoaderCircle className="mr-2 animate-spin" />}
              {canRenew
                ? t("buyNow", "Buy Now")
                : t("subscriptionUnavailable", "Not available for purchase")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
