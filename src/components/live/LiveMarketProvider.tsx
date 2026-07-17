"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  classifyTickFreshness,
  isNseCashSession,
  type FreshnessState,
} from "@/lib/live/freshness";
import {
  YAHOO_STREAM_URL,
  decodeLiveTick,
  fromYahooSymbol,
  toYahooSymbol,
  type LiveTick,
} from "@/lib/live/yahooStream";

export type LiveQuoteView = {
  key: string;
  yahooSymbol: string;
  price: number;
  changePercent: number | null;
  change: number | null;
  timeMs: number | null;
  state: FreshnessState;
};

type LiveMarketContextValue = {
  connected: boolean;
  sessionOpen: boolean;
  globalState: FreshnessState;
  lastMessageAt: number | null;
  quotesByKey: Record<string, LiveQuoteView>;
  subscribe: (keys: string[]) => () => void;
  getQuote: (key: string) => LiveQuoteView | undefined;
};

const LiveMarketContext = createContext<LiveMarketContextValue | null>(null);

const RETRY_START_MS = 2_000;
const RETRY_MAX_MS = 30_000;
const FLUSH_INTERVAL_MS = 1_000;
const HEALTH_TICK_MS = 5_000;

function keyToYahoo(key: string): string | null {
  if (key === "NIFTY50" || key === "SENSEX" || key === "INDIAVIX") {
    return toYahooSymbol(key, "index");
  }
  return toYahooSymbol(key, "stock");
}

export function LiveMarketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [quotesByYahoo, setQuotesByYahoo] = useState<Record<string, LiveTick>>({});
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [sessionOpen, setSessionOpen] = useState(() => isNseCashSession());

  const pending = useRef<Record<string, LiveTick>>({});
  const subscribers = useRef(new Map<string, number>());
  const [desiredSymbols, setDesiredSymbols] = useState<string[]>([]);

  const subscribe = useCallback((keys: string[]) => {
    const yahoo = keys
      .map(keyToYahoo)
      .filter((s): s is string => s !== null);

    for (const symbol of yahoo) {
      subscribers.current.set(symbol, (subscribers.current.get(symbol) ?? 0) + 1);
    }
    setDesiredSymbols([...subscribers.current.keys()].sort());

    return () => {
      for (const symbol of yahoo) {
        const next = (subscribers.current.get(symbol) ?? 1) - 1;
        if (next <= 0) subscribers.current.delete(symbol);
        else subscribers.current.set(symbol, next);
      }
      setDesiredSymbols([...subscribers.current.keys()].sort());
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now());
      setSessionOpen(isNseCashSession());
    }, HEALTH_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const symbolsKey = desiredSymbols.join(",");

  useEffect(() => {
    if (symbolsKey === "") {
      setConnected(false);
      return;
    }
    const symbols = symbolsKey.split(",");

    let disposed = false;
    let ws: WebSocket | null = null;
    let retryMs = RETRY_START_MS;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const flushTimer = setInterval(() => {
      const batch = pending.current;
      if (Object.keys(batch).length === 0) return;
      pending.current = {};
      setQuotesByYahoo((prev) => ({ ...prev, ...batch }));
      setLastMessageAt(Date.now());
    }, FLUSH_INTERVAL_MS);

    function scheduleReconnect() {
      if (disposed) return;
      retryTimer = setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
    }

    function handleMessage(raw: string) {
      let base64 = raw;
      if (raw.startsWith("{")) {
        try {
          const parsed = JSON.parse(raw) as { message?: unknown };
          if (typeof parsed.message !== "string") return;
          base64 = parsed.message;
        } catch {
          return;
        }
      }
      const tick = decodeLiveTick(base64);
      if (tick) pending.current[tick.id] = tick;
    }

    function connect() {
      if (disposed) return;
      try {
        ws = new WebSocket(YAHOO_STREAM_URL);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        retryMs = RETRY_START_MS;
        setConnected(true);
        ws?.send(JSON.stringify({ subscribe: symbols }));
      };
      ws.onmessage = (event) => {
        if (typeof event.data === "string") handleMessage(event.data);
      };
      ws.onclose = () => {
        setConnected(false);
        scheduleReconnect();
      };
      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      disposed = true;
      clearInterval(flushTimer);
      if (retryTimer) clearTimeout(retryTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      setConnected(false);
    };
  }, [symbolsKey]);

  const quotesByKey = useMemo(() => {
    const out: Record<string, LiveQuoteView> = {};
    for (const [yahooSymbol, tick] of Object.entries(quotesByYahoo)) {
      const key = fromYahooSymbol(yahooSymbol);
      const state = classifyTickFreshness({
        connected,
        tickTimeMs: tick.time,
        nowMs,
      });
      out[key] = {
        key,
        yahooSymbol,
        price: tick.price,
        changePercent: tick.changePercent,
        change: tick.change,
        timeMs: tick.time,
        state,
      };
    }
    return out;
  }, [quotesByYahoo, connected, nowMs]);

  const globalState = useMemo<FreshnessState>(() => {
    const states = Object.values(quotesByKey).map((q) => q.state);
    if (states.includes("live")) return "live";
    if (connected) return "delayed";
    if (states.includes("stale")) return "stale";
    if (states.length > 0) return "delayed";
    return "unavailable";
  }, [quotesByKey, connected]);

  const getQuote = useCallback(
    (key: string) => quotesByKey[key],
    [quotesByKey],
  );

  const value = useMemo(
    () => ({
      connected,
      sessionOpen,
      globalState,
      lastMessageAt,
      quotesByKey,
      subscribe,
      getQuote,
    }),
    [
      connected,
      sessionOpen,
      globalState,
      lastMessageAt,
      quotesByKey,
      subscribe,
      getQuote,
    ],
  );

  return (
    <LiveMarketContext.Provider value={value}>
      {children}
    </LiveMarketContext.Provider>
  );
}

export function useLiveMarket(): LiveMarketContextValue {
  const ctx = useContext(LiveMarketContext);
  if (!ctx) {
    throw new Error("useLiveMarket must be used within LiveMarketProvider");
  }
  return ctx;
}

/** Subscribe keys for the lifetime of the component. */
export function useLiveSubscription(keys: string[]) {
  const { subscribe, getQuote, connected, globalState, sessionOpen } =
    useLiveMarket();
  const keySig = [...keys].sort().join(",");

  useEffect(() => {
    if (!keySig) return;
    return subscribe(keySig.split(","));
  }, [keySig, subscribe]);

  const quotes = useMemo(() => {
    const out: Record<string, LiveQuoteView> = {};
    for (const key of keys) {
      const q = getQuote(key);
      if (q) out[key] = q;
    }
    return out;
  }, [keys, getQuote]);

  return { quotes, connected, globalState, sessionOpen };
}
