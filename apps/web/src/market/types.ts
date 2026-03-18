import type { CandleTimeframe, Symbol } from "@wts/common";

export type CandleHistoryItem = {
  symbol: Symbol;
  timeframe: CandleTimeframe;
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ActiveCandle = {
  symbol: Symbol;
  timeframe: CandleTimeframe;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}