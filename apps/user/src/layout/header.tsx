import { Link, useMatches } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";
import { LanguageSwitch } from "@workspace/ui/composed/language-switch";
import { ThemeSwitch } from "@workspace/ui/composed/theme-switch";
import { cn } from "@workspace/ui/lib/utils";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useCommon, useUser } from "@/stores/global";
import { UserNav } from "./user-nav";

// Also used by the user shell's sticky sidebars.
export const HEADER_HEIGHT = "4rem";

const headerStyle = { "--header-h": HEADER_HEIGHT } as CSSProperties;

const primaryLinks = [
  { to: "/dashboard", key: "menu.dashboard", fallback: "Dashboard" },
  { to: "/subscribe", key: "menu.subscribe", fallback: "Subscribe" },
  { to: "/wallet", key: "menu.wallet", fallback: "Balance" },
] as const;

export default function Header() {
  const { t } = useTranslation("components");
  const matches = useMatches();
  const isUserArea = matches.some(
    (match) => match.routeId === "/(main)/(user)"
  );

  const common = useCommon();
  const user = useUser();
  const { site } = common;
  const supportText =
    site.site_desc || t("footer.copyright", "All rights reserved");
  const Logo = (
    <Link
      className="group flex min-w-0 items-center gap-2.5 font-semibold text-base sm:text-lg"
      to="/"
    >
      {site.site_logo && (
        <img
          alt={site.site_name || "logo"}
          className="shrink-0 rounded-md ring-1 ring-primary/18 transition-all duration-200 group-hover:ring-primary/35"
          height={34}
          src={site.site_logo}
          width={34}
        />
      )}
      <span className="truncate font-display text-foreground">
        {site.site_name}
      </span>
    </Link>
  );
  return (
    <header
      className="sticky top-0 z-50 box-border h-16 border-border/60 border-b bg-secondary/80 backdrop-blur-md"
      style={headerStyle}
    >
      <div
        className={cn(
          "h-full",
          isUserArea
            ? "mx-auto w-full max-w-[96rem] px-4 sm:px-6 lg:px-8"
            : "container"
        )}
      >
        <div className="flex h-full items-center gap-3 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <nav className="flex min-w-0 items-center">{Logo}</nav>
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
          <div className="flex shrink-0 items-center gap-2">
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
    </header>
  );
}
