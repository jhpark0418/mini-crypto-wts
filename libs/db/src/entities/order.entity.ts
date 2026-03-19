import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("orders")
@Index("idx_orders_account_symbol_created_at", ["accountId", "symbol", "createdAt"])
@Index("idx_orders_symbol_status_created_at", ["symbol", "status", "createdAt"])
@Index("idx_orders_order_id", ["orderId"], { unique: true })
export class OrderEntity {
    @PrimaryGeneratedColumn("increment", { type: "bigint" })
    id!: string;

    @Column({ name: "order_id", type: "varchar", length: 100 })
    orderId!: string;

    @Column({ name: "account_id", type: "varchar", length: 100 })
    accountId!: string;

    @Column({ type: "varchar", length: 20 })
    symbol!: string;

    @Column({ type: "varchar", length: 10 })
    side!: string;

    @Column({ name: "order_type", type: "varchar", length: 10 })
    orderType!: string;

    @Column({ type: "numeric", precision: 18, scale: 8, nullable: true })
    price!: string | null;

    @Column({ type: "numeric", precision: 28, scale: 8 })
    qty!: string;

    @Column({ name: "filled_qty", type: "numeric", precision: 28, scale: 8, default: 0 })
    filledQty!: string;

    @Column({ name: "remaining_qty", type: "numeric", precision: 28, scale: 8 })
    remainingQty!: string;

    @Column({ type: "varchar", length: 30 })
    status!: string;

    @Column({ name: "avg_fill_price", type: "numeric", precision: 18, scale: 8, nullable: true })
    avgFillPrice!: string | null;

    @CreateDateColumn({ name: "created_at", type: "timestamp" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
    updatedAt!: Date;
}