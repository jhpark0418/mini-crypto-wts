import { Symbol } from "./market.js";

export type OrderSide = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";
export type OrderStatus = 
    | "OPEN"
    | "PARTIALLY_FILLED"
    | "FILLED"
    | "CANCELED"
    | "REJECTED";

export interface OrderCreateCommand {
    eventId: string;
    type: "ORDER_CREATE_COMMAND";
    orderId: string;
    accountId: string;
    symbol: Symbol;
    side: OrderSide;
    orderType: OrderType;
    price?: number;
    qty: number;
    ts: string;
}

export interface OrderUpdatedEvent {
    eventId: string;
    type: "ORDER_UPDATED";
    orderId: string;
    accountId: string;
    symbol: Symbol;
    side: OrderSide;
    orderType: OrderType;
    status: OrderStatus;
    price?: number;
    qty: number;
    filledQty: number;
    remainingQty: number;
    avgFillPrice?: number;
    reason?: string;
    ts: string;
    createdAtTs?: string;
}

export interface TradeExecutedEvent {
    eventId: string;
    type: "TRADE_EXECUTED";
    tradeId: string;
    symbol: Symbol;
    buyOrderId: string;
    sellOrderId: string;
    price: number;
    qty: number;
    ts: string;
}