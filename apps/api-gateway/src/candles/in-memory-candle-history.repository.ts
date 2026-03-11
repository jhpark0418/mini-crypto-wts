import { CandleHistoryRepository } from "./candle-history.repository";
import { Candle } from "./candle.types";
import { CandleTimeframe, Symbol } from "@wts/common";

export class InMemoryCandleHistoryRepository implements CandleHistoryRepository {
    private readonly store = new Map<string, Candle[]>();
    private readonly maxCandlesPerKey = 5000;

    private makeKey(symbol: Candle["symbol"], timeframe: CandleTimeframe): string {
        return `${symbol}:${timeframe}`;
    }

    async save(candle: Candle): Promise<void> {
        const key = this.makeKey(candle.symbol, candle.timeframe);
        const list = this.store.get(key) ?? [];

        const existingIndex = list.findIndex((item) => item.openTime === candle.openTime);

        if (existingIndex >= 0) {
            list[existingIndex] = candle;
        } else {
            list.push(candle);
        }

        list.sort(
            (a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime()
        );
        
        if (list.length > this.maxCandlesPerKey) {
            list.splice(0, list.length - this.maxCandlesPerKey);
        }

        this.store.set(key, list);
    }

    async findLastes(params: { 
        symbol: Candle["symbol"]; 
        timeframe: CandleTimeframe; 
        limit: number; 
    }): Promise<Candle[]> {
        const key = this.makeKey(params.symbol, params.timeframe);
        const list = this.store.get(key) ?? [];
        return list.slice(-params.limit);            
    }

    async seed(symbol: Symbol, timeframe: CandleTimeframe, candles: Candle[]): Promise<void> {
        const key = this.makeKey(symbol, timeframe);

        const sorted = [...candles].sort((a, b) => a.openTime - b.openTime);
        const trimmed = sorted.length > this.maxCandlesPerKey
            ? sorted.slice(sorted.length - this.maxCandlesPerKey)
            : sorted;

        this.store.set(key, trimmed);
    }

    async appendOrReplace(candle: Candle): Promise<void> {
        const key = this.makeKey(candle.symbol, candle.timeframe);
        const list = this.store.get(key) ?? [];
        const last = list[list.length - 1];

        if (last && last.openTime === candle.openTime) {
            list[list.length - 1] = candle;
        } else {
            list.push(candle);
        }

        if (list.length > this.maxCandlesPerKey) {
            list.splice(0, list.length - this.maxCandlesPerKey);
        }

        this.store.set(key, list);
    }

    async find(params: {
        symbol: Symbol;
        timeframe: CandleTimeframe;
        limit?: number;
    }): Promise<Candle[]> {
        const { symbol, timeframe, limit = 300 } = params;
        const key = this.makeKey(symbol, timeframe);
        const list = this.store.get(key) ?? [];

        return list.slice(Math.max(0, list.length - limit));
    }
}