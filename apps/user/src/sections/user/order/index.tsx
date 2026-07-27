"use client";

import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  ProList,
  type ProListActions,
} from "@workspace/ui/composed/pro-list/pro-list";
import { closeOrder, queryOrderList } from "@workspace/ui/services/user/order";
import { formatDate } from "@workspace/ui/utils/formatting";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { DescriptionList } from "@/components/description-list";
import { Display } from "@/components/display";
import { PageHeader } from "@/components/page-header";

export default function Order() {
  const { t } = useTranslation("order");
  const statusMap: Record<number, string> = {
    0: t("status.0", "Status"),
    1: t("status.1", "Pending"),
    2: t("status.2", "Paid"),
    3: t("status.3", "Cancelled"),
    4: t("status.4", "Closed"),
    5: t("status.5", "Completed"),
  };
  const typeMap: Record<number, string> = {
    0: t("type.0", "Type"),
    1: t("type.1", "New Purchase"),
    2: t("type.2", "Renewal"),
    3: t("type.3", "Reset Traffic"),
    4: t("type.4", "Recharge"),
  };

  const ref = useRef<ProListActions>(null);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description={t(
          "pageDescription",
          "Track and manage all of your orders"
        )}
        title={t("orderList", "Order List")}
      />
      <ProList<API.OrderDetail, Record<string, unknown>>
        action={ref}
        renderItem={(item) => (
          <div className="rose-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 sm:p-5">
              <div className="font-semibold leading-none">
                {t("orderNo", "Order No")}
                <p className="mt-1.5 font-normal text-muted-foreground text-sm">
                  {item.order_no}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.status === 1 ? (
                  <>
                    <Link
                      className={buttonVariants({ size: "sm" })}
                      key="payment"
                      search={{ order_no: item.order_no }}
                      to="/payment"
                    >
                      {t("payment", "Payment")}
                    </Link>
                    <Button
                      key="cancel"
                      onClick={async () => {
                        await closeOrder({ orderNo: item.order_no });
                        ref.current?.refresh();
                      }}
                      size="sm"
                      variant="destructive"
                    >
                      {t("cancel", "Cancel")}
                    </Button>
                  </>
                ) : (
                  <Link
                    className={buttonVariants({ size: "sm" })}
                    key="detail"
                    search={{ order_no: item.order_no }}
                    to="/payment"
                  >
                    {t("detail", "Detail")}
                  </Link>
                )}
              </div>
            </div>
            <div className="px-4 pb-4 text-sm sm:px-5 sm:pb-5">
              <DescriptionList
                items={[
                  {
                    label: t("name", "Product Name"),
                    value: (
                      <span>
                        {item.subscribe?.name || typeMap[item.type] || "-"}
                      </span>
                    ),
                  },
                  {
                    label: t("paymentAmount", "Amount"),
                    value: (
                      <span>
                        <Display type="currency" value={item.amount} />
                      </span>
                    ),
                  },
                  {
                    label: t("status.0", "Status"),
                    value: (
                      <span>
                        {statusMap[item.status] ||
                          t(`status.${item.status}`, "Unknown Status")}
                      </span>
                    ),
                  },
                  {
                    label: t("createdAt", "Created At"),
                    value: <time>{formatDate(item.created_at)}</time>,
                  },
                ]}
              />
            </div>
          </div>
        )}
        request={async (pagination, filter) => {
          const response = await queryOrderList({ ...pagination, ...filter });
          return {
            list: response.data.data?.list || [],
            total: response.data.data?.total || 0,
          };
        }}
      />
    </div>
  );
}
