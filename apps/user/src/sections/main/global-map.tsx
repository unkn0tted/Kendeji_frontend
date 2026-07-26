import { Icon } from "@workspace/ui/composed/icon";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { cardReveal, sectionReveal, sectionViewport } from "./motion";

export function GlobalMap() {
  const { t } = useTranslation("main");
  const notes = [
    {
      icon: "uil:shuffle",
      title: t("global_map_pillar_network_title", "Routing Rhythm"),
      description: t(
        "global_map_pillar_network_desc",
        "Protocol and import options are kept close to the dashboard."
      ),
    },
    {
      icon: "uil:map-marker",
      title: t("global_map_pillar_coverage_title", "Regional Spread"),
      description: t(
        "global_map_pillar_coverage_desc",
        "Region labels and node details stay compact and readable."
      ),
    },
    {
      icon: "uil:crosshair",
      title: t("global_map_pillar_experience_title", "Interaction Focus"),
      description: t(
        "global_map_pillar_experience_desc",
        "Copy, scan, and import actions are placed where users expect them."
      ),
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
      <div className="grid items-center gap-8 xl:grid-cols-[0.46fr_0.54fr] xl:gap-10">
        <div className="flex flex-col">
          <span className="rose-pill">
            {t("global_map_badge", "Global Network")}
          </span>
          <h2 className="mt-6 max-w-lg font-display text-3xl leading-tight sm:text-4xl">
            <span className="rose-section-title">
              {t("global_map_itle", "Wider Coverage, Lighter Expression")}
            </span>
          </h2>
          <p className="mt-4 max-w-xl text-base text-muted-foreground leading-8 sm:text-lg">
            {t(
              "global_map_description",
              "Region, protocol, and import information are arranged so connection setup stays predictable."
            )}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {notes.map((item, index) => (
              <motion.div
                className={`rose-panel main-feature-card min-h-[156px] p-5 sm:p-6 ${
                  index === 2 ? "sm:col-span-2" : ""
                }`}
                custom={index}
                key={item.title}
                variants={cardReveal}
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" icon={item.icon} />
                  </div>
                  <div>
                    <p className="font-semibold text-[1.02rem]">{item.title}</p>
                    <p className="mt-2 max-w-sm text-muted-foreground text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <motion.div
          className="relative mx-auto grid w-full max-w-[44rem] gap-4 xl:justify-self-end"
          custom={1}
          variants={cardReveal}
        >
          <div className="main-map-stage">
            <div className="main-map-stage__grid" />
            <div className="main-map-stage__route main-map-stage__route--one" />
            <div className="main-map-stage__route main-map-stage__route--two" />
            <div className="main-map-stage__route main-map-stage__route--three" />
            <span className="main-map-stage__node main-map-stage__node--one" />
            <span className="main-map-stage__node main-map-stage__node--two" />
            <span className="main-map-stage__node main-map-stage__node--three" />
            <span className="main-map-stage__node main-map-stage__node--four" />
            <div className="flex items-center justify-between gap-4 border-primary/10 border-b pb-4 dark:border-white/10">
              <div>
                <p className="font-medium text-[0.72rem] text-muted-foreground uppercase tracking-[0.16em]">
                  {t("global_map_visual_eyebrow", "Node overview")}
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-md border border-primary/12 bg-primary/10 text-primary">
                <Icon className="size-5" icon="uil:map-marker" />
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                {
                  region: t("global_map_region_asia", "Asia"),
                  status: t("global_map_status_available", "Available"),
                  icon: "uil:location-point",
                },
                {
                  region: t("global_map_region_europe", "Europe"),
                  status: t("global_map_status_available", "Available"),
                  icon: "uil:location-point",
                },
                {
                  region: t("global_map_region_america", "America"),
                  status: t("global_map_status_available", "Available"),
                  icon: "uil:location-point",
                },
              ].map((item) => (
                <div
                  className="main-map-region rose-surface flex items-center justify-between gap-4 p-3"
                  key={item.region}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-4" icon={item.icon} />
                    </div>
                    <div>
                      <p className="font-semibold">{item.region}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.status}
                      </p>
                    </div>
                  </div>
                  <span className="h-2 w-16 rounded-full bg-primary/20">
                    <span className="block h-full w-3/4 rounded-full bg-primary" />
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <motion.div
              className="rose-panel main-feature-card p-4"
              custom={2}
              variants={cardReveal}
            >
              <p className="font-semibold text-sm">
                {t("global_map_floating_left_title", "Import")}
              </p>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                {t(
                  "global_map_floating_left_desc",
                  "Subscription links and QR codes are available in the dashboard."
                )}
              </p>
            </motion.div>
            <motion.div
              className="rose-panel main-feature-card p-4"
              custom={3}
              variants={cardReveal}
            >
              <p className="font-semibold text-sm">
                {t("global_map_floating_right_title", "Protocols")}
              </p>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                {t(
                  "global_map_floating_right_desc",
                  "Switch protocol output before copying or scanning."
                )}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
