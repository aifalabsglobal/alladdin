import { NextResponse } from "next/server";

import { getTickerTape } from "@/lib/queries/market";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tape = await getTickerTape();
    return NextResponse.json(tape, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { asOf: null, items: [] },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
