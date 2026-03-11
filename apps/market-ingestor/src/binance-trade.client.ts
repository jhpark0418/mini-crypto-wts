import WebSocket from "ws";
import type { Symbol, TickEvent } from "@wts/common";
import { randomUUID } from "node:crypto";
import { publishJson } from "@wts/kafka";
import { BinanceTradeMessage } from "./types.js";

export function startBinaceTradeStream(params: {
    symbol: Symbol;
    producer: any;
    reconnectDelayMs?: number;
}) {
    const { symbol, producer, reconnectDelayMs = 3000 } = params;
    const topic = `tick.${symbol}`;
    const streamName = `${symbol.toLowerCase()}@trade`;
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamName}`;

    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isShuttingDown = false;
    let isReconnectScheduled = false;

    const clearReconnectTimer = () => {
        if (reconnectTimer) {
            reconnectTimer = null;
        }
        isReconnectScheduled = false;
    }

    const scheduleReconnect = (reason: string) => {
        if (isShuttingDown) return;
        if (isReconnectScheduled) return;

        isReconnectScheduled = true;

        console.log(`[market-ingestor] reconnect scheduled in ${reconnectDelayMs}ms (${reason})`);
      
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            isReconnectScheduled =false;
            connect();
        }), reconnectDelayMs;
    }

    const connect = () => {
        if (isShuttingDown) return;
        
        console.log("[market-ingestor] connecting to", wsUrl);

        ws = new WebSocket(wsUrl);

        ws.on("open", () => {
            console.log("[market-ingestor] binance ws connected");
            clearReconnectTimer();
        });
    
        ws.on("message", async (data) => {
            try {
                const msg = JSON.parse(data.toString()) as BinanceTradeMessage;
    
                if (msg.e !== "trade") {
                    return;
                }
    
                if (msg.s !== symbol) {
                    console.warn("[market-ingestor] unsupported symbol:", msg.s);
                    return;
                }
    
                const tick: TickEvent = {
                    eventId: randomUUID(),
                    type: "TICK_RECEIVED",
                    symbol: msg.s,
                    price: Number(msg.p),
                    qty: Number(msg.q),
                    ts: new Date(msg.T).toISOString(),
                    source: "binance"
                };
    
                await publishJson(producer, topic, tick);
    
                console.log(`[market-ingestor] tick ${tick.symbol} price=${tick.price}`);
            } catch (error) {
                console.error("[market-ingestor] message error", error);
            }
        });
    
        ws.on("error", (err) => {
            console.error("[market-ingestor] ws error", err);
        });
        
        ws.on("close", (code, reason) => {
            console.log(`[market-ingestor] ws closed code=${code} reason=${reason.toString()}`);

            ws = null;
            scheduleReconnect(`close:${code}`);
        });
    }

    const shutdown = () => {
        isShuttingDown = true;
        clearReconnectTimer();

        if (ws) {
            ws.removeAllListeners();
            ws.close();
            ws = null;
        }
    }

    connect();

    return {
        shutdown
    };
}