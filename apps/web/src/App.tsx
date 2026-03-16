import { type UTCTimestamp } from 'lightweight-charts';
import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from "socket.io-client";
import { useCandleChart } from './hooks/useCandleChart';
import { API_BASE_URL, fetchCandleHistory } from './market/api';
import { BINANCE_TIMEFRAMES, SYMBOLS, type CandleTimeframe, type CandleEvent, type Symbol, type TickEvent } from '@wts/common';
import { type ActiveCandle, type CandleHistoryItem } from './market/types';

const TIMEFRAME_MS: Record<CandleTimeframe, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "12h": 12 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol>("BTCUSDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState<CandleTimeframe>("1m");

  const selectedSymbolRef = useRef<Symbol>(selectedSymbol);
  const selectedTimeframeRef = useRef<CandleTimeframe>(selectedTimeframe);

  const [tick, setTick] = useState<TickEvent | null>(null);
  const [lastCandle, setLastCandle] = useState<CandleHistoryItem | null>(null);
  
  const { chartContainerRef, chartRef, seriesRef } = useCandleChart(selectedTimeframe);
  
  const activeCandleRef = useRef<ActiveCandle | null>(null);
  const lastChartTimeRef = useRef<number | null>(null);
  const isHistoryLoadingRef = useRef(false);

  function toDisplayCandle(event: CandleEvent): ActiveCandle {
    if (event.type === "CANDLE_OPENED") {
      return {
        symbol: event.symbol,
        timeframe: event.timeframe,
        openTime: event.openTime,
        closeTime: event.closeTime,
        open: event.open,
        high: event.open,
        low: event.open,
        close: event.open,
        volume: 0,
      };
    }
  
    return {
      symbol: event.symbol,
      timeframe: event.timeframe,
      openTime: event.openTime,
      closeTime: event.closeTime,
      open: event.open,
      high: event.high,
      low: event.low,
      close: event.close,
      volume: event.volume,
    };
  }
  
  function updateSeriesFromCandle(candle: ActiveCandle) {
    const t = Math.floor(candle.openTime / 1000) as UTCTimestamp;
  
    seriesRef.current?.update({
      time: t,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    });
  
    lastChartTimeRef.current = t;
  }

  useEffect(() => {
    selectedSymbolRef.current = selectedSymbol;
    selectedTimeframeRef.current = selectedTimeframe;
  }, [selectedSymbol, selectedTimeframe]);
  
  useEffect(() => {
    if (!seriesRef.current) return;

    let cancelled = false;
    isHistoryLoadingRef.current = true;

    (async () => {
      try {
        const candles = await fetchCandleHistory(selectedSymbol, selectedTimeframe, 200);

        if (cancelled || !seriesRef.current) return;

        seriesRef.current.setData(
          candles.map((item) => ({
            time: Math.floor(new Date(item.openTime).getTime() / 1000) as UTCTimestamp,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
          }))
        );

        const last = candles[candles.length - 1];
        lastChartTimeRef.current = last 
          ? Math.floor(new Date(last.openTime).getTime() / 1000)
          : null;

        setLastCandle(
          last
            ? {
                symbol: last.symbol,
                timeframe: last.timeframe,
                openTime: new Date(last.openTime).getTime(),
                closeTime: new Date(last.openTime).getTime() + TIMEFRAME_MS[last.timeframe] - 1,
                open: last.open,
                high: last.high,
                low: last.low,
                close: last.close,
                volume: last.volume,
              }
            : null
        );

        activeCandleRef.current = null;

      } catch (error) {
        console.error("failed to load candle history:", error);

        if (!cancelled && seriesRef.current) {
          seriesRef.current.setData([]);
          lastChartTimeRef.current = null;

          requestAnimationFrame(() => {
            if (!cancelled) {
              chartRef.current?.timeScale().fitContent();
            }
          });
        }
      } finally {
        if (!cancelled) {
          isHistoryLoadingRef.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, selectedTimeframe, chartRef, seriesRef]);

  useEffect(() => {
    const socket = io(`${API_BASE_URL}/ws`, {
      transports: ["websocket"]
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("tick", (msg: TickEvent) => {
      if (msg.symbol !== selectedSymbolRef.current) return;
      if (Math.random() < 0.01) {
        console.log(`[trace][web-tick] symbol=${msg.symbol} lagMs=${Date.now() - new Date(msg.ts).getTime()}`);
      }

      setTick(msg);

      const active = activeCandleRef.current;
      if (!active) return;
      if (active.symbol !== msg.symbol) return;
      if (active.timeframe !== selectedTimeframeRef.current) return;

      const tickMs = new Date(msg.ts).getTime();

      // 현재 활성 봉 구간 안에 있는 tick만 반영
      if (tickMs < active.openTime || tickMs > active.closeTime) return;

      active.high = Math.max(active.high, msg.price);
      active.low = Math.min(active.low, msg.price);
      active.close = msg.price;
      active.volume += msg.qty ?? 0;

      seriesRef.current?.update({
        time: Math.floor(active.openTime / 1000) as UTCTimestamp,
        open: active.open,
        high: active.high,
        low: active.low,
        close: active.close
      });

      setLastCandle({...active});
    });

    socket.on("candle", (event: CandleEvent) => {
      if (event.symbol !== selectedSymbolRef.current) return;
      if (event.timeframe !== selectedTimeframeRef.current) return;
      if (isHistoryLoadingRef.current) return;

      const candle = toDisplayCandle(event);
      updateSeriesFromCandle(candle);

      if (event.type === "CANDLE_OPENED") {
        activeCandleRef.current = candle;
      } else {
        const active = activeCandleRef.current;
        if (
          active &&
          active.symbol === event.symbol &&
          active.timeframe === event.timeframe &&
          active.openTime === event.openTime
        ) {
          activeCandleRef.current = null;
        }

        setLastCandle(candle);
      }

      // if (candle.symbol !== selectedSymbolRef.current) return;
      // if (candle.timeframe !== selectedTimeframeRef.current) return;
      // if (isHistoryLoadingRef.current) return;

      // const recvLagMs = Date.now() - candle.openTime;
      // const t = Math.floor(candle.openTime / 1000) as UTCTimestamp;
      // const lastTime = lastChartTimeRef.current;

      // if (lastTime !== null && t < lastTime) return;

      // if (Math.random() < 0.05) {
      //   console.log(`[trace][web-candle] symbol=${candle.symbol} tf=${candle.timeframe} recvLagFromOpenMs=${recvLagMs}`);
      // }

      // setLastCandle(candle);

      // const updateStart = performance.now();

      // seriesRef.current?.update({
      //   time: t,
      //   open: candle.open,
      //   high: candle.high,
      //   low: candle.low,
      //   close: candle.close,
      // });

      // const updateCost = performance.now() - updateStart;
      // if (updateCost > 3) {
      //   console.log(`[trace][web-chart-update] symbol=${candle.symbol} tf=${candle.timeframe} costMs=${updateCost.toFixed(2)}`);
      // }

      // lastChartTimeRef.current = t;
    });

    return () => {
      socket.disconnect();
    };
  }, [seriesRef]);

  useEffect(() => {
    setTick(null);
    setLastCandle(null);
    activeCandleRef.current = null;
    lastChartTimeRef.current = null;
    seriesRef.current?.setData([]);
  }, [selectedSymbol, selectedTimeframe, seriesRef]);

  const tickPriceText = useMemo(() => {
    return tick ? tick.price.toFixed(2) : "-";
  }, [tick]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>mini-crypto-wts</h2>

      <div>
        WS: <b>{connected ? "CONNECTED" : "DISCONNECTED"}</b>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <div>
          <label>Symbol </label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value as Symbol)}
          >
            {SYMBOLS.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Timeframe </label>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as CandleTimeframe)}
          >
            {BINANCE_TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Tick</h3>
        <div>Symbol: {tick?.symbol ?? "-"}</div>
        <div>Price: {tickPriceText}</div>
        <div>Time: {tick?.ts ?? "-"}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Last Candle</h3>
        <div>Symbol: {lastCandle?.symbol ?? "-"}</div>
        <div>TF: {lastCandle?.timeframe ?? "-"}</div>
        <div>OpenTime: {lastCandle ? new Date(lastCandle.openTime).toISOString() : "-"}</div>
        <div>
          O/H/L/C:{" "}
          {lastCandle
            ? `${lastCandle.open.toFixed(2)} / ${lastCandle.high.toFixed(2)} / ${lastCandle.low.toFixed(2)} / ${lastCandle.close.toFixed(2)}`
            : "-"}
        </div>
        <div>Volume: {lastCandle ? lastCandle.volume.toFixed(4) : "-"}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Chart</h3>
        <div
          ref={chartContainerRef}
          style={{
            width: "100%",
            maxWidth: 1000,
            height: 420,
            border: "1px solid #ddd",
            borderRadius: 12,
            overflow: "hidden",
          }}
        />
      </div>
    </div>
  );
}