import { createConsumer, createProducer } from "@wts/kafka";
import { candleAggregator } from "./candle-aggregator.js";
import { CandleUpsertedEvent, TickEvent } from "@wts/common";

const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
const timeframe = "1m";

function candleTopic(symbol: string, timeframe: string) {
    console.log("[candle-service] starting...");
    console.log("[candle-service] brokers:", brokers.join(","));
    return `candle.${timeframe}.${symbol}`;
}

async function main() {
    const consumer = await createConsumer({
        clientId: "candle-service",
        brokers,
        groupId: `candle-service-${timeframe}`
    });

    const producer = await createProducer({
        clientId: "candle-service",
        brokers
    });

    console.log("[candle-service] consumer/producer connected");

    const agg = new candleAggregator(timeframe);

    await consumer.subscribe({ topic: "tick.BTCUSDT", fromBeginning: false});

    await consumer.run({
        eachMessage: async ({ topic, partition, message }: any) => {
            if (!message.value) return;

            const tick = JSON.parse(message.value.toString()) as TickEvent;

            const { upserted, closed } = agg.onTick(tick);

            const upsertTopic = candleTopic(upserted.symbol, upserted.timeframe);

            await producer.send({
                topic: upsertTopic,
                messages: [{ value: JSON.stringify(upserted) }]
            });

            console.log("[candle-service] candle update:", upserted.close);

            // 버킷이 넘어가서 이전 캔들이 닫히면 publish
            if (closed) {
                const outTopic = candleTopic(closed.symbol, closed.timeframe);

                await producer.send({
                    topic: outTopic,
                    messages: [{ value: JSON.stringify(closed satisfies CandleUpsertedEvent) }]
                });

                console.log("[candle-service] candle closed:", closed.openTime);
            } 
        }
    });

    const shutdown = async () => {
        try {
            await consumer.disconnect();
            await producer.disconnect();
        } finally {
            process.exit(0);
        }
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    console.log("[candle-service] run started");
}

main().catch((e) => {
    console.error("[candle-service] fatal:", e);
    process.exit(1);
});

