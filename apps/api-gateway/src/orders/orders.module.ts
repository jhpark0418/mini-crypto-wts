import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity, TradeEntity } from '@wts/db';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { TradesController } from './trades.controller';
import { OrdersConsumerService } from './consumers/orders-consumer.service';
import { MarketModule } from 'src/market/market.module';

@Module({
    imports: [TypeOrmModule.forFeature([OrderEntity, TradeEntity]), MarketModule],
    controllers: [OrdersController, TradesController],
    providers: [OrdersService, OrdersConsumerService],
    exports: [OrdersService]
})
export class OrdersModule {}
