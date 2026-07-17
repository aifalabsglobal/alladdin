import "server-only";

/**
 * Entitlement helpers: only surface quotes/mappings the product may display.
 * Prototype providers with displayAllowed=false stay internal.
 */
export function isDisplayAllowedQuote(
  provider: string,
  mappings: { provider: string; displayAllowed: boolean; enabled: boolean }[],
): boolean {
  const mapping = mappings.find((m) => m.provider === provider && m.enabled);
  if (!mapping) return false;
  return mapping.displayAllowed;
}

export function filterDisplayableQuotes<T extends { provider: string }>(
  quotes: T[],
  mappings: { provider: string; displayAllowed: boolean; enabled: boolean }[],
): T[] {
  return quotes.filter((quote) => isDisplayAllowedQuote(quote.provider, mappings));
}

export function filterDisplayableMappings<
  T extends { displayAllowed: boolean; enabled: boolean },
>(mappings: T[]): T[] {
  return mappings.filter((m) => m.enabled && m.displayAllowed);
}
