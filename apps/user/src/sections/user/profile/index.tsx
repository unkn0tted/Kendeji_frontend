import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/page-header";
import ChangePassword from "./change-password";
import NotifySettings from "./notify-settings";
import ThirdPartyAccounts from "./third-party-accounts";

export default function Profile() {
  const { t } = useTranslation(["profile", "components"]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description={t(
          "pageDescription",
          "Manage your linked accounts, notifications and password"
        )}
        title={t("components:menu.profile", "User Detail")}
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:*:flex-auto">
        <ThirdPartyAccounts />
        <NotifySettings />
        <ChangePassword />
      </div>
    </div>
  );
}
