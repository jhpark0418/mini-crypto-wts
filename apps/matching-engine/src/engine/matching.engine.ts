import { randomUUID } from "node:crypto";
import { OrderCreateCommand, OrderUpdatedEvent, Symbol, TradeExecutedEvent } from "@wts/common";
import { EngineOrder, OrderBookState } from "./engine.types.js";

export type MatchingResult = {
    restingOrdersToUpsert: EngineOrder[];
    incomingOrder: EngineOrder;
    orderEvents: OrderUpdatedEvent[];
    tradeEvents: TradeExecutedEvent[];
};

export class MatchingEngine {
    private books = new Map<Symbol, OrderBookState>();

    private getOrCreateBook(symbol: Symbol): OrderBookState {
        const existing = this.books.get(symbol);
        if (existing) return existing;

        const next: OrderBookState = {
            bids: [],
            asks: []
        };

        this.books.set(symbol, next);
        return next;
    }

    getBook(symbol: Symbol): OrderBookState {
        return this.getOrCreateBook(symbol);
    }

    private sortBook(book: OrderBookState) {
        book.bids.sort((a, b) => {
            const priceDiff = (b.price ?? 0) - (a.price ?? 0);
            if (priceDiff !== 0) return priceDiff;
            return a.createdAtMs - b.createdAtMs;
          });
      
          book.asks.sort((a, b) => {
            const priceDiff = (a.price ?? 0) - (b.price ?? 0);
            if (priceDiff !== 0) return priceDiff;
            return a.createdAtMs - b.createdAtMs;
          });
    }

    private toEngineOrder(command: OrderCreateCommand): EngineOrder {
        const createdAtMs = new Date(command.ts).getTime();

        return {
            orderId: command.orderId,
            accountId: command.accountId,
            symbol: command.symbol as Symbol,
            side: command.side,
            orderType: command.orderType,
            price: command.price,
            qty: command.qty,
            filledQty: 0,
            remainingQty: command.qty,
            status: "OPEN",
            createdAtMs,
            createdAtTs: command.ts
        };
    }

    addRestingOrder(order: EngineOrder) {
        const book = this.getOrCreateBook(order.symbol);

        if (order.side === "BUY") {
            book.bids.push(order);
        }

        if (order.side === "SELL") {
            book.asks.push(order);
        }

        this.sortBook(book);
    }

    processLimitOrder(command: OrderCreateCommand): MatchingResult {
        const incoming = this.toEngineOrder(command);
        const book = this.getOrCreateBook(incoming.symbol);

        const opposite = incoming.side === "BUY" ? book.asks : book.bids;

        const orderEvents: OrderUpdatedEvent[] = [];
        const tradeEvents: TradeExecutedEvent[] = [];
        const restingOrdersToUpsert = new Map<string, EngineOrder>();

        if (incoming.price == null || Number.isNaN(incoming.price)) {
            incoming.status = "REJECTED";

            orderEvents.push(this.toOrderUpdatedEvent(incoming, {
                reason: "LIMIT order requires price"
            }));

            return {
                restingOrdersToUpsert: [],
                incomingOrder: incoming,
                orderEvents,
                tradeEvents
            };
        }

        let totalFilledNotional = 0;

        while (incoming.remainingQty > 0 && opposite.length > 0) {
            const bestOpposite = opposite[0];
            const isMatch = 
                incoming.side === "BUY"
                    ? (bestOpposite.price ?? Infinity) <= incoming.price
                    : (bestOpposite.price ?? -Infinity) >= incoming.price;

            if (!isMatch) {
                break;
            }

            const  matchQty = Math.min(incoming.remainingQty, bestOpposite.remainingQty);
            const tradePrice = bestOpposite.price ?? incoming.price;

            incoming.filledQty += matchQty;
            incoming.remainingQty -= matchQty;

            bestOpposite.filledQty += matchQty;
            bestOpposite.remainingQty -= matchQty;

            totalFilledNotional += tradePrice * matchQty;

            incoming.avgFillPrice = incoming.filledQty > 0
                ? totalFilledNotional / incoming.filledQty
                : undefined;

            bestOpposite.avgFillPrice = bestOpposite.filledQty > 0
                ? (((bestOpposite.avgFillPrice ?? 0) * (bestOpposite.filledQty - matchQty)) + (tradePrice * matchQty)) / bestOpposite.filledQty
                : undefined;

            if (bestOpposite.remainingQty === 0) {
                bestOpposite.status = "FILLED";
                opposite.shift();
            } else {
                bestOpposite.status = "PARTIALLY_FILLED";
            }

            tradeEvents.push({
                eventId: randomUUID(),
                type: "TRADE_EXECUTED",
                tradeId: randomUUID(),
                symbol: incoming.symbol,
                buyOrderId: incoming.side === "BUY" ? incoming.orderId : bestOpposite.orderId,
                sellOrderId: incoming.side === "SELL" ? incoming.orderId : bestOpposite.orderId,
                price: tradePrice,
                qty: matchQty,
                ts: new Date().toISOString()
            });

            orderEvents.push(this.toOrderUpdatedEvent(bestOpposite));
            restingOrdersToUpsert.set(bestOpposite.orderId, {...bestOpposite});
        }

        if (incoming.remainingQty === 0) {
            incoming.status = "FILLED";
        } else if (incoming.filledQty > 0) {
            incoming.status = "PARTIALLY_FILLED";
        } else {
            incoming.status = "OPEN";
            this.addRestingOrder(incoming);
        }

        orderEvents.push(this.toOrderUpdatedEvent(incoming));

        return {
            restingOrdersToUpsert: Array.from(restingOrdersToUpsert.values()),
            incomingOrder: incoming,
            orderEvents,
            tradeEvents
        };
    }

    private toOrderUpdatedEvent(
        order: EngineOrder,
        extra?: {
            reason?: string;
        }
    ): OrderUpdatedEvent {
        return {
            eventId: randomUUID(),
            type: "ORDER_UPDATED",
            orderId: order.orderId,
            accountId: order.accountId,
            symbol: order.symbol,
            side: order.side,
            orderType: order.orderType,
            status: order.status,
            price: order.price,
            qty: order.qty,
            filledQty: order.filledQty,
            remainingQty: order.remainingQty,
            avgFillPrice: order.avgFillPrice,
            reason: extra?.reason,
            ts: new Date().toISOString(),
            createdAtTs: order.createdAtTs
        };
    }
}