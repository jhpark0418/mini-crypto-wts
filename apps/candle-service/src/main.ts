import "reflect-metadata";
import "./env.js";
import { createConsumer, createProducer } from "@wts/kafka";
import { candleAggregator } from "./candle/candle.aggregator.js"
import { CandleUpsertedEvent, TickEvent, Symbol, CandleTimeframe, SYMBOLS, BINANCE_TIMEFRAMES } from "@wts/common";
import { AppDataSource } from "./db/data-source.js";
import { upsertCandle } from "./db/repositories/candle.repository.js";
import { backfillCandles } from "./binance/backfill.service.js";

const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");

function candleTopic(symbol: Symbol, timeframe: CandleTimeframe) {
    return `candle.${symbol}.${timeframe}`;
}

async function publishCandle(
    producer: any,
    event: CandleUpsertedEvent
) {
    const topic = candleTopic(event.symbol, event.timeframe);
    const t0 = performance.now();

    await producer.send({
        topic,
        messages: [{ value: JSON.stringify(event) }]
    });

    const cost = performance.now() - t0;
    if (cost > 10) {
        console.log(`[trace][candle-publish] symbol=${event.symbol} tf=${event.timeframe} costMs=${cost.toFixed(2)}`);
    }
}

async function main() {
    console.log("[candle-service] starting...");
    console.log("[candle-service] brokers:", brokers.join(","));

    await AppDataSource.initialize();
    console.log("[candle-service] database connected");

    await backfillCandles(SYMBOLS, BINANCE_TIMEFRAMES, 200);
    console.log("[candle-service] initial backfill completed");

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

            const tickLagMs = Date.now() - new Date(tick.ts).getTime();

            if (Math.random() < 0.01) {
                console.log(`[trace][candle-consume] symbol=${tick.symbol} tickLagMs=${tickLagMs} tickTs=${tick.ts}`);
            }

            const processStart = performance.now();

            for (const agg of aggregators) {
                const aggStart = performance.now();

                const { upserted, closed } = agg.onTick(tick);

                const aggCost = performance.now() - aggStart;
                if (aggCost > 5) {
                    console.log(
                    `[trace][candle-agg] symbol=${tick.symbol} tf=${agg.timeframe ?? "unknown"} costMs=${aggCost.toFixed(2)}`
                    );
                }

                void publishCandle(producer, upserted).catch((err) => {
                    console.error("[candle-service] publish upserted failed:", err);
                });;

                if (closed) {
                    const dbStart = performance.now();

                    await upsertCandle({
                        symbol: closed.symbol,
                        timeframe: closed.timeframe,
                        openTime: new Date(closed.openTime).toISOString(),
                        open: closed.open,
                        high: closed.high,
                        low: closed.low,
                        close: closed.close,
                        volume: closed.volume,
                    });

                    const dbCost = performance.now() - dbStart;
                    console.log(`[trace][candle-db] symbol=${closed.symbol} tf=${closed.timeframe} costMs=${dbCost.toFixed(2)}`);

                    void publishCandle(producer, closed).catch((err) => {
                        console.error("[candle-service] publish closed failed:", err);
                    });;
                }
            }

            const processCost = performance.now() - processStart;
            if (processCost > 10) {
                console.log(`[trace][candle-eachMessage] symbol=${tick.symbol} totalCostMs=${processCost.toFixed(2)}`   );
            }
        }
    });

    const flushTimer = setInterval(async () => {
        const now = Date.now();
        const timerStart = performance.now();

        for (const agg of aggregators) {
            const expired = agg.flushIfExpired(now);

            for (const ev of expired) {
                const dbStart = performance.now();

                await upsertCandle({
                    symbol: ev.symbol,
                    timeframe: ev.timeframe,
                    openTime: new Date(ev.openTime).toISOString(),
                    open: ev.open,
                    high: ev.high,
                    low: ev.low,
                    close: ev.close,
                    volume: ev.volume,
                });

                const dbCost = performance.now() - dbStart;
                console.log(`[trace][flush-db] symbol=${ev.symbol} tf=${ev.timeframe} costMs=${dbCost.toFixed(2)}`);

                void publishCandle(producer, ev);
            }
        }

        const timerCost = performance.now() - timerStart;
        if (timerCost > 20) {
            console.log(`[trace][flush-total] costMs=${timerCost.toFixed(2)}`);
        }
    }, 1000);

    const shutdown = async () => {
        clearInterval(flushTimer);

        try {
            await consumer.disconnect();
            await producer.disconnect();

            if (AppDataSource.isInitialized) {
                await AppDataSource.destroy();
            }
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

