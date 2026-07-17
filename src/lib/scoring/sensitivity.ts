export type MacroSensitivity = {
  usdInr: number;
  crude: number;
  fiiBeta: number;
};

/**
 * Directional sector sensitivities, not forecasts:
 * +1 means the sector generally benefits when the input rises;
 * -1 means it is generally pressured. Values are deliberately conservative.
 */
export const SECTOR_MACRO_SENSITIVITY: Record<string, MacroSensitivity> = {
  "Information Technology": { usdInr: 0.8, crude: -0.05, fiiBeta: 0.9 },
  "Financial Services": { usdInr: -0.15, crude: -0.1, fiiBeta: 1.0 },
  Energy: { usdInr: -0.2, crude: 0.35, fiiBeta: 0.8 },
  "Consumer Goods": { usdInr: -0.25, crude: -0.2, fiiBeta: 0.7 },
  Automobile: { usdInr: -0.2, crude: -0.3, fiiBeta: 0.9 },
  Pharmaceuticals: { usdInr: 0.55, crude: -0.05, fiiBeta: 0.7 },
  "Metals & Mining": { usdInr: 0.15, crude: -0.15, fiiBeta: 1.1 },
  Telecom: { usdInr: -0.3, crude: -0.05, fiiBeta: 0.8 },
};

export const DEFAULT_MACRO_SENSITIVITY: MacroSensitivity = {
  usdInr: 0,
  crude: 0,
  fiiBeta: 0.8,
};

export function sensitivityFor(sectorName: string): MacroSensitivity {
  return SECTOR_MACRO_SENSITIVITY[sectorName] ?? DEFAULT_MACRO_SENSITIVITY;
}
