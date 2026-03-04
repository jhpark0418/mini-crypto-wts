import { randomUUID } from "node:crypto";
import type { TickEvent } from "@wts/common";
import { createProducer, publishJson } from "@wts/kafka";

const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
const TOPIC = "tick.BTCUSDT";

async function main() {
  const producer = await createProducer({
    clientId: "market-ingestor",
    brokers
  });

  console.log("[market-ingestor] producer connected:", brokers.join(","));

  setInterval(async () => {
    const e: TickEvent = {
      eventId: randomUUID(),
      type: "TICK_RECEIVED",
      symbol: "BTCUSDT",
      price: 65000 + Math.random() * 50,
      qty: 0.01,
      ts: new Date().toISOString(),
      source: "mock"
    };

    try {
      await publishJson(producer, TOPIC, e);
      console.log("[market-ingestor] published:", TOPIC, e.price.toFixed(2));
    } catch (err) {
      console.error("[market-ingestor] publish failed:", err);
    }
  }, 1000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});