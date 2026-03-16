import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BINANCE_TIMEFRAMES, CandleEvent, CandleTimeframe, OrderbookSnapshotEvent, Symbol, SYMBOLS, TickEvent } from "@wts/common";
import { createConsumer } from "@wts/kafka";
import { MarketGateway } from "./market.gateway";

@Injectable()
export class MarketConsumerService implements OnModuleInit, OnModuleDestroy {
    private consumer: any;

    private readonly latestOrderbooks = new Map<Symbol, OrderbookSnapshotEvent>();

    private readonly activeCandles = new Map<string, {
        symbol: Symbol;
        timeframe: CandleTimeframe;
        openTime: string;
        closeTime: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }>();

    constructor(
        private readonly config: ConfigService,
        private readonly marketGateway: MarketGateway,
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
                    if (topic.startsWith("tick.")) {
                        const tick = JSON.parse(raw) as TickEvent;

                        const lagMs = Date.now() - new Date(tick.ts).getTime();

                        if (Math.random() < 0.01) {
                            console.log(`[trace][gateway-tick] symbol=${tick.symbol} lagMs=${lagMs}`);
                        }

                        for (const timeframe of BINANCE_TIMEFRAMES) {
                            const key = this.getCandleKey(tick.symbol, timeframe);
                            const active = this.activeCandles.get(key);
                            if (!active) continue;

                            const tickMs = new Date(tick.ts).getTime();
                            const openMs = new Date(active.openTime).getTime();
                            const closeMs = new Date(active.closeTime).getTime();

                            if (tickMs < openMs || tickMs > closeMs) continue;

                            active.high = Math.max(active.high, tick.price);
                            active.low = Math.min(active.low, tick.price);
                            active.close = tick.price;
                            active.volume += tick.qty ?? 0;

                            this.activeCandles.set(key, active);
                        }

                        this.marketGateway.broadcastTick(tick);

                        // console.log(
                        //     "[api-gateway] tick:",
                        //     tick.symbol,
                        //     tick.price,
                        //     tick.qty,
                        //     tick.ts
                        // );
                        return;
                    }

                    if (topic.startsWith("candle.")) {
                        const candleEvent = JSON.parse(raw) as CandleEvent;

                        const lagMs = Date.now() - candleEvent.openTime;

                        if (Math.random() < 0.05) {
                            console.log(`[trace][gateway-candle] symbol=${candleEvent.symbol} tf=${candleEvent.timeframe} lagFromOpenMs=${lagMs}`);
                        }

                        const key = this.getCandleKey(candleEvent.symbol, candleEvent.timeframe);

                        if (candleEvent.type === "CANDLE_OPENED") {
                            this.activeCandles.set(key, {
                                symbol: candleEvent.symbol,
                                timeframe: candleEvent.timeframe,
                                openTime: new Date(candleEvent.openTime).toISOString(),
                                closeTime: new Date(candleEvent.closeTime).toISOString(),
                                open: candleEvent.open,
                                high: candleEvent.open,
                                low: candleEvent.open,
                                close: candleEvent.open,
                                volume: 0
                            });
                        } else if (candleEvent.type === "CANDLE_CLOSED") {
                            this.activeCandles.set(key, {
                                symbol: candleEvent.symbol,
                                timeframe: candleEvent.timeframe,
                                openTime: new Date(candleEvent.openTime).toISOString(),
                                closeTime: new Date(candleEvent.closeTime).toISOString(),
                                open: candleEvent.open,
                                high: candleEvent.high,
                                low: candleEvent.low,
                                close: candleEvent.close,
                                volume: candleEvent.volume
                            });
                        }

                        const emitStart = performance.now();

                        this.marketGateway.broadcastCandle(candleEvent);

                        const emitCost = performance.now() - emitStart;

                        if (emitCost > 5) {
                            console.log(`[trace][gateway-emit] symbol=${candleEvent.symbol} tf=${candleEvent.timeframe} costMs=${emitCost.toFixed(2)}`);
                        }

                        // console.log(
                        //     "[api-gateway] candle:",
                        //     candleEvent.symbol,
                        //     candleEvent.timeframe,
                        //     candleEvent.openTime,
                        //     candleEvent.close
                        // );
                        return;
                    }

                    if (topic.startsWith("orderbook.")) {
                        const orderbook = JSON.parse(raw) as OrderbookSnapshotEvent;

                        this.latestOrderbooks.set(orderbook.symbol, orderbook);

                        if (Math.random() < 0.02) {
                            console.log(`[trace][gateway-orderbook] symbol=${orderbook.symbol} bids=${orderbook.bids.length} asks=${orderbook.asks.length}`);
                        }

                        this.marketGateway.broadcastOrdebook(orderbook);
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

    getLatestOrderbook(symbol: Symbol) {
        return this.latestOrderbooks.get(symbol) ?? null;
    }

    private getCandleKey(symbol: Symbol, timeframe: CandleTimeframe) {
        return `${symbol}.${timeframe}`;
    }

    getActiveCandle(symbol: Symbol, timeframe: CandleTimeframe) {
        const key = this.getCandleKey(symbol, timeframe);
        return this.activeCandles.get(key) ?? null;
    }

    async onModuleDestroy() {
        try {
            await this.consumer?.disconnect();
        } catch {}
    }
}