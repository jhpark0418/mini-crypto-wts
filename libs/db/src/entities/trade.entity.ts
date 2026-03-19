import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("trades")
@Index("idx_trades_symbol_traded_at", ["symbol", "tradedAt"])
@Index("idx_trades_trade_id", ["tradeId"], { unique: true })
export class TradeEntity {
    @PrimaryGeneratedColumn("increment", { type: "bigint" })
    id!: string;

    @Column({ name: "trade_id", type: "varchar", length: 100 })
    tradeId!: string;

    @Column({ type: "varchar", length: 20 })
    symbol!: string;

    @Column({ name: "buy_order_id", type: "varchar", length: 100 })
    buyOrderId!: string;

    @Column({ name: "sell_order_id", type: "varchar", length: 100 })
    sellOrderId!: string;

    @Column({ type: "numeric", precision: 18, scale: 8 })
    price!: string;

    @Column({ type: "numeric", precision: 28, scale: 8 })
    qty!: string;

    @Column({ name: "traded_at", type: "timestamp" })
    tradedAt!: Date;

    @CreateDateColumn({ name: "created_at", type: "timestamp" })
    createdAt!: Date;
}