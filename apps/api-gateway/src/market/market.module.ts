import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketConsumerService } from 'src/market-consumer.service';
import { MarketGateway } from 'src/market.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandleEntity } from 'src/candles/entities/candle.entity';
import { TickConsumerService } from 'src/tick-consumer.service';

@Module({
  imports: [TypeOrmModule.forFeature([CandleEntity])],
  providers: [MarketConsumerService, TickConsumerService, MarketGateway],
  controllers: [MarketController],
  exports: [MarketConsumerService]
})
export class MarketModule {}
