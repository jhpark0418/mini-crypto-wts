import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CandlesService } from './candles.service';
import { SYMBOLS, SymbolType, Timeframe, TIMEFRAMES } from './candle.types';

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

        if (!SYMBOLS.includes(resolvedSymbol as SymbolType)) {
            throw new BadRequestException(`invalid symbol: ${resolvedSymbol}`);
        }

        if (!TIMEFRAMES.includes(resolvedTimeframe as Timeframe)) {
            throw new BadRequestException(`invalid timeframe: ${resolvedTimeframe}`);
          }
      
        if (!Number.isInteger(resolvedLimit) || resolvedLimit <= 0 || resolvedLimit > 5000) {
            throw new BadRequestException(`invalid limit: ${limit}`);
        }

        return this.candlesService.findLastest({
            symbol: resolvedSymbol as SymbolType,
            timeframe: resolvedTimeframe as Timeframe,
            limit: resolvedLimit
        });
    }
}
