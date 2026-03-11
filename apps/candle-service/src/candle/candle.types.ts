import { CandleTimeframe, Symbol } from "@wts/common";

export type CandleState = {
    symbol: Symbol;
    timeframe: CandleTimeframe;
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