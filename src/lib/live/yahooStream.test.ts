import { describe, expect, it } from "vitest";

import { decodeLiveTick, fromYahooSymbol, toYahooSymbol } from "./yahooStream";

function varint(value: bigint): number[] {
  const out: number[] = [];
  let v = value;
  while (v > 0x7fn) {
    out.push(Number(v & 0x7fn) | 0x80);
    v >>= 7n;
  }
  out.push(Number(v));
  return out;
}

function zigzag(value: bigint): bigint {
  return value >= 0n ? value << 1n : ((-value) << 1n) - 1n;
}

function float32(value: number): number[] {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setFloat32(0, value, true);
  return [...new Uint8Array(buf)];
}

/** Encode a minimal yaticker message the way protobuf wire format does. */
function encodeTicker(fields: {
  id: string;
  price: number;
  timeMs: number;
  marketHours: number;
  changePercent: number;
  change: number;
}): string {
  const idBytes = [...new TextEncoder().encode(fields.id)];
  const bytes = [
    (1 << 3) | 2, idBytes.length, ...idBytes,
    (2 << 3) | 5, ...float32(fields.price),
    (3 << 3) | 0, ...varint(zigzag(BigInt(fields.timeMs))),
    (7 << 3) | 0, ...varint(BigInt(fields.marketHours)),
    (8 << 3) | 5, ...float32(fields.changePercent),
    (12 << 3) | 5, ...float32(fields.change),
  ];
  return btoa(String.fromCharCode(...bytes));
}

describe("decodeLiveTick", () => {
  it("decodes id, price, time, marketHours, change and changePercent", () => {
    const b64 = encodeTicker({
      id: "RELIANCE.NS",
      price: 2945.75,
      timeMs: 1_784_280_000_000,
      marketHours: 1,
      changePercent: -0.42,
      change: -12.4,
    });

    const tick = decodeLiveTick(b64);
    expect(tick).not.toBeNull();
    expect(tick!.id).toBe("RELIANCE.NS");
    expect(tick!.price).toBeCloseTo(2945.75, 2);
    expect(tick!.time).toBe(1_784_280_000_000);
    expect(tick!.marketHours).toBe(1);
    expect(tick!.changePercent).toBeCloseTo(-0.42, 4);
    expect(tick!.change).toBeCloseTo(-12.4, 3);
  });

  it("skips unknown fields without failing", () => {
    const idBytes = [...new TextEncoder().encode("^NSEI")];
    const bytes = [
      (1 << 3) | 2, idBytes.length, ...idBytes,
      // unknown length-delimited field 13 (shortName)
      (13 << 3) | 2, 3, 65, 66, 67,
      // unknown fixed64 field 14 (tag must fit one byte; 14<<3|1 = 113)
      (14 << 3) | 1, 0, 0, 0, 0, 0, 0, 0, 0,
      (2 << 3) | 5, ...float32(22358.57),
    ];
    const tick = decodeLiveTick(btoa(String.fromCharCode(...bytes)));
    expect(tick).not.toBeNull();
    expect(tick!.id).toBe("^NSEI");
    expect(tick!.price).toBeCloseTo(22358.57, 1);
  });

  it("returns null for malformed payloads", () => {
    expect(decodeLiveTick("not-base64!!!")).toBeNull();
    expect(decodeLiveTick(btoa("\x0a\xff"))).toBeNull();
    expect(decodeLiveTick("")).toBeNull();
  });
});

describe("symbol mapping", () => {
  it("maps app keys to Yahoo symbols and back", () => {
    expect(toYahooSymbol("NIFTY50", "index")).toBe("^NSEI");
    expect(toYahooSymbol("SENSEX", "index")).toBe("^BSESN");
    expect(toYahooSymbol("INDIAVIX", "index")).toBe("^INDIAVIX");
    expect(toYahooSymbol("BAJAJ-AUTO", "stock")).toBe("BAJAJ-AUTO.NS");
    expect(toYahooSymbol("UNKNOWNINDEX", "index")).toBeNull();

    expect(fromYahooSymbol("^NSEI")).toBe("NIFTY50");
    expect(fromYahooSymbol("BAJAJ-AUTO.NS")).toBe("BAJAJ-AUTO");
  });
});
