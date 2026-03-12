import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CandleUpsertedEvent, TickEvent } from "@wts/common";
import { createConsumer } from "@wts/kafka";
import { TickGateway } from "./tick.gateway";
import { CandlesService } from "./candles/candles.service";
import { Candle } from "./candles/candle.types";

const CANDLE_TIMEFRAMES = [
    "1m", "5m", "30m",
    "1h", "12h",
    "1d"
] as const;
const SYMBOLS = ["BTCUSDT", "ETHUSDT"] as const;

@Injectable()
export class MarketConsumerService implements OnModuleInit, OnModuleDestroy {
    private consumer: any;

    constructor(
        private readonly config: ConfigService,
        private readonly tickGateway: TickGateway,
        private readonly candlesService: CandlesService
    ) {}

    async onModuleInit() {
        const brokers = (this.config.get<string>("KAFKA_BROKERS") ?? "localhost:9092").split(",");

        this.consumer = await createConsumer({
            clientId: "api-gateway",
            brokers,
            groupId: "api-gateway-market"
        });

        console.log("[api-gateway] consumer connected:", brokers.join(","));
        
        
        for (const symbol of SYMBOLS) {
            // tick topic
            await this.consumer.subscribe({ topic: `tick.${symbol}`, fromBeginning: false });

            // candle topic
            for (const timeframe of CANDLE_TIMEFRAMES) {
                await this.consumer.subscribe({ topic: `candle.${symbol}.${timeframe}`, fromBeginning: false });
            }
        }

        await this.consumer.run({
            eachMessage: async ({ topic, partition, message }: any) => {
                if (!message.value) return;

                const raw = message.value.toString();

                try {
                    if (topic.startsWith("tick.")) {
                        const tick = JSON.parse(raw) as TickEvent;
                        this.tickGateway.broadcastTick(tick);

                        console.log(
                            "[api-gateway] tick:",
                            tick.symbol,
                            tick.price,
                            tick.qty,
                            tick.ts
                        );
                        return;
                    }

                    if (topic.startsWith("candle.")) {
                        const candleEvent = JSON.parse(raw) as CandleUpsertedEvent;

                        this.tickGateway.broadcastCandle(candleEvent);

                        console.log(
                            "[api-gateway] candle:",
                            candleEvent.symbol,
                            candleEvent.timeframe,
                            candleEvent.openTime,
                            candleEvent.close
                        );
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


    async onModuleDestroy() {
        try {
            await this.consumer?.disconnect();
        } catch {}
    }
}