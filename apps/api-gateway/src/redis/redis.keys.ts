import { CandleTimeframe, Symbol } from "@wts/common";

export const redisKeys = {
    activeCandle: (symbol: Symbol, timeframe: CandleTimeframe) => 
        `active-candle:${symbol}:${timeframe}`,

    orderbook: (symbol: Symbol) =>
        `orderbook:${symbol}`
};