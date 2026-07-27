"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Textarea } from "@workspace/ui/components/textarea";
import { EnhancedInput } from "@workspace/ui/composed/enhanced-input";
import { ProList } from "@workspace/ui/composed/pro-list/pro-list";
import {
  commissionWithdraw,
  queryUserAffiliate,
  queryUserAffiliateList,
} from "@workspace/ui/services/user/user";
import { formatDate } from "@workspace/ui/utils/formatting";
import { unitConversion } from "@workspace/ui/utils/unit-conversions";
import { Copy } from "lucide-react";
import { type FormEvent, useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DescriptionList } from "@/components/description-list";
import { Display } from "@/components/display";
import { PageHeader } from "@/components/page-header";
import { useCommon, useGetUserInfo, useUser } from "@/stores/global";

export default function Affiliate() {
  const { t } = useTranslation(["affiliate", "components"]);
  const user = useUser();
  const common = useCommon();
  const getUserInfo = useGetUserInfo();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  // Stored in cents to match `availableCommission` and the API contract.
  const [withdrawAmount, setWithdrawAmount] = useState<number | undefined>(
    undefined
  );
  const [withdrawContent, setWithdrawContent] = useState("");
  const { data, refetch } = useQuery({
    queryKey: ["queryUserAffiliate"],
    queryFn: async () => {
      const response = await queryUserAffiliate();
      return response.data.data;
    },
  });
  const displayedTotalCommission = Math.max(
    data?.total_commission || 0,
    user?.commission || 0,
    0
  );
  const availableCommission = user?.commission ?? data?.total_commission ?? 0;
  const withdrawMutation = useMutation({
    mutationFn: commissionWithdraw,
    onSuccess: async () => {
      toast.success(t("withdrawSuccess", "Withdrawal request submitted"));
      setWithdrawAmount(undefined);
      setWithdrawContent("");
      setWithdrawOpen(false);
      await Promise.all([refetch(), getUserInfo()]);
    },
    onError: () => {
      toast.error(t("withdrawFailed", "Failed to submit withdrawal request"));
    },
  });

  const handleWithdraw = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Already converted to cents by the input's formatOutput.
    const amount = withdrawAmount;
    const content = withdrawContent.trim();

    if (amount === undefined || !Number.isFinite(amount) || amount <= 0) {
      toast.error(t("invalidWithdrawAmount", "Please enter a valid amount"));
      return;
    }

    if (amount > availableCommission) {
      toast.error(
        t("withdrawAmountExceeds", "Amount exceeds available commission")
      );
      return;
    }

    if (!content) {
      toast.error(t("withdrawContentRequired", "Please enter withdrawal info"));
      return;
    }

    withdrawMutation.mutate({
      amount,
      content,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description={t(
          "pageDescription",
          "Invite friends and earn commission on their purchases"
        )}
        title={t("components:menu.affiliate", "Commission")}
      />
      <section className="rose-panel p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="font-semibold">
            {t("totalCommission", "Total Commission")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("commissionInfo", "Commission Info")}
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-bold text-3xl">
              <Display type="currency" value={displayedTotalCommission} />
            </span>
            <span className="text-muted-foreground text-sm">
              ({t("commissionRate", "Commission Rate")}:{" "}
              {user?.referral_percentage || common?.invite?.referral_percentage}
              %)
            </span>
          </div>
          <Dialog onOpenChange={setWithdrawOpen} open={withdrawOpen}>
            <DialogTrigger asChild>
              <Button disabled={availableCommission <= 0}>
                {t("withdraw", "Withdraw")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleWithdraw}>
                <DialogHeader>
                  <DialogTitle>
                    {t("withdrawCommission", "Withdraw Commission")}
                  </DialogTitle>
                  <DialogDescription>
                    {t(
                      "withdrawDescription",
                      "Submit a commission withdrawal request for admin review."
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="font-medium text-sm" htmlFor="amount">
                      {t("withdrawAmount", "Withdrawal Amount")}
                    </label>
                    <EnhancedInput
                      formatInput={(value) =>
                        unitConversion("centsToDollars", value)
                      }
                      formatOutput={(value) =>
                        unitConversion("dollarsToCents", value)
                      }
                      id="amount"
                      min={0}
                      onValueChange={(value) =>
                        setWithdrawAmount(value as number)
                      }
                      placeholder={t("withdrawAmount", "Withdrawal Amount")}
                      step="0.01"
                      type="number"
                      value={withdrawAmount}
                    />
                    <p className="text-muted-foreground text-sm">
                      {t("availableCommission", "Available Commission")}:{" "}
                      <Display type="currency" value={availableCommission} />
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <label className="font-medium text-sm" htmlFor="content">
                      {t("withdrawInfo", "Withdrawal Info")}
                    </label>
                    <Textarea
                      id="content"
                      onChange={(event) =>
                        setWithdrawContent(event.target.value)
                      }
                      placeholder={t(
                        "withdrawInfoPlaceholder",
                        "Enter payment account or withdrawal instructions"
                      )}
                      value={withdrawContent}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button disabled={withdrawMutation.isPending} type="submit">
                    {withdrawMutation.isPending
                      ? t("submitting", "Submitting...")
                      : t("submitWithdraw", "Submit Withdrawal")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>
      <section className="rose-panel p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">{t("inviteCode", "Invite Code")}</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <code className="rounded-lg bg-muted px-2 py-1 font-bold text-2xl">
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
      </section>
      <ProList<API.UserAffiliate, Record<string, unknown>>
        header={{
          title: t("inviteRecords", "Invite Records"),
        }}
        renderItem={(item) => (
          <div className="rose-panel p-4 text-sm sm:p-5">
            <DescriptionList
              className="lg:grid-cols-2"
              items={[
                {
                  label: t("userIdentifier", "User Identifier"),
                  value: <span>{item.identifier}</span>,
                },
                {
                  label: t("registrationTime", "Registration Time"),
                  value: <time>{formatDate(item.registered_at)}</time>,
                },
              ]}
            />
          </div>
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
