import { CandlestickSeries, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from "socket.io-client";

type SymbolType = "BTCUSDT" | "ETHUSDT";
type Timeframe = "10s" | "30s" | "1m" | "5m" | "15m" | "30m" | "1h";

type TickEvent = {
  eventId: string;
  symbol: SymbolType;
  price: number;
  qty: number;
  ts: string;
  source: string;
}

type CandleUpsertedEvent = {
  eventId: string;
  type: "CANDLE_UPSERTED";
  symbol: SymbolType;
  timeframe: Timeframe;
  openTime: string; // ISO
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const SYMBOLS: SymbolType[] = ["BTCUSDT", "ETHUSDT"];
const TIMEFRAMES: Timeframe[] = ["10s", "30s", "1m", "5m", "15m", "30m", "1h"];

export default function App() {
  const [connected, setConnected] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolType>("BTCUSDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("1m");

  const [tick, setTick] = useState<TickEvent | null>(null);
  const [lastCandle, setLastCandle] = useState<CandleUpsertedEvent | null>(null);

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const candleMapRef = useRef<Map<string, CandleUpsertedEvent>>(new Map());

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth || 900,
      height: 420,
      layout: {
        textColor: "#111",
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: selectedTimeframe === "10s" || selectedTimeframe === "30s",
      },
      grid: {
        vertLines: { visible: true },
        horzLines: { visible: true },
      },
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

  // timeframe 바뀌면 secondsVisible 옵션 갱신
  useEffect(() => {
    chartRef.current?.applyOptions({
      timeScale: {
        timeVisible: true,
        secondsVisible: selectedTimeframe === "10s" || selectedTimeframe === "30s"
      }
    })
  }, [selectedTimeframe]);

  useEffect(() => {
    const socket = io("http://localhost:3000/ws", {
      transports: ["websocket"]
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("tick", (msg: TickEvent) => {
      if (msg.symbol !== selectedSymbol) return;
      setTick(msg);
    });

    socket.on("candle", (candle: CandleUpsertedEvent) => {
      if (candle.symbol !== selectedSymbol) return;
      if (candle.timeframe !== selectedTimeframe) return;

      setLastCandle(candle);

      const key = `${candle.symbol}|${candle.timeframe}|${candle.openTime}`;
      candleMapRef.current.set(key, candle);

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
      socketRef.current = null;
    };
  }, [selectedSymbol, selectedTimeframe]);

  useEffect(() => {
    if (!seriesRef.current) return;

    const candles = Array.from(candleMapRef.current.values())
      .filter((c) => c.symbol === selectedSymbol && c.timeframe === selectedTimeframe)
      .sort((a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime())
      .map((c) => ({
        time: Math.floor(new Date(c.openTime).getTime() / 1000) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }));

      seriesRef.current.setData(candles);
  }, [selectedSymbol, selectedTimeframe]);

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