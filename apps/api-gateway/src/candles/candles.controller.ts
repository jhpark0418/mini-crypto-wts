import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CandlesService } from './candles.service';
import { SYMBOLS, Symbol, CandleTimeframe, BINANCE_TIMEFRAMES } from '@cmp/common';

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
        const resolvedSymbol = (symbol ?? "BTCUSDT") as Symbol;
        const resolvedTimeframe = (timeframe ?? "1m") as CandleTimeframe;
        const resolvedLimit = limit ? Number(limit) : 200;

        if (!SYMBOLS.includes(resolvedSymbol as Symbol)) {
            throw new BadRequestException(`invalid symbol: ${resolvedSymbol}`);
        }

        if (!BINANCE_TIMEFRAMES.includes(resolvedTimeframe as CandleTimeframe)) {
            throw new BadRequestException(`invalid timeframe: ${resolvedTimeframe}`);
          }
      
        if (!Number.isInteger(resolvedLimit) || resolvedLimit <= 0 || resolvedLimit > 200) {
            throw new BadRequestException(`invalid limit: ${limit}`);
        }

        return this.candlesService.findLatest({
            symbol: resolvedSymbol,
            timeframe: resolvedTimeframe,
            limit: resolvedLimit
        });
    }
}
