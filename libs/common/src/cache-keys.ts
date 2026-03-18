import { CandleTimeframe, Symbol } from "./market.js";

export const cacheKeys = {
    activeCandle: (symbol: Symbol, timeframe: CandleTimeframe) => 
        `active-candle:${symbol}:${timeframe}`,

    orderbook: (symbol: Symbol) =>
        `orderbook:${symbol}`
};