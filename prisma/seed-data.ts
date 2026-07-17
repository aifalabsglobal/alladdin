export type SeedStock = {
  symbol: string;
  exchange: "NSE" | "BSE";
  name: string;
  sector: string;
  industry: string;
  marketCapCr: number;
  basePrice: number;
};

export const SEED_SECTORS = [
  "Information Technology",
  "Financial Services",
  "Energy",
  "Consumer Goods",
  "Automobile",
  "Pharmaceuticals",
  "Metals & Mining",
  "Telecom",
] as const;

export const SEED_STOCKS: SeedStock[] = [
  { symbol: "RELIANCE", exchange: "NSE", name: "Reliance Industries Ltd", sector: "Energy", industry: "Oil & Gas", marketCapCr: 1800000, basePrice: 2850 },
  { symbol: "TCS", exchange: "NSE", name: "Tata Consultancy Services Ltd", sector: "Information Technology", industry: "IT Services", marketCapCr: 1400000, basePrice: 3950 },
  { symbol: "HDFCBANK", exchange: "NSE", name: "HDFC Bank Ltd", sector: "Financial Services", industry: "Private Bank", marketCapCr: 1200000, basePrice: 1650 },
  { symbol: "INFY", exchange: "NSE", name: "Infosys Ltd", sector: "Information Technology", industry: "IT Services", marketCapCr: 750000, basePrice: 1780 },
  { symbol: "ICICIBANK", exchange: "NSE", name: "ICICI Bank Ltd", sector: "Financial Services", industry: "Private Bank", marketCapCr: 850000, basePrice: 1120 },
  { symbol: "HINDUNILVR", exchange: "NSE", name: "Hindustan Unilever Ltd", sector: "Consumer Goods", industry: "FMCG", marketCapCr: 580000, basePrice: 2450 },
  { symbol: "ITC", exchange: "NSE", name: "ITC Ltd", sector: "Consumer Goods", industry: "Diversified FMCG", marketCapCr: 560000, basePrice: 450 },
  { symbol: "SBIN", exchange: "NSE", name: "State Bank of India", sector: "Financial Services", industry: "Public Bank", marketCapCr: 720000, basePrice: 780 },
  { symbol: "BHARTIARTL", exchange: "NSE", name: "Bharti Airtel Ltd", sector: "Telecom", industry: "Telecom Services", marketCapCr: 900000, basePrice: 1550 },
  { symbol: "LT", exchange: "NSE", name: "Larsen & Toubro Ltd", sector: "Energy", industry: "Engineering", marketCapCr: 480000, basePrice: 3450 },
  { symbol: "AXISBANK", exchange: "NSE", name: "Axis Bank Ltd", sector: "Financial Services", industry: "Private Bank", marketCapCr: 360000, basePrice: 1100 },
  { symbol: "BAJFINANCE", exchange: "NSE", name: "Bajaj Finance Ltd", sector: "Financial Services", industry: "NBFC", marketCapCr: 420000, basePrice: 7200 },
  { symbol: "ASIANPAINT", exchange: "NSE", name: "Asian Paints Ltd", sector: "Consumer Goods", industry: "Paints", marketCapCr: 260000, basePrice: 2850 },
  { symbol: "MARUTI", exchange: "NSE", name: "Maruti Suzuki India Ltd", sector: "Automobile", industry: "Passenger Vehicles", marketCapCr: 390000, basePrice: 11200 },
  { symbol: "SUNPHARMA", exchange: "NSE", name: "Sun Pharmaceutical Industries Ltd", sector: "Pharmaceuticals", industry: "Pharma", marketCapCr: 380000, basePrice: 1650 },
  { symbol: "TITAN", exchange: "NSE", name: "Titan Company Ltd", sector: "Consumer Goods", industry: "Jewellery", marketCapCr: 310000, basePrice: 3400 },
  { symbol: "WIPRO", exchange: "NSE", name: "Wipro Ltd", sector: "Information Technology", industry: "IT Services", marketCapCr: 250000, basePrice: 520 },
  { symbol: "ULTRACEMCO", exchange: "NSE", name: "UltraTech Cement Ltd", sector: "Metals & Mining", industry: "Cement", marketCapCr: 300000, basePrice: 10500 },
  { symbol: "NESTLEIND", exchange: "NSE", name: "Nestle India Ltd", sector: "Consumer Goods", industry: "FMCG", marketCapCr: 230000, basePrice: 2400 },
  { symbol: "POWERGRID", exchange: "NSE", name: "Power Grid Corporation of India Ltd", sector: "Energy", industry: "Power Transmission", marketCapCr: 270000, basePrice: 310 },
  { symbol: "NTPC", exchange: "NSE", name: "NTPC Ltd", sector: "Energy", industry: "Power Generation", marketCapCr: 340000, basePrice: 360 },
  { symbol: "HCLTECH", exchange: "NSE", name: "HCL Technologies Ltd", sector: "Information Technology", industry: "IT Services", marketCapCr: 420000, basePrice: 1680 },
  { symbol: "M&M", exchange: "NSE", name: "Mahindra & Mahindra Ltd", sector: "Automobile", industry: "Auto Conglomerate", marketCapCr: 360000, basePrice: 2750 },
  { symbol: "TATASTEEL", exchange: "NSE", name: "Tata Steel Ltd", sector: "Metals & Mining", industry: "Steel", marketCapCr: 180000, basePrice: 155 },
  { symbol: "TECHM", exchange: "NSE", name: "Tech Mahindra Ltd", sector: "Information Technology", industry: "IT Services", marketCapCr: 140000, basePrice: 1550 },
  { symbol: "ADANIENT", exchange: "NSE", name: "Adani Enterprises Ltd", sector: "Energy", industry: "Conglomerate", marketCapCr: 320000, basePrice: 2850 },
  { symbol: "ADANIPORTS", exchange: "NSE", name: "Adani Ports and SEZ Ltd", sector: "Energy", industry: "Ports", marketCapCr: 280000, basePrice: 1250 },
  { symbol: "JSWSTEEL", exchange: "NSE", name: "JSW Steel Ltd", sector: "Metals & Mining", industry: "Steel", marketCapCr: 210000, basePrice: 920 },
  { symbol: "ONGC", exchange: "NSE", name: "Oil & Natural Gas Corporation Ltd", sector: "Energy", industry: "Oil & Gas", marketCapCr: 320000, basePrice: 270 },
  { symbol: "COALINDIA", exchange: "NSE", name: "Coal India Ltd", sector: "Energy", industry: "Coal Mining", marketCapCr: 250000, basePrice: 430 },
  { symbol: "BAJAJFINSV", exchange: "NSE", name: "Bajaj Finserv Ltd", sector: "Financial Services", industry: "Financial Conglomerate", marketCapCr: 250000, basePrice: 1850 },
  { symbol: "KOTAKBANK", exchange: "NSE", name: "Kotak Mahindra Bank Ltd", sector: "Financial Services", industry: "Private Bank", marketCapCr: 360000, basePrice: 1780 },
  { symbol: "DRREDDY", exchange: "NSE", name: "Dr. Reddy's Laboratories Ltd", sector: "Pharmaceuticals", industry: "Pharma", marketCapCr: 100000, basePrice: 6200 },
  { symbol: "CIPLA", exchange: "NSE", name: "Cipla Ltd", sector: "Pharmaceuticals", industry: "Pharma", marketCapCr: 120000, basePrice: 1450 },
  { symbol: "DIVISLAB", exchange: "NSE", name: "Divi's Laboratories Ltd", sector: "Pharmaceuticals", industry: "API / Pharma", marketCapCr: 110000, basePrice: 5200 },
  { symbol: "APOLLOHOSP", exchange: "NSE", name: "Apollo Hospitals Enterprise Ltd", sector: "Pharmaceuticals", industry: "Hospitals", marketCapCr: 95000, basePrice: 6800 },
  { symbol: "EICHERMOT", exchange: "NSE", name: "Eicher Motors Ltd", sector: "Automobile", industry: "Two Wheelers", marketCapCr: 130000, basePrice: 4800 },
  { symbol: "HEROMOTOCO", exchange: "NSE", name: "Hero MotoCorp Ltd", sector: "Automobile", industry: "Two Wheelers", marketCapCr: 90000, basePrice: 4600 },
  { symbol: "TATAMOTORS", exchange: "NSE", name: "Tata Motors Ltd", sector: "Automobile", industry: "Automobiles", marketCapCr: 280000, basePrice: 780 },
  { symbol: "BAJAJ-AUTO", exchange: "NSE", name: "Bajaj Auto Ltd", sector: "Automobile", industry: "Two Wheelers", marketCapCr: 240000, basePrice: 8900 },
  { symbol: "HINDALCO", exchange: "NSE", name: "Hindalco Industries Ltd", sector: "Metals & Mining", industry: "Aluminium", marketCapCr: 140000, basePrice: 640 },
  { symbol: "VEDL", exchange: "NSE", name: "Vedanta Ltd", sector: "Metals & Mining", industry: "Diversified Metals", marketCapCr: 150000, basePrice: 450 },
  { symbol: "BPCL", exchange: "NSE", name: "Bharat Petroleum Corporation Ltd", sector: "Energy", industry: "Oil Marketing", marketCapCr: 120000, basePrice: 560 },
  { symbol: "INDUSINDBK", exchange: "NSE", name: "IndusInd Bank Ltd", sector: "Financial Services", industry: "Private Bank", marketCapCr: 90000, basePrice: 980 },
  { symbol: "GRASIM", exchange: "NSE", name: "Grasim Industries Ltd", sector: "Metals & Mining", industry: "Diversified", marketCapCr: 160000, basePrice: 2450 },
  { symbol: "BRITANNIA", exchange: "NSE", name: "Britannia Industries Ltd", sector: "Consumer Goods", industry: "Food Products", marketCapCr: 130000, basePrice: 5200 },
  { symbol: "SBILIFE", exchange: "NSE", name: "SBI Life Insurance Company Ltd", sector: "Financial Services", industry: "Life Insurance", marketCapCr: 150000, basePrice: 1550 },
  { symbol: "HDFCLIFE", exchange: "NSE", name: "HDFC Life Insurance Company Ltd", sector: "Financial Services", industry: "Life Insurance", marketCapCr: 140000, basePrice: 680 },
  { symbol: "IDEA", exchange: "NSE", name: "Vodafone Idea Ltd", sector: "Telecom", industry: "Telecom Services", marketCapCr: 85000, basePrice: 12 },
  { symbol: "TATACOMM", exchange: "NSE", name: "Tata Communications Ltd", sector: "Telecom", industry: "Telecom Infrastructure", marketCapCr: 50000, basePrice: 1850 },
];

/** Mulberry32 — deterministic PRNG from a 32-bit seed. */
export function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
