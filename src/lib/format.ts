const inrCompact = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatMoney(
  value: number,
  currency: string,
  locale = "en-US",
  maximumFractionDigits = 2,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(maximumFractionDigits)}`;
  }
}

export function formatCompactMoney(
  value: number | null,
  currency: string,
  locale = "en-US",
): string {
  if (value === null) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    })}`;
  }
}

export function formatInr(value: number): string {
  return formatMoney(value, "INR", "en-IN");
}

export function formatMarketCap(value: number | null): string {
  if (value === null) return "—";
  return `₹${inrCompact.format(value)}`;
}

export function formatPct(value: number, signed = true): string {
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatCrore(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}₹${Math.abs(value).toFixed(0)} Cr`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function dayChangePct(latestClose: number, prevClose: number): number {
  if (prevClose === 0) return 0;
  return ((latestClose - prevClose) / prevClose) * 100;
}
