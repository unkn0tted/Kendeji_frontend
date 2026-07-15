import { Outlet } from "@tanstack/react-router";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { getCookie } from "@workspace/ui/lib/cookies";
import { useEffect, useState } from "react";
import { Header } from "@/layout/header";
import { SidebarLeft } from "./sidebar-left";

export default function DashboardLayout() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const sidebarState = getCookie("sidebar_state");
    if (sidebarState !== undefined) {
      setOpen(sidebarState === "true");
    }
  }, []);

  return (
    <SidebarProvider
      className="relative min-h-svh overflow-hidden bg-background"
      defaultOpen={open}
    >
      <SidebarLeft />
      <SidebarInset className="relative flex-grow overflow-hidden bg-background">
        <Header />
        <main className="h-[calc(100vh-65px)] flex-grow overflow-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="relative mx-auto flex min-h-full w-full max-w-[1600px] flex-col gap-5">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
