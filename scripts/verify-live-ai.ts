import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const latest = await prisma.prediction.findFirst({
    where: { mlModel: { key: "ensemble_v1" } },
    orderBy: { asOf: "desc" },
    select: { asOf: true, runId: true },
  });
  if (!latest) throw new Error("No ensemble predictions found");

  const [predictions, intradayBars, explanations, labeled, models] =
    await Promise.all([
      prisma.prediction.findMany({
        where: { runId: latest.runId },
        include: { stock: { select: { symbol: true } }, mlModel: true },
      }),
      prisma.intradayBar.count(),
      prisma.predictionExplanation.count(),
      prisma.prediction.count({
        where: { outcome: { not: null }, correct: { not: null } },
      }),
      prisma.mlModel.findMany({
        where: { status: "ACTIVE" },
        select: { key: true, version: true, metrics: true },
      }),
    ]);

  const badProbability = predictions.filter((p) => {
    if (p.probUp === null || p.probSideways === null || p.probDown === null) {
      return true;
    }
    const sum = p.probUp + p.probSideways + p.probDown;
    return (
      p.probUp < 0 ||
      p.probSideways < 0 ||
      p.probDown < 0 ||
      Math.abs(sum - 1) > 0.01
    );
  });

  const horizons = Object.fromEntries(
    [...new Set(predictions.map((p) => p.horizon))].map((h) => [
      h,
      predictions.filter((p) => p.horizon === h).length,
    ]),
  );

  const result = {
    latestRun: latest.runId,
    asOf: latest.asOf.toISOString(),
    predictions: predictions.length,
    horizons,
    insufficient: predictions.filter((p) => p.insufficientData).length,
    boundedProbabilities: badProbability.length === 0,
    confidenceRange: {
      min: Math.min(...predictions.map((p) => p.confidence)),
      max: Math.max(...predictions.map((p) => p.confidence)),
    },
    labeledOutcomes: labeled,
    intradayBars,
    explanations,
    activeModels: models,
    sample: predictions[0]
      ? {
          symbol: predictions[0].stock.symbol,
          horizon: predictions[0].horizon,
          direction: predictions[0].direction,
          confidence: predictions[0].confidence,
          probabilities: [
            predictions[0].probUp,
            predictions[0].probSideways,
            predictions[0].probDown,
          ],
        }
      : null,
  };

  if (predictions.length !== 300) {
    throw new Error(`Expected 300 latest predictions, found ${predictions.length}`);
  }
  if (badProbability.length > 0) {
    throw new Error(`${badProbability.length} predictions have invalid probabilities`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
