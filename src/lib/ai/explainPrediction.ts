import "server-only";

import OpenAI from "openai";

import { assertWithinBudget, recordApiUsage } from "@/lib/ai/budget";
import {
  PROMPT_VERSION,
  explanationSchema,
  sanitizeExplanation,
  type ExplanationPayload,
} from "@/lib/ai/explanationSchema";
import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

const MODEL = "gpt-4o-mini";

export type ExplainResult = {
  predictionId: string;
  cached: boolean;
  explanation: ExplanationPayload & {
    promptVersion: string;
    model: string;
  };
};

function buildFallback(args: {
  symbol: string;
  horizon: string;
  direction: string;
  confidence: number;
  drivers: { key: string; reason: string }[];
  insufficientData: boolean;
}): ExplanationPayload {
  const top = args.drivers.slice(0, 3).map((d) => d.reason);
  return {
    summary: args.insufficientData
      ? `${args.symbol} ${args.horizon} outlook is inconclusive because feature coverage is thin. Treat this as an educational placeholder, not a forecast.`
      : `${args.symbol} model leans ${args.direction.toLowerCase()} over ${args.horizon} with ${(args.confidence * 100).toFixed(0)}% class probability. This is an educational directional signal from an explainable ensemble, not investment advice.`,
    bullishDrivers:
      args.direction === "DOWN"
        ? top.length
          ? []
          : ["Limited upside evidence in the current feature set."]
        : top.length
          ? top
          : ["Momentum and health inputs are mixed-to-constructive."],
    bearishDrivers:
      args.direction === "UP"
        ? []
        : top.length
          ? top
          : ["Momentum/volatility inputs do not clearly support upside."],
    risks: [
      "Model is a prototype ensemble without licensed intraday market data guarantees.",
      "Past feature relationships may not persist; confidence is not a success probability guarantee.",
    ],
    caveats: [
      args.insufficientData
        ? "Insufficient feature history — confidence is capped."
        : "Yahoo stream/chart data is an unofficial prototype feed with EOD fallback.",
      "No buy/sell recommendation is implied.",
    ],
  };
}

export async function explainPrediction(
  predictionId: string,
  opts?: { force?: boolean },
): Promise<ExplainResult> {
  const prediction = await prisma.prediction.findUnique({
    where: { id: predictionId },
    include: {
      stock: { select: { symbol: true, name: true } },
      mlModel: true,
      explanation: true,
    },
  });

  if (!prediction) {
    throw new Error("Prediction not found");
  }

  if (prediction.explanation && !opts?.force) {
    const cached = prediction.explanation;
    return {
      predictionId,
      cached: true,
      explanation: {
        promptVersion: cached.promptVersion,
        model: cached.model,
        summary: cached.summary,
        bullishDrivers: cached.bullishDrivers as string[],
        bearishDrivers: cached.bearishDrivers as string[],
        risks: cached.risks as string[],
        caveats: cached.caveats as string[],
      },
    };
  }

  const features = prediction.features as {
    drivers?: { key: string; reason: string; impact: number }[];
  };
  const drivers = features.drivers ?? [];

  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    const fallback = buildFallback({
      symbol: prediction.stock.symbol,
      horizon: prediction.horizon,
      direction: prediction.direction,
      confidence: prediction.confidence,
      drivers,
      insufficientData: prediction.insufficientData,
    });
    const saved = await prisma.predictionExplanation.upsert({
      where: { predictionId },
      create: {
        predictionId,
        promptVersion: PROMPT_VERSION,
        model: "fallback-local",
        summary: fallback.summary,
        bullishDrivers: fallback.bullishDrivers,
        bearishDrivers: fallback.bearishDrivers,
        risks: fallback.risks,
        caveats: fallback.caveats,
        evidence: { drivers, source: "local_fallback" },
      },
      update: {
        promptVersion: PROMPT_VERSION,
        model: "fallback-local",
        summary: fallback.summary,
        bullishDrivers: fallback.bullishDrivers,
        bearishDrivers: fallback.bearishDrivers,
        risks: fallback.risks,
        caveats: fallback.caveats,
        evidence: { drivers, source: "local_fallback" },
      },
    });
    return {
      predictionId,
      cached: false,
      explanation: {
        promptVersion: saved.promptVersion,
        model: saved.model,
        ...fallback,
      },
    };
  }

  await assertWithinBudget(900);

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const system = `You explain quantitative stock-health model outputs for an educational dashboard.
Rules:
- Use only the provided evidence. Do not invent prices, news, or catalysts.
- Never give buy/sell advice, target prices, or personalized recommendations.
- Stay under 90 words in summary.
- Return strict JSON matching the schema keys: summary, bullishDrivers, bearishDrivers, risks, caveats.`;

  const user = JSON.stringify({
    symbol: prediction.stock.symbol,
    name: prediction.stock.name,
    horizon: prediction.horizon,
    direction: prediction.direction,
    confidence: prediction.confidence,
    probabilities: {
      up: prediction.probUp,
      sideways: prediction.probSideways,
      down: prediction.probDown,
    },
    expectedReturn: prediction.expectedReturn,
    uncertainty: prediction.uncertainty,
    insufficientData: prediction.insufficientData,
    model: `${prediction.mlModel.key}@${prediction.mlModel.version}`,
    drivers,
  });

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const usage = completion.usage;
  await recordApiUsage({
    model: MODEL,
    purpose: "prediction_explanation",
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
    metadata: { predictionId, promptVersion: PROMPT_VERSION },
  });

  const rawText = completion.choices[0]?.message?.content ?? "{}";
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    parsedJson = {};
  }

  const validated = explanationSchema.safeParse(parsedJson);
  const sanitized = validated.success
    ? sanitizeExplanation(validated.data)
    : null;

  const payload =
    sanitized ??
    buildFallback({
      symbol: prediction.stock.symbol,
      horizon: prediction.horizon,
      direction: prediction.direction,
      confidence: prediction.confidence,
      drivers,
      insufficientData: prediction.insufficientData,
    });

  const saved = await prisma.predictionExplanation.upsert({
    where: { predictionId },
    create: {
      predictionId,
      promptVersion: PROMPT_VERSION,
      model: sanitized ? MODEL : "fallback-local",
      summary: payload.summary,
      bullishDrivers: payload.bullishDrivers,
      bearishDrivers: payload.bearishDrivers,
      risks: payload.risks,
      caveats: payload.caveats,
      evidence: { drivers, asOf: prediction.asOf.toISOString() },
      rawResponse: parsedJson as object,
    },
    update: {
      promptVersion: PROMPT_VERSION,
      model: sanitized ? MODEL : "fallback-local",
      summary: payload.summary,
      bullishDrivers: payload.bullishDrivers,
      bearishDrivers: payload.bearishDrivers,
      risks: payload.risks,
      caveats: payload.caveats,
      evidence: { drivers, asOf: prediction.asOf.toISOString() },
      rawResponse: parsedJson as object,
    },
  });

  return {
    predictionId,
    cached: false,
    explanation: {
      promptVersion: saved.promptVersion,
      model: saved.model,
      ...payload,
    },
  };
}
