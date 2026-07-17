import { z } from "zod";

export const breakdownItemSchema = z.object({
  key: z.string(),
  name: z.string(),
  category: z.string(),
  weight: z.number(),
  normalizedScore: z.number(),
  impactPoints: z.number(),
  reasonText: z.string(),
  rawValue: z.number().optional(),
  dataQuality: z.number().min(0).max(1).optional(),
  provenance: z.array(z.string()).optional(),
  isFallback: z.boolean().optional(),
  engineVersion: z.string().optional(),
});

export type BreakdownItem = z.infer<typeof breakdownItemSchema>;

export const breakdownSchema = z.array(breakdownItemSchema);

export function parseBreakdown(json: unknown): BreakdownItem[] {
  const result = breakdownSchema.safeParse(json);
  return result.success ? result.data : [];
}

export const modelMetricsSchema = z.object({
  accuracy: z
    .object({
      D1: z.number().optional(),
      W1: z.number().optional(),
      M1: z.number().optional(),
    })
    .optional(),
  note: z.string().optional(),
});

export type ModelMetrics = z.infer<typeof modelMetricsSchema>;

export function parseModelMetrics(json: unknown): ModelMetrics | null {
  const result = modelMetricsSchema.safeParse(json);
  return result.success ? result.data : null;
}
