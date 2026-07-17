/**
 * Client-safe helpers for Yahoo Finance's public streaming WebSocket
 * (wss://streamer.finance.yahoo.com). The stream pushes base64-encoded
 * protobuf messages ("yaticker"); we hand-decode only the fields we need
 * so no protobuf dependency is required in the browser bundle.
 *
 * yaticker fields used:
 *   1: id (string)          2: price (float)       3: time (sint64, ms)
 *   7: marketHours (enum)   8: changePercent (float)  12: change (float)
 */

export const YAHOO_STREAM_URL = "wss://streamer.finance.yahoo.com/?version=2";

export type LiveTick = {
  id: string;
  price: number;
  time: number | null;
  changePercent: number | null;
  change: number | null;
  marketHours: number | null;
};

const INDEX_TO_YAHOO: Record<string, string> = {
  NIFTY50: "^NSEI",
  SENSEX: "^BSESN",
  INDIAVIX: "^INDIAVIX",
};

const YAHOO_TO_INDEX: Record<string, string> = Object.fromEntries(
  Object.entries(INDEX_TO_YAHOO).map(([k, v]) => [v, k]),
);

/** Map an app ticker key (NSE symbol or index key) to its Yahoo symbol. */
export function toYahooSymbol(key: string, kind: "index" | "stock"): string | null {
  if (kind === "index") return INDEX_TO_YAHOO[key] ?? null;
  return `${key}.NS`;
}

/** Map a Yahoo symbol back to the app ticker key. */
export function fromYahooSymbol(yahooSymbol: string): string {
  const index = YAHOO_TO_INDEX[yahooSymbol];
  if (index) return index;
  return yahooSymbol.endsWith(".NS")
    ? yahooSymbol.slice(0, -".NS".length)
    : yahooSymbol;
}

function base64ToBytes(base64: string): Uint8Array | null {
  try {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function readVarint(bytes: Uint8Array, pos: number): { value: bigint; pos: number } | null {
  let result = 0n;
  let shift = 0n;
  while (pos < bytes.length) {
    const byte = bytes[pos]!;
    pos += 1;
    result |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value: result, pos };
    shift += 7n;
    if (shift > 63n) return null;
  }
  return null;
}

function zigzagDecode(value: bigint): bigint {
  return (value >> 1n) ^ -(value & 1n);
}

/** Decode a base64 yaticker protobuf payload. Returns null on malformed input. */
export function decodeLiveTick(base64: string): LiveTick | null {
  const bytes = base64ToBytes(base64);
  if (!bytes || bytes.length === 0) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tick: LiveTick = {
    id: "",
    price: Number.NaN,
    time: null,
    changePercent: null,
    change: null,
    marketHours: null,
  };

  let pos = 0;
  while (pos < bytes.length) {
    const tag = readVarint(bytes, pos);
    if (!tag) return null;
    pos = tag.pos;
    const fieldNo = Number(tag.value >> 3n);
    const wireType = Number(tag.value & 7n);

    if (wireType === 0) {
      const v = readVarint(bytes, pos);
      if (!v) return null;
      pos = v.pos;
      if (fieldNo === 3) tick.time = Number(zigzagDecode(v.value));
      else if (fieldNo === 7) tick.marketHours = Number(v.value);
    } else if (wireType === 5) {
      if (pos + 4 > bytes.length) return null;
      const f = view.getFloat32(pos, true);
      pos += 4;
      if (fieldNo === 2) tick.price = f;
      else if (fieldNo === 8) tick.changePercent = f;
      else if (fieldNo === 12) tick.change = f;
    } else if (wireType === 1) {
      if (pos + 8 > bytes.length) return null;
      pos += 8;
    } else if (wireType === 2) {
      const len = readVarint(bytes, pos);
      if (!len) return null;
      pos = len.pos;
      const end = pos + Number(len.value);
      if (end > bytes.length) return null;
      if (fieldNo === 1) {
        tick.id = new TextDecoder().decode(bytes.subarray(pos, end));
      }
      pos = end;
    } else {
      return null;
    }
  }

  if (!tick.id || !Number.isFinite(tick.price)) return null;
  return tick;
}
