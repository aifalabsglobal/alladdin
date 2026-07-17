/**
 * Shared freshness / provenance vocabulary for the enterprise dashboard.
 * Never claim unofficial Yahoo ticks as licensed exchange data.
 */

export type FreshnessState =
  | "live"
  | "delayed"
  | "eod"
  | "stale"
  | "degraded"
  | "synthetic"
  | "unavailable";

export type DataProvenance = {
  state: FreshnessState;
  source: string;
  observedAt: Date | null;
  ingestedAt?: Date | null;
  label: string;
  detail?: string;
};

/** Tick older than this is treated as stale even if the socket is open. */
export const STALE_TICK_MS = 90_000;

export function freshnessLabel(state: FreshnessState): string {
  switch (state) {
    case "live":
      return "Live";
    case "delayed":
      return "Delayed";
    case "eod":
      return "EOD";
    case "stale":
      return "Stale";
    case "degraded":
      return "Degraded";
    case "synthetic":
      return "Synthetic";
    case "unavailable":
      return "Unavailable";
  }
}

export function classifyTickFreshness(args: {
  connected: boolean;
  tickTimeMs: number | null;
  nowMs?: number;
}): FreshnessState {
  const now = args.nowMs ?? Date.now();
  if (!args.connected && args.tickTimeMs === null) return "unavailable";
  if (args.tickTimeMs === null) return "delayed";
  if (now - args.tickTimeMs > STALE_TICK_MS) return "stale";
  if (args.connected) return "live";
  return "delayed";
}

export function yahooPrototypeProvenance(args: {
  state: FreshnessState;
  observedAt: Date | null;
}): DataProvenance {
  return {
    state: args.state,
    source: "Yahoo Finance (unofficial prototype stream)",
    observedAt: args.observedAt,
    label: freshnessLabel(args.state),
    detail:
      "Prototype feed for development only. Not a licensed NSE/BSE redistribution.",
  };
}

export function eodProvenance(args: {
  source: string;
  observedAt: Date | null;
  synthetic?: boolean;
}): DataProvenance {
  if (args.synthetic) {
    return {
      state: "synthetic",
      source: args.source,
      observedAt: args.observedAt,
      label: "Synthetic",
      detail: "Seeded demo data — not market observations.",
    };
  }
  return {
    state: "eod",
    source: args.source,
    observedAt: args.observedAt,
    label: "EOD",
    detail: "Latest end-of-day observation.",
  };
}

export type SessionProfile = {
  timezone: string;
  sessionType: "EXCHANGE" | "CONTINUOUS_24_5" | "CONTINUOUS_24_7";
  openMinute?: number | null;
  closeMinute?: number | null;
  weekMask?: string;
};

export type SessionState = "open" | "closed" | "unknown";

function zonedParts(now: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;
    const weekdays: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const weekday = weekdays[value("weekday") ?? ""];
    const hour = Number(value("hour"));
    const minute = Number(value("minute"));
    if (weekday === undefined || !Number.isFinite(hour) || !Number.isFinite(minute)) {
      return null;
    }
    return { weekday, minuteOfDay: hour * 60 + minute };
  } catch {
    return null;
  }
}

export function marketSessionState(
  profile: SessionProfile,
  now = new Date(),
): SessionState {
  const local = zonedParts(now, profile.timezone);
  if (!local) return "unknown";
  if (profile.sessionType === "CONTINUOUS_24_7") return "open";

  const allowedDays = new Set(
    (profile.weekMask ?? "1,2,3,4,5")
      .split(",")
      .map(Number)
      .filter(Number.isInteger),
  );
  if (!allowedDays.has(local.weekday)) return "closed";
  if (profile.sessionType === "CONTINUOUS_24_5") return "open";
  if (profile.openMinute == null || profile.closeMinute == null) return "unknown";

  if (profile.openMinute <= profile.closeMinute) {
    return local.minuteOfDay >= profile.openMinute &&
      local.minuteOfDay <= profile.closeMinute
      ? "open"
      : "closed";
  }
  return local.minuteOfDay >= profile.openMinute ||
    local.minuteOfDay <= profile.closeMinute
    ? "open"
    : "closed";
}

/** NSE cash session roughly 09:15–15:30 IST (UTC+5:30). */
export function isNseCashSession(now = new Date()): boolean {
  return (
    marketSessionState(
      {
        timezone: "Asia/Kolkata",
        sessionType: "EXCHANGE",
        openMinute: 9 * 60 + 15,
        closeMinute: 15 * 60 + 30,
      },
      now,
    ) === "open"
  );
}
