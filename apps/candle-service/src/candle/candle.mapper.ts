import { randomUUID } from "crypto";
import { CandleUpsertedEvent } from "@wts/common";
import { CandleState } from "./candle.types.js";

export function toCandleUpertedEvent(state: CandleState): CandleUpsertedEvent {
    return {
        eventId: randomUUID(),
        type: "CANDLE_UPSERTED",
        symbol: state.symbol,
        timeframe: state.timeframe,
        openTime: state.openTime,
        open: state.open,
        high: state.high,
        low: state.low,
        close: state.close,
        volume: state.volume
    };
}