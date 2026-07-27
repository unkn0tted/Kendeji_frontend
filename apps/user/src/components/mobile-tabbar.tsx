"use client";

import { Link, useLocation } from "@tanstack/react-router";
import { Icon } from "@workspace/ui/composed/icon";
import { cn } from "@workspace/ui/lib/utils";
import { useNavItems } from "@/layout/navs";

/**
 * Fixed bottom tab bar for the logged-in area below the lg breakpoint, where
 * the side rail is hidden. Rendered from the user layout only, so marketing
 * pages never show it. The glass capsule reuses .rose-nav-shell, which
 * already carries the theme's mobile/no-backdrop-filter fallbacks.
 */
export function MobileTabbar() {
  const items = useNavItems();
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.625rem)] lg:hidden">
      <div className="rose-nav-shell mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const isActive =
            location.pathname === item.url ||
            location.pathname.startsWith(`${item.url}/`);
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-0.5 pt-2 pb-2.5 font-medium text-[0.66rem] transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={item.url}
              to={item.url}
            >
              <Icon className="size-5" icon={item.icon} />
              <span className="max-w-full truncate px-1">{item.title}</span>
              {isActive && (
                <span className="absolute inset-x-[30%] bottom-1 h-0.5 rounded-full bg-linear-to-r from-aurora-rose via-aurora-magenta to-aurora-coral" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
