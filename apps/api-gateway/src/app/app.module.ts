import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CandlesModule } from 'src/candles/candles.module';
import { MarketConsumerService } from 'src/market-consumer.service';
import { TickGateway } from 'src/tick.gateway';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true
        }),
        CandlesModule
    ],
    providers: [MarketConsumerService, TickGateway]
})
export class AppModule {}
