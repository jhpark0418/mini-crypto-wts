import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OrderUpdatedEvent, SYMBOLS, TradeExecutedEvent } from "@wts/common";
import { createConsumer, ensureTopics } from "@wts/kafka";
import { MarketGateway } from "src/market/market.gateway";

@Injectable()
export class OrdersConsumerService implements OnModuleInit, OnModuleDestroy {
    private consumer: any;

    constructor(
        private readonly config: ConfigService,
        private readonly marketGateway: MarketGateway
    ) {}

    async onModuleInit() {
        const brokers = (this.config.get<string>("KAFKA_BROKERS") ?? "localhost:9092").split(",");

        await ensureTopics({
            clientId: "api-gateway-orders-consumer-ensure",
            brokers,
            topics: SYMBOLS.flatMap((symbol) => [
                `order.updated.${symbol}`,
                `trade.executed.${symbol}`
            ])
        });

        this.consumer = await createConsumer({
            clientId: "api-gateway-orders-consumer",
            brokers,
            groupId: "api-gateway-orders-consumer"
        });

        for (const symbol of SYMBOLS) {
            await this.consumer.subscribe({
                topic: `order.updated.${symbol}`,
                fromBeginning: false
            });

            await this.consumer.subscribe({
                topic: `trade.executed.${symbol}`,
                fromBeginning: false
            });
        }

        await this.consumer.run({
            eachMessage: async ({ topic, message }: any) => {
                if (!message.value) return;

                const raw = message.value.toString();

                try {
                    if (topic.startsWith("order.updated.")) {
                        const payload = JSON.parse(raw) as OrderUpdatedEvent;
                        this.marketGateway.broadcastOrderUpdate(payload);
                        return;
                    }

                    if (topic.startsWith("trade.executed.")) {
                        const payload = JSON.parse(raw) as TradeExecutedEvent;
                        this.marketGateway.broadcastTrade(payload);
                        return;
                    }
                } catch (error) {
                    console.error("[api-gateway-orders-consumer] parse error", {
                        topic,
                        raw,
                        error
                    });
                }
            }
        });

        console.log("[api-gateway-orders-consumer] consumer run started");
    }

    async onModuleDestroy() {
        try {
            await this.consumer?.disconnect();
        } catch {}
    }
}