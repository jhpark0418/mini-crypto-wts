import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TickEvent } from "@wts/common";
import { createConsumer } from "@wts/kafka";
import { TickGateway } from "./tick.gateway";

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
            groupId: "api-gateway-tick"
        });

        console.log("[api-gateway] consumer connected:", brokers.join(","));
        
        // tick topic
        await this.consumer.subscribe({ topic: "tick.BTCUSDT", fromBeginning: false });
        // candle topic
        await this.consumer.subscribe({ topic: "candle.1m.BTCUSDT", fromBeginning: false })

        await this.consumer.run({
            eachMessage: async ({ topic, partition, message }: any) => {
                // console.log("[api-gateway] got message:", {
                //     topic,
                //     partition,
                //     offset: message.offset,
                //     hasValue: !!message.value
                // });

                if (!message.value) return;

                const e = JSON.parse(message.value.toString()) as TickEvent;

                if (topic.startsWith("tick.")) {
                    this.tickGateway.broadcastTick(e);
                }
                
                if (topic.startsWith("candle.")) {
                    this.tickGateway.broadcastCandle(e);
                }
                console.log("[api-gateway] tick:", e.symbol, e.price);
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