export type SymbolType = "BTCUSDT" | "ETHUSDT";
export type Timeframe = "10s" | "30s" | "1m" | "5m" | "15m" | "30m" | "1h";

export const SYMBOLS: SymbolType[] = ["BTCUSDT", "ETHUSDT"];
export const TIMEFRAMES: Timeframe[] = ["10s", "30s", "1m", "5m", "15m", "30m", "1h"];

export type TickEvent = {
  eventId: string;
  symbol: SymbolType;
  price: number;
  qty: number;
  ts: string;
  source: string;
}

export type CandleUpsertedEvent = {
  eventId: string;
  type: "CANDLE_UPSERTED";
  symbol: SymbolType;
  timeframe: Timeframe;
  openTime: string; // ISO
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type CandleHistoryItem = {
  symbol: SymbolType;
  timeframe: Timeframe;
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};