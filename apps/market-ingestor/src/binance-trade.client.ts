import WebSocket from "ws";
import type { Symbol, TickEvent } from "@cmp/common";
import { randomUUID } from "node:crypto";
import { BinanceTradeMessage } from "./types.js";

export function startBinanceTradeStream(params: {
  symbol: Symbol;
  publishTick: (topic: string, tick: TickEvent) => Promise<void>;
  reconnectDelayMs?: number;
}) {
  const { symbol, publishTick, reconnectDelayMs = 3000 } = params;

  const topic = `tick.${symbol}`;
  const streamName = `${symbol.toLowerCase()}@trade`;
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

    console.log(
      `[market-ingestor] reconnect scheduled in ${reconnectDelayMs}ms (${reason})`
    );

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      isReconnectScheduled = false;
      connect();
    }, reconnectDelayMs);
  };

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

        if (msg.e !== "trade") return;
        if (msg.s !== symbol) return;

        const tick: TickEvent = {
          eventId: randomUUID(),
          type: "TICK_RECEIVED",
          symbol: msg.s,
          price: Number(msg.p),
          qty: Number(msg.q),
          ts: new Date(msg.T).toISOString(),
          source: "binance",
        };

        const receivedAt = Date.now();
        const sourceTs = new Date(msg.T).getTime();

        if (Math.random() < 0.01) {
          console.log(
            `[trace][ingestor] symbol=${msg.s} sourceLagMs=${
              receivedAt - sourceTs
            } publishStart=${receivedAt}`
          );
        }

        await publishTick(topic, tick);
      } catch (error) {
        console.error("[market-ingestor] message parse error", error);
      }
    });

    ws.on("error", (err) => {
      console.error("[market-ingestor] ws error", err);
    });

    ws.on("close", (code, reason) => {
      console.log(
        `[market-ingestor] ws closed code=${code} reason=${reason.toString()}`
      );

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