import type { SubscriptionRewriterPublicConfig } from "@workspace/ui/services/subscription-rewriter";

export type SubscriptionLinkConfigStatus = "loading" | "ready" | "retrying";

export function getConfiguredPublicSubscriptionUrls(
  config: SubscriptionRewriterPublicConfig | undefined
) {
  const configuredUrls =
    config?.public_base_urls?.map((url) => url.trim()).filter(Boolean) || [];
  const fallbackUrl = config?.public_base_url?.trim();
  if (configuredUrls.length === 0 && fallbackUrl) {
    configuredUrls.push(fallbackUrl);
  }

  return [...new Set(configuredUrls)];
}

export function hasConfiguredPublicSubscriptionUrls(
  config: SubscriptionRewriterPublicConfig | undefined
) {
  return getConfiguredPublicSubscriptionUrls(config).length > 0;
}

export function canGenerateSubscriptionLinks(
  status: SubscriptionLinkConfigStatus
) {
  return status === "ready";
}
