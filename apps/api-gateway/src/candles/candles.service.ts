import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CandleTimeframe, Symbol } from '@wts/common';
import { CandleEntity } from '@wts/db';
import { Repository } from 'typeorm';

export type CandleHistoryItem = {
    symbol: Symbol;
    timeframe: CandleTimeframe;
    openTime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

@Injectable()
export class CandlesService {
    constructor(
        @InjectRepository(CandleEntity)
        private readonly candleRepository: Repository<CandleEntity>
    ) {}

    async findLatest(params: {
        symbol: Symbol;
        timeframe: CandleTimeframe;
        limit: number;
    }) {
        const { symbol, timeframe, limit } = params;

        const rows = await this.candleRepository.find({
            where: { symbol, timeframe },
            order: { openTime: "DESC" },
            take: limit
        });

        // DB에서는 DESC LIMIT N 으로 가져오고 
        // 프론트용으로 다시 오름차순 반환
        return rows.reverse()
            .map((row) => ({
                symbol: row.symbol as Symbol,
                timeframe: row.timeframe as CandleTimeframe,
                openTime: row.openTime.toISOString(),
                open: Number(row.openPrice),
                high: Number(row.highPrice),
                low: Number(row.lowPrice),
                close: Number(row.closePrice),
                volume: Number(row.volume)
            }));
    }
}
