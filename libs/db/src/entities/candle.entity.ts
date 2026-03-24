import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("candles")
@Index("idx_candle_symbol_timeframe_open_time", ["symbol", "timeframe", "openTime"])
export class CandleEntity {
    @PrimaryColumn({ type: "varchar", length: 20 })
    symbol!: string;

    @PrimaryColumn({ type: "varchar", length: 10 })
    timeframe!: string;

    @PrimaryColumn({ name: "open_time", type: "timestamptz" })
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

    @CreateDateColumn({ name: "created_at", type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
    updatedAt!: Date;
}