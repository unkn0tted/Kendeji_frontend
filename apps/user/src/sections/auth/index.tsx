"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Link } from "@tanstack/react-router";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Icon } from "@workspace/ui/composed/icon";
import { LanguageSwitch } from "@workspace/ui/composed/language-switch";
import { ThemeSwitch } from "@workspace/ui/composed/theme-switch";
import { useTranslation } from "react-i18next";
import { useGlobalStore } from "@/stores/global";
import EmailAuthForm from "./email/auth-form";
import { OAuthMethods } from "./oauth-methods";
import PhoneAuthForm from "./phone/auth-form";

function stripSiteName(value: string, siteName: string) {
  return value
    .replaceAll(siteName, "")
    .replace(/^[\s,，.。:：|｜-]+|[\s,，.。:：|｜-]+$/g, "")
    .trim();
}

export default function Main() {
  const { t } = useTranslation("auth");
  const { t: tMain } = useTranslation("main");
  const { common } = useGlobalStore();
  const { site, auth } = common;
  const sanitizedSiteDescription = site.site_name
    ? stripSiteName(site.site_desc || "", site.site_name)
    : site.site_desc;
  const authDescription =
    sanitizedSiteDescription || t("authTagline", "Welcome back");
  const features = [
    {
      icon: "uil:users-alt",
      title: tMain("users", "Users"),
    },
    {
      icon: "uil:server",
      title: tMain("servers", "Servers"),
    },
    {
      icon: "uil:map-marker",
      title: tMain("locations", "Locations"),
    },
  ];

  const AUTH_METHODS = [
    {
      key: "email",
      enabled: auth.email.enable,
      children: <EmailAuthForm />,
    },
    {
      key: "mobile",
      enabled: auth.mobile.enable,
      children: <PhoneAuthForm />,
    },
  ].filter((method) => method.enabled);

  return (
    <main className="rose-form relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8">
      <div className="rose-grid opacity-35" />
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rose-shell hidden flex-col justify-between p-8 lg:flex xl:p-10">
          <div>
            {site.site_logo && (
              <Link className="group inline-flex items-center gap-3" to="/">
                <img
                  alt="logo"
                  className="rounded-md border"
                  height={44}
                  src={site.site_logo}
                  width={44}
                />
              </Link>
            )}
            <span className="rose-pill mt-8">{t("login.title", "Login")}</span>
            <h1 className="mt-6 max-w-xl font-display text-5xl leading-tight">
              <span className="rose-section-title">
                {site.site_name || t("login.title", "Login")}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground leading-8">
              {authDescription}
            </p>
            <div className="mt-8 overflow-hidden rounded-md border border-primary/10 bg-white/55 dark:border-white/8 dark:bg-white/5">
              <DotLottieReact
                autoplay
                className="mx-auto aspect-[4/3] w-full max-w-sm"
                loop
                src="./assets/lotties/login.json"
              />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {features.map((item) => (
              <div
                className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-md border border-primary/10 bg-white/58 px-3 py-4 text-center dark:border-white/8 dark:bg-white/5"
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
                {site.site_logo && (
                  <img
                    alt="logo"
                    className="rounded-md border"
                    height={40}
                    src={site.site_logo}
                    width={40}
                  />
                )}
                <span className="font-display text-xl">
                  <span className="rose-section-title">{site.site_name}</span>
                </span>
              </Link>
              <div className="mt-6 lg:mt-0">
                <span className="rose-pill">{t("login.title", "Login")}</span>
                <h2 className="mt-5 font-display font-semibold text-2xl leading-tight">
                  {t(
                    "verifyAccountDesc",
                    "Please login or register to continue"
                  )}
                </h2>
              </div>
              <div className="mt-8">
                {AUTH_METHODS.length === 1
                  ? AUTH_METHODS[0]?.children
                  : AUTH_METHODS[0] && (
                      <Tabs
                        className="gap-4"
                        defaultValue={AUTH_METHODS[0].key}
                      >
                        <TabsList className="flex w-full *:flex-1">
                          {AUTH_METHODS.map((item) => (
                            <TabsTrigger key={item.key} value={item.key}>
                              {t(`methods.${item.key}`)}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {AUTH_METHODS.map((item) => (
                          <TabsContent key={item.key} value={item.key}>
                            {item.children}
                          </TabsContent>
                        ))}
                      </Tabs>
                    )}
              </div>
              <div className="mt-8 border-primary/10 border-t pt-6 dark:border-white/10">
                <OAuthMethods />
              </div>
              <div className="mt-8 flex flex-col gap-4 border-primary/10 border-t pt-5 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                <div className="app-quick-actions flex items-center gap-1 rounded-md border border-primary/10 bg-white/60 p-1 dark:border-white/8 dark:bg-white/5">
                  <LanguageSwitch />
                  <ThemeSwitch />
                </div>
                <div className="flex flex-wrap gap-3 font-medium text-muted-foreground">
                  <Link
                    className="transition-colors hover:text-primary"
                    to="/tos"
                  >
                    {t("tos", "Terms of Service")}
                  </Link>
                  <Link
                    className="transition-colors hover:text-primary"
                    to="/privacy-policy"
                  >
                    {t("privacyPolicy", "Privacy Policy")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
