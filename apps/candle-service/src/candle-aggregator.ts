import { randomUUID } from "crypto";
import { CandleUpsertedEvent, TickEvent, Symbol } from "@wts/common";

type CandleState = {
    symbol: Symbol;
    timeframe: "1m" | "5m" | "1h";
    openTimeMs: number; // 내부 계산용
    openTime: string; // 외부 표시용
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

function toMs(ts: string): number {
    const ms = Date.parse(ts);
    if (Number.isNaN(ms)) throw new Error(`Invalid timestamp: ${ts}`);
    return ms;
}

function bucketStartMs(timeframe: CandleState["timeframe"], tsMs: number): number {
    const oneMin = 60_000;
    const fiveMin = 5 * oneMin;
    const oneHour = 60 * oneMin;

    const size = 
        timeframe === "1m" ? oneMin :
        timeframe === "5m" ? fiveMin :
        oneHour;

    return Math.floor(tsMs / size) * size;
}

function toIso(ms: number) {
    return new Date(ms).toISOString();
}

export class candleAggregator {
    private states = new Map<string, CandleState>();

    constructor(
        private readonly timeframe: CandleState["timeframe"]
    ) {}

    onTick(tick: TickEvent): { upserted: CandleUpsertedEvent; closed?: CandleUpsertedEvent } {
        const  tsMS = toMs(tick.ts);
        const openItmeMs = bucketStartMs(this.timeframe, tsMS);
        const key = `${tick.symbol}:${this.timeframe}:${openItmeMs}`;

        // 현재 버킷 candle upsert
        const existed = this.states.get(key);
        const price = tick.price;
        const qty = tick.qty ?? 0;

        let state: CandleState;
        if (!existed) {
            state = {
                symbol: tick.symbol,
                timeframe: this.timeframe,
                openTimeMs: openItmeMs,
                openTime: toIso(openItmeMs),
                open: price,
                high: price,
                low: price,
                close: price,
                volume: qty,
            };
            this.states.set(key, state);
        } else {
            existed.high = Math.max(existed.high, price);
            existed.low = Math.min(existed.low, price);
            existed.close = price;
            existed.volume += qty;
            state = existed;
            this.states.set(key, state);
        }

        const upserted: CandleUpsertedEvent = {
            eventId: randomUUID(),
            type: "CANDLE_UPSERTED",
            symbol: state.symbol,
            timeframe: state.timeframe,
            openTime: state.openTime,
            open: state.open,
            high: state.high,
            low: state.low,
            close: state.close,
            volume: state.volume,
        };

        // 버킷이 바뀌면 이전 버킷을 closed로 1번 emit (심볼별로 이전 상태 추적)
        const closed = this.closePrviousIfNeeded(tick.symbol, openItmeMs);

        return { upserted, closed };
    }

    private lastKeyBySymbol = new Map<Symbol, string>();

    private closePrviousIfNeeded(symbol: Symbol, openItmeMs: number): CandleUpsertedEvent | undefined {
        const currentKey = `${symbol}:${this.timeframe}:${openItmeMs}`;
        const lastKey = this.lastKeyBySymbol.get(symbol);

        if (!lastKey) {
            this.lastKeyBySymbol.set(symbol, currentKey);
            return undefined;
        }

        if (lastKey === currentKey) return undefined;

        const lastState = this.states.get(lastKey);
        this.states.delete(lastKey);
        this.lastKeyBySymbol.set(symbol, currentKey);

        if (!lastState) return undefined;

        return {
            eventId: randomUUID(),
            type: "CANDLE_UPSERTED",
            symbol: lastState.symbol,
            timeframe: lastState.timeframe,
            openTime: lastState.openTime,
            open: lastState.open,
            high: lastState.high,
            low: lastState.low,
            close: lastState.close,
            volume: lastState.volume,
        }
    }
}