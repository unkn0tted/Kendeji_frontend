import { Icon } from "@workspace/ui/composed/icon";
import { useTranslation } from "react-i18next";
import CurrencyForm from "./basic-settings/currency-form";
import PrivacyPolicyForm from "./basic-settings/privacy-policy-form";
import SiteForm from "./basic-settings/site-form";
import TosForm from "./basic-settings/tos-form";
import LogCleanupForm from "./log-cleanup/log-cleanup-form";
import InviteForm from "./user-security/invite-form";
import RegisterForm from "./user-security/register-form";
import VerifyCodeForm from "./user-security/verify-code-form";
import VerifyForm from "./user-security/verify-form";

export default function System() {
  const { t } = useTranslation("system");

  const formSections = [
    {
      id: "basic-settings",
      icon: "uil:setting",
      title: t("basicSettings", "Basic Settings"),
      description: t(
        "basicSettingsDescription",
        "Site information, currency, terms of service and privacy policy"
      ),
      forms: [
        { id: "site", component: SiteForm },
        { id: "currency", component: CurrencyForm },
        { id: "tos", component: TosForm },
        { id: "privacy-policy", component: PrivacyPolicyForm },
      ],
    },
    {
      id: "user-security",
      icon: "uil:shield-check",
      title: t("userSecuritySettings", "User & Security"),
      description: t(
        "userSecuritySettingsDescription",
        "Registration, invitation and verification settings"
      ),
      forms: [
        { id: "register", component: RegisterForm },
        { id: "invite", component: InviteForm },
        { id: "verify", component: VerifyForm },
        { id: "verify-code", component: VerifyCodeForm },
      ],
    },
    {
      id: "log-settings",
      icon: "uil:file-alt",
      title: t("logSettings", "Log Settings"),
      description: t(
        "logSettingsDescription",
        "Log retention and automatic cleanup rules"
      ),
      forms: [{ id: "log-cleanup", component: LogCleanupForm }],
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {formSections.map((section) => (
        <section className="rose-panel p-6" key={section.id}>
          <header className="flex items-start gap-3 border-b pb-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" icon={section.icon} />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-base leading-tight">
                {section.title}
              </h2>
              <p className="mt-1 text-muted-foreground text-sm">
                {section.description}
              </p>
            </div>
          </header>
          <div className="divide-y divide-border/60">
            {section.forms.map((form) => {
              const FormComponent = form.component;
              return (
                <div className="py-4 last:pb-0" key={form.id}>
                  <FormComponent />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
