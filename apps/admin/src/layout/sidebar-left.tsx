import { Link, useLocation } from "@tanstack/react-router";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { Icon } from "@workspace/ui/composed/icon";
import { cn } from "@workspace/ui/lib/utils";
import React, { useState } from "react";
import { useCommon } from "@/stores/global";
import { type NavItem, useNavs } from "./navs";

/** Nav link look: quiet by default, pink surface + a small left accent bar
 *  when active. `group/nav` lets the icon pick up hover/active tinting. */
const navButtonClass =
  "group/nav relative h-9 rounded-md transition-colors before:absolute before:top-1/2 before:left-0 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary before:opacity-0 before:transition-opacity before:content-[''] data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary data-[active=true]:before:opacity-100";

/** Monochrome nav icons: muted at rest, primary on hover / active row. */
const navIconClass =
  "size-4 shrink-0 text-muted-foreground transition-colors group-hover/nav:text-primary group-data-[active=true]/nav:text-primary";

function hasChildren(obj: any): obj is { items: any[] } {
  return (
    obj && Array.isArray((obj as any).items) && (obj as any).items.length > 0
  );
}

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const common = useCommon();
  const { site } = common;
  const navs = useNavs();
  const pathname = useLocation({ select: (location) => location.pathname });
  const { state, isMobile } = useSidebar();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next: Record<string, boolean> = { ...prev };
      navs.forEach((nav) => {
        if (hasChildren(nav) && next[nav.title] === undefined) {
          next[nav.title] = nav.defaultOpen ?? true;
        }
      });
      return next;
    });
  }, [navs]);

  const handleToggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const normalize = (p: string) =>
    p.endsWith("/") && p !== "/" ? p.replace(/\/+$/, "") : p;
  const isActiveUrl = (url: string) => {
    const path = normalize(pathname);
    const target = normalize(url);
    if (target === "/dashboard") return path === target;
    if (path === target) return true;
    return path.startsWith(`${target}/`);
  };

  const isGroupActive = (nav: NavItem) =>
    (hasChildren(nav) && nav.items?.some((i: any) => isActiveUrl(i.url))) ||
    ("url" in nav && nav.url ? isActiveUrl(nav.url as string) : false);

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next: Record<string, boolean> = { ...prev };
      navs.forEach((nav) => {
        if (hasChildren(nav) && isGroupActive(nav)) next[nav.title] = true;
      });
      return next;
    });
  }, [pathname, navs]);

  const renderCollapsedFlyout = (nav: NavItem) => {
    const active = isGroupActive(nav);

    if (!hasChildren(nav)) {
      // Leaf entry in collapsed mode: the sidebar kit's built-in tooltip
      // provides the label.
      return (
        <SidebarMenuButton
          aria-label={nav.title}
          asChild={!!nav.url}
          className={cn(navButtonClass, "justify-center")}
          isActive={active}
          size="sm"
          tooltip={nav.title}
        >
          {nav.url ? (
            <Link to={nav.url}>
              {nav.icon ? (
                <Icon className={navIconClass} icon={nav.icon} />
              ) : null}
            </Link>
          ) : nav.icon ? (
            <Icon className={navIconClass} icon={nav.icon} />
          ) : null}
        </SidebarMenuButton>
      );
    }

    return (
      <HoverCard closeDelay={200} openDelay={40}>
        <HoverCardTrigger asChild>
          <SidebarMenuButton
            aria-label={nav.title}
            className={cn(navButtonClass, "justify-center")}
            isActive={active}
            size="sm"
          >
            {nav.icon ? (
              <Icon className={navIconClass} icon={nav.icon} />
            ) : null}
          </SidebarMenuButton>
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          avoidCollisions
          className="z-50 w-64 overflow-hidden p-0"
          collisionPadding={8}
          side="right"
          sideOffset={10}
        >
          <div className="flex items-center gap-2 border-border border-b bg-primary/5 px-3 py-2">
            {nav.icon ? (
              <Icon className="size-4 text-primary" icon={nav.icon} />
            ) : null}
            <span className="truncate font-medium text-muted-foreground text-xs">
              {nav.title}
            </span>
          </div>

          <ul className="p-1">
            {nav.items?.map((item: any) => (
              <li key={item.title}>
                <Link
                  className={[
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActiveUrl(item.url)
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent/60",
                  ].join(" ")}
                  to={item.url}
                >
                  {item.icon && <Icon className="size-4" icon={item.icon} />}
                  <span className="truncate">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <Sidebar
      className="border-r-0 bg-transparent p-3 pr-0 [&_[data-slot=sidebar-inner]]:bg-transparent"
      collapsible="icon"
      {...props}
    >
      <SidebarHeader className="rose-shell mb-3 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-11 rounded-md hover:bg-accent/70"
              size="sm"
            >
              <Link to="/">
                <div className="rose-surface flex aspect-square size-8 items-center justify-center rounded-md">
                  <img
                    alt="logo"
                    className="size-6 rounded-md"
                    height={24}
                    src={site.site_logo || "/favicon.svg"}
                    width={24}
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-display font-semibold text-sm">
                    {site.site_name}
                  </span>
                  <span className="truncate text-xs opacity-70">
                    {site.site_desc}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="rose-shell p-2">
        <SidebarMenu>
          {!isMobile && state === "collapsed"
            ? navs.map((nav) => (
                <SidebarMenuItem className="mx-auto" key={nav.title}>
                  {renderCollapsedFlyout(nav)}
                </SidebarMenuItem>
              ))
            : navs.map((nav) => {
                if (hasChildren(nav)) {
                  const isOpen = openGroups[nav.title] ?? false;
                  return (
                    <SidebarGroup className="py-1" key={nav.title}>
                      <SidebarMenuButton
                        className={cn(
                          "group/nav mb-1 flex h-9 w-full items-center justify-between rounded-md font-medium text-muted-foreground transition-colors hover:bg-accent/70 hover:text-accent-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                        )}
                        isActive={isGroupActive(nav)}
                        onClick={() => handleToggleGroup(nav.title)}
                        size="sm"
                        tabIndex={0}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {nav.icon ? (
                            <Icon className={navIconClass} icon={nav.icon} />
                          ) : null}
                          <span className="truncate text-sm">{nav.title}</span>
                        </span>
                        <Icon
                          className={`ml-2 size-4 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                          icon="mdi:chevron-down"
                        />
                      </SidebarMenuButton>
                      {isOpen && (
                        <SidebarGroupContent className="px-2">
                          <SidebarMenu>
                            {nav.items?.map((item: any) => (
                              <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                  asChild
                                  className={navButtonClass}
                                  isActive={isActiveUrl(item.url)}
                                  size="sm"
                                  tooltip={item.title}
                                >
                                  <Link to={item.url}>
                                    {item.icon && (
                                      <Icon
                                        className={navIconClass}
                                        icon={item.icon}
                                      />
                                    )}
                                    <span className="text-sm">
                                      {item.title}
                                    </span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      )}
                    </SidebarGroup>
                  );
                }

                return (
                  <SidebarGroup className="py-1" key={nav.title}>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild={!!nav.url}
                            className={navButtonClass}
                            isActive={nav.url ? isActiveUrl(nav.url) : false}
                            size="sm"
                            tooltip={nav.title}
                          >
                            {nav.url ? (
                              <Link to={nav.url}>
                                {nav.icon ? (
                                  <Icon
                                    className={navIconClass}
                                    icon={nav.icon}
                                  />
                                ) : null}
                                <span className="text-sm">{nav.title}</span>
                              </Link>
                            ) : (
                              <>
                                {nav.icon ? (
                                  <Icon
                                    className={navIconClass}
                                    icon={nav.icon}
                                  />
                                ) : null}
                                <span className="text-sm">{nav.title}</span>
                              </>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                );
              })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
