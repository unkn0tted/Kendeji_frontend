"use client";
import { Outlet, useLocation } from "@tanstack/react-router";
import { cn } from "@workspace/ui/lib/utils";
import type { CSSProperties } from "react";
import { MobileTabbar } from "@/components/mobile-tabbar";
import { HEADER_HEIGHT } from "@/layout/header";
import Announcement from "@/sections/user/announcement";
import { SidebarLeft } from "./sidebar-left";
import { SidebarRight } from "./sidebar-right";

/* Re-declared here (same constant) because the inline --header-h on <header>
   does not cascade to this sibling subtree. */
const shellStyle = { "--header-h": HEADER_HEIGHT } as CSSProperties;

const STICKY_RAIL =
  "sticky top-[calc(var(--header-h)+1rem)] hidden max-h-[calc(100vh-var(--header-h)-2rem)] self-start overflow-y-auto";

export default function UserLayout() {
  const location = useLocation();
  const isSubscribePage = location.pathname === "/subscribe";

  return (
    <div
      className={cn(
        // Wider than .container (max-w-7xl) on purpose: the three-column app
        // shell needs the room; marketing pages keep the narrower container.
        "relative mx-auto grid w-full max-w-[96rem] grid-cols-1 px-4 pt-5 sm:px-6 sm:pt-8 lg:px-8",
        "pb-5 sm:pb-8",
        "lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_auto]",
        isSubscribePage ? "gap-6 2xl:gap-8" : "gap-5"
      )}
      style={shellStyle}
    >
      <SidebarLeft className={cn(STICKY_RAIL, "w-56 lg:block")} />
      <main className="flex min-w-0 flex-col gap-5">
        <Outlet />
      </main>
      <SidebarRight
        className={cn(STICKY_RAIL, "xl:block", {
          "w-56": !isSubscribePage,
          "user-layout__aside--subscribe w-52": isSubscribePage,
        })}
        isSubscribePage={isSubscribePage}
      />
      <Announcement type="popup" />
      <MobileTabbar />
    </div>
  );
}
