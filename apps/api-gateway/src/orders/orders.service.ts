import { BadRequestException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { isValidSymbol, OrderCreateCommand, OrderSide, OrderType, Symbol, SYMBOLS } from '@wts/common';
import { OrderEntity, TradeEntity } from '@wts/db';
import { createProducer, ensureTopics, publishJson } from '@wts/kafka';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';

type CreateOrderInput = {
    accountId: string;
    symbol: Symbol;
    side: OrderSide;
    orderType: OrderType;
    price?: number;
    qty: number;
};

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
    private producer: any;

    constructor(
        private readonly config: ConfigService,
        @InjectRepository(OrderEntity)
        private readonly orderRepository: Repository<OrderEntity>,
        @InjectRepository(TradeEntity)
        private readonly tradeRepository: Repository<TradeEntity>
    ) {}

    async onModuleInit() {
        const brokers = (this.config.get<string>("KAFKA_BROKERS") ?? "localhost:9092").split(",");

        const topics: string[] = [];

        for (const symbol of SYMBOLS) {
            topics.push(`order.command.${symbol}`);
            topics.push(`order.updated.${symbol}`);
            topics.push(`trade.executed.${symbol}`);
        }

        await ensureTopics({
            clientId: "api-gateway-orders-ensure",
            brokers,
            topics
        });

        this.producer = await createProducer({
            clientId: "api-gateway-orders",
            brokers
        });

        console.log("[api-gateway-orders] producer connected:", brokers.join(","));
    }

    async onModuleDestroy() {
        try {
            await this.producer?.disconnect();
        } catch {}
    }

    async createOrder(input: CreateOrderInput) {
        if (!input.accountId?.trim()) {
            throw new BadRequestException("accountId is required");
        }
    
        if (!isValidSymbol(input.symbol)) {
            throw new BadRequestException("invalid symbol");
        }
    
        if (input.side !== "BUY" && input.side !== "SELL") {
            throw new BadRequestException("invalid side");
        }
    
        if (input.orderType !== "LIMIT") {
            throw new BadRequestException("only LIMIT order is supported for now");
        }
    
        if (typeof input.qty !== "number" || !Number.isFinite(input.qty) || input.qty <= 0) {
            throw new BadRequestException("qty must be a positive number");
        }
    
        if (typeof input.price !== "number" || !Number.isFinite(input.price) || input.price <= 0) {
            throw new BadRequestException("price must be a positive number for LIMIT order");
        }

        const orderId = randomUUID();

        const command: OrderCreateCommand = {
            eventId: randomUUID(),
            type: "ORDER_CREATE_COMMAND",
            orderId,
            accountId: input.accountId,
            symbol: input.symbol as Symbol,
            side: input.side,
            orderType: input.orderType,
            price: input.price,
            qty: input.qty,
            ts: new Date().toISOString()
        };

        await publishJson(this.producer, `order.command.${command.symbol}`, command);

        return {
            orderId,
            status: "PENDING",
            accepted: true
        };
    }

    async findOrders(params: {
        accountId: string;
        symbol?: Symbol;
        limit: number;
    }) {
        const qb = this.orderRepository
            .createQueryBuilder("o")
            .orderBy("o.createdAt", "DESC")
            .take(params.limit);

        if (params.accountId) {
            qb.andWhere("o.accountId = :accountId", { accountId: params.accountId });
        }

        if (params.symbol) {
            qb.andWhere("o.symbol = :symbol", { symbol: params.symbol });
        }

        const rows = await qb.getMany();

        return rows.map((row) => ({
            orderId: row.orderId,
            accountId: row.accountId,
            symbol: row.symbol,
            side: row.side,
            orderType: row.orderType,
            price: row.price == null ? null : Number(row.price),
            qty: Number(row.qty),
            filledQty: Number(row.filledQty),
            remainingQty: Number(row.remainingQty),
            status: row.status,
            avgFillPrice: row.avgFillPrice == null ? null : Number(row.avgFillPrice),
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString()
        }));
    }

    async findTrades(params: {
        symbol?: Symbol;
        limit: number;
    }) {
        const qb = this.tradeRepository
            .createQueryBuilder("t")
            .orderBy("t.tradedAt", "DESC")
            .take(params.limit);

        if (params.symbol) {
            qb.andWhere("t.symbol = :symbol", { symbol: params.symbol });
        }

        const rows = await qb.getMany();

        return rows.map((row) => ({
            tradeId: row.tradeId,
            symbol: row.symbol,
            buyOrderId: row.buyOrderId,
            sellOrderId: row.sellOrderId,
            price: Number(row.price),
            qty: Number(row.qty),
            tradedAt: row.tradedAt.toISOString(),
            createdAt: row.createdAt.toISOString()
        }));
    }
}
