import "reflect-metadata";
import "./env.js";
import { createConsumer, createProducer, createAdmin, ensureTopics, publishJson } from "@wts/kafka";
import { AppDataSource } from "./db/data-source.js";
import { OrderCreateCommand, Symbol, SYMBOLS } from "@wts/common";
import { MatchingEngine } from "./engine/matching.engine.js";
import { OrderEntity, TradeEntity } from "@wts/db";

function toNullableNumeric(value?: number) {
    if (value == null || Number.isNaN(value)) return null;
    return value.toFixed(8);
}

async function upsertOrderFromEvent(event: {
    orderId: string;
    accountId: string;
    symbol: string;
    side: string;
    orderType: string;
    status: string;
    price?: number;
    qty: number;
    filledQty: number;
    remainingQty: number;
    avgFillPrice?: number;
    createdAtTs?: string;
}) {
    const repo = AppDataSource.getRepository(OrderEntity);

    let entity = await repo.findOne({
        where: {
            orderId: event.orderId
        }
    });

    if (!entity) {
        entity = repo.create({
            orderId: event.orderId,
            accountId: event.accountId,
            symbol: event.symbol as Symbol,
            side: event.side,
            orderType: event.orderType,
            createdAt: event.createdAtTs ? new Date(event.createdAtTs) : new Date()
        });
    }

    entity.price = toNullableNumeric(event.price);
    entity.qty = event.qty.toFixed(8);
    entity.filledQty = event.filledQty.toFixed(8);
    entity.remainingQty = event.remainingQty.toFixed(8);
    entity.status = event.status;
    entity.avgFillPrice = toNullableNumeric(event.avgFillPrice);

    await repo.save(entity);
}

async function insertTrade(event: {
    tradeId: string;
    symbol: string;
    buyOrderId: string;
    sellOrderId: string;
    price: number;
    qty: number;
    ts: string;
}) {
    const repo = AppDataSource.getRepository(TradeEntity);

    const exists = await repo.findOne({
        where: {
            tradeId: event.tradeId
        }
    });

    if (exists) return;

    const entity = repo.create({
        tradeId: event.tradeId,
        symbol: event.symbol,
        buyOrderId: event.buyOrderId,
        sellOrderId: event.sellOrderId,
        price: event.price.toFixed(8),
        qty: event.qty.toFixed(8),
        tradedAt: new Date(event.ts)
    });

    await repo.save(entity);
}

async function main() {
    const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");

    await AppDataSource.initialize();
    console.log("[matching-engine] db connected");

    await ensureTopics({
        clientId: "matching-engine-ensure",
        brokers,
        topics: SYMBOLS.flatMap((symbol) => [
            `order.command.${symbol}`,
            `order.updated.${symbol}`,
            `trade.executed.${symbol}`
        ])
    });

    const producer = await createProducer({
        clientId: "matching-engine",
        brokers
    });

    const consumer = await createConsumer({
        clientId: "matching-engine",
        brokers,
        groupId: "matching-engine-v1"
    });

    for (const symbol of SYMBOLS) {
        await consumer.subscribe({
            topic: `order.command.${symbol}`,
            fromBeginning: false
        });
    }

    console.log("[matching-engine] kafka connected");

    const engine = new MatchingEngine();

    const shutdown = async () => {
        console.log("[matching-engine] shutting down...");

        try {
            await consumer.disconnect();
        } catch {}

        try {
            await producer.disconnect();
        } catch {}

        try {
            if (AppDataSource.isInitialized) {
                await AppDataSource.destroy();
            }
        } catch {}

        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.off("SIGTERM", shutdown);

    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            if (!message.value) return;

            try {
                const payload = JSON.parse(message.value.toString()) as OrderCreateCommand;

                if (payload.type !== "ORDER_CREATE_COMMAND") {
                    return;
                }

                console.log("[matching-engine] order command received", {
                    topic,
                    orderId: payload.orderId,
                    symbol: payload.symbol,
                    side: payload.side,
                    orderType: payload.orderType,
                    price: payload.price,
                    qty: payload.qty
                });

                if (payload.orderType !== "LIMIT") {
                    console.log("[matching-engine] skip non-limit order for now", {
                        orderId: payload.orderId,
                        orderType: payload.orderType
                    });
                    return;
                }

                const result = engine.processLimitOrder(payload);

                for (const orderEvent of result.orderEvents) {
                    await upsertOrderFromEvent(orderEvent);

                    await publishJson(producer, `order.updated.${orderEvent.symbol}`, orderEvent);
                }

                for (const tradeEvent of result.tradeEvents) {
                    await insertTrade(tradeEvent);

                    await publishJson(producer, `trade.executed.${tradeEvent.symbol}`, tradeEvent);
                }

                console.log("[matching-engine] processed", {
                    orderId: payload.orderId,
                    status: result.incomingOrder.status,
                    filledQty: result.incomingOrder.filledQty,
                    remainingQty: result.incomingOrder.remainingQty,
                    trades: result.tradeEvents.length
                });
            } catch (error) {
                console.error("[matching-engine] message parse error", error);
            }
        }
    });
}

main().catch((error) => {
    console.error("[matching-engine] fatal", error);
    process.exit(1);
});