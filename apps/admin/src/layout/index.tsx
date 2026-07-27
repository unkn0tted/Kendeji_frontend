import { Outlet } from "@tanstack/react-router";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { getCookie } from "@workspace/ui/lib/cookies";
import { Header } from "@/layout/header";
import { SidebarLeft } from "./sidebar-left";

export default function DashboardLayout() {
  const sidebarState = getCookie("sidebar_state");
  const defaultOpen = sidebarState === undefined || sidebarState === "true";

  return (
    <SidebarProvider
      className="relative h-dvh min-h-0 overflow-hidden bg-transparent"
      defaultOpen={defaultOpen}
    >
      <div className="rose-grid opacity-20" />
      <SidebarLeft />
      <SidebarInset className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-transparent">
        <Header />
        {/* The single scroll container: sticky elements inside routed pages
            stick against this, not a nested wrapper. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5 sm:px-5">
          <div className="rose-shell flex min-h-full flex-col p-3 sm:p-5">
            <div className="relative flex flex-1 flex-col gap-4">
              <Outlet />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
