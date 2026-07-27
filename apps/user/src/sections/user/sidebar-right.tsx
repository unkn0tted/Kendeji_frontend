"use client";

import { Button } from "@workspace/ui/components/button";
import { Icon } from "@workspace/ui/composed/icon";
import { cn } from "@workspace/ui/lib/utils";
import { isBrowser } from "@workspace/ui/utils/index";
import CopyToClipboard from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Display } from "@/components/display";
import Recharge from "@/sections/subscribe/recharge";
import { useUser } from "@/stores/global";

interface SidebarRightProps {
  className?: string;
  isSubscribePage?: boolean;
}

export function SidebarRight({
  className,
  isSubscribePage = false,
}: Readonly<SidebarRightProps>) {
  const user = useUser();
  const { t } = useTranslation("layout");
  const inviteLink =
    isBrowser() && user?.refer_code
      ? `${window.location.origin}/#/auth?invite=${user.refer_code}`
      : "";
  const shouldShowReferralPanel = isSubscribePage || Boolean(user?.refer_code);

  return (
    <aside className={className}>
      <div className="subscribe-side-rail">
        <section className="subscribe-side-rail__panel">
          <div className="subscribe-side-rail__panel-header">
            <div className="space-y-1">
              <p className="subscribe-side-rail__eyebrow">
                {t("accountOverview", "Account Overview")}
              </p>
              <h3 className="subscribe-side-rail__title">
                {t("accountBalance", "Account Balance")}
              </h3>
            </div>
            <Recharge
              className="subscribe-side-rail__action"
              size="sm"
              variant="secondary"
            />
          </div>

          <div className="subscribe-side-rail__balance">
            <span className="subscribe-side-rail__balance-label">
              {t("accountBalance", "Account Balance")}
            </span>
            <strong className="subscribe-side-rail__balance-value">
              <Display type="currency" value={user?.balance} />
            </strong>
          </div>

          <div className="subscribe-side-rail__metric-list">
            <div className="subscribe-side-rail__metric">
              <span className="subscribe-side-rail__metric-label">
                {t("giftAmount", "Gift Amount")}
              </span>
              <span className="subscribe-side-rail__metric-value">
                <Display type="currency" value={user?.gift_amount} />
              </span>
            </div>
            <div className="subscribe-side-rail__metric">
              <span className="subscribe-side-rail__metric-label">
                {t("commission", "Commission")}
              </span>
              <span className="subscribe-side-rail__metric-value">
                <Display type="currency" value={user?.commission} />
              </span>
            </div>
          </div>
        </section>

        {shouldShowReferralPanel && (
          <section className="subscribe-side-rail__panel">
            <div className="subscribe-side-rail__panel-header">
              <div className="space-y-1">
                <p className="subscribe-side-rail__eyebrow">
                  {t("referralOverview", "Referral Overview")}
                </p>
                <h3 className="subscribe-side-rail__title">
                  {t("inviteCode", "Invite Code")}
                </h3>
              </div>
              {user?.refer_code && (
                <CopyToClipboard
                  onCopy={(_text: string, result: boolean) => {
                    if (result) {
                      toast.success(t("copySuccess", "Copy Success"));
                    }
                  }}
                  text={inviteLink}
                >
                  <Button
                    className="subscribe-side-rail__copy"
                    size="icon"
                    variant="ghost"
                  >
                    <Icon className="size-4" icon="mdi:content-copy" />
                  </Button>
                </CopyToClipboard>
              )}
            </div>

            <div className="subscribe-side-rail__invite">
              <span className="subscribe-side-rail__metric-label">
                {t("inviteCode", "Invite Code")}
              </span>
              <span
                className={cn("subscribe-side-rail__invite-code", {
                  "text-foreground/42": !user?.refer_code,
                })}
              >
                {user?.refer_code || "--"}
              </span>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
