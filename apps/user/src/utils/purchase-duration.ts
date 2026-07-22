type PurchaseDuration = {
  discount?: Array<{ quantity: number }>;
  show_original_price?: boolean;
};

export function getMinimumPurchaseQuantity(
  subscribe?: PurchaseDuration
): number {
  if (subscribe?.show_original_price !== false) return 1;

  const quantities = (subscribe.discount || [])
    .map((item) => Number(item.quantity))
    .filter((quantity) => Number.isInteger(quantity) && quantity > 0);

  return quantities.length > 0 ? Math.min(...quantities) : 1;
}
