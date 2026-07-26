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
import {
  readOptionalConfigCache,
  updateOptionalConfigCache,
} from "@/config/optional-config-cache";
import { useGlobalStore } from "@/stores/global";

export const Route = createRootRouteWithContext()({
  component: () => {
    const { common, setCommon, getUserInfo, clearUserLoading } =
      useGlobalStore();
    useEffect(() => {
      const loadConfig = async () => {
        const cachedConfig = readOptionalConfigCache();
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
        const protocolConfigPromise = getProtocolConfig({ timeout: 15_000 })
          .then((response) => response.data.data ?? null)
          .catch(() => {
            /* Protocol config is optional. */
            return null;
          });
        const rewriterConfigPromise = getSubscriptionRewriterPublicConfig({
          timeout: 15_000,
        })
          .then((response) => response.data.data ?? null)
          .catch(() => {
            /* Subscription rewriter is optional. */
            return null;
          });

        const globalConfig = await globalConfigPromise;
        const applyOptionalConfig = (
          protocolConfig = cachedConfig.protocolConfig,
          rewriterConfig = cachedConfig.rewriterConfig
        ) => {
          if (protocolConfig === undefined && rewriterConfig === undefined) {
            return;
          }

          const currentSubscribe = useGlobalStore.getState().common.subscribe;
          const publicBaseUrl = rewriterConfig?.public_base_url || "";
          const publicBaseUrls =
            rewriterConfig?.public_base_urls ||
            (publicBaseUrl ? [publicBaseUrl] : []);

          setCommon({
            subscribe: {
              ...currentSubscribe,
              ...globalConfig?.subscribe,
              ...protocolConfig,
              ...(rewriterConfig === undefined
                ? {}
                : {
                    public_subscribe_url: publicBaseUrl,
                    public_subscribe_urls: publicBaseUrls,
                  }),
            },
          });
        };

        applyOptionalConfig();

        const [protocolConfig, rewriterConfig] = await Promise.all([
          protocolConfigPromise,
          rewriterConfigPromise,
        ]);
        updateOptionalConfigCache({
          ...(protocolConfig === null ? {} : { protocolConfig }),
          ...(rewriterConfig === null ? {} : { rewriterConfig }),
        });
        if (protocolConfig !== null || rewriterConfig !== null) {
          applyOptionalConfig(
            protocolConfig ?? cachedConfig.protocolConfig,
            rewriterConfig ?? cachedConfig.rewriterConfig
          );
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
