import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const bySource = await prisma.priceBar.groupBy({
    by: ["dataSource"],
    _count: { _all: true },
  });
  console.log("PriceBar rows by source:", JSON.stringify(bySource));

  const latestReal = await prisma.priceBar.findFirst({
    where: { dataSource: "NSE_BHAVCOPY" },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  console.log("Latest bhavcopy date:", latestReal?.date.toISOString().slice(0, 10));

  if (latestReal) {
    const covered = await prisma.priceBar.findMany({
      where: { dataSource: "NSE_BHAVCOPY", date: latestReal.date },
      select: { stock: { select: { symbol: true } } },
    });
    const coveredSet = new Set(covered.map((c) => c.stock.symbol));
    const all = await prisma.stock.findMany({ select: { symbol: true } });
    const missing = all.map((s) => s.symbol).filter((s) => !coveredSet.has(s));
    console.log("Symbols missing real bhavcopy row:", JSON.stringify(missing));
  }

  const macro = await prisma.macroIndicator.findMany({
    orderBy: [{ key: "asc" }, { date: "desc" }],
    take: 10,
    select: { key: true, date: true, value: true, dataSource: true },
  });
  console.log(
    "MacroIndicator rows:",
    JSON.stringify(
      macro.map((m) => ({
        key: m.key,
        date: m.date.toISOString().slice(0, 10),
        value: m.value,
        src: m.dataSource,
      })),
    ),
  );

  const runs = await prisma.ingestionRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 8,
    select: { adapter: true, status: true, rowsUpserted: true, errorMessage: true },
  });
  console.log("Recent ingestion runs:", JSON.stringify(runs));

  const syntheticStillThere = await prisma.priceBar.count({
    where: { dataSource: "SYNTHETIC" },
  });
  console.log("Synthetic price bars retained:", syntheticStillThere);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
