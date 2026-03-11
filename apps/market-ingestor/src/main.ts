import { randomUUID } from "node:crypto";
import type { Symbol, TickEvent } from "@wts/common";
import { createProducer, publishJson } from "@wts/kafka";
import { startBinaceTradeStream } from "./binance-trade.client.js";

async function main() {
  const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");

  const producer = await createProducer({
    clientId: "market-ingestor",
    brokers,
  });

  console.log("[market-ingestor] producer connected");

  const symbol: Symbol = "BTCUSDT";

  const stream = startBinaceTradeStream({
    symbol,
    producer,
    reconnectDelayMs: 3000
  });

  const shutdown = async () => {
    console.log("[market-ingestor] shutting down...");

    stream.shutdown();

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
  console.log("[market-ingestor] shutting down...");
  process.exit(1);
});