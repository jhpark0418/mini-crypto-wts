import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("candle")
@Unique("uq_candle", ["symbol", "timeframe", "openTime"])
@Index("idx_candle_symbol_timeframe_open_time", ["symbol", "timeframe", "openTime"])
export class CandleEntity {
    @PrimaryGeneratedColumn("increment", { type: "bigint" })
    id!: string;

    @Column({ type: "varchar", length: 20 })
    symbol!: string;

    @Column({ type: "varchar", length: 10 })
    timeframe!: string;

    @Column({ name: "open_time", type: "timestamp" })
    openTime!: Date;

    @Column({ name: "open_price", type: "numeric", precision: 18, scale: 8 })
    openPrice!: string;

    @Column({ name: "high_price", type: "numeric", precision: 18, scale: 8 })
    highPrice!: string;

    @Column({ name: "low_price", type: "numeric", precision: 18, scale: 8 })
    lowPrice!: string;

    @Column({ name: "close_price", type: "numeric", precision: 18, scale: 8 })
    closePrice!: string;

    @Column({ type: "numeric", precision: 28, scale: 8, default: 0 })
    volume!: string;
}