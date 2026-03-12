import { Module } from '@nestjs/common';
import { CANDLE_HISTORY_REPOSITORY, CandlesService } from './candles.service';
import { CandlesController } from './candles.controller';

@Module({
  controllers: [CandlesController],
  providers: [
    CandlesService,
  ],
  exports: [CandlesService],
})
export class CandlesModule {}
