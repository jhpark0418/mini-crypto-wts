import { AppDataSource } from "../data-source.js";
import { CandleEntity } from "@cmp/db";

export type UpsertCandleInput = {
    symbol: string;
    timeframe: string;
    openTime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export async function upsertCandle(input: UpsertCandleInput) {
    const repository = AppDataSource.getRepository(CandleEntity);

    await repository.upsert(
        {
            symbol: input.symbol,
            timeframe: input.timeframe,
            openTime: new Date(input.openTime),
            openPrice: input.open.toString(),
            highPrice: input.high.toString(),
            lowPrice: input.low.toString(),
            closePrice: input.close.toString(),
            volume: input.volume.toString()
        },
        {
            conflictPaths: ["symbol", "timeframe", "openTime"],
            skipUpdateIfNoValuesChanged: false
        }
    );
}