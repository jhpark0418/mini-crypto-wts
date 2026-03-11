import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DEFAULT_BACKFILL_TIMEFRAMES, Symbol } from "@wts/common";
import { fetchBinanceKlinesForAllTimeframes } from "./binance-klines.client";
import { CANDLE_HISTORY_REPOSITORY } from "./candles.service";
import type { CandleHistoryRepository } from "./candle-history.repository";

@Injectable()
export class CandleBackfillService implements OnModuleInit {
    private readonly logger = new Logger(CandleBackfillService.name);

    constructor(
        @Inject(CANDLE_HISTORY_REPOSITORY)
        private readonly candleHistoryRepository: CandleHistoryRepository
    ) {}

    async onModuleInit() {
        const symbol: Symbol = "BTCUSDT";
        const limit = 300;

        this.logger.log(`starting candle backfill: symbol=${symbol}, limit=${limit}`);

        const seeded = await fetchBinanceKlinesForAllTimeframes({
            symbol,
            limit,
            timeframes: DEFAULT_BACKFILL_TIMEFRAMES
        });

        for (const timeframe of DEFAULT_BACKFILL_TIMEFRAMES) {
            const candles = seeded[timeframe];
            this.candleHistoryRepository.seed(symbol, timeframe, candles);

            this.logger.log(`seeded ${symbol} ${timeframe}: ${candles.length} candles`);
        }

        this.logger.log("candle backfill completed");
    }
}