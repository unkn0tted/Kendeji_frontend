import { Link, useLocation } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { Icon } from "@workspace/ui/composed/icon";
import { LanguageSwitch } from "@workspace/ui/composed/language-switch";
import { ThemeSwitch } from "@workspace/ui/composed/theme-switch";
import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { findNavByUrl, useNavs } from "./navs";
import TimezoneSwitch from "./timezone-switch";
import { UserNav } from "./user-nav";

export function Header() {
  const { t } = useTranslation("menu");
  const pathname = useLocation({ select: (location) => location.pathname });
  const navs = useNavs();
  const items = useMemo(() => findNavByUrl(navs, pathname), [navs, pathname]);
  return (
    <header className="relative z-50 shrink-0 px-3 pt-3 pb-2 sm:px-5 sm:pt-4">
      <div className="flex min-h-12 items-center gap-3 border-border/60 border-b px-1 pb-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SidebarTrigger className="size-9 shrink-0 border border-border/70 bg-background/50 shadow-none hover:bg-primary/10 hover:text-primary" />
          <div className="min-w-0 border-border/60 border-l pl-3">
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap overflow-hidden">
                {items.length ? (
                  items.map((item, index) => (
                    <Fragment key={item?.title}>
                      {index !== items.length - 1 && (
                        <BreadcrumbItem className="min-w-0">
                          <BreadcrumbLink asChild>
                            <Link
                              className="truncate"
                              to={item?.url || "/dashboard"}
                            >
                              {item?.title}
                            </Link>
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                      )}
                      {index < items.length - 1 && <BreadcrumbSeparator />}
                      {index === items.length - 1 && (
                        <BreadcrumbPage className="truncate font-medium">
                          {item?.title}
                        </BreadcrumbPage>
                      )}
                    </Fragment>
                  ))
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbPage className="inline-flex items-center gap-1.5 font-medium">
                      <Icon className="size-4 text-primary" icon="uil:apps" />
                      {t("Dashboard", "Dashboard")}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
        <div className="app-quick-actions shrink-0">
          <LanguageSwitch />
          <TimezoneSwitch />
          <ThemeSwitch />
        </div>
        <UserNav />
      </div>
    </header>
  );
}
