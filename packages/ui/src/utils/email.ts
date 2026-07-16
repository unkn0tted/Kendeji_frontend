/**
 * Detect RFC-style subaddressing such as `name+tag@example.com`.
 *
 * Provider-specific aliases (for example Gmail dot normalization) cannot be
 * identified reliably without rejecting legitimate mailbox addresses.
 */
export function hasEmailSubaddress(email: string): boolean {
  const separatorIndex = email.lastIndexOf("@");
  if (separatorIndex <= 0) return false;

  return email.slice(0, separatorIndex).includes("+");
}
