import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Toaster } from "@workspace/ui/components/sonner";
import { NavigationProgress } from "@workspace/ui/composed/navigation-progress";
import { TanStackQueryDevtools } from "@workspace/ui/integrations/tanstack-query-devtools";
import { getCookie } from "@workspace/ui/lib/cookies";
import { getGlobalConfig } from "@workspace/ui/services/common/common";
import { getProtocolConfig } from "@workspace/ui/services/protocol-config";
import { getSubscriptionRewriterPublicConfig } from "@workspace/ui/services/subscription-rewriter";
import { isBrowser } from "@workspace/ui/utils/index";
import { useEffect } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { useGlobalStore } from "@/stores/global";

export const Route = createRootRouteWithContext()({
  component: () => {
    const { common, setCommon, getUserInfo, clearUserLoading } =
      useGlobalStore();
    useEffect(() => {
      const loadConfig = async () => {
        const globalConfigPromise = getGlobalConfig()
          .then((response) => {
            const globalConfig = response.data.data;
            if (globalConfig) {
              setCommon(globalConfig);
            }
            return globalConfig;
          })
          .catch((error) => {
            console.error("Failed to load global config:", error);
          });
        const protocolConfigPromise = getProtocolConfig({ timeout: 5000 })
          .then((response) => response.data.data)
          .catch(() => {
            /* Protocol config is optional. */
          });
        const rewriterConfigPromise = getSubscriptionRewriterPublicConfig({
          timeout: 5000,
        })
          .then((response) => response.data.data)
          .catch(() => {
            /* Subscription rewriter is optional. */
          });
        const [globalConfig, protocolConfig, rewriterConfig] =
          await Promise.all([
            globalConfigPromise,
            protocolConfigPromise,
            rewriterConfigPromise,
          ]);

        if (
          protocolConfig ||
          rewriterConfig?.public_base_url ||
          rewriterConfig?.public_base_urls?.length
        ) {
          setCommon({
            subscribe: {
              ...useGlobalStore.getState().common.subscribe,
              ...globalConfig?.subscribe,
              ...protocolConfig,
              public_subscribe_url: rewriterConfig?.public_base_url || "",
              public_subscribe_urls:
                rewriterConfig?.public_base_urls ||
                (rewriterConfig?.public_base_url
                  ? [rewriterConfig.public_base_url]
                  : []),
            },
          });
        }
      };

      const loadUser = async () => {
        if (getCookie("Authorization")) {
          await getUserInfo();
        } else {
          clearUserLoading();
        }
      };

      loadConfig().catch((error) => {
        console.error("Failed to initialize app config:", error);
      });
      loadUser().catch((error) => {
        console.error("Failed to initialize user:", error);
        clearUserLoading();
      });
    }, []);

    const { site } = common;
    const title = site.site_name || "Loading...";
    const description = site.site_desc || "";
    const keywords = site.keywords || "";
    const logo = site.site_logo || "";
    const url = isBrowser() ? window.location.href : "";

    return (
      <HelmetProvider>
        <Helmet>
          <title>{title}</title>
          <meta content={description} name="description" />
          <meta content={keywords} name="keywords" />
          <link href={url} rel="canonical" />
          <link href={logo} rel="icon" />
          <link href={logo} rel="apple-touch-icon" sizes="180x180" />
          <link href="/site.webmanifest" rel="manifest" />
        </Helmet>
        <NavigationProgress />
        <Outlet />
        <Toaster closeButton richColors visibleToasts={3} />
        <div
          dangerouslySetInnerHTML={{ __html: common?.site.custom_html || "" }}
          id="custom_html"
        />
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
      </HelmetProvider>
    );
  },
});
