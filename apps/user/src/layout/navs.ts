import { useTranslation } from "react-i18next";

export interface NavItem {
  title: string;
  url: string;
  icon: string;
}

export interface NavGroup {
  title: string;
  url?: string;
  icon?: string;
  items?: NavItem[];
}

/** Grouped navigation for the desktop side rail and the account dropdown.
 *  Titles are already translated — render them directly, never re-t() them. */
export function useNavs() {
  const { t } = useTranslation("components");

  const navs: NavGroup[] = [
    {
      title: t("menu.dashboard", "Dashboard"),
      url: "/dashboard",
      icon: "uil:dashboard",
    },
    {
      title: t("menu.personal", "Personal"),
      items: [
        {
          title: t("menu.profile", "User Detail"),
          url: "/profile",
          icon: "uil:user",
        },
      ],
    },
    {
      title: t("menu.server", "Server Management"),
      items: [
        {
          url: "/subscribe",
          icon: "uil:shop",
          title: t("menu.subscribe", "Subscribe"),
        },
      ],
    },
    {
      title: t("menu.finance", "Commerce"),
      items: [
        {
          url: "/order",
          icon: "uil:notes",
          title: t("menu.order", "Orders"),
        },
        {
          url: "/wallet",
          icon: "uil:wallet",
          title: t("menu.wallet", "Balance"),
        },
        {
          url: "/affiliate",
          icon: "uil:users-alt",
          title: t("menu.affiliate", "Commission"),
        },
      ],
    },
    {
      title: t("menu.help", "Users & Support"),
      items: [
        {
          url: "/document",
          icon: "uil:book-alt",
          title: t("menu.document", "Docs"),
        },
        {
          url: "/announcement",
          icon: "uil:megaphone",
          title: t("menu.announcement", "Announcements"),
        },
        {
          url: "/ticket",
          icon: "uil:message",
          title: t("menu.ticket", "Support Tickets"),
        },
      ],
    },
  ];

  return navs;
}

/** The five primary destinations for the mobile bottom tab bar. */
export function useNavItems(): NavItem[] {
  const { t } = useTranslation("components");

  return [
    {
      url: "/dashboard",
      icon: "uil:dashboard",
      title: t("menu.dashboard", "Dashboard"),
    },
    {
      url: "/subscribe",
      icon: "uil:shop",
      title: t("menu.subscribe", "Subscribe"),
    },
    {
      url: "/order",
      icon: "uil:notes",
      title: t("menu.order", "Orders"),
    },
    {
      url: "/wallet",
      icon: "uil:wallet",
      title: t("menu.wallet", "Balance"),
    },
    {
      url: "/profile",
      icon: "uil:user",
      title: t("menu.personal", "Personal"),
    },
  ];
}
