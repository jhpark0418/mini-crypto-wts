import { CandlestickSeries, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react'
import { io } from "socket.io-client";


type TickEvent = {
  eventId: string;
  symbol: string;
  price: number;
  qty: number;
  ts: string;
  source: string;
}

type CandleUpsertedEvent = {
  eventId: string;
  type: "CANDLE_UPSERTED";
  symbol: "BTCUSDT" | "ETHUSDT";
  timeframe: "1m" | "5m" | "1h";
  openTime: string; // ISO
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export default function App() {
  const [connected, setConnected] = useState(false);
  const [tick, setTick] = useState<TickEvent | null>(null);
  const [lastCandle, setLastCandle] = useState<CandleUpsertedEvent | null>(null);

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth || 900,
      height: 420,
      layout: { textColor: "#111" },
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    const series = chart.addSeries(CandlestickSeries);
    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (!chartContainerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = io("http://localhost:3000/ws", {
      transports: ["websocket"]
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("tick", (msg: TickEvent) => setTick(msg));
    socket.on("candle", (candle: CandleUpsertedEvent) => {
      setLastCandle(candle);

      // lightweight-charts는 time을 "초" 단위 UNIX timestamp로 받는 게 가장 깔끔
      const t = Math.floor(new Date(candle.openTime).getTime() / 1000) as UTCTimestamp;

      seriesRef.current?.update({
        time: t,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });
    });

    return () => {
      socket.disconnect();
    }
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>mini-crypto-wts</h2>

      <div>
        WS: <b>{connected ? "CONNECTED" : "DISCONNECTED"}</b>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Tick</h3>
        <div>Symbol: {tick?.symbol ?? "-"}</div>
        <div>Price: {tick ? tick.price.toFixed(2) : "-"}</div>
        <div>Time: {tick?.ts ?? "-"}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Candle (last)</h3>
        <div>Symbol: {lastCandle?.symbol ?? "-"}</div>
        <div>TF: {lastCandle?.timeframe ?? "-"}</div>
        <div>OpenTime: {lastCandle?.openTime ?? "-"}</div>
        <div>
          O/H/L/C:{" "}
          {lastCandle
            ? `${lastCandle.open.toFixed(2)} / ${lastCandle.high.toFixed(2)} / ${lastCandle.low.toFixed(2)} / ${lastCandle.close.toFixed(2)}`
            : "-"}
        </div>
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