import { Symbol } from "@wts/common";

export const TIMEFRAMES = ["10s", "30s", "1m", "5m", "15m", "30m", "1h"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export type CandleState = {
    symbol: Symbol;
    timeframe: Timeframe;
    intervalMs: number;      // 버킷 계산용
    openTimeMs: number;      // 내부 계산용
    openTime: string;        // 외부 표시용
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    trades: number;          // 틱 개수
    lastTickMs: number;      // 마지막 틱 시간(타이머 fulsh 판단용)
  };