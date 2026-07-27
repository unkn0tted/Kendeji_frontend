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
import {
  readOptionalConfigCache,
  updateOptionalConfigCache,
} from "@/config/optional-config-cache";
import {
  getConfiguredPublicSubscriptionUrls,
  hasConfiguredPublicSubscriptionUrls,
} from "@/config/subscription-link-policy";
import {
  useClearUserLoading,
  useCommon,
  useGetUserInfo,
  useGlobalStore,
  useSetCommon,
  useSetSubscriptionLinkConfigStatus,
} from "@/stores/global";

const REWRITER_RETRY_INITIAL_DELAY_MS = 5000;
const REWRITER_RETRY_MAX_DELAY_MS = 60_000;

// Constant-folded away in production builds, so the devtools chunk is never
// emitted and its packages stay out of the bundle entirely.
const Devtools = import.meta.env.DEV
  ? lazy(() => import("@/components/devtools"))
  : null;

export const Route = createRootRouteWithContext()({
  component: () => {
    const common = useCommon();
    const setCommon = useSetCommon();
    const getUserInfo = useGetUserInfo();
    const clearUserLoading = useClearUserLoading();
    const setSubscriptionLinkConfigStatus =
      useSetSubscriptionLinkConfigStatus();
    useEffect(() => {
      const controller = new AbortController();
      const { signal } = controller;
      setSubscriptionLinkConfigStatus("loading");

      const loadConfig = async () => {
        const cachedConfig = readOptionalConfigCache();
        let globalConfig: API.GetGlobalConfigResponse | undefined;
        let protocolConfig = cachedConfig.protocolConfig;
        let rewriterConfig = hasConfiguredPublicSubscriptionUrls(
          cachedConfig.rewriterConfig
        )
          ? cachedConfig.rewriterConfig
          : undefined;

        const applyOptionalConfig = () => {
          if (signal.aborted) return;
          if (protocolConfig === undefined && rewriterConfig === undefined) {
            return;
          }

          const currentSubscribe = useGlobalStore.getState().common.subscribe;
          const publicBaseUrls =
            getConfiguredPublicSubscriptionUrls(rewriterConfig);

          setCommon({
            subscribe: {
              ...currentSubscribe,
              ...globalConfig?.subscribe,
              ...protocolConfig,
              ...(rewriterConfig === undefined
                ? {}
                : {
                    public_subscribe_url: publicBaseUrls[0] || "",
                    public_subscribe_urls: publicBaseUrls,
                  }),
            },
          });
        };

        const markSubscriptionLinksReady = () => {
          if (
            rewriterConfig !== undefined &&
            (hasConfiguredPublicSubscriptionUrls(rewriterConfig) ||
              globalConfig !== undefined)
          ) {
            setSubscriptionLinkConfigStatus("ready");
            return true;
          }
          return false;
        };

        const globalConfigPromise = getGlobalConfig()
          .then((response) => {
            if (signal.aborted) return;
            globalConfig = response.data.data;
            if (globalConfig) {
              setCommon(globalConfig);
              applyOptionalConfig();
              markSubscriptionLinksReady();
            }
            return globalConfig;
          })
          .catch((error) => {
            console.error("Failed to load global config:", error);
          });
        const protocolConfigPromise = getProtocolConfig({
          signal,
          timeout: 15_000,
        })
          .then((response) => response.data.data ?? null)
          .catch(() => null);
        const requestRewriterConfig = () =>
          getSubscriptionRewriterPublicConfig({
            signal,
            timeout: 15_000,
          })
            .then((response) => response.data.data ?? null)
            .catch(() => null);
        const firstRewriterConfigPromise = requestRewriterConfig();

        const waitForRetry = (delay: number) =>
          new Promise<void>((resolve) => {
            if (signal.aborted) {
              resolve();
              return;
            }

            const finish = () => {
              clearTimeout(timeout);
              signal.removeEventListener("abort", finish);
              resolve();
            };
            const timeout = setTimeout(finish, delay);
            signal.addEventListener("abort", finish, { once: true });
          });

        await globalConfigPromise;
        if (signal.aborted) return;

        applyOptionalConfig();
        markSubscriptionLinksReady();

        protocolConfigPromise.then((remoteProtocolConfig) => {
          if (signal.aborted || remoteProtocolConfig === null) return;
          protocolConfig = remoteProtocolConfig;
          updateOptionalConfigCache({ protocolConfig });
          applyOptionalConfig();
        });

        let remoteRewriterConfig = await firstRewriterConfigPromise;
        let retryDelay = REWRITER_RETRY_INITIAL_DELAY_MS;
        while (!signal.aborted) {
          if (remoteRewriterConfig !== null) {
            rewriterConfig = remoteRewriterConfig;
            updateOptionalConfigCache({ rewriterConfig });
            applyOptionalConfig();
            if (markSubscriptionLinksReady()) {
              return;
            }
          }

          if (!hasConfiguredPublicSubscriptionUrls(rewriterConfig)) {
            setSubscriptionLinkConfigStatus("retrying");
          }

          await waitForRetry(retryDelay);
          if (signal.aborted) return;
          retryDelay = Math.min(retryDelay * 2, REWRITER_RETRY_MAX_DELAY_MS);
          if (globalConfig === undefined) {
            // A rewriter config without public URLs is only usable once the
            // global config is present, so keep retrying it as well when the
            // initial request failed.
            await getGlobalConfig()
              .then((response) => {
                if (signal.aborted) return;
                globalConfig = response.data.data;
                if (globalConfig) {
                  setCommon(globalConfig);
                  applyOptionalConfig();
                }
              })
              .catch(() => null);
            if (signal.aborted) return;
            if (markSubscriptionLinksReady()) {
              return;
            }
          }
          remoteRewriterConfig = await requestRewriterConfig();
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
        if (!signal.aborted) {
          setSubscriptionLinkConfigStatus("retrying");
        }
      });
      loadUser().catch((error) => {
        console.error("Failed to initialize user:", error);
        clearUserLoading();
      });

      return () => {
        controller.abort();
      };
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
          {logo && <link href={logo} rel="icon" />}
          {logo && <link href={logo} rel="apple-touch-icon" sizes="180x180" />}
          <link href="/site.webmanifest" rel="manifest" />
        </Helmet>
        <NavigationProgress />
        <Outlet />
        <Toaster closeButton richColors visibleToasts={3} />
        <div
          dangerouslySetInnerHTML={{ __html: common?.site.custom_html || "" }}
          id="custom_html"
        />
        {Devtools && (
          <Suspense fallback={null}>
            <Devtools />
          </Suspense>
        )}
      </HelmetProvider>
    );
  },
});
