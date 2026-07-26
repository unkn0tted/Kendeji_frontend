"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { AuroraOrb } from "@workspace/ui/composed/aurora-orb";
import { Icon } from "@workspace/ui/composed/icon";
import { LanguageSwitch } from "@workspace/ui/composed/language-switch";
import { ThemeSwitch } from "@workspace/ui/composed/theme-switch";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useGlobalStore } from "@/stores/global";
import EmailAuthForm from "./email/auth-form";

function stripSiteName(value: string, siteName: string) {
  return value
    .replaceAll(siteName, "")
    .replace(/^[\s,，.。:：|｜-]+|[\s,，.。:：|｜-]+$/g, "")
    .trim();
}

export default function Auth() {
  const { t } = useTranslation("auth");
  const { common, user } = useGlobalStore();
  const { site } = common;
  const sanitizedSiteDescription = site.site_name
    ? stripSiteName(site.site_desc || "", site.site_name)
    : site.site_desc;
  const authDescription =
    sanitizedSiteDescription ||
    t("login.description", "Enter your credentials to continue");

  const navigate = useNavigate();
  useEffect(() => {
    if (user) {
      navigate({ to: "/dashboard" });
    }
  }, [navigate, user]);

  return (
    <main className="rose-form relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8">
      <div className="rose-grid opacity-35" />
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rose-shell hidden flex-col justify-between p-8 lg:flex xl:p-10">
          <div>
            <Link className="group inline-flex items-center gap-3" to="/">
              <img
                alt="logo"
                className="rounded-md ring-1 ring-primary/18 transition-all duration-200 group-hover:ring-primary/35"
                height={44}
                src={site.site_logo || "/favicon.svg"}
                width={44}
              />
            </Link>
            <span className="rose-pill mt-8">Admin</span>
            <h1 className="mt-6 max-w-xl font-display text-5xl leading-tight">
              <span className="rose-section-title">
                {site.site_name || t("login.title", "Login")}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground leading-8">
              {authDescription}
            </p>
            <div className="rose-panel mt-8 p-6">
              <AuroraOrb
                className="mx-auto max-w-sm"
                logo={site.site_logo || undefined}
              />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: "uil:shield-check", title: "Admin" },
              { icon: "uil:lock-access", title: t("check.title", "Verify") },
              { icon: "uil:setting", title: t("login.title", "Login") },
            ].map((item) => (
              <div
                className="rose-panel flex min-h-24 flex-col items-center justify-center gap-3 px-3 py-4 text-center"
                key={item.title}
              >
                <div className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-5" icon={item.icon} />
                </div>
                <p className="font-semibold text-sm">{item.title}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rose-shell flex items-center p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[30rem]">
            <div className="rose-panel p-6 sm:p-8">
              <Link
                className="group inline-flex items-center gap-3 lg:hidden"
                to="/"
              >
                <img
                  alt="logo"
                  className="rounded-md ring-1 ring-primary/18 transition-all duration-200 group-hover:ring-primary/35"
                  height={40}
                  src={site.site_logo || "/favicon.svg"}
                  width={40}
                />
                <span className="font-display text-xl">
                  <span className="rose-section-title">{site.site_name}</span>
                </span>
              </Link>
              <div className="mt-6 lg:mt-0">
                <span className="rose-pill">Admin</span>
              </div>
              <div className="mt-8">
                <EmailAuthForm />
              </div>
              <div className="mt-8 flex items-center justify-between border-primary/10 border-t pt-5 dark:border-white/10">
                <div className="app-quick-actions">
                  <LanguageSwitch />
                  <ThemeSwitch />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
