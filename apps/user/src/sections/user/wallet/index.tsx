"use client";

import {
  ProList,
  type ProListActions,
} from "@workspace/ui/composed/pro-list/pro-list";
import { queryUserBalanceLog } from "@workspace/ui/services/user/user";
import { formatDate } from "@workspace/ui/utils/formatting";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { DescriptionList } from "@/components/description-list";
import { Display } from "@/components/display";
import { PageHeader } from "@/components/page-header";
import Recharge from "@/sections/subscribe/recharge";
import { useUser } from "@/stores/global";

export default function Wallet() {
  const { t } = useTranslation("wallet");
  const typeMap: Record<number, string> = {
    0: t("type.0", "Type"),
    1: t("type.1", "Recharge"),
    2: t("type.2", "Withdrawal"),
    3: t("type.3", "Purchase"),
    4: t("type.4", "Refund"),
    5: t("type.5", "Reward"),
    6: t("type.6", "Commission"),
    231: t("type.231", "Auto Reset"),
    232: t("type.232", "Advance Reset"),
    233: t("type.233", "Paid Reset"),
    321: t("type.321", "Recharge"),
    322: t("type.322", "Withdraw"),
    323: t("type.323", "Payment"),
    324: t("type.324", "Refund"),
    325: t("type.325", "Reward"),
    326: t("type.326", "Admin Adjust"),
    331: t("type.331", "Purchase"),
    332: t("type.332", "Renewal"),
    333: t("type.333", "Refund"),
    334: t("type.334", "Withdraw"),
    335: t("type.335", "Admin Adjust"),
    341: t("type.341", "Increase"),
    342: t("type.342", "Reduce"),
  };
  const user = useUser();
  const ref = useRef<ProListActions>(null);
  const totalAssets =
    (user?.balance || 0) + (user?.commission || 0) + (user?.gift_amount || 0);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={<Recharge />}
        description={t(
          "pageDescription",
          "Manage your balance and review every transaction"
        )}
        title={t("assetOverview", "Asset Overview")}
      />
      <section className="rose-panel p-5 sm:p-6">
        <div className="mb-5">
          <p className="font-medium text-muted-foreground text-sm">
            {t("totalAssets", "Total Assets")}
          </p>
          <p className="font-bold text-3xl">
            <Display type="currency" value={totalAssets} />
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rose-surface rounded-lg p-4">
            <p className="font-medium text-muted-foreground text-sm">
              {t("balance", "Balance")}
            </p>
            <p className="font-bold text-2xl">
              <Display type="currency" value={user?.balance} />
            </p>
          </div>
          <div className="rose-surface rounded-lg p-4">
            <p className="font-medium text-muted-foreground text-sm">
              {t("giftAmount", "Gift Amount")}
            </p>
            <p className="font-bold text-2xl">
              <Display type="currency" value={user?.gift_amount} />
            </p>
          </div>
          <div className="rose-surface rounded-lg p-4">
            <p className="font-medium text-muted-foreground text-sm">
              {t("commission", "Commission")}
            </p>
            <p className="font-bold text-2xl">
              <Display type="currency" value={user?.commission} />
            </p>
          </div>
        </div>
      </section>
      <ProList<API.BalanceLog, Record<string, unknown>>
        action={ref}
        renderItem={(item) => (
          <div className="rose-panel p-4 text-sm sm:p-5">
            <DescriptionList
              items={[
                {
                  label: t("createdAt", "Created At"),
                  value: <time>{formatDate(item.timestamp)}</time>,
                },
                {
                  label: t("type.0", "Type"),
                  value: (
                    <span>
                      {typeMap[item.type] ||
                        t(`type.${item.type}`, "Unknown Type")}
                    </span>
                  ),
                },
                {
                  label: t("amount", "Amount"),
                  value: (
                    <span>
                      <Display type="currency" value={item.amount} />
                    </span>
                  ),
                },
                {
                  label: t("balance", "Balance"),
                  value: (
                    <span>
                      <Display type="currency" value={item.balance} />
                    </span>
                  ),
                },
              ]}
            />
          </div>
        )}
        request={async (pagination, filter) => {
          const response = await queryUserBalanceLog({
            ...pagination,
            ...filter,
          });
          return {
            list: response.data.data?.list || [],
            total: response.data.data?.total || 0,
          };
        }}
      />
    </div>
  );
}
