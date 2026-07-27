import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface NavItem {
  title: string;
  url?: string;
  icon?: string;
  items?: NavItem[];
  defaultOpen?: boolean;
}

export function useNavs() {
  const { t } = useTranslation("menu");

  const navs: NavItem[] = useMemo(
    () => [
      {
        title: t("Dashboard", "Dashboard"),
        url: "/dashboard",
        icon: "uil:dashboard",
      },

      {
        title: t("Maintenance", "Maintenance"),
        icon: "uil:server-network",
        items: [
          {
            title: t("Server Management", "Server Management"),
            url: "/dashboard/servers",
            icon: "uil:server",
          },
          {
            title: t("Node Management", "Node Management"),
            url: "/dashboard/nodes",
            icon: "uil:sitemap",
          },
          {
            title: t("Subscribe Config", "Subscribe Config"),
            url: "/dashboard/subscribe",
            icon: "uil:ruler",
          },
          {
            title: t("Product Management", "Product Management"),
            url: "/dashboard/product",
            icon: "uil:shop",
          },
        ],
      },

      {
        title: t("Commerce", "Commerce"),
        icon: "uil:chart-growth",
        items: [
          {
            title: t("Order Management", "Order Management"),
            url: "/dashboard/order",
            icon: "uil:clipboard-notes",
          },
          {
            title: t("Coupon Management", "Coupon Management"),
            url: "/dashboard/coupon",
            icon: "uil:ticket",
          },
          {
            title: t("Marketing Management", "Marketing Management"),
            url: "/dashboard/marketing",
            icon: "uil:chart-line",
          },
          {
            title: t("Announcement Management", "Announcement Management"),
            url: "/dashboard/announcement",
            icon: "uil:megaphone",
          },
        ],
      },

      {
        title: t("Users & Support", "Users & Support"),
        icon: "uil:users-alt",
        items: [
          {
            title: t("User Management", "User Management"),
            url: "/dashboard/user",
            icon: "uil:user",
          },
          {
            title: t("Ticket Management", "Ticket Management"),
            url: "/dashboard/ticket",
            icon: "uil:comments-alt",
          },
          {
            title: t("Document Management", "Document Management"),
            url: "/dashboard/document",
            icon: "uil:file-alt",
          },
        ],
      },

      {
        defaultOpen: false,
        title: t("System", "System"),
        icon: "uil:setting",
        items: [
          {
            title: t("System Config", "System Config"),
            url: "/dashboard/system",
            icon: "uil:setting",
          },
          {
            title: t("Auth Control", "Auth Control"),
            url: "/dashboard/auth-control",
            icon: "uil:lock-alt",
          },
          {
            title: t("Payment Config", "Payment Config"),
            url: "/dashboard/payment",
            icon: "uil:exchange",
          },
          {
            title: t("Plugin Management", "Plugin Management"),
            url: "/dashboard/plugin",
            icon: "uil:puzzle-piece",
          },
          {
            title: t("ADS Config", "ADS Config"),
            url: "/dashboard/ads",
            icon: "uil:presentation-play",
          },
        ],
      },

      {
        defaultOpen: false,
        title: t("Logs & Analytics", "Logs & Analytics"),
        icon: "uil:chart-bar",
        items: [
          {
            title: t("Login", "Login"),
            url: "/dashboard/log/login",
            icon: "uil:signin",
          },
          {
            title: t("Register", "Register"),
            url: "/dashboard/log/register",
            icon: "uil:user-plus",
          },
          {
            title: t("Email", "Email"),
            url: "/dashboard/log/email",
            icon: "uil:envelope",
          },
          {
            title: t("Mobile", "Mobile"),
            url: "/dashboard/log/mobile",
            icon: "uil:mobile-android",
          },
          {
            title: t("Subscribe", "Subscribe"),
            url: "/dashboard/log/subscribe",
            icon: "uil:rss",
          },
          {
            title: t("Reset Subscribe", "Reset Subscribe"),
            url: "/dashboard/log/reset-subscribe",
            icon: "uil:refresh",
          },
          {
            title: t("Subscribe Traffic", "Subscribe Traffic"),
            url: "/dashboard/log/subscribe-traffic",
            icon: "uil:tachometer-fast",
          },
          {
            title: t("Server Traffic", "Server Traffic"),
            url: "/dashboard/log/server-traffic",
            icon: "uil:server-connection",
          },
          {
            title: t("Traffic Details", "Traffic Details"),
            url: "/dashboard/log/traffic-details",
            icon: "uil:graph-bar",
          },
          {
            title: t("Balance", "Balance"),
            url: "/dashboard/log/balance",
            icon: "uil:wallet",
          },
          {
            title: t("Commission", "Commission"),
            url: "/dashboard/log/commission",
            icon: "uil:usd-circle",
          },
          {
            title: t("Gift", "Gift"),
            url: "/dashboard/log/gift",
            icon: "uil:gift",
          },
        ],
      },
    ],
    [t]
  );

  return navs;
}

export function findNavByUrl(navs: NavItem[], url: string) {
  function matchDynamicRoute(pattern: string, path: string): boolean {
    const regexPattern = pattern
      .replace(/:[^/]+/g, "[^/]+")
      .replace(/\//g, "\\/");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }
  function findNav(
    items: NavItem[],
    url: string,
    path: NavItem[] = []
  ): NavItem[] {
    for (const item of items) {
      if (item.url === url || (item.url && matchDynamicRoute(item.url, url))) {
        return [...path, item];
      }
      if (item.items) {
        const result = findNav(item.items, url, [...path, item]);
        if (result.length) return result;
      }
    }
    return [];
  }
  return findNav(navs, url);
}
