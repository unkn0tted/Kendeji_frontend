"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ProList } from "@workspace/ui/composed/pro-list/pro-list";
import {
  queryUserAffiliate,
  queryUserAffiliateList,
  queryUserCommissionLog,
} from "@workspace/ui/services/user/user";
import { formatDate } from "@workspace/ui/utils/formatting";
import { Copy } from "lucide-react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Display } from "@/components/display";
import { useGlobalStore } from "@/stores/global";

const COMMISSION_LOG_PAGE_SIZE = 100;
const REFERRAL_COMMISSION_TYPES = new Set([331, 332]);

async function queryCommissionSummary() {
  const firstResponse = await queryUserCommissionLog({
    page: 1,
    size: COMMISSION_LOG_PAGE_SIZE,
  });
  const firstPage = firstResponse.data.data;
  const totalPages = Math.ceil(
    (firstPage?.total || 0) / COMMISSION_LOG_PAGE_SIZE
  );
  const remainingResponses = await Promise.all(
    Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) =>
      queryUserCommissionLog({
        page: index + 2,
        size: COMMISSION_LOG_PAGE_SIZE,
      })
    )
  );
  const logs = [
    ...(firstPage?.list || []),
    ...remainingResponses.flatMap((response) => response.data.data?.list || []),
  ];

  return logs.reduce(
    (summary, item) => {
      if (REFERRAL_COMMISSION_TYPES.has(item.type) && item.amount > 0) {
        summary.referralIncome += item.amount;
      }
      if (item.amount < 0) {
        summary.deductions += Math.abs(item.amount);
      }
      return summary;
    },
    { referralIncome: 0, deductions: 0 }
  );
}

export default function Affiliate() {
  const { t } = useTranslation("affiliate");
  const { user, common } = useGlobalStore();
  const { data } = useQuery({
    queryKey: ["queryUserAffiliate"],
    queryFn: async () => {
      const response = await queryUserAffiliate();
      return response.data.data;
    },
  });
  const { data: commissionSummary } = useQuery({
    queryKey: ["queryUserAffiliateCommissionSummary"],
    queryFn: queryCommissionSummary,
  });
  const displayedTotalCommission = Math.max(
    commissionSummary?.referralIncome || 0,
    (user?.commission || 0) + (commissionSummary?.deductions || 0),
    data?.total_commission || 0,
    0
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("totalCommission", "Total Commission")}</CardTitle>
          <CardDescription>
            {t("commissionInfo", "Commission Info")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-3xl">
              <Display type="currency" value={displayedTotalCommission} />
            </span>
            <span className="text-muted-foreground text-sm">
              ({t("commissionRate", "Commission Rate")}:{" "}
              {user?.referral_percentage || common?.invite?.referral_percentage}
              %)
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-medium text-lg">
            {t("inviteCode", "Invite Code")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <code className="rounded bg-muted px-2 py-1 font-bold text-2xl">
              {user?.refer_code}
            </code>
            <CopyToClipboard
              onCopy={(_, result) => {
                if (result) {
                  toast.success(t("copySuccess", "Copy Success"));
                }
              }}
              text={`${location?.origin}/#/auth?invite=${user?.refer_code}`}
            >
              <Button className="gap-2" size="sm" variant="secondary">
                <Copy className="h-4 w-4" />
                {t("copyInviteLink", "Copy Invite Link")}
              </Button>
            </CopyToClipboard>
          </div>
        </CardContent>
      </Card>
      <ProList<API.UserAffiliate, Record<string, unknown>>
        header={{
          title: t("inviteRecords", "Invite Records"),
        }}
        renderItem={(item) => (
          <Card className="overflow-hidden">
            <CardContent className="p-3 text-sm">
              <ul className="grid grid-cols-2 gap-3 *:flex *:flex-col">
                <li className="font-semibold">
                  <span className="text-muted-foreground">
                    {t("userIdentifier", "User Identifier")}
                  </span>
                  <span>{item.identifier}</span>
                </li>
                <li className="font-semibold">
                  <span className="text-muted-foreground">
                    {t("registrationTime", "Registration Time")}
                  </span>
                  <time>{formatDate(item.registered_at)}</time>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
        request={async (pagination, filter) => {
          const response = await queryUserAffiliateList({
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
