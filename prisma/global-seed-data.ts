export type SeedVenue = {
  code: string;
  mic?: string;
  name: string;
  countryCode?: string;
  timezone: string;
  sessionType: "EXCHANGE" | "CONTINUOUS_24_5" | "CONTINUOUS_24_7";
  openMinute?: number;
  closeMinute?: number;
  weekMask?: string;
};

export type SeedInstrument = {
  symbol: string;
  name: string;
  assetClass:
    | "EQUITY"
    | "ETF"
    | "INDEX"
    | "FX"
    | "CRYPTO"
    | "COMMODITY"
    | "BOND_PROXY"
    | "FUTURE";
  venueCode: string;
  quoteCurrency: string;
  baseCurrency?: string;
  tier: "HOT" | "WARM" | "COLD";
  providers: {
    provider: string;
    symbol: string;
    capabilities: string[];
    displayAllowed?: boolean;
  }[];
};

export const GLOBAL_VENUES: SeedVenue[] = [
  {
    code: "XNSE",
    mic: "XNSE",
    name: "National Stock Exchange of India",
    countryCode: "IN",
    timezone: "Asia/Kolkata",
    sessionType: "EXCHANGE",
    openMinute: 555,
    closeMinute: 930,
  },
  {
    code: "XBOM",
    mic: "XBOM",
    name: "Bombay Stock Exchange",
    countryCode: "IN",
    timezone: "Asia/Kolkata",
    sessionType: "EXCHANGE",
    openMinute: 555,
    closeMinute: 930,
  },
  {
    code: "XNAS",
    mic: "XNAS",
    name: "Nasdaq",
    countryCode: "US",
    timezone: "America/New_York",
    sessionType: "EXCHANGE",
    openMinute: 570,
    closeMinute: 960,
  },
  {
    code: "XNYS",
    mic: "XNYS",
    name: "New York Stock Exchange",
    countryCode: "US",
    timezone: "America/New_York",
    sessionType: "EXCHANGE",
    openMinute: 570,
    closeMinute: 960,
  },
  {
    code: "ARCX",
    mic: "ARCX",
    name: "NYSE Arca",
    countryCode: "US",
    timezone: "America/New_York",
    sessionType: "EXCHANGE",
    openMinute: 570,
    closeMinute: 960,
  },
  {
    code: "GLOBAL_INDEX",
    name: "Global index reference",
    timezone: "UTC",
    sessionType: "EXCHANGE",
    openMinute: 0,
    closeMinute: 1439,
  },
  {
    code: "FX",
    name: "Global foreign exchange",
    timezone: "UTC",
    sessionType: "CONTINUOUS_24_5",
  },
  {
    code: "CRYPTO",
    name: "Global crypto aggregate",
    timezone: "UTC",
    sessionType: "CONTINUOUS_24_7",
    weekMask: "0,1,2,3,4,5,6",
  },
  {
    code: "PROXY",
    name: "Exchange-traded market proxies",
    timezone: "America/New_York",
    sessionType: "EXCHANGE",
    openMinute: 570,
    closeMinute: 960,
  },
];

const yahoo = (
  symbol: string,
  capabilities = ["QUOTE", "INTRADAY", "EOD"],
) => ({
  provider: "YAHOO_FINANCE",
  symbol,
  capabilities,
  displayAllowed: false,
});

const twelve = (symbol: string) => ({
  provider: "TWELVE_DATA",
  symbol,
  capabilities: ["QUOTE", "INTRADAY", "EOD"],
  displayAllowed: false,
});

