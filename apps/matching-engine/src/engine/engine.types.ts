import { OrderSide, OrderStatus, OrderType, Symbol } from "@wts/common";

export type EngineOrder = {
    orderId: string;
    accountId: string;
    symbol: Symbol;
    side: OrderSide;
    orderType: OrderType;
    price?: number;
    qty: number;
    filledQty: number;
    remainingQty: number;
    status: OrderStatus;
    createdAtMs: number;
    createdAtTs: string;
    avgFillPrice?: number;
};

export type OrderBookState = {
    bids: EngineOrder[];
    asks: EngineOrder[];
}