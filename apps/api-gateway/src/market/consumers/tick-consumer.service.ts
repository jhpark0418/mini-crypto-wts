import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MarketGateway } from "../market.gateway";
import { createConsumer, createAdmin, ensureTopics } from "@wts/kafka";
import { SYMBOLS, TickEvent } from "@wts/common";

@Injectable()
export class TickConsumerService implements OnModuleInit, OnModuleDestroy {
    private consumer: any;
    private isTickReady = false;
    private hasSeeked = false;

    constructor(
        private readonly config: ConfigService,
        private readonly marketGateway: MarketGateway
    ) {}

    async onModuleInit() {
        const brokers = (this.config.get<string>("KAFKA_BROKERS") ?? "localhost:9092").split(",");

        await ensureTopics({
            clientId: "api-gateway-tick-ensure",
            brokers,
            topics: SYMBOLS.map((symbol) => `tick.${symbol}`)
        });

        this.consumer = await createConsumer({
            clientId: "api-gateway-tick",
            brokers,
            groupId: "api-gateway-tick"
        });

        console.log("[api-gateway-tick] consumer connected:", brokers.join(","));

        for (const symbol of SYMBOLS) {
            await this.consumer.subscribe({
                topic: `tick.${symbol}`,
                fromBeginning: false
            });
        }

        // await this.seekTickTopicsToLatest(brokers);
        this.consumer.on(this.consumer.events.GROUP_JOIN, async () => {
            if (this.hasSeeked) return;

            try {
                console.log("[api-gateway-tick] group joined, seeking tick topics to latest...");
                await this.seekTickTopicsToLatest(brokers);
                this.hasSeeked = true;
                this.isTickReady = true;
                console.log("[api-gateway-tick] tick consumer is ready");
            } catch (error) {
                console.error("[api-gateway-tick] failed to seek latest tick offsets:", error);
            }
        });

        await this.consumer.run({
            eachMessage: async ({ topic, message }: any) => {
                if (!message.value) return;

                if (!this.isTickReady) {
                    return;
                }

                try {
                    const tick = JSON.parse(message.value.toString()) as TickEvent;

                    if (Math.random() < 0.01) {
                        console.log(`[trace][gateway-tick] symbol=${tick.symbol} lagMs=${Date.now() - new Date(tick.ts).getTime()}`);
                    }

                    this.marketGateway.broadcastTick(tick);
                } catch (err) {
                    console.error("[api-gateway-tick] failed to parse tick message:", {
                        topic,
                        raw: message.value.toString(),
                        err,
                    });
                }
            }
        });

        console.log("[api-gateway-tick] consumer run started");
    }

    private async seekTickTopicsToLatest(brokers: string[]) {
        const admin = await createAdmin({
            clientId: "api-gateway-tick-admin",
            brokers
        });

        try {
            for (const symbol of SYMBOLS) {
                const topic = `tick.${symbol}`;
                const offsets = await admin.fetchTopicOffsets(topic);

                for (const offsetInfo of offsets) {
                    this.consumer.seek({
                        topic,
                        partition: offsetInfo.partition,
                        offset: offsetInfo.offset
                    });

                    console.log(`[api-gateway-tick] seek latest topic=${topic} partition=${offsetInfo.partition} offset=${offsetInfo.offset}`);
                }
            }
        } finally {
            await admin.disconnect();
        }
    }

    async onModuleDestroy() {
        try {
            await this.consumer?.disconnect();
        } catch {}
    }
}