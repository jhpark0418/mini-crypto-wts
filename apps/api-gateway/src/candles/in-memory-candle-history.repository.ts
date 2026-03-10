import { CandleHistoryRepository } from "./candle-history.repository";
import { Candle, Timeframe } from "./candle.types";

export class InMemoryCandleHistoryRepository implements CandleHistoryRepository {
    private readonly store = new Map<string, Candle[]>();
    private readonly maxCandlesPerKey = 5000;

    private makeKey(symbol: Candle["symbol"], timeframe: Timeframe): string {
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
        timeframe: Timeframe; 
        limit: number; 
    }): Promise<Candle[]> {
        const key = this.makeKey(params.symbol, params.timeframe);
        const list = this.store.get(key) ?? [];
        return list.slice(-params.limit);            
    }
}