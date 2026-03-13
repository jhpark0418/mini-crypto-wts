import { Symbol } from "./market.js";
import { CandleTimeframe } from "./market.js";

export interface TickEvent {
    eventId: string;
    type: "TICK_RECEIVED";
    symbol: Symbol;
    price: number;
    qty: number;
    ts: string;
    source: string;
  }
  
  export interface CandleUpsertedEvent {
    eventId: string;
    type: "CANDLE_UPSERTED";
    symbol: Symbol;
    timeframe: CandleTimeframe;
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;
  }