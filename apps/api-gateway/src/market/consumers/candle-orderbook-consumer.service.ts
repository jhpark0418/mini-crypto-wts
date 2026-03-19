import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BINANCE_TIMEFRAMES, cacheKeys, CandleEvent, CandleTimeframe, OrderbookSnapshotEvent, Symbol, SYMBOLS } from "@wts/common";
import { createConsumer, ensureTopics } from "@wts/kafka";
import { MarketGateway } from "../market.gateway";
import { RedisService } from "../../redis/redis.service";

@Injectable()
export class CandleOrderbookConsumer implements OnModuleInit, OnModuleDestroy {
    private consumer: any;

    private static readonly ORDERBOOK_TTL_SECONDS = 15;

    constructor(
        private readonly config: ConfigService,
        private readonly marketGateway: MarketGateway,
        private readonly redisService: RedisService,
    ) {}

    async onModuleInit() {
        const brokers = (this.config.get<string>("KAFKA_BROKERS") ?? "localhost:9092").split(",");

        const topics: string[] = [];
        
        for (const symbol of SYMBOLS) {
            for (const timeframe of BINANCE_TIMEFRAMES) {
                topics.push(`candle.${symbol}.${timeframe}`);
            }

            topics.push(`orderbook.${symbol}`);
        }

        await ensureTopics({
            clientId: "api-gateway-market-ensure",
            brokers,
            topics
        });

        this.consumer = await createConsumer({
            clientId: "api-gateway",
            brokers,
            groupId: "api-gateway-market"
        });

        console.log("[api-gateway] consumer connected:", brokers.join(","));

        for (const symbol of SYMBOLS) {
            // candle topic
            for (const timeframe of BINANCE_TIMEFRAMES) {
                await this.consumer.subscribe({ topic: `candle.${symbol}.${timeframe}`, fromBeginning: false });
            }

            await this.consumer.subscribe({topic: `orderbook.${symbol}`, fromBeginning: false});
        }

        await this.consumer.run({
            eachMessage: async ({ topic, partition, message }: any) => {
                if (!message.value) return;

                const raw = message.value.toString();

                try {
                    if (topic.startsWith("candle.")) {
                        const candleEvent = JSON.parse(raw) as CandleEvent;

                        const lagMs = Date.now() - candleEvent.openTime;

                        if (Math.random() < 0.05) {
                            console.log(`[trace][gateway-candle] symbol=${candleEvent.symbol} tf=${candleEvent.timeframe} lagFromOpenMs=${lagMs}`);
                        }

                        const emitStart = performance.now();

                        this.marketGateway.broadcastCandle(candleEvent);

                        const emitCost = performance.now() - emitStart;

                        if (emitCost > 5) {
                            console.log(`[trace][gateway-emit] symbol=${candleEvent.symbol} tf=${candleEvent.timeframe} costMs=${emitCost.toFixed(2)}`);
                        }

                        return;
                    }

                    if (topic.startsWith("orderbook.")) {
                        const orderbook = JSON.parse(raw) as OrderbookSnapshotEvent;

                        await this.redisService.setJson(
                            cacheKeys.orderbook(orderbook.symbol),
                            orderbook,
                            CandleOrderbookConsumer.ORDERBOOK_TTL_SECONDS
                        );

                        if (Math.random() < 0.02) {
                            console.log(`[trace][gateway-orderbook] symbol=${orderbook.symbol} bids=${orderbook.bids.length} asks=${orderbook.asks.length}`);
                        }

                        this.marketGateway.broadcastOrderbook(orderbook);
                        return;
                    }

                    console.warn("[api-gateway] unknown topic:", topic);
                
                } catch (err) {
                    console.error("[api-gateway] failed to parse message:", {
                        topic,
                        partition,
                        raw,
                        err,
                    });
                }
            }
        });

        console.log("[api-gateway] consumer run started"); // 여기까지 찍히면 run 등록 완료
    }

    async getLatestOrderbook(symbol: Symbol) {
        return this.redisService.getJson<OrderbookSnapshotEvent>(
            cacheKeys.orderbook(symbol)
        );
    }

    async getActiveCandle(symbol: Symbol, timeframe: CandleTimeframe) {
        return this.redisService.getJson(
            cacheKeys.activeCandle(symbol, timeframe)
        );
    }

    async onModuleDestroy() {
        try {
            await this.consumer?.disconnect();
        } catch {}
    }
}