import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Toaster } from "@workspace/ui/components/sonner";
import { NavigationProgress } from "@workspace/ui/composed/navigation-progress";
import { getCookie } from "@workspace/ui/lib/cookies";
import { getGlobalConfig } from "@workspace/ui/services/common/common";
import { getProtocolConfig } from "@workspace/ui/services/protocol-config";
import { getSubscriptionRewriterPublicConfig } from "@workspace/ui/services/subscription-rewriter";
import { isBrowser } from "@workspace/ui/utils/index";
import { lazy, Suspense, useEffect } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { useGlobalStore } from "@/stores/global";

// Constant-folded away in production builds, so the devtools chunk is never
// emitted and its packages stay out of the bundle entirely.
const Devtools = import.meta.env.DEV
  ? lazy(() => import("@/components/devtools"))
  : null;

export const Route = createRootRouteWithContext()({
  component: () => {
    const { common, setCommon, getUserInfo } = useGlobalStore();
    useEffect(() => {
      const initializeApp = async () => {
        try {
          const configResponse = await getGlobalConfig();
          const globalConfig = configResponse.data.data;
          if (globalConfig) {
            setCommon(globalConfig);
          }
          try {
            const [protocolConfigResponse, rewriterConfigResponse] =
              await Promise.all([
                getProtocolConfig(),
                getSubscriptionRewriterPublicConfig().catch(() => null),
              ]);
            const protocolConfig = protocolConfigResponse.data.data;
            const publicSubscribeUrl =
              rewriterConfigResponse?.data.data?.public_base_url;
            const publicSubscribeUrls =
              rewriterConfigResponse?.data.data?.public_base_urls;
            if (
              protocolConfig ||
              publicSubscribeUrl ||
              publicSubscribeUrls?.length
            ) {
              setCommon({
                subscribe: {
                  ...common.subscribe,
                  ...globalConfig?.subscribe,
                  ...protocolConfig,
                  public_subscribe_url: publicSubscribeUrl || "",
                  public_subscribe_urls: publicSubscribeUrls || [],
                },
              });
            }
          } catch {
            /* empty */
          }
          try {
            if (getCookie("Authorization")) {
              await getUserInfo();
            }
          } catch {
            /* empty */
          }
        } catch (error) {
          console.error("Failed to initialize app:", error);
        }
      };

      initializeApp();
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
        <Toaster closeButton richColors />
        {Devtools && (
          <Suspense fallback={null}>
            <Devtools />
          </Suspense>
        )}
      </HelmetProvider>
    );
  },
});
