"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserId } from "@/lib/auth";
import {
  addStockToWatchlist,
  removeStockFromWatchlist,
} from "@/lib/queries/userWatchlist";

export async function addWatchlistItem(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const symbol = String(formData.get("symbol") ?? "")
    .trim()
    .toUpperCase();
  if (!symbol) return;
  await addStockToWatchlist(userId, symbol);
  revalidatePath("/watchlist");
}

export async function removeWatchlistItem(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const symbol = String(formData.get("symbol") ?? "").trim();
  if (!symbol) return;
  await removeStockFromWatchlist(userId, symbol);
  revalidatePath("/watchlist");
}
