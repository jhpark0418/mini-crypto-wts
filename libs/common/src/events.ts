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

export interface CandleOpenedEvent {
  eventId: string;
  type: "CANDLE_OPENED";
  symbol: Symbol;
  timeframe: CandleTimeframe;
  openTime: number;
  open: number;
  closeTime: number;
}

export interface CandleUpdatedEvent {
  eventId: string;
  type: "CANDLE_UPDATED";
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

export interface CandleClosedEvent {
  eventId: string;
  type: "CANDLE_CLOSED";
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

export type CandleEvent = 
  | CandleOpenedEvent 
  | CandleUpdatedEvent 
  | CandleClosedEvent;

export type ActiveCandleSnapshot = {
  symbol: Symbol;
  timeframe: CandleTimeframe;
  openTime: string;
  closeTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderbookLevel {
  price: number;
  qty: number;
}

export interface OrderbookSnapshotEvent {
  eventId: string;
  type: "ORDERBOOK_SNAPSHOT";
  symbol: Symbol;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  ts: string;
  source: "binance";
}

export type MarketEvent = 
  | TickEvent 
  | CandleOpenedEvent 
  | CandleUpdatedEvent
  | CandleClosedEvent 
  | OrderbookSnapshotEvent;