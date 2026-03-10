
export const TIMEFRAMES = ["10s", "30s", "1m", "5m", "15m", "30m", "1h"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const SYMBOLS = ["BTCUSDT", "ETHUSDT"] as const;
export type SymbolType = (typeof SYMBOLS)[number];

export type Candle = {
    symbol: SymbolType;
    timeframe: Timeframe;
    openTime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}