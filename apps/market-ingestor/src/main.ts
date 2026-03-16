import "./env.js";
import { SYMBOLS } from "@wts/common";
import { createProducer, publishJson } from "@wts/kafka";
import { startBinanceTradeStream } from "./binance-trade.client.js";
import { startBinanceDepthStream } from "./binance-depth.client.js";

function isKafkaDisconnectError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const msg = error.message ?? "";
  return (
    msg.includes("producer is disconnected") ||
    msg.includes("producer is disconnecting") ||
    msg.includes("Broker not connected")
  );
}

async function main() {
  const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");

  let producer = await createProducer({
    clientId: "market-ingestor",
    brokers,
  });

  let reconnectPromise: Promise<void> | null = null;
  let producerReady = true;

  const reconnectProducer = async () => {
    if (reconnectPromise) return reconnectPromise;

    reconnectPromise = (async () => {
      producerReady = false;

      try {
        console.log("[market-ingestor] reconnecting producer...");

        try {
          await producer.disconnect();
        } catch {
          // ignore
        }

        producer = await createProducer({
          clientId: "market-ingestor",
          brokers,
        });

        producerReady = true;
        console.log("[market-ingestor] producer reconnected");
      } catch (err) {
        console.error("[market-ingestor] producer reconnect failed", err);
      } finally {
        reconnectPromise = null;
      }
    })();

    return reconnectPromise;
  };

  const safePublish = async (topic: string, payload: unknown) => {
    if (!producerReady || reconnectPromise) {
      return;
    }

    try {
      await publishJson(producer, topic, payload);
    } catch (error) {
      console.error("[market-ingestor] message error", error);

      if (isKafkaDisconnectError(error)) {
        await reconnectProducer();
      }
      // 현재 tick은 재시도하지 않고 drop
    }
  };

  console.log("[market-ingestor] producer connected");

  const tradeStreams = SYMBOLS.map((symbol) =>
    startBinanceTradeStream({
      symbol,
      publishTick: safePublish,
      reconnectDelayMs: 3000,
    })
  );

  const depthStreams = SYMBOLS.map((symbol) => 
      startBinanceDepthStream({
        symbol,
        publishOrderbook: safePublish,
        reconnectDelayMs: 3000
      })
  );

  const shutdown = async () => {
    console.log("[market-ingestor] shutting down...");

    for (const stream of tradeStreams) {
      stream.shutdown();
    }

    for (const stream of depthStreams) {
      stream.shutdown();
    }

    try {
      await producer.disconnect();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error("[market-ingestor] fatal:", e);
  process.exit(1);
});