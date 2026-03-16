import { Controller, Get, Query } from '@nestjs/common';
import { type CandleTimeframe, type Symbol } from '@wts/common';
import { MarketConsumerService } from 'src/market-consumer.service';

@Controller('api/market')
export class MarketController {
    constructor(
        private readonly marketConsumerService: MarketConsumerService
    ) {}

    @Get("active-candle")
    getActiveCandle(
        @Query("symbol") symbol: Symbol,
        @Query("timeframe") timeframe: CandleTimeframe
    ) {
        return this.marketConsumerService.getActiveCandle(symbol, timeframe);
    }
}
