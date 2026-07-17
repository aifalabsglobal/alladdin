/**
 * One-off smoke test: connect to Yahoo's streaming WebSocket, subscribe to a
 * few symbols, and decode the first ticks with our hand-rolled decoder.
 * Run: npx tsx scripts/smoke-yahoo-stream.ts
 */
import { YAHOO_STREAM_URL, decodeLiveTick } from "../src/lib/live/yahooStream";

const SYMBOLS = ["BTC-USD", "^NSEI", "RELIANCE.NS"];
const MAX_TICKS = 5;
const TIMEOUT_MS = 20_000;

const ws = new WebSocket(YAHOO_STREAM_URL);
let received = 0;

const timeout = setTimeout(() => {
  console.log(`Timed out after ${TIMEOUT_MS}ms with ${received} tick(s).`);
  ws.close();
  process.exit(received > 0 ? 0 : 1);
}, TIMEOUT_MS);

ws.addEventListener("open", () => {
  console.log("Connected. Subscribing:", SYMBOLS.join(", "));
  ws.send(JSON.stringify({ subscribe: SYMBOLS }));
});

ws.addEventListener("message", (event) => {
  const raw = typeof event.data === "string" ? event.data : "";
  if (!raw) return;

  let base64 = raw;
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { message?: unknown };
      if (typeof parsed.message !== "string") {
        console.log("Non-pricing frame:", raw.slice(0, 120));
        return;
      }
      base64 = parsed.message;
    } catch {
      return;
    }
  }

  const tick = decodeLiveTick(base64);
  if (!tick) {
    console.log("Undecodable frame:", base64.slice(0, 60));
    return;
  }

  received += 1;
  console.log(
    `tick ${received}: ${tick.id} price=${tick.price} changePct=${tick.changePercent} marketHours=${tick.marketHours}`,
  );
  if (received >= MAX_TICKS) {
    clearTimeout(timeout);
    ws.close();
    console.log("Smoke test passed.");
    process.exit(0);
  }
});

ws.addEventListener("error", () => {
  console.error("WebSocket error");
});

ws.addEventListener("close", (event) => {
  console.log(`Closed: code=${event.code}`);
});
