export const DEFAULT_SUBSCRIPTION_PROTOCOL = "tuic";
export const DEFAULT_PROTOCOL_SELECTOR_STYLE = "cards";

export const SUBSCRIPTION_PROTOCOLS = ["tuic", "anytls"] as const;
export const PROTOCOL_SELECTOR_STYLES = ["cards", "compact"] as const;

export type SubscriptionProtocol = (typeof SUBSCRIPTION_PROTOCOLS)[number];
export type ProtocolSelectorStyle = (typeof PROTOCOL_SELECTOR_STYLES)[number];

export const SUBSCRIPTION_PROTOCOL_LABELS: Record<
  SubscriptionProtocol,
  string
> = {
  tuic: "TUIC",
  anytls: "AnyTLS",
};

export function isSubscriptionProtocol(
  protocol?: string | null
): protocol is SubscriptionProtocol {
  return SUBSCRIPTION_PROTOCOLS.includes(protocol as SubscriptionProtocol);
}

export function normalizeSubscriptionProtocol(
  protocol?: string | null
): SubscriptionProtocol {
  if (isSubscriptionProtocol(protocol)) {
    return protocol;
  }

  return DEFAULT_SUBSCRIPTION_PROTOCOL;
}

export function getSubscriptionProtocolLabel(protocol?: string | null) {
  return (
    SUBSCRIPTION_PROTOCOL_LABELS[normalizeSubscriptionProtocol(protocol)] ||
    protocol ||
    SUBSCRIPTION_PROTOCOL_LABELS[DEFAULT_SUBSCRIPTION_PROTOCOL]
  );
}

export function isProtocolSelectorStyle(
  style?: string | null
): style is ProtocolSelectorStyle {
  return PROTOCOL_SELECTOR_STYLES.includes(style as ProtocolSelectorStyle);
}

export function normalizeProtocolSelectorStyle(
  style?: string | null
): ProtocolSelectorStyle {
  if (isProtocolSelectorStyle(style)) {
    return style;
  }

  return DEFAULT_PROTOCOL_SELECTOR_STYLE;
}
