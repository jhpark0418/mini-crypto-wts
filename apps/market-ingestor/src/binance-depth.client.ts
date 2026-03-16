import { OrderbookLevel, OrderbookSnapshotEvent, Symbol } from "@wts/common";
import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import { BinanceDepthMessage } from "./types.js";

export function startBinanceDepthStream(params: {
    symbol: Symbol;
    publishOrderbook: (topic: string, event: OrderbookSnapshotEvent) => Promise<void>;
    reconnectDelayMs?: number;
}) {
    const { symbol, publishOrderbook, reconnectDelayMs = 3000 } = params;

    const topic = `orderbook.${symbol}`;
    const streamName = `${symbol.toLocaleLowerCase()}@depth20@100ms`;
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamName}`;

    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isShuttingDown = false;
    let isReconnectScheduled = false;

    const clearReconnectTimer = () => {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        isReconnectScheduled = false;
    };

    const scheduleReconnect = (reason: string) => {
        if (isShuttingDown) return;
        if (isReconnectScheduled) return;

        isReconnectScheduled = true;

        console.log(`[market-ingestor][depth] reconnect scheduled in ${reconnectDelayMs}ms (${symbol}, ${reason})`);

        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            isReconnectScheduled = false;
            connect();
        }, reconnectDelayMs);
    };

    const toLevels = (levels: [string, string][]): OrderbookLevel[] => {
        return levels.map(([price, qty]) => ({
            price: Number(price),
            qty: Number(qty)
        })).filter((level) => Number.isFinite(level.price) && Number.isFinite(level.qty));
    };

    const connect = () => {
        if (isShuttingDown) return;

        console.log("[market-ingestor][depth] connecting to", wsUrl);

        ws = new WebSocket(wsUrl);

        ws.on("open", () => {
            console.log(`[market-ingestor][depth] binance ws connected: ${symbol}`);
            clearReconnectTimer();
        });

        ws.on("message", async (data) => {
            try {
                const msg = JSON.parse(data.toString()) as BinanceDepthMessage;
                const bids = toLevels(msg.bids ?? []);
                const asks = toLevels(msg.asks ?? []);

                const event: OrderbookSnapshotEvent = {
                    eventId: randomUUID(),
                    type: "ORDERBOOK_SNAPSHOT",
                    symbol,
                    bids,
                    asks,
                    ts: new Date().toISOString(),
                    source: "binance"
                };

                await publishOrderbook(topic, event);

                if (Math.random() < 0.01) {
                    console.log(`[trace][depth] symbol=${symbol} bids=${bids.length} asks=${asks.length}`);
                }
            } catch (error) {
                console.error(`[market-ingestor][depth] message parse error (${symbol})`, error);
            }
        });

        ws.on("error", (err) => {
            console.error(`[market-ingestor][depth] ws error (${symbol})`, err);
        });

        ws.on("close", (code, reason) => {
            console.log(`[market-ingestor][depth] ws closed symbol=${symbol} code=${code} reason=${reason.toString()}`);

            ws = null;
            scheduleReconnect(`close:${code}`);
        });
    };

    const shutdown = () => {
        isShuttingDown = true;
        clearReconnectTimer();

        if (ws) {
            ws.removeAllListeners();
            ws.close();
            ws = null;
        }
    };

    connect();

    return { shutdown };
}