import { createConsumer, createProducer } from "@wts/kafka";
import { candleAggregator } from "./candle/candle.aggregator.js"
import { CandleUpsertedEvent, TickEvent } from "@wts/common";
import { Symbol, CandleTimeframe } from "@wts/common";

const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");

const SYMBOLS = ["BTCUSDT", "ETHUSDT"] as const;
const BINANCE_TIMEFRAMES = [
    "1s", 
    "1m", "3m", "5m", "15m", "30m",
    "1h", "2h", "4h", "6h", "8h", "12h",
    "1d", "3d",
    "1w",
] as const satisfies CandleTimeframe[];

function candleTopic(symbol: Symbol, timeframe: CandleTimeframe) {
    return `candle.${symbol}.${timeframe}`;
}

async function publishCandle(
    producer: any,
    event: CandleUpsertedEvent
) {
    const topic = candleTopic(event.symbol, event.timeframe);

    await producer.send({
        topic,
        messages: [{ value: JSON.stringify(event) }]
    });
}

async function main() {
    console.log("[candle-service] starting...");
    console.log("[candle-service] brokers:", brokers.join(","));

    const consumer = await createConsumer({
        clientId: "candle-service",
        brokers,
        groupId: `candle-service`
    });

    const producer = await createProducer({
        clientId: "candle-service",
        brokers
    });

    console.log("[candle-service] consumer/producer connected");

    const aggregators = BINANCE_TIMEFRAMES.map((tf) => new candleAggregator(tf));

    for (const symbol of SYMBOLS) {
        await consumer.subscribe({ topic: `tick.${symbol}`, fromBeginning: false });
      }

    await consumer.run({
        eachMessage: async ({ message }: any) => {
            if (!message.value) return;

            const tick = JSON.parse(message.value.toString()) as TickEvent;

            for (const agg of aggregators) {
                const { upserted, closed } = agg.onTick(tick);

                await publishCandle(producer, upserted);
                console.log(
                    `[candle-service] upsert ${upserted.timeframe} ${upserted.symbol} ${upserted.openTime} close=${upserted.close}`
                );

                if (closed) {
                    await publishCandle(producer, closed);
                    console.log(
                        `[candle-service] closed ${closed.timeframe} ${closed.symbol} ${closed.openTime}`
                    );
                }
            }
        }
    });

    const flushTimer = setInterval(() => {
        const now = Date.now();

        for (const agg of aggregators) {
            const expired = agg.flushIfExpired(now);

            for (const ev of expired) {
                void publishCandle(producer, ev);
                console.log(
                    `[candle-service] timer-closed ${ev.timeframe} ${ev.symbol} ${ev.openTime}`
                );
            }
        }
    }, 1000);

    const shutdown = async () => {
        clearInterval(flushTimer);

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

