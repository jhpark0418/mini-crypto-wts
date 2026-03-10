import { type UTCTimestamp } from 'lightweight-charts';
import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from "socket.io-client";
import { useCandleChart } from './hooks/useCandleChart';
import { API_BASE_URL, fetchCandleHistory } from './market/api';
import { 
  SYMBOLS, 
  TIMEFRAMES, 
  type CandleUpsertedEvent, 
  type SymbolType, 
  type TickEvent, 
  type Timeframe 
} from './market/types';

export default function App() {
  const [connected, setConnected] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolType>("BTCUSDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("1m");

  const selectedSymbolRef = useRef<SymbolType>(selectedSymbol);
  const selectedTimeframeRef = useRef<Timeframe>(selectedTimeframe);

  const [tick, setTick] = useState<TickEvent | null>(null);
  const [lastCandle, setLastCandle] = useState<CandleUpsertedEvent | null>(null);

  const { chartContainerRef, chartRef, seriesRef } = useCandleChart(selectedTimeframe);

  const lastChartTimeRef = useRef<number | null>(null);
  const isHistoryLoadingRef = useRef(false);

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

        seriesRef.current.setData(candles);

        const last = candles[candles.length - 1];
        lastChartTimeRef.current = last ? Number(last.time) : null;

        requestAnimationFrame(() => {
          if (cancelled) return;
          chartRef.current?.timeScale().fitContent();
          seriesRef.current?.priceScale().applyOptions({
            autoScale: true,
            scaleMargins: {
              top: 0.15,
              bottom: 0.15
            }
          });
        });

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
      setTick(msg);
    });

    socket.on("candle", (candle: CandleUpsertedEvent) => {
      if (candle.symbol !== selectedSymbolRef.current) return;
      if (candle.timeframe !== selectedTimeframeRef.current) return;
      if (isHistoryLoadingRef.current) return;

      const t = Math.floor(new Date(candle.openTime).getTime() / 1000);
      const lastTime = lastChartTimeRef.current;

      if (lastTime !== null && t < lastTime) return;

      setLastCandle(candle);

      seriesRef.current?.update({
        time: t as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });

      lastChartTimeRef.current = t;
    });

    return () => {
      socket.disconnect();
    };
  }, [seriesRef]);

  useEffect(() => {
    setTick(null);
    setLastCandle(null);
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
            onChange={(e) => setSelectedSymbol(e.target.value as SymbolType)}
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
            onChange={(e) => setSelectedTimeframe(e.target.value as Timeframe)}
          >
            {TIMEFRAMES.map((tf) => (
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
        <div>OpenTime: {lastCandle?.openTime ?? "-"}</div>
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