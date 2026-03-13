export const SYMBOLS = ["BTCUSDT", "ETHUSDT"] as const;
export type Symbol = (typeof SYMBOLS)[number];

export const BINANCE_TIMEFRAMES = [
  // "1m", "5m", "30m",
  // "1h", "12h",
  // "1d"
  "1m", "5m", 
  "1h"
] as const;
export type CandleTimeframe = (typeof BINANCE_TIMEFRAMES)[number];

export const DEFAULT_CHART_TIMEFRAMES: CandleTimeframe[] = [
  "1m", "5m", 
  "1h"
];

export const DEFAULT_BACKFILL_TIMEFRAMES: CandleTimeframe[] = [
  "1m", "5m", 
  "1h"
];