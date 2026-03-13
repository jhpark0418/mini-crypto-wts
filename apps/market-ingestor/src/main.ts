import { SYMBOLS } from "@wts/common";
import { createProducer } from "@wts/kafka";
import { startBinaceTradeStream } from "./binance-trade.client.js";

async function main() {
  const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");

  const producer = await createProducer({
    clientId: "market-ingestor",
    brokers,
  });

  console.log("[market-ingestor] producer connected");

  const streams = SYMBOLS.map((symbol) => 
    startBinaceTradeStream({
      symbol,
      producer,
      reconnectDelayMs: 3000
    })
  );

  const shutdown = async () => {
    console.log("[market-ingestor] shutting down...");

    for (const stream of streams) {
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
  console.log("[market-ingestor] shutting down...");
  process.exit(1);
});