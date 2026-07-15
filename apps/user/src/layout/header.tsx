import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";
import { LanguageSwitch } from "@workspace/ui/composed/language-switch";
import { ThemeSwitch } from "@workspace/ui/composed/theme-switch";
import { useTranslation } from "react-i18next";
import { useGlobalStore } from "@/stores/global";
import { UserNav } from "./user-nav";

export default function Header() {
  const { t } = useTranslation("components");

  const { common, user } = useGlobalStore();
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
          alt="logo"
          className="rounded-md border"
          height={34}
          src={site.site_logo}
          width={34}
        />
      )}
      <span className="font-display text-foreground">{site.site_name}</span>
    </Link>
  );
  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 py-3 backdrop-blur-md">
      <div className="container">
        <div className="py-0.5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <nav className="flex items-center">{Logo}</nav>
              <div className="hidden min-w-0 items-center gap-2 border-l pl-4 text-muted-foreground text-sm lg:flex">
                <span className="size-2 rounded-full bg-primary" />
                <p className="truncate">{supportText}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!user && (
                <Link
                  className="hidden rounded-md border bg-background px-4 py-2 font-medium text-foreground/80 text-sm transition-colors hover:bg-accent md:inline-flex"
                  to="/purchasing"
                >
                  {t("pricing", "Pricing")}
                </Link>
              )}
              <div className="app-quick-actions flex items-center gap-1 rounded-md border p-1">
                <LanguageSwitch />
                <ThemeSwitch />
              </div>
              <UserNav />
              {!user && (
                <Link
                  className={`${buttonVariants({
                    size: "sm",
                  })} rounded-md px-4 font-semibold`}
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
