import { Symbol } from "./market";
import { CandleTimeframe } from "./market";

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
    openTime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }