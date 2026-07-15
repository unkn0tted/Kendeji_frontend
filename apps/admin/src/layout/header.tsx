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
import { useGlobalStore } from "@/stores/global";
import { findNavByUrl, useNavs } from "./navs";
import TimezoneSwitch from "./timezone-switch";
import { UserNav } from "./user-nav";

export function Header() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const navs = useNavs();
  const { common } = useGlobalStore();
  const { site } = common;
  const items = useMemo(() => findNavByUrl(navs, pathname), [pathname]);
  return (
    <header className="sticky top-0 z-50 shrink-0 border-b bg-card/95 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <SidebarTrigger className="border bg-background shadow-none hover:bg-accent" />
            <Link
              className="hidden min-w-0 items-center gap-2.5 font-semibold text-sm tracking-tight sm:flex"
              to="/dashboard"
            >
              <img
                alt="logo"
                className="size-8 rounded-md border"
                height={32}
                src={site.site_logo || "/favicon.svg"}
                width={32}
              />
              <span className="truncate font-display text-foreground">
                {site.site_name}
              </span>
            </Link>
            <div className="hidden h-7 w-px bg-border md:block" />
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
                      Dashboard
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="app-quick-actions flex shrink-0 items-center gap-1 rounded-md border p-1">
            <LanguageSwitch />
            <TimezoneSwitch />
            <ThemeSwitch />
          </div>
          <UserNav />
        </div>
      </div>
    </header>
  );
}
