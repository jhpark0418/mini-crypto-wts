import { CandleClosedEvent, CandleOpenedEvent, CandleUpdatedEvent, TickEvent } from "@cmp/common";
import { CandleState } from "./candle.types.js";
import { bucketStartMs, timeframeToMs, toIso, toMs } from "./candle.util.js";
import { Symbol, CandleTimeframe } from "@cmp/common";
import { toCandleClosedEvent, toCandleOpenedEvent, toCandleUpdatedEvent } from "./candle.mapper.js";

export class CandleAggregator {
    private stateBySymbol = new Map<Symbol, CandleState>();

    constructor(
        private readonly timeframe: CandleTimeframe
    ) {}

    getTimeframe() {
        return this.timeframe;
    }

    onTick(tick: TickEvent): { opened?: CandleOpenedEvent; closed?: CandleClosedEvent } {
        const tsMs = toMs(tick.ts);
        const intervalMs = timeframeToMs(this.timeframe);
        const openTimeMs = bucketStartMs(tsMs, intervalMs);

        const existed = this.stateBySymbol.get(tick.symbol);
        const price = tick.price;
        const qty = tick.qty ?? 0;

        // 처음이거나 버킷이 바뀌면 기존 state를 closed로 내보내고 새로 시작
        if (!existed || existed.openTimeMs !== openTimeMs) {
            const closed = existed ? toCandleClosedEvent(existed) : undefined;

            const next: CandleState = {
                symbol: tick.symbol,
                timeframe: this.timeframe,
                intervalMs,
                openTimeMs,
                openTime: toIso(openTimeMs),
                open: price,
                high: price,
                low: price,
                close: price,
                volume: qty,
                trades: 1,
                lastTickMs: tsMs,
                dirty: true
            }

            this.stateBySymbol.set(tick.symbol, next);

            return { opened: toCandleOpenedEvent(next), closed };
        }

        existed.high = Math.max(existed.high, price);
        existed.low = Math.min(existed.low, price);
        existed.close = price;
        existed.volume += qty;
        existed.trades += 1;
        existed.lastTickMs = tsMs;
        existed.dirty = true;

        return {};
    }

    /**
     * 타이머 기반 flush:
     * - tick이 끊기면 "버킷 변경" 이벤트가 안와서 캔들이 안닫힐 수 있음
     * - now가 다음 버킷으로 넘어갔다면 현재 state를 closed로 내보냄냄
     */
    flushIfExpired(nowMs: number): CandleClosedEvent[] {
        const out: CandleClosedEvent[] = [];
        const intervalMs = timeframeToMs(this.timeframe);
        const currentBucketStart = bucketStartMs(nowMs, intervalMs);

        for (const [symbol, st] of this.stateBySymbol.entries()) {
            if (st.openTimeMs < currentBucketStart) {
                out.push(toCandleClosedEvent(st));
                this.stateBySymbol.delete(symbol);
            }
        }

        return out;
    }

    collectDirtyUpdates(): CandleUpdatedEvent[] {
        const out: CandleUpdatedEvent[] = [];

        for (const state of this.stateBySymbol.values()) {
            if (!state.dirty) continue;

            out.push(toCandleUpdatedEvent(state));
            state.dirty = false;
        }

        return out;
    }

    getActiveStates(): CandleState[] {
        return [...this.stateBySymbol.values()];
    }

    restoreState(state: CandleState) {
        this.stateBySymbol.set(state.symbol, state);
    }

    removeState(symbol: Symbol) {
        this.stateBySymbol.delete(symbol);
    }
}