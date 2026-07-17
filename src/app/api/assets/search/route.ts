import { NextResponse } from "next/server";
import { z } from "zod";

import { searchAssets } from "@/lib/queries/assets";

const querySchema = z.object({
  q: z.string().trim().min(1).max(80),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) return NextResponse.json({ items: [] });

  const assets = await searchAssets(parsed.data.q);
  return NextResponse.json({
    items: assets.map((asset) => ({
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      assetClass: asset.assetClass,
      venue: asset.venue?.code ?? "OTC",
      currency: asset.quoteCurrency,
    })),
  });
}
