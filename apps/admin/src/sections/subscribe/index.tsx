"use client";

import { Card, CardContent } from "@workspace/ui/components/card";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import ConfigForm from "./config-form";
import { ProtocolForm } from "./protocol-form";
import { RewriterPanel } from "./rewriter-panel";

export default function Subscribe() {
  const { t } = useTranslation("subscribe");
  const isMobile = useIsMobile();

  return (
    <>
      <section className="space-y-2 rounded-md border bg-card p-4 md:hidden">
        <h2 className="font-semibold text-base">
          {t("config.title", "Subscription Configuration")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t(
            "mobileDesktopOnly",
            "Manage subscription settings on a desktop device."
          )}
        </p>
      </section>
      {!isMobile && (
        <div className="hidden space-y-4 md:block">
          <h2 className="font-semibold text-lg">
            {t("config.title", "Subscription Configuration")}
          </h2>
          <Card className="py-3">
            <CardContent>
              <ConfigForm />
            </CardContent>
          </Card>

          <ProtocolForm />
          <RewriterPanel />
        </div>
      )}
    </>
  );
}