export const GLOBAL_INSTRUMENTS: SeedInstrument[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    assetClass: "EQUITY",
    venueCode: "XNAS",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [yahoo("AAPL"), twelve("AAPL")],
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    assetClass: "EQUITY",
    venueCode: "XNAS",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [yahoo("MSFT"), twelve("MSFT")],
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    assetClass: "EQUITY",
    venueCode: "XNAS",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [yahoo("NVDA"), twelve("NVDA")],
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    assetClass: "EQUITY",
    venueCode: "XNAS",
    quoteCurrency: "USD",
    tier: "WARM",
    providers: [yahoo("AMZN")],
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    assetClass: "EQUITY",
    venueCode: "XNAS",
    quoteCurrency: "USD",
    tier: "WARM",
    providers: [yahoo("GOOGL")],
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    assetClass: "EQUITY",
    venueCode: "XNAS",
    quoteCurrency: "USD",
    tier: "WARM",
    providers: [yahoo("META")],
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    assetClass: "EQUITY",
    venueCode: "XNAS",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [yahoo("TSLA"), twelve("TSLA")],
  },
  {
    symbol: "BRK.B",
    name: "Berkshire Hathaway Inc. Class B",
    assetClass: "EQUITY",
    venueCode: "XNYS",
    quoteCurrency: "USD",
    tier: "COLD",
    providers: [yahoo("BRK-B")],
  },
  {
    symbol: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    assetClass: "ETF",
    venueCode: "ARCX",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [yahoo("SPY"), twelve("SPY")],
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ Trust",
    assetClass: "ETF",
    venueCode: "ARCX",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [yahoo("QQQ")],
  },
  {
    symbol: "IWM",
    name: "iShares Russell 2000 ETF",
    assetClass: "ETF",
    venueCode: "ARCX",
    quoteCurrency: "USD",
    tier: "WARM",
    providers: [yahoo("IWM")],
  },
  {
    symbol: "GLD",
    name: "SPDR Gold Shares",
    assetClass: "COMMODITY",
    venueCode: "ARCX",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [yahoo("GLD")],
  },
  {
    symbol: "USO",
    name: "United States Oil Fund",
    assetClass: "COMMODITY",
    venueCode: "ARCX",
    quoteCurrency: "USD",
    tier: "WARM",
    providers: [yahoo("USO")],
  },
  {
    symbol: "TLT",
    name: "iShares 20+ Year Treasury Bond ETF",
    assetClass: "BOND_PROXY",
    venueCode: "ARCX",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [yahoo("TLT")],
  },
  {
    symbol: "GSPC",
    name: "S&P 500 Index",
    assetClass: "INDEX",
    venueCode: "GLOBAL_INDEX",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [yahoo("^GSPC")],
  },
  {
    symbol: "NDX",
    name: "Nasdaq-100 Index",
    assetClass: "INDEX",
    venueCode: "GLOBAL_INDEX",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [yahoo("^NDX")],
  },
  {
    symbol: "VIX",
    name: "CBOE Volatility Index",
    assetClass: "INDEX",
    venueCode: "GLOBAL_INDEX",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [yahoo("^VIX")],
  },
  {
    symbol: "N225",
    name: "Nikkei 225",
    assetClass: "INDEX",
    venueCode: "GLOBAL_INDEX",
    quoteCurrency: "JPY",
    tier: "WARM",
    providers: [yahoo("^N225")],
  },
  {
    symbol: "FTSE",
    name: "FTSE 100",
    assetClass: "INDEX",
    venueCode: "GLOBAL_INDEX",
    quoteCurrency: "GBP",
    tier: "WARM",
    providers: [yahoo("^FTSE")],
  },
  {
    symbol: "EURUSD",
    name: "Euro / US Dollar",
    assetClass: "FX",
    venueCode: "FX",
    baseCurrency: "EUR",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [yahoo("EURUSD=X"), twelve("EUR/USD")],
  },
  {
    symbol: "GBPUSD",
    name: "British Pound / US Dollar",
    assetClass: "FX",
    venueCode: "FX",
    baseCurrency: "GBP",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [yahoo("GBPUSD=X"), twelve("GBP/USD")],
  },
  {
    symbol: "USDJPY",
    name: "US Dollar / Japanese Yen",
    assetClass: "FX",
    venueCode: "FX",
    baseCurrency: "USD",
    quoteCurrency: "JPY",
    tier: "WARM",
    providers: [yahoo("JPY=X"), twelve("USD/JPY")],
  },
  {
    symbol: "USDINR",
    name: "US Dollar / Indian Rupee",
    assetClass: "FX",
    venueCode: "FX",
    baseCurrency: "USD",
    quoteCurrency: "INR",
    tier: "HOT",
    providers: [yahoo("INR=X")],
  },
  {
    symbol: "BTCUSD",
    name: "Bitcoin / US Dollar",
    assetClass: "CRYPTO",
    venueCode: "CRYPTO",
    baseCurrency: "BTC",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [
      {
        provider: "COINGECKO",
        symbol: "bitcoin",
        capabilities: ["QUOTE", "INTRADAY", "EOD"],
        displayAllowed: true,
      },
      yahoo("BTC-USD"),
    ],
  },
  {
    symbol: "ETHUSD",
    name: "Ethereum / US Dollar",
    assetClass: "CRYPTO",
    venueCode: "CRYPTO",
    baseCurrency: "ETH",
    quoteCurrency: "USD",
    tier: "HOT",
    providers: [
      {
        provider: "COINGECKO",
        symbol: "ethereum",
        capabilities: ["QUOTE", "INTRADAY", "EOD"],
        displayAllowed: true,
      },
      yahoo("ETH-USD"),
    ],
  },
  {
    symbol: "SOLUSD",
    name: "Solana / US Dollar",
    assetClass: "CRYPTO",
    venueCode: "CRYPTO",
    baseCurrency: "SOL",
    quoteCurrency: "USD",
    tier: "WARM",
    providers: [
      {
        provider: "COINGECKO",
        symbol: "solana",
        capabilities: ["QUOTE", "INTRADAY", "EOD"],
        displayAllowed: true,
      },
      yahoo("SOL-USD"),
    ],
  },
];
