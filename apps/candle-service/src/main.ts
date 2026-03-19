import "reflect-metadata";
import "./env.js";
import { createConsumer, createProducer, ensureTopics } from "@wts/kafka";
import { CandleAggregator } from "./candle/candle.aggregator.js"
import { TickEvent, Symbol, CandleTimeframe, SYMBOLS, BINANCE_TIMEFRAMES, CandleEvent, cacheKeys } from "@wts/common";
import { AppDataSource } from "./db/data-source.js";
import { upsertCandle } from "./db/repositories/candle.repository.js";
import { backfillCandles } from "./binance/backfill.service.js";
import { restoreActiveState } from "./active-candle/active-candle.restore.js";
import { getRedis } from "./redis/redis.client.js";

const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
const redis = getRedis();

function candleTopic(symbol: Symbol, timeframe: CandleTimeframe) {
    return `candle.${symbol}.${timeframe}`;
}

async function publishCandle(
    producer: any,
    event: CandleEvent
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

    const topics: string[] = [];

    for (const symbol of SYMBOLS) {
        topics.push(`tick.${symbol}`);

        for (const timeframe of BINANCE_TIMEFRAMES) {
            topics.push(`candle.${symbol}.${timeframe}`);
        }
    }

    await ensureTopics({
        clientId: "candle-service-ensure",
        brokers,
        topics
    });

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

    const aggregators = BINANCE_TIMEFRAMES.map((tf) => new CandleAggregator(tf));
    
    for (const agg of aggregators) {
        for (const symbol of SYMBOLS) {
            const restored = await restoreActiveState(symbol, agg.getTimeframe());
            if (restored) {
                agg.restoreState(restored);
            }
        }
    }

    for (const symbol of SYMBOLS) {
        await consumer.subscribe({ topic: `tick.${symbol}`, fromBeginning: false });
    }

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

                await redis.del(cacheKeys.activeCandle(ev.symbol, ev.timeframe));

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

    const activePublishTimer = setInterval(async () => {
        for (const agg of aggregators) {
            const updates = agg.collectDirtyUpdates();

            for (const ev of updates) {
                await redis.set(
                    cacheKeys.activeCandle(ev.symbol, ev.timeframe),
                    JSON.stringify({
                        symbol: ev.symbol,
                        timeframe: ev.timeframe,
                        openTime: new Date(ev.openTime).toISOString(),
                        closeTime: new Date(ev.closeTime).toISOString(),
                        open: ev.open,
                        high: ev.high,
                        low: ev.low,
                        close: ev.close,
                        volume: ev.volume,
                    }),
                    "EX",
                    180
                );

                void publishCandle(producer, ev).catch((err) => {
                    console.error("[candle-service] publish updated failed:", err);
                });
            }
        }
    }, 200);

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

                const { opened, closed } = agg.onTick(tick);

                const aggCost = performance.now() - aggStart;
                if (aggCost > 5) {
                    console.log(
                    `[trace][candle-agg] symbol=${tick.symbol} tf=${agg.getTimeframe() ?? "unknown"} costMs=${aggCost.toFixed(2)}`
                    );
                }

                if (opened) {
                    await redis.set(
                        cacheKeys.activeCandle(opened.symbol, opened.timeframe),
                        JSON.stringify({
                            symbol: opened.symbol,
                            timeframe: opened.timeframe,
                            openTime: new Date(opened.openTime).toISOString(),
                            closeTime: new Date(opened.closeTime).toISOString(),
                            open: opened.open,
                            high: opened.open,
                            low: opened.open,
                            close: opened.open,
                            volume: 0,
                        }),
                        "EX",
                        180
                    );
                    
                    void publishCandle(producer, opened).catch((err) => {
                        console.error("[candle-service] publish opened failed:", err);
                    });
                }

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

                    await redis.del(cacheKeys.activeCandle(closed.symbol, closed.timeframe));

                    const dbCost = performance.now() - dbStart;
                    console.log(`[trace][candle-db] symbol=${closed.symbol} tf=${closed.timeframe} costMs=${dbCost.toFixed(2)}`);

                    void publishCandle(producer, closed).catch((err) => {
                        console.error("[candle-service] publish closed failed:", err);
                    });
                }
            }

            const processCost = performance.now() - processStart;
            if (processCost > 10) {
                console.log(`[trace][candle-eachMessage] symbol=${tick.symbol} totalCostMs=${processCost.toFixed(2)}`   );
            }
        }
    });

    const shutdown = async () => {
        clearInterval(flushTimer);
        clearInterval(activePublishTimer);

        try {
            await consumer.disconnect();
            await producer.disconnect();
            await redis.quit();

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

