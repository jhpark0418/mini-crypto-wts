import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { CandleOrderbookConsumer } from 'src/market/consumers/candle-orderbook-consumer.service';
import { MarketGateway } from 'src/market/market.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandleEntity } from '@cmp/db';
import { TickConsumerService } from 'src/market/consumers/tick-consumer.service';

@Module({
  imports: [TypeOrmModule.forFeature([CandleEntity])],
  providers: [CandleOrderbookConsumer, TickConsumerService, MarketGateway],
  controllers: [MarketController],
  exports: [CandleOrderbookConsumer, MarketGateway]
})
export class MarketModule {}
