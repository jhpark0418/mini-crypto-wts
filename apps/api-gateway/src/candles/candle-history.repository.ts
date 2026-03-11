import { Candle } from "./candle.types";
import { Symbol, CandleTimeframe } from "@wts/common";

export interface CandleHistoryRepository {
    save(candle: Candle): Promise<void>;

    findLastes(params: {
        symbol: Candle["symbol"];
        timeframe: CandleTimeframe;
        limit: number;
    }): Promise<Candle[]>;

    seed(symbol: Symbol, timeframe: CandleTimeframe, candles: Candle[]): Promise<void>;

    appendOrReplace(candle: Candle): Promise<void>;

    find(params: {
        symbol: Symbol;
        timeframe: CandleTimeframe;
        limit?: number;
    }): Promise<Candle[]>;
}