"use client";
import { Link, useLocation } from "@tanstack/react-router";
import { Icon } from "@workspace/ui/composed/icon";
import { cn } from "@workspace/ui/lib/utils";
import { useNavs } from "@/layout/navs";

/** Desktop navigation rail: a plain grouped link list on the aurora
 *  background. Nav titles from useNavs() arrive already translated. */
export function SidebarLeft({ className }: { className?: string }) {
  const location = useLocation();
  const navs = useNavs();

  return (
    <aside className={className}>
      <nav className="flex flex-col gap-5">
        {navs.map((nav) => (
          <div className="flex flex-col gap-0.5" key={nav.title}>
            {nav.items && (
              <p className="px-3 pb-1.5 font-semibold text-[0.68rem] text-muted-foreground uppercase tracking-[0.14em]">
                {nav.title}
              </p>
            )}
            {(nav.items || [nav]).map((item) => {
              const isActive = item.url === location.pathname;
              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 font-semibold text-primary before:absolute before:inset-y-2 before:start-0 before:w-0.5 before:rounded-full before:bg-primary"
                      : "text-foreground/72 hover:bg-glass-strong hover:text-foreground"
                  )}
                  key={item.title}
                  to={item.url || "/"}
                >
                  {item.icon && (
                    <Icon className="size-4 shrink-0" icon={item.icon} />
                  )}
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
