import { BINANCE_TIMEFRAMES, CandleTimeframe, Symbol, SYMBOLS } from "./market";

export function isValidSymbol(value: string): value is Symbol {
    return (SYMBOLS as readonly string[]).includes(value);
}

export function isValidTimeframe(value: string): value is CandleTimeframe {
    return (BINANCE_TIMEFRAMES as readonly string[]).includes(value);
}