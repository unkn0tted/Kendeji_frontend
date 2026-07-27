"use client";

import { Link } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { Icon } from "@workspace/ui/composed/icon";
import { cn } from "@workspace/ui/lib/utils";
import { formatDate } from "@workspace/ui/utils/formatting";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { DescriptionList } from "@/components/description-list";
import { Display } from "@/components/display";
import { SubscribeBilling } from "@/sections/subscribe/billing";
import { SubscribeDetail } from "@/sections/subscribe/detail";
import StripePayment from "@/sections/user/payment/stripe";
import { Countdown, EXPIRY_MINUTES } from "./countdown";

export type OrderStatusViewProps = {
  /**
   * Order detail. Authenticated pages pass `API.OrderDetail`; the guest page
   * passes `API.QueryPurchaseOrderResponse` (a structural subset).
   */
  order?: Partial<API.OrderDetail>;
  /** Checkout descriptor for pending orders (url / qr / stripe / balance). */
  payment?: API.CheckoutOrderResponse;
  /**
   * Which flow rendered the view. Both flows currently share identical
   * actions; the flag is the seam for any future auth-specific divergence so
   * it gets expressed here as a prop instead of re-forking the page.
   */
  isLoggedIn: boolean;
  /** Re-fetch the order — wired to the pending countdown expiring. */
  onRefresh?: () => void;
};

/** Status icon inside a soft tinted circle, per the Aurora Glass system. */
function StatusIcon({
  icon,
  tone,
}: {
  icon: string;
  tone: "pending" | "success" | "failed";
}) {
  return (
    <span
      className={cn("flex size-20 items-center justify-center rounded-full", {
        "bg-primary/10 text-primary": tone === "pending",
        "bg-chart-2/15 text-chart-2": tone === "success",
        "bg-destructive/10 text-destructive": tone === "failed",
      })}
    >
      <Icon className="text-4xl" icon={icon} />
    </span>
  );
}

/**
 * The full order-status UI shared by the logged-in payment page
 * (sections/user/payment) and the guest purchasing page
 * (sections/purchasing/order.tsx). Those files were ~300-line near-clones
 * whose drift caused real bugs — all presentation now lives here, and the
 * containers only differ in data fetching and side effects.
 */
export function OrderStatusView({
  order,
  payment,
  isLoggedIn,
  onRefresh,
}: OrderStatusViewProps) {
  const { t } = useTranslation("order");

  const status = order?.status;
  const type = order?.type;
  // Guests have no Authorization cookie, and /subscribe now sits behind the
  // (user) route guard — send them to the public landing instead.
  const productListTarget = isLoggedIn
    ? ({ to: "/subscribe" } as const)
    : ({ to: "/", search: { id: 0 } } as const);
  const isPending = status === 1;
  const isSuccess = status === 2 || status === 5;
  const isClosed = status === 3 || status === 4;

  const expiresAt = order?.created_at
    ? order.created_at + EXPIRY_MINUTES * 60 * 1000
    : undefined;
  const countdown = (
    <p className="font-bold text-3xl">
      <Countdown onExpire={onRefresh} target={expiresAt} />
    </p>
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rose-panel order-2 xl:order-1">
        <div className="p-4 sm:p-5">
          <h2 className="font-semibold leading-none">
            {t("orderNumber", "Order Number")}
          </h2>
          <p className="mt-1.5 break-all text-muted-foreground text-sm">
            {order?.order_no || "-"}
          </p>
        </div>
        <div className="grid gap-3 px-4 pb-4 text-sm sm:px-5 sm:pb-5">
          <DescriptionList
            className="lg:grid-cols-2"
            items={[
              {
                label: t("createdAt", "Created At"),
                value: <time>{formatDate(order?.created_at)}</time>,
              },
              {
                label: t("paymentMethod", "Payment Method"),
                value: (
                  <span>
                    <Badge>
                      {order?.payment?.name || order?.payment?.platform || "-"}
                    </Badge>
                  </span>
                ),
              },
            ]}
          />
          <Separator />

          {(type === 1 || type === 2) && (
            <SubscribeDetail
              subscribe={{
                ...order?.subscribe,
                quantity: order?.quantity,
              }}
            />
          )}
          {type === 3 && (
            <>
              <div className="font-semibold">
                {t("resetTraffic", "Reset Traffic")}
              </div>
              <DescriptionList
                className="lg:grid-cols-2"
                items={[
                  {
                    label: t("resetPrice", "Reset Price"),
                    value: <Display type="currency" value={order?.amount} />,
                  },
                ]}
              />
            </>
          )}
          {type === 4 && (
            <>
              <div className="font-semibold">
                {t("balanceRecharge", "Balance Recharge")}
              </div>
              <DescriptionList
                className="lg:grid-cols-2"
                items={[
                  {
                    label: t("rechargeAmount", "Recharge Amount"),
                    value: <Display type="currency" value={order?.amount} />,
                  },
                ]}
              />
            </>
          )}

          <Separator />
          <SubscribeBilling
            order={{
              ...order,
              unit_price: order?.subscribe?.unit_price,
              show_original_price: order?.subscribe?.show_original_price,
            }}
          />
        </div>
      </section>

      <section className="rose-panel order-1 flex min-h-64 flex-auto items-center justify-center px-6 py-12 xl:order-2">
        {isSuccess && (
          <div className="flex flex-col items-center gap-6 text-center">
            <StatusIcon icon="mdi:success-circle-outline" tone="success" />
            <h3 className="font-bold text-2xl tracking-tight">
              {t("paymentSuccess", "Payment Successful")}
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild>
                <Link to="/dashboard">
                  {t("subscribeNow", "Subscribe Now")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/document">{t("viewDocument", "View Document")}</Link>
              </Button>
            </div>
          </div>
        )}

        {isPending && payment?.type === "url" && (
          <div className="flex flex-col items-center gap-6 text-center">
            <StatusIcon icon="mdi:access-time" tone="pending" />
            <h3 className="font-bold text-2xl tracking-tight">
              {t("waitingForPayment", "Waiting for Payment")}
            </h3>
            {countdown}
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                onClick={() => {
                  if (payment?.checkout_url) {
                    window.location.href = payment?.checkout_url;
                  }
                }}
              >
                {t("goToPayment", "Go to Payment")}
              </Button>
              <Button asChild variant="outline">
                <Link {...productListTarget}>
                  {t("productList", "Product List")}
                </Link>
              </Button>
            </div>
          </div>
        )}

        {isPending && payment?.type === "qr" && (
          <div className="flex flex-col items-center gap-6 text-center">
            <h3 className="font-bold text-2xl tracking-tight">
              {t("scanToPay", "Scan to Pay")}
            </h3>
            {countdown}
            <div className="overflow-hidden rounded-xl bg-white p-2 shadow-sm">
              <QRCodeCanvas
                imageSettings={{
                  src: "./assets/payment/alipay_f2f.svg",
                  width: 24,
                  height: 24,
                  excavate: true,
                }}
                size={208}
                value={payment?.checkout_url || ""}
              />
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild>
                <Link {...productListTarget}>
                  {t("productList", "Product List")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/order">{t("orderList", "Order List")}</Link>
              </Button>
            </div>
          </div>
        )}

        {isPending && payment?.type === "stripe" && (
          <div className="flex flex-col items-center gap-6 text-center">
            <h3 className="font-bold text-2xl tracking-tight">
              {t("waitingForPayment", "Waiting for Payment")}
            </h3>
            {countdown}
            {payment.stripe && <StripePayment {...payment.stripe} />}
          </div>
        )}

        {isClosed && (
          <div className="flex flex-col items-center gap-6 text-center">
            <StatusIcon icon="mdi:cancel" tone="failed" />
            <h3 className="font-bold text-2xl tracking-tight">
              {t("orderClosed", "Order Closed")}
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild>
                <Link {...productListTarget}>
                  {t("productList", "Product List")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/order">{t("orderList", "Order List")}</Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
