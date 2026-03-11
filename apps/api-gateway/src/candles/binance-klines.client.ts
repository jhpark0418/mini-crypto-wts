import { CandleTimeframe, DEFAULT_BACKFILL_TIMEFRAMES, Symbol } from "@wts/common";
import { Candle } from "./candle.types";
import { URL } from "url";

const BINANCE_REST_BASE_URL = process.env.BINANCE_REST_BASE_URL ?? "https://api.binance.com";

export async function fetchBinanceKlines(params: {
    symbol: Symbol;
    interval: CandleTimeframe;
    limit?: number;
}): Promise<Candle[]> {
    const { symbol, interval, limit = 300 } = params;

    const url = new URL("/api/v3/klines", BINANCE_REST_BASE_URL);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString());

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[binance-klines] request failed: ${res.status} ${res.statusText} - ${text}`);
    }

    const data = (await res.json()) as unknown;

    if (!Array.isArray(data)) {
        throw new Error("[binance-klines] invalid response: expected array");
    }

    return data.map((row) => {
        if (!Array.isArray(row) || row.length < 7) {
            throw new Error("[binance-klines] invalid kline row");
        }

        return {
            symbol,
            timeframe: interval,
            openTime: Number(row[0]),
            open: Number(row[1]),
            high: Number(row[2]),
            low: Number(row[3]),
            close: Number(row[4]),
            volume: Number(row[5]),
            closeTime: Number(row[6]),
        }
    });
}

export async function fetchBinanceKlinesForAllTimeframes(params: {
    symbol: Symbol;
    limit?: number;
    timeframes?: CandleTimeframe[];
}): Promise<Record<CandleTimeframe, Candle[]>> {
    const { symbol, limit = 300, timeframes = DEFAULT_BACKFILL_TIMEFRAMES } = params;

    const entries = await Promise.all(
        timeframes.map(async (timeframe) => {
            const candles = await fetchBinanceKlines({
                symbol, 
                interval: timeframe,
                limit
            });

            return [timeframe, candles] as const;
        })
    );

    return Object.fromEntries(entries) as Record<CandleTimeframe, Candle[]>;
}