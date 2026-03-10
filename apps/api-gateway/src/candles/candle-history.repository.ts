import { Candle, Timeframe } from "./candle.types";

export interface CandleHistoryRepository {
    save(candle: Candle): Promise<void>;

    findLastes(params: {
        symbol: Candle["symbol"];
        timeframe: Timeframe;
        limit: number;
    }): Promise<Candle[]>;
}