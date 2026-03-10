import { Inject, Injectable } from '@nestjs/common';
import type { CandleHistoryRepository } from './candle-history.repository';
import { Candle, Timeframe } from './candle.types';
import { Symbol } from '@wts/common';

export const CANDLE_HISTORY_REPOSITORY = "CANDLE_HISTORY_REPOSITORY";

@Injectable()
export class CandlesService {
    constructor(
        @Inject(CANDLE_HISTORY_REPOSITORY)
        private readonly candleHsitoryRepository: CandleHistoryRepository
    ) {}

    async save(candle: Candle): Promise<void> {
        await this.candleHsitoryRepository.save(candle);
    }

    async findLastest(params: {
        symbol: Candle["symbol"];
        timeframe: Timeframe;
        limit: number;
    }): Promise<Candle[]> {
        return this.candleHsitoryRepository.findLastes(params);
    }
}
