import { useSearch } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card";
import { Separator } from "@workspace/ui/components/separator";
import {
  ProTable,
  type ProTableActions,
} from "@workspace/ui/composed/pro-table/pro-table";
import { cn } from "@workspace/ui/lib/utils";
import { getOrderList } from "@workspace/ui/services/admin/order";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Display } from "@/components/display";
import { useSubscribe } from "@/stores/subscribe";
import { formatDate } from "@/utils/common";
import { UserDetail } from "../user/user-detail";
import { OrderStatusControl } from "./order-status-control";
import { isOrderStatusEditable } from "./status-update";

export default function Order() {
  const { t } = useTranslation("order");
  const sp = useSearch({ strict: false }) as Record<string, string | undefined>;

  const statusOptions = [
    {
      value: 1,
      label: t("status.1", "Pending"),
      className: "bg-orange-500",
    },
    { value: 2, label: t("status.2", "Paid"), className: "bg-green-500" },
    {
      value: 3,
      label: t("status.3", "Cancelled"),
      className: "bg-gray-500",
    },
    { value: 4, label: t("status.4", "Closed"), className: "bg-red-500" },
    {
      value: 5,
      label: t("status.5", "Completed"),
      className: "bg-green-500",
    },
  ];

  const typeOptions = [
    { value: 1, label: t("type.1", "New Purchase") },
    { value: 2, label: t("type.2", "Renewal") },
    { value: 3, label: t("type.3", "Reset Traffic") },
    { value: 4, label: t("type.4", "Recharge") },
  ];

  const ref = useRef<ProTableActions>(null);

  const { subscribes, getSubscribeName } = useSubscribe();

  const initialFilters = {
    user_id: sp.user_id ? Number(sp.user_id) : undefined,
  };

  return (
    <ProTable<API.Order, any>
      action={ref}
      columns={[
        {
          accessorKey: "order_no",
          header: t("orderNumber", "Order Number"),
        },
        {
          accessorKey: "type",
          header: t("type.0", "Type"),
          cell: ({ row }) => {
            const type = row.getValue("type") as number;
            return (
              typeOptions.find((opt) => opt.value === type)?.label ||
              t(`type.${type}`)
            );
          },
        },
        {
          accessorKey: "subscribe_id",
          header: t("subscribe", "Subscribe"),
          cell: ({ row }) => {
            const order = row.original as API.Order;
            if (order.type === 4) {
              const type = row.getValue("type") as number;
              return (
                typeOptions.find((opt) => opt.value === type)?.label ||
                t(`type.${type}`)
              );
            }
            const name = getSubscribeName(order.subscribe_id);
            const quantity = order.quantity;
            return name ? `${name} × ${quantity}` : "";
          },
        },
        {
          accessorKey: "amount",
          header: t("amount", "Amount"),
          cell: ({ row }) => {
            const order = row.original as API.Order;
            return (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button className="p-0" variant="link">
                    <Display type="currency" value={order.amount} />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="grid gap-3">
                    {order.trade_no && (
                      <>
                        <div className="font-semibold">
                          {t("tradeNo", "Transaction Number")}
                        </div>
                        <span className="text-muted-foreground">
                          {order.trade_no}
                        </span>
                        <Separator className="my-2" />
                      </>
                    )}
                    <ul className="grid gap-3">
                      <li className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {t("subscribePrice", "Subscription Price")}
                        </span>
                        <span>
                          <Display type="currency" value={order.price} />
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {t("discount", "Discount Amount")}
                        </span>
                        <span>
                          <Display type="currency" value={order.discount} />
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {t("couponDiscount", "Coupon Discount")}
                        </span>
                        <span>
                          <Display
                            type="currency"
                            value={order.coupon_discount}
                          />
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {t("feeAmount", "Fee Amount")}
                        </span>
                        <span>
                          <Display type="currency" value={order.fee_amount} />
                        </span>
                      </li>
                      <li className="flex items-center justify-between font-semibold">
                        <span className="text-muted-foreground">
                          {t("total", "Total")}
                        </span>
                        <span>
                          <Display type="currency" value={order.amount} />
                        </span>
                      </li>
                    </ul>
                  </div>
                  <Separator className="my-4" />
                  <ul className="grid gap-3">
                    <li className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("method", "Payment Method")}
                      </span>
                      <span>
                        {order.payment?.name || order.payment?.platform}
                      </span>
                    </li>
                  </ul>
                </HoverCardContent>
              </HoverCard>
            );
          },
        },
        {
          accessorKey: "user_id",
          header: t("user", "User"),
          cell: ({ row }) => {
            const order = row.original as API.Order;
            return <UserDetail id={order.user_id} />;
          },
        },
        {
          accessorKey: "updated_at",
          header: t("updateTime", "Update Time"),
          cell: ({ row }) => {
            const order = row.original as API.Order;
            return formatDate(order.updated_at);
          },
        },
        {
          accessorKey: "status",
          header: t("status.0", "Status"),
          cell: ({ row }) => {
            const order = row.original as API.Order;
            const option = statusOptions.find(
              (opt) => opt.value === order.status
            );
            if (isOrderStatusEditable(order.status)) {
              return (
                <OrderStatusControl
                  className={cn(option?.className)}
                  onUpdated={() => ref.current?.refresh()}
                  order={order}
                />
              );
            }
            return (
              <Badge>
                {option?.label || t(`status.${row.getValue("status")}`)}
              </Badge>
            );
          },
        },
      ]}
      initialFilters={initialFilters}
      key={JSON.stringify(initialFilters)}
      mobileRowRender={(row) => {
        const status = statusOptions.find((item) => item.value === row.status);
        const type = typeOptions.find((item) => item.value === row.type);
        return (
          <article className="min-w-0 space-y-3 rounded-md border bg-card p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-all font-semibold text-base leading-snug">
                  {row.order_no}
                </h3>
                <p className="mt-1 text-muted-foreground text-xs">
                  {type?.label || t(`type.${row.type}`)}
                </p>
              </div>
              <Badge
                className="shrink-0"
                variant={
                  row.status === 2 || row.status === 5 ? "default" : "secondary"
                }
              >
                {status?.label || t(`status.${row.status}`)}
              </Badge>
            </div>
            <dl className="grid grid-cols-[minmax(5rem,34%)_minmax(0,1fr)] gap-x-3 gap-y-2 border-t pt-3 text-sm">
              <dt className="text-muted-foreground">{t("amount", "Amount")}</dt>
              <dd className="font-semibold">
                <Display type="currency" value={row.amount} />
              </dd>
              <dt className="text-muted-foreground">{t("user", "User")}</dt>
              <dd>#{row.user_id}</dd>
              <dt className="text-muted-foreground">
                {t("subscribe", "Subscribe")}
              </dt>
              <dd className="min-w-0 break-words">
                {row.type === 4
                  ? "--"
                  : `${getSubscribeName(row.subscribe_id) || `#${row.subscribe_id}`} × ${row.quantity}`}
              </dd>
              <dt className="text-muted-foreground">
                {t("method", "Payment Method")}
              </dt>
              <dd className="min-w-0 break-words">
                {row.payment?.name || row.payment?.platform || "--"}
              </dd>
              <dt className="text-muted-foreground">
                {t("updateTime", "Update Time")}
              </dt>
              <dd>{formatDate(row.updated_at)}</dd>
            </dl>
          </article>
        );
      }}
      params={[
        {
          key: "status",
          placeholder: t("status.0", "Status"),
          options: statusOptions.map((item) => ({
            label: item.label,
            value: String(item.value),
          })),
        },
        {
          key: "subscribe_id",
          placeholder: `${t("subscribe", "Subscribe")}`,
          options: subscribes?.map((item) => ({
            label: item.name!,
            value: String(item.id),
          })),
        },
        { key: "search" },
        {
          key: "user_id",
          placeholder: `${t("user", "User")} ID`,
          options: undefined,
        },
      ]}
      request={async (pagination, filter) => {
        const { data } = await getOrderList({ ...pagination, ...filter });
        return {
          list: data.data?.list || [],
          total: data.data?.total || 0,
        };
      }}
    />
  );
}
