"use client";
import { Outlet, useLocation } from "@tanstack/react-router";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import Announcement from "@/sections/user/announcement";
import { SidebarLeft } from "./sidebar-left";
import { SidebarRight } from "./sidebar-right";

export default function UserLayout() {
  const location = useLocation();
  const isSubscribePage = location.pathname === "/subscribe";

  return (
    <SidebarProvider
      className={cn("container relative py-5 sm:py-7", {
        "gap-4": !isSubscribePage,
        "gap-6 2xl:gap-8": isSubscribePage,
      })}
    >
      <SidebarLeft className="sticky top-[92px] hidden w-56 border-r-0 bg-transparent lg:flex" />
      <SidebarInset
        className={cn(
          "relative min-h-[calc(100vh-92px)] rounded-lg border bg-card p-5 shadow-xs sm:p-7",
          {
            "user-layout__inset--subscribe p-4 sm:p-6 xl:p-7": isSubscribePage,
          }
        )}
      >
        <Outlet />
      </SidebarInset>
      <SidebarRight
        className={cn(
          "sticky top-[92px] hidden border-r-0 bg-transparent 2xl:flex",
          {
            "w-56": !isSubscribePage,
            "user-layout__aside--subscribe w-52": isSubscribePage,
          }
        )}
        isSubscribePage={isSubscribePage}
      />
      <Announcement type="popup" />
    </SidebarProvider>
  );
}
