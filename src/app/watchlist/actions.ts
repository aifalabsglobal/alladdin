"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import {
  addStockToWatchlist,
  removeStockFromWatchlist,
} from "@/lib/queries/userWatchlist";

export async function addWatchlistItem(formData: FormData): Promise<void> {
  const auth = await requireUserId();
  if (!auth.ok) return;
  const symbol = String(formData.get("symbol") ?? "")
    .trim()
    .toUpperCase();
  if (!symbol) return;
  await addStockToWatchlist(auth.userId, symbol);
  revalidatePath("/watchlist");
}

export async function removeWatchlistItem(formData: FormData): Promise<void> {
  const auth = await requireUserId();
  if (!auth.ok) return;
  const symbol = String(formData.get("symbol") ?? "").trim();
  if (!symbol) return;
  await removeStockFromWatchlist(auth.userId, symbol);
  revalidatePath("/watchlist");
}
