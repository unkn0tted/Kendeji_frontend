export const DEFAULT_SUBSCRIPTION_PROTOCOL = "tuic";
export const DEFAULT_PROTOCOL_SELECTOR_STYLE = "cards";

export const PROTOCOL_SELECTOR_STYLES = ["cards", "compact"] as const;

export type SubscriptionProtocol = string;
export type ProtocolSelectorStyle = (typeof PROTOCOL_SELECTOR_STYLES)[number];

export type SubscriptionProtocolOption = {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  enabled?: boolean;
};

export const DEFAULT_SUBSCRIPTION_PROTOCOL_OPTIONS: SubscriptionProtocolOption[] =
  [
    {
      value: "tuic",
      label: "TUIC",
      description: "TUIC subscription output",
      icon: "mdi:rocket-launch-outline",
      enabled: true,
    },
    {
      value: "anytls",
      label: "AnyTLS",
      description: "Only get AnyTLS nodes",
      icon: "mdi:shield-lock-outline",
      enabled: true,
    },
  ];

function getDefaultSubscriptionProtocolOptions() {
  return DEFAULT_SUBSCRIPTION_PROTOCOL_OPTIONS.map((option) => ({
    ...option,
  }));
}

function normalizeProtocolOption(
  option: Partial<SubscriptionProtocolOption>
): SubscriptionProtocolOption | null {
  const value = String(option.value || "").trim();
  if (!value) {
    return null;
  }

  const label = String(option.label || value.toUpperCase()).trim();

  return {
    value,
    label: label || value,
    description: String(option.description || "").trim(),
    icon: String(option.icon || "mdi:connection").trim(),
    enabled: option.enabled !== false,
  };
}

export function normalizeSubscriptionProtocolOptions(
  options?: Partial<SubscriptionProtocolOption>[] | null
): SubscriptionProtocolOption[] {
  const normalized: SubscriptionProtocolOption[] = [];
  const seen = new Set<string>();

  for (const option of options || []) {
    const normalizedOption = normalizeProtocolOption(option);
    if (!(normalizedOption && !seen.has(normalizedOption.value))) {
      continue;
    }

    normalized.push(normalizedOption);
    seen.add(normalizedOption.value);
  }

  if (normalized.length === 0) {
    return getDefaultSubscriptionProtocolOptions();
  }

  if (!normalized.some((option) => option.enabled !== false)) {
    normalized[0] = { ...normalized[0]!, enabled: true };
  }

  return normalized;
}

export function getEnabledSubscriptionProtocolOptions(
  options?: Partial<SubscriptionProtocolOption>[] | null
) {
  const normalized = normalizeSubscriptionProtocolOptions(options);
  const enabled = normalized.filter((option) => option.enabled !== false);

  return enabled.length > 0 ? enabled : normalized.slice(0, 1);
}

export function isSubscriptionProtocol(
  protocol?: string | null,
  options?: Partial<SubscriptionProtocolOption>[] | null
): protocol is SubscriptionProtocol {
  return getEnabledSubscriptionProtocolOptions(options).some(
    (option) => option.value === protocol
  );
}

export function normalizeSubscriptionProtocol(
  protocol?: string | null,
  options?: Partial<SubscriptionProtocolOption>[] | null
): SubscriptionProtocol {
  const enabledOptions = getEnabledSubscriptionProtocolOptions(options);

  if (
    typeof protocol === "string" &&
    enabledOptions.some((option) => option.value === protocol)
  ) {
    return protocol;
  }

  return enabledOptions[0]?.value || DEFAULT_SUBSCRIPTION_PROTOCOL;
}

export function getSubscriptionProtocolLabel(
  protocol?: string | null,
  options?: Partial<SubscriptionProtocolOption>[] | null
) {
  const normalizedProtocol = normalizeSubscriptionProtocol(protocol, options);
  const protocolOption = getEnabledSubscriptionProtocolOptions(options).find(
    (option) => option.value === normalizedProtocol
  );

  return (
    protocolOption?.label ||
    normalizedProtocol ||
    DEFAULT_SUBSCRIPTION_PROTOCOL_OPTIONS[0]?.label ||
    DEFAULT_SUBSCRIPTION_PROTOCOL
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
