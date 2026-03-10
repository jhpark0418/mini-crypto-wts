import type { UTCTimestamp } from "lightweight-charts";
import type { CandleHistoryItem, SymbolType } from "./types";

const API_BASE_URL = "http://localhost:3000";

export function toChartCandle(candle: CandleHistoryItem) {
    return {
        time: Math.floor(new Date(candle.openTime).getTime() / 1000) as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
    };
}

export async function fetchCandleHistory(symbol: SymbolType, timeframe: string, limit = 200) {
    const res = await fetch(
        `http://localhost:3000/api/candles?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`
    );

    if (!res.ok) {
        throw new Error(`failed to fetch candles: ${res.status}`);
    }

    const data = (await res.json()) as CandleHistoryItem[];

    const dedupedMap = new Map<string, CandleHistoryItem>();
    for (const candle of data) {
        dedupedMap.set(candle.openTime, candle);
    }

    const dedupedSorted = Array.from(dedupedMap.values()).sort(
        (a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime()
    );

    return dedupedSorted.map(toChartCandle);
}

export { API_BASE_URL };