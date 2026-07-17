import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const prediction = await prisma.prediction.findFirst({
    where: {
      mlModel: { key: "ensemble_v1" },
      insufficientData: false,
    },
    orderBy: [{ asOf: "desc" }, { confidence: "desc" }],
    select: { id: true, stock: { select: { symbol: true } } },
  });
  if (!prediction) throw new Error("No ensemble prediction found");

  const response = await fetch("http://localhost:3001/api/ai/explain", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ predictionId: prediction.id }),
  });
  const json = (await response.json()) as {
    error?: string;
    cached?: boolean;
    explanation?: {
      model: string;
      summary: string;
      risks: string[];
      caveats: string[];
    };
  };
  if (!response.ok || !json.explanation) {
    throw new Error(json.error ?? `HTTP ${response.status}`);
  }

  console.log(
    JSON.stringify(
      {
        symbol: prediction.stock.symbol,
        cached: json.cached,
        model: json.explanation.model,
        summaryLength: json.explanation.summary.length,
        risks: json.explanation.risks.length,
        caveats: json.explanation.caveats.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
