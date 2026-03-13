import { Module } from '@nestjs/common';
import { CandlesService } from './candles.service';
import { CandlesController } from './candles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandleEntity } from './entities/candle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CandleEntity])],
  controllers: [CandlesController],
  providers: [
    CandlesService,
  ],
  exports: [CandlesService],
})
export class CandlesModule {}
