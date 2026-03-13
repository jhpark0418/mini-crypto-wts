import type { UTCTimestamp } from "lightweight-charts";
import type { CandleHistoryItem } from "./types";
import type { CandleTimeframe, Symbol } from "@wts/common";


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

export async function fetchCandleHistory(symbol: Symbol, timeframe: CandleTimeframe, limit = 200) {
    const res = await fetch(
        `${API_BASE_URL}/api/candles?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`
    );

    if (!res.ok) {
        throw new Error(`failed to fetch candles: ${res.status}`);
    }

    const data = (await res.json()) as CandleHistoryItem[];

    const dedupedMap = new Map<string, CandleHistoryItem>();
    for (const candle of data) {
        dedupedMap.set(candle.openTime.toString(), candle);
    }

    return Array.from(dedupedMap.values()).sort(
        (a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime()
    );
}

export { API_BASE_URL };