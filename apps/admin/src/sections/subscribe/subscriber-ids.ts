const maxSubscriberIdsPerRule = 10_000;

export function parseSubscriberIds(value: string): number[] | null {
  const tokens = value.split(/[\s,，、;；]+/).filter(Boolean);
  if (tokens.length > maxSubscriberIdsPerRule) {
    return null;
  }

  const subscriberIds = new Set<number>();
  for (const token of tokens) {
    const subscriberId = Number(token);
    if (!(Number.isSafeInteger(subscriberId) && subscriberId >= 0)) {
      return null;
    }
    subscriberIds.add(subscriberId);
  }

  return [...subscriberIds].sort((left, right) => left - right);
}
