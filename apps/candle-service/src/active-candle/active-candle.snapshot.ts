import { ActiveCandleSnapshot } from "@cmp/common";
import { CandleState } from "../candle/candle.types.js";

export function toActiveCandleSnapshot(state: CandleState): ActiveCandleSnapshot {
    return {
        symbol: state.symbol,
        timeframe: state.timeframe,
        openTime: new Date(state.openTimeMs).toISOString(),
        closeTime: new Date(state.openTimeMs + state.intervalMs - 1).toISOString(),
        open: state.open,
        high: state.high,
        low: state.low,
        close: state.close,
        volume: state.volume,
    }
}