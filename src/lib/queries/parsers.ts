import { z } from "zod";

export const breakdownItemSchema = z.object({
  key: z.string(),
  name: z.string(),
  category: z.string(),
  weight: z.number(),
  normalizedScore: z.number(),
  impactPoints: z.number(),
  reasonText: z.string(),
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
