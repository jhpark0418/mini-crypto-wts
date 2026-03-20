import { CandleTimeframe, Symbol } from "@cmp/common";
import { CandleState } from "../candle/candle.types.js";
import { AppDataSource } from "../db/data-source.js";
import { CandleEntity } from "@cmp/db";
import { timeframeToMs } from "../candle/candle.util.js";

export async function restoreActiveState(
    symbol: Symbol,
    timeframe: CandleTimeframe
): Promise<CandleState | null> {
    const repo = AppDataSource.getRepository(CandleEntity);

    const latest = await repo.findOne({
        where: { symbol, timeframe },
        order: { openTime: "DESC" }
    });

    if (!latest) return null;

    const openTimeMs = new Date(latest.openTime).getTime();
    const intervalMs = timeframeToMs(timeframe);
    const closeTimeMs = openTimeMs + intervalMs - 1;
    const nowMs = Date.now();

    if (nowMs < openTimeMs || nowMs > closeTimeMs) {
        return null;
    }

    return {
        symbol,
        timeframe,
        intervalMs,
        openTimeMs,
        openTime: new Date(openTimeMs).toISOString(),
        open: Number(latest.openPrice),
        high: Number(latest.highPrice),
        low: Number(latest.lowPrice),
        close: Number(latest.closePrice),
        volume: Number(latest.volume),
        trades: 0,
        lastTickMs: nowMs,
        dirty: true,
    }
}