import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const latest = await prisma.healthScore.findFirst({
    where: { dataSource: "COMPUTED" },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  if (!latest) throw new Error("No COMPUTED health scores found");

  const [scores, readings, features, priceBarsAfter] = await Promise.all([
    prisma.healthScore.findMany({
      where: { date: latest.date, dataSource: "COMPUTED" },
      include: { stock: { select: { symbol: true } } },
      orderBy: { stock: { symbol: "asc" } },
    }),
    prisma.influencerReading.count({
      where: { date: latest.date, dataSource: "COMPUTED" },
    }),
    prisma.featureSnapshot.count({ where: { date: latest.date } }),
    prisma.priceBar.count({
      where: {
        date: { gt: latest.date },
        dataSource: { in: ["NSE_BHAVCOPY", "YAHOO_FINANCE"] },
      },
    }),
  ]);

  const sample = scores[0];
  const breakdown = Array.isArray(sample?.breakdown)
    ? sample.breakdown
    : [];

  console.log(
    JSON.stringify(
      {
        asOf: latest.date.toISOString().slice(0, 10),
        computedScores: scores.length,
        computedReadings: readings,
        featureSnapshots: features,
        scoreRange: {
          min: Math.min(...scores.map((s) => s.score)),
          max: Math.max(...scores.map((s) => s.score)),
        },
        sample: sample
          ? {
              symbol: sample.stock.symbol,
              score: sample.score,
              band: sample.band,
              dataSource: sample.dataSource,
              influencerCount: breakdown.length,
              firstInfluencer: breakdown[0],
            }
          : null,
        futureRealBarsPresent: priceBarsAfter,
        note:
          "The engine queries date <= asOf, so later bars cannot enter this score even if present.",
      },
      null,
      2,
    ),
  );

  if (scores.length !== 50) throw new Error(`Expected 50 scores, got ${scores.length}`);
  if (readings !== 550) throw new Error(`Expected 550 readings, got ${readings}`);
  if (features !== 50) throw new Error(`Expected 50 features, got ${features}`);
  if (breakdown.length !== 11) {
    throw new Error(`Expected 11 sample breakdown entries, got ${breakdown.length}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
