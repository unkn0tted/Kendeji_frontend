import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";
import { LanguageSwitch } from "@workspace/ui/composed/language-switch";
import { ThemeSwitch } from "@workspace/ui/composed/theme-switch";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useCommon, useUser } from "@/stores/global";
import { UserNav } from "./user-nav";

/**
 * Total rendered header height, the single source for every sticky offset in
 * the user shell. Breakdown: header py-3 (1.5rem) + nav-shell border (2px ≈
 * 0.125rem) + nav-shell py-2 (1rem) + explicit h-12 content row (3rem).
 * Consumers read it as `var(--header-h)`; the layout re-declares the same
 * constant on its own wrapper because inline custom properties on <header>
 * do not cascade to sibling subtrees.
 */
export const HEADER_HEIGHT = "5.625rem";

const headerStyle = { "--header-h": HEADER_HEIGHT } as CSSProperties;

const primaryLinks = [
  { to: "/dashboard", key: "menu.dashboard", fallback: "Dashboard" },
  { to: "/subscribe", key: "menu.subscribe", fallback: "Subscribe" },
  { to: "/wallet", key: "menu.wallet", fallback: "Balance" },
] as const;

export default function Header() {
  const { t } = useTranslation("components");

  const common = useCommon();
  const user = useUser();
  const { site } = common;
  const supportText =
    site.site_desc || t("footer.copyright", "All rights reserved");
  const Logo = (
    <Link
      className="group flex items-center gap-2.5 font-semibold text-base tracking-tight sm:text-lg"
      to="/"
    >
      {site.site_logo && (
        <img
          alt={site.site_name || "logo"}
          className="rounded-md ring-1 ring-primary/18 transition-all duration-200 group-hover:ring-primary/35"
          height={34}
          src={site.site_logo}
          width={34}
        />
      )}
      <span className="font-display text-foreground">{site.site_name}</span>
    </Link>
  );
  return (
    <header
      className="sticky top-0 z-50 bg-background/95 py-3 backdrop-blur-md"
      style={headerStyle}
    >
      <div className="container">
        <div className="rose-nav-shell px-3 py-2 sm:px-4">
          <div className="flex h-12 items-center gap-3 sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <nav className="flex items-center">{Logo}</nav>
              {user ? (
                <nav className="hidden items-center gap-1 md:flex">
                  {primaryLinks.map((link) => (
                    <Link
                      className="rose-surface-interactive rounded-md px-3.5 py-2 font-medium text-foreground/80 text-sm"
                      key={link.to}
                      to={link.to}
                    >
                      {t(link.key, link.fallback)}
                    </Link>
                  ))}
                </nav>
              ) : (
                <div className="rose-surface hidden min-w-0 items-center gap-2 rounded-md px-3 py-2 text-muted-foreground text-sm lg:flex">
                  <span className="size-2.5 rounded-[3px] bg-primary shadow-[0_0_0_6px_oklch(0.68_0.17_8_/0.16)]" />
                  <p className="truncate">{supportText}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!user && (
                <Link
                  className="rose-surface-interactive hidden rounded-md px-4 py-2 font-medium text-foreground/80 text-sm md:inline-flex"
                  to="/purchasing"
                >
                  {t("pricing", "Pricing")}
                </Link>
              )}
              <div className="app-quick-actions">
                <LanguageSwitch />
                <ThemeSwitch />
              </div>
              <UserNav />
              {!user && (
                <Link
                  className={`${buttonVariants({
                    size: "sm",
                  })} rounded-md px-4 font-semibold shadow-primary/10 shadow-sm`}
                  to="/auth"
                >
                  {t("loginRegister", "Login / Register")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
