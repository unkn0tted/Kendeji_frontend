import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Icon } from "@workspace/ui/composed/icon";
import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useCommon, useUser } from "@/stores/global";

export function Hero() {
  const { t } = useTranslation("main");
  const common = useCommon();
  const user = useUser();
  const { site } = common;
  const prefersReducedMotion = useReducedMotion();
  const statusItems = [
    {
      icon: "uil:shield-check",
      title: t("hero_floating_security_title", "Stable routing"),
      description: t(
        "hero_floating_security_desc",
        "Keep connection details organized without extra steps."
      ),
    },
    {
      icon: "uil:qrcode-scan",
      title: t("hero_quick_import_title", "Quick import"),
      description: t(
        "hero_quick_import_desc",
        "Copy, scan, or import your subscription from one place."
      ),
    },
    {
      icon: "uil:apps",
      title: t("hero_floating_global_title", "Plan overview"),
      description: t(
        "hero_floating_global_desc",
        "Traffic, expiry, and renewal actions stay easy to find."
      ),
    },
  ];

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="rose-shell main-hero isolate px-5 py-7 sm:px-8 sm:py-10 lg:px-10 lg:py-12"
      initial={{ opacity: 0, y: 28 }}
      transition={{ duration: 0.72, ease: "easeOut" }}
    >
      <div className="rose-grid" />
      <div className="main-hero__aura" />
      <div className="main-hero__scan" />
      <div aria-hidden="true" className="main-hero__particles">
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            style={{ "--particle-index": index } as CSSProperties}
          />
        ))}
      </div>
      <div className="grid min-h-[min(68vh,46rem)] items-center gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(25rem,1.08fr)] lg:gap-10">
        <div className="flex flex-col items-start lg:pl-1">
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.68, delay: 0.08, ease: "easeOut" }}
          >
            <span className="rose-pill">
              {t("hero_badge", "Network access")}
            </span>
            <h1 className="mt-6 max-w-3xl font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
              {t("welcome", "Welcome to")}
              <br />
              <span className="main-hero__title-gradient">
                {site.site_name}
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base text-foreground/78 leading-8 sm:text-lg">
              {t(
                "hero_description",
                "Manage your subscription, import links, and view account status from a cleaner workspace."
              )}
            </p>
          </motion.div>
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mt-9 flex w-full max-w-xl flex-wrap items-center gap-3 sm:justify-start lg:justify-end"
            initial={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.58, delay: 0.22, ease: "easeOut" }}
          >
            <Button
              asChild
              className="h-12 px-6 font-semibold shadow-primary/15 shadow-sm"
            >
              <Link to={user ? "/dashboard" : "/auth"}>
                {t("started", "Get Started")}
              </Link>
            </Button>
            {!user && (
              <Button
                asChild
                className="rose-surface-interactive hidden h-12 px-6 font-semibold text-foreground sm:inline-flex"
                variant="outline"
              >
                <Link to="/purchasing">
                  {t("product_showcase_action", "View Plan")}
                </Link>
              </Button>
            )}
          </motion.div>
        </div>
        <motion.div
          animate={{ opacity: 1, scale: 1, x: 0 }}
          className="main-hero__visual relative mx-auto w-full max-w-[42rem] lg:justify-self-end"
          initial={{ opacity: 0, scale: 0.96, x: 24 }}
          transition={{ duration: 0.78, delay: 0.16, ease: "easeOut" }}
        >
          <div aria-hidden="true" className="main-orbit">
            <span className="main-orbit__ring main-orbit__ring--one" />
            <span className="main-orbit__ring main-orbit__ring--two" />
            <span className="main-orbit__ring main-orbit__ring--three" />
            <span className="main-orbit__dot main-orbit__dot--one" />
            <span className="main-orbit__dot main-orbit__dot--two" />
            <span className="main-orbit__dot main-orbit__dot--three" />
            <span className="main-orbit__dot main-orbit__dot--four" />
          </div>

          <div className="main-hero-console">
            <div className="main-hero-console__header">
              <div>
                <p className="font-medium text-[0.72rem] text-muted-foreground uppercase tracking-[0.16em]">
                  {t("hero_visual_eyebrow", "Workspace")}
                </p>
                <p className="mt-2 font-semibold text-2xl">
                  {t("hero_visual_description", "Ready to connect")}
                </p>
              </div>
              {site.site_logo ? (
                <img
                  alt=""
                  className="size-12 rounded-md border border-primary/12 bg-background object-contain p-1.5"
                  height={48}
                  src={site.site_logo}
                  width={48}
                />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-md border border-primary/12 bg-primary/10 text-primary">
                  <Icon className="size-5" icon="uil:shield-check" />
                </div>
              )}
            </div>
            <div className="main-hero-console__meter">
              <span />
            </div>
            <div className="mt-5 grid gap-3">
              {statusItems.map((item) => (
                <motion.div
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : {
                          y: [0, -5, 0],
                        }
                  }
                  className="main-status-card flex items-start gap-3 p-3"
                  key={item.title}
                  transition={{
                    duration: 4.8,
                    ease: "easeInOut",
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "mirror",
                  }}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4" icon={item.icon} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    y: [0, -12, 0],
                    rotate: [0, 0.35, 0],
                  }
            }
            className="main-hero-floating main-hero-floating--usage"
            transition={{
              duration: 6,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "mirror",
            }}
          >
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">
                {t("hero_tag_speed", "Subscription")}
              </span>
              <span className="font-semibold text-primary">
                {t("hero_tag_design", "Active")}
              </span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-primary/10">
              <div className="h-full w-2/3 rounded-full bg-primary" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t("users", "Users")}</p>
                <p className="mt-1 font-semibold">
                  {t("hero_status_online", "Online")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t("servers", "Servers")}
                </p>
                <p className="mt-1 font-semibold">
                  {t("hero_status_auto", "Auto")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t("locations", "Locations")}
                </p>
                <p className="mt-1 font-semibold">
                  {t("hero_status_global", "Global")}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
