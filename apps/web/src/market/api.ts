import type { UTCTimestamp } from "lightweight-charts";
import type { CandleHistoryItem } from "./types";
import type { CandleTimeframe, OrderbookSnapshotEvent, Symbol } from "@cmp/common";


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

export async function fetchActiveCandle(symbol: Symbol, timeframe: CandleTimeframe) {
    const res = await fetch(
        `${API_BASE_URL}/api/market/active-candle?symbol=${symbol}&timeframe=${timeframe}`
    );

    if (res.status === 404) return null;

    if (!res.ok) {
        throw new Error(`failed to fetch active candle: ${res.status}`);
    }

    return res.json();
}

export async function fetchOrderbook(symbol: Symbol) {
    const res = await fetch(
        `${API_BASE_URL}/api/market/orderbook?symbol=${symbol}`
    );

    if (!res.ok) {
        throw new Error(`failed to fetch orderbook: ${res.status}`);
    }

    return (await res.json()) as OrderbookSnapshotEvent;
}

export { API_BASE_URL };