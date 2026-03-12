import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CandlesService } from './candles.service';
import { SYMBOLS, Symbol, CandleTimeframe, BINANCE_TIMEFRAMES } from '@wts/common';

@Controller('api/candles')
export class CandlesController {
    constructor(
        private readonly candlesService: CandlesService
    ) {}

    @Get()
    async getCandles(
        @Query("symbol") symbol?: string,
        @Query("timeframe") timeframe?: string,
        @Query("limit") limit?: string
    ) {
        const resolvedSymbol = symbol ?? "BTCUSDT";
        const resolvedTimeframe = timeframe ?? "1m";
        const resolvedLimit = limit ? Number(limit) : 200;

        if (!SYMBOLS.includes(resolvedSymbol as Symbol)) {
            throw new BadRequestException(`invalid symbol: ${resolvedSymbol}`);
        }

        if (!BINANCE_TIMEFRAMES.includes(resolvedTimeframe as CandleTimeframe)) {
            throw new BadRequestException(`invalid timeframe: ${resolvedTimeframe}`);
          }
      
        if (!Number.isInteger(resolvedLimit) || resolvedLimit <= 0 || resolvedLimit > 5000) {
            throw new BadRequestException(`invalid limit: ${limit}`);
        }

        return;
    }
}
