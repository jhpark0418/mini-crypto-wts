export const SYMBOLS = ["BTCUSDT", "ETHUSDT"] as const;
export type Symbol = (typeof SYMBOLS)[number];

export const BINANCE_TIMEFRAMES = [
  "1m", "5m", "30m",
  "1h", "12h",
  "1d"
] as const;
export type CandleTimeframe = (typeof BINANCE_TIMEFRAMES)[number];

export const DEFAULT_CHART_TIMEFRAMES: CandleTimeframe[] = [
  "1m", "5m", "30m",
  "1h", "12h",
  "1d"
];

export const DEFAULT_BACKFILL_TIMEFRAMES: CandleTimeframe[] = [
  "1m", "5m", "30m",
  "1h", "12h",
  "1d"
];