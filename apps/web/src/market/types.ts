import type { CandleTimeframe, Symbol } from "@wts/common";

export type CandleHistoryItem = {
  symbol: Symbol;
  timeframe: CandleTimeframe;
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};