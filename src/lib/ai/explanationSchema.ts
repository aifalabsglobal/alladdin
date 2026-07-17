import { z } from "zod";

export const PROMPT_VERSION = "explain-v1";

export const explanationSchema = z.object({
  summary: z
    .string()
    .min(20)
    .max(600)
    .describe("Plain-language educational summary of the model outlook"),
  bullishDrivers: z
    .array(z.string().min(3).max(200))
    .max(5)
    .describe("Evidence supporting upside"),
  bearishDrivers: z
    .array(z.string().min(3).max(200))
    .max(5)
    .describe("Evidence supporting downside"),
  risks: z
    .array(z.string().min(3).max(200))
    .max(5)
    .describe("Key uncertainties and model limitations"),
  caveats: z
    .array(z.string().min(3).max(200))
    .max(5)
    .describe("Data quality / freshness caveats"),
});

export type ExplanationPayload = z.infer<typeof explanationSchema>;

export const FORBIDDEN_PHRASES = [
  "buy now",
  "sell now",
  "strong buy",
  "strong sell",
  "you should buy",
  "you should sell",
  "guaranteed",
  "target price",
  "accumulate",
  "book profits",
];

export function containsAdviceLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_PHRASES.some((p) => lower.includes(p));
}

export function sanitizeExplanation(
  payload: ExplanationPayload,
): ExplanationPayload | null {
  const blob = [
    payload.summary,
    ...payload.bullishDrivers,
    ...payload.bearishDrivers,
    ...payload.risks,
    ...payload.caveats,
  ].join(" ");
  if (containsAdviceLanguage(blob)) return null;
  return payload;
}
