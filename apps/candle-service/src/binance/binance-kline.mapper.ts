import type { UpsertCandleInput } from "../db/repositories/candle.repository.js";
import type { BinanceKlineRow } from "./binance-klines.js";

export function mapKlineToUpsertInput(
  symbol: string,
  timeframe: string,
  row: BinanceKlineRow
): UpsertCandleInput {
  return {
    symbol,
    timeframe,
    openTime: new Date(row[0]).toISOString(),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  };
}