import "server-only";

import { prisma } from "@/lib/db";

export async function getOrCreatePaperAccount(userId: string) {
  return prisma.paperAccount.upsert({
    where: { userId },
    create: { userId, cash: 100_000, equity: 100_000, currency: "USD" },
    update: {},
  });
}

export async function getPaperPortfolio(userId: string) {
  const account = await getOrCreatePaperAccount(userId);
  const [positions, orders, fills] = await Promise.all([
    prisma.paperPosition.findMany({
      where: { accountId: account.id },
      orderBy: { symbol: "asc" },
    }),
    prisma.paperOrder.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.paperFill.findMany({
      where: { accountId: account.id },
      orderBy: { filledAt: "desc" },
      take: 40,
    }),
  ]);
  const marketValue = positions.reduce((s, p) => s + p.marketValue, 0);
  const unrealized = positions.reduce((s, p) => s + p.unrealizedPnL, 0);
  return {
    account: {
      ...account,
      marketValue,
      unrealized,
      equityMark: account.cash + marketValue,
    },
    positions,
    orders,
    fills,
  };
}

/**
 * Immediate market fill at the supplied mark price with a simple fee.
 * Educational simulator only — not a broker.
 */
export async function placePaperMarketOrder(args: {
  userId: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  markPrice: number;
  instrumentId?: string | null;
  stockId?: string | null;
}) {
  if (!(args.quantity > 0) || !(args.markPrice > 0)) {
    return { ok: false as const, reason: "Invalid quantity or price" };
  }
  const account = await getOrCreatePaperAccount(args.userId);
  const feeRate = 0.001;
  const notional = args.quantity * args.markPrice;
  const fee = notional * feeRate;
  const existing = await prisma.paperPosition.findUnique({
    where: {
      accountId_symbol: { accountId: account.id, symbol: args.symbol },
    },
  });

  if (args.side === "BUY" && account.cash < notional + fee) {
    const order = await prisma.paperOrder.create({
      data: {
        accountId: account.id,
        symbol: args.symbol,
        side: "BUY",
        quantity: args.quantity,
        limitPrice: args.markPrice,
        status: "REJECTED",
        reason: "Insufficient cash",
        instrumentId: args.instrumentId ?? null,
        stockId: args.stockId ?? null,
      },
    });
    return { ok: false as const, reason: "Insufficient cash", orderId: order.id };
  }

  if (args.side === "SELL" && (existing?.quantity ?? 0) < args.quantity) {
    const order = await prisma.paperOrder.create({
      data: {
        accountId: account.id,
        symbol: args.symbol,
        side: "SELL",
        quantity: args.quantity,
        limitPrice: args.markPrice,
        status: "REJECTED",
        reason: "Insufficient position",
        instrumentId: args.instrumentId ?? null,
        stockId: args.stockId ?? null,
      },
    });
    return {
      ok: false as const,
      reason: "Insufficient position",
      orderId: order.id,
    };
  }

  const order = await prisma.paperOrder.create({
    data: {
      accountId: account.id,
      symbol: args.symbol,
      side: args.side,
      quantity: args.quantity,
      limitPrice: args.markPrice,
      status: "FILLED",
      instrumentId: args.instrumentId ?? null,
      stockId: args.stockId ?? null,
    },
  });

  await prisma.paperFill.create({
    data: {
      accountId: account.id,
      orderId: order.id,
      price: args.markPrice,
      quantity: args.quantity,
      fee,
    },
  });

  let cashDelta = 0;
  if (args.side === "BUY") {
    cashDelta = -(notional + fee);
    const nextQty = (existing?.quantity ?? 0) + args.quantity;
    const nextCost =
      existing && existing.quantity > 0
        ? (existing.avgCost * existing.quantity + notional) / nextQty
        : args.markPrice;
    await prisma.paperPosition.upsert({
      where: {
        accountId_symbol: { accountId: account.id, symbol: args.symbol },
      },
      create: {
        accountId: account.id,
        symbol: args.symbol,
        quantity: args.quantity,
        avgCost: args.markPrice,
        marketValue: notional,
        unrealizedPnL: 0,
        instrumentId: args.instrumentId ?? null,
        stockId: args.stockId ?? null,
      },
      update: {
        quantity: nextQty,
        avgCost: nextCost,
        marketValue: nextQty * args.markPrice,
        unrealizedPnL: (args.markPrice - nextCost) * nextQty,
      },
    });
  } else {
    const held = existing?.quantity ?? 0;
    cashDelta = notional - fee;
    const nextQty = held - args.quantity;
    if (nextQty <= 1e-9) {
      await prisma.paperPosition.delete({
        where: {
          accountId_symbol: { accountId: account.id, symbol: args.symbol },
        },
      });
    } else {
      await prisma.paperPosition.update({
        where: {
          accountId_symbol: { accountId: account.id, symbol: args.symbol },
        },
        data: {
          quantity: nextQty,
          marketValue: nextQty * args.markPrice,
          unrealizedPnL: (args.markPrice - existing!.avgCost) * nextQty,
        },
      });
    }
  }

  const positions = await prisma.paperPosition.findMany({
    where: { accountId: account.id },
  });
  const marketValue = positions.reduce((s, p) => s + p.marketValue, 0);
  const nextCash = account.cash + cashDelta;
  await prisma.paperAccount.update({
    where: { id: account.id },
    data: { cash: nextCash, equity: nextCash + marketValue },
  });

  return { ok: true as const, orderId: order.id };
}
