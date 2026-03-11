import { Module } from '@nestjs/common';
import { CANDLE_HISTORY_REPOSITORY, CandlesService } from './candles.service';
import { InMemoryCandleHistoryRepository } from './in-memory-candle-history.repository';
import { CandlesController } from './candles.controller';
import { CandleBackfillService } from './candle-backfill.service';

@Module({
  controllers: [CandlesController],
  providers: [
    CandlesService,
    {
      provide: CANDLE_HISTORY_REPOSITORY,
      useClass: InMemoryCandleHistoryRepository,
    },
    CandleBackfillService
  ],
  exports: [CandlesService],
})
export class CandlesModule {}
