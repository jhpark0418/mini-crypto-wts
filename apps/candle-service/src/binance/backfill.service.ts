import { upsertCandle } from "../db/repositories/candle.repository.js";
import { mapKlineToUpsertInput } from "./binance-kline.mapper.js";
import { fetchBinanceKlines } from "./binance-klines.js";

export async function backfillCandles(
    symbols: readonly string[],
    timeframes: readonly string[],
    limit: number = 300
) {
    for (const symbol of symbols) {
        for (const timeframe of timeframes) {
            console.log(`[candle-service] backfill start ${symbol} ${timeframe}`);

            const rows = await fetchBinanceKlines(symbol, timeframe, limit);
            const closedRows = rows.slice(0, -1);

            for (const row of closedRows) {
                const input = mapKlineToUpsertInput(symbol, timeframe, row);
                await upsertCandle(input);
            }
        
            console.log(`[candle-service] backfill done ${symbol} ${timeframe} count=${closedRows.length}`);
        }
    }
}