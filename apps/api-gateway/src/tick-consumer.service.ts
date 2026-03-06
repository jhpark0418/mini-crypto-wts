import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CandleUpsertedEvent, TickEvent } from "@wts/common";
import { createConsumer } from "@wts/kafka";
import { TickGateway } from "./tick.gateway";

const CANDLE_TIMEFRAMES = ["10s", "30s", "1m", "5m", "15m", "30m", "1h"] as const;
const SYMBOLS = ["BTCUSDT", "ETHUSDT"] as const;

@Injectable()
export class TickConsumerService implements OnModuleInit, OnModuleDestroy {
    private consumer: any;

    constructor(
        private readonly config: ConfigService,
        private readonly tickGateway: TickGateway
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
                await this.consumer.subscribe({ topic: `candle.BTCUSDT.${timeframe}`, fromBeginning: false });
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
                        const candle = JSON.parse(raw) as CandleUpsertedEvent;
                        this.tickGateway.broadcastCandle(candle);

                        console.log(
                            "[api-gateway] candle:",
                            candle.symbol,
                            candle.timeframe,
                            candle.openTime,
                            candle.close
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