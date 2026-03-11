import { CandleTimeframe } from "@wts/common";

export function toMs(ts: string) {
    const ms = Date.parse(ts);
    if (Number.isNaN(ms)) throw new Error(`Invalid timestamp: ${ts}`);
    return ms;
}

export function toIso(ms: number): string {
    return new Date(ms).toISOString();
}

export function timeframeToMs(tf: CandleTimeframe): number {
    const n = Number(tf.slice(0, -1));
    const unit = tf.slice(-1);

    if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid timeframe: ${tf}`);
    
    if (unit === "s") return n * 1000;
    if (unit === "m") return n * 1000 * 60;
    if (unit === "h") return n * 1000 * 60 * 60;
    if (unit === "d") return n * 1000 * 60 * 60 * 24;
    if (unit === "w") return n * 1000 * 60 * 60 * 24 * 7;

    throw new Error(`Invalid timeframe unit: ${tf}`);
}

export function bucketStartMs(tsMs: number, intervalMs: number) {
    return Math.floor(tsMs / intervalMs) * intervalMs;
}

export function stateKey(symbol: Symbol, timeframe: string) {
    return `${symbol}|${timeframe}`;
}