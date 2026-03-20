import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { type CandleTimeframe, type Symbol } from '@cmp/common';
import { CandleOrderbookConsumer } from 'src/market/consumers/candle-orderbook-consumer.service';

@Controller('api/market')
export class MarketController {
    constructor(
        private readonly candleOrderbookConsumer: CandleOrderbookConsumer
    ) {}

    @Get("active-candle")
    async getActiveCandle(
        @Query("symbol") symbol: Symbol,
        @Query("timeframe") timeframe: CandleTimeframe
    ) {
        const snapshot = await this.candleOrderbookConsumer.getActiveCandle(symbol, timeframe);
        if (!snapshot) {
            throw new NotFoundException("Active candle snapshot not found");
        }
        return snapshot;
    }

    @Get("orderbook")
    async getOrderbook(
        @Query("symbol") symbol: Symbol
    ) {
        const snapshot = await this.candleOrderbookConsumer.getLatestOrderbook(symbol);
        if (!snapshot) {
            throw new NotFoundException("Orderbook snapshot not found");
        }
        return snapshot;
    }
}
