import { CandleTimeframe, Symbol } from "@cmp/common";

export type Candle = {
    symbol: Symbol;
    timeframe: CandleTimeframe;
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;
}