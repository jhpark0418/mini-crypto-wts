import { randomUUID } from "crypto";
import { CandleOpenedEvent, CandleClosedEvent } from "@wts/common";
import { CandleState } from "./candle.types.js";

export function toCandleOpenedEvent(state: CandleState): CandleOpenedEvent {
    return {
        eventId: randomUUID(),
        type: "CANDLE_OPENED",
        symbol: state.symbol,
        timeframe: state.timeframe,
        openTime: state.openTimeMs,
        open: state.open,
        closeTime: state.openTimeMs + state.intervalMs - 1
    };
}

export function toCandleClosedEvent(state: CandleState): CandleClosedEvent {
    return {
        eventId: randomUUID(),
        type: "CANDLE_CLOSED",
        symbol: state.symbol,
        timeframe: state.timeframe,
        openTime: state.openTimeMs,
        open: state.open,
        high: state.high,
        low: state.low,
        close: state.close,
        volume: state.volume,
        closeTime: state.openTimeMs + state.intervalMs - 1
    };
}