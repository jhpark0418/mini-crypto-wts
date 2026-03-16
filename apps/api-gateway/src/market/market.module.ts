import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketConsumerService } from 'src/market-consumer.service';
import { MarketGateway } from 'src/market.gateway';

@Module({
  providers: [MarketConsumerService, MarketGateway],
  controllers: [MarketController]
})
export class MarketModule {}
