import { Icon } from "@workspace/ui/composed/icon";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { cardReveal, sectionReveal, sectionViewport } from "./motion";

export function Stats() {
  const { t } = useTranslation("main");

  const list = [
    {
      name: t("users", "Users"),
      description: t(
        "stats_users_description",
        "Account access, subscription status, and notices stay in one place."
      ),
      icon: "uil:users-alt",
    },
    {
      name: t("servers", "Servers"),
      description: t(
        "stats_servers_description",
        "Server information is organized for quick review and import."
      ),
      icon: "uil:server",
    },
    {
      name: t("locations", "Locations"),
      description: t(
        "stats_locations_description",
        "Regional options stay readable when the available range grows."
      ),
      icon: "uil:map-marker",
    },
  ];

  return (
    <motion.section
      className="rose-shell isolate px-6 py-7 sm:px-8 lg:px-10 lg:py-9"
      initial="hidden"
      variants={sectionReveal}
      viewport={sectionViewport}
      whileInView="visible"
    >
      <div className="rose-grid" />
      <div className="grid gap-8 xl:grid-cols-[0.36fr_0.64fr] xl:items-start">
        <div className="flex flex-col">
          <span className="rose-pill">{t("stats_badge", "Service")}</span>
          <h2 className="mt-6 max-w-sm font-display text-3xl leading-tight sm:text-4xl">
            <span className="rose-section-title">
              {t("stats_title", "Everything important is easier to scan.")}
            </span>
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {list.map((item, index) => (
            <motion.article
              className="rose-panel main-feature-card group hover:-translate-y-1 flex min-h-[176px] flex-col p-5 transition-all duration-300"
              custom={index}
              key={item.name}
              variants={cardReveal}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-5" icon={item.icon} />
                </div>
              </div>
              <h3 className="mt-6 font-display text-2xl leading-none">
                {item.name}
              </h3>
              <p className="mt-4 max-w-xs text-foreground/72 text-sm leading-7">
                {item.description}
              </p>
              <div className="mt-auto pt-8">
                <div className="h-px bg-gradient-to-r from-primary/18 via-primary/28 to-transparent" />
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
