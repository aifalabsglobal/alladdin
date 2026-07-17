"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { placePaperMarketOrder } from "@/lib/paper/trading";

export async function submitPaperOrder(formData: FormData): Promise<void> {
  const auth = await requireUserId();
  if (!auth.ok) return;
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const side = String(formData.get("side") ?? "BUY").toUpperCase() as
    | "BUY"
    | "SELL";
  const quantity = Number(formData.get("quantity"));
  const markPrice = Number(formData.get("markPrice"));
  await placePaperMarketOrder({
    userId: auth.userId,
    symbol,
    side,
    quantity,
    markPrice,
  });
  revalidatePath("/paper");
}
