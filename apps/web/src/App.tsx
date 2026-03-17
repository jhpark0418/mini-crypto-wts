import { type UTCTimestamp } from 'lightweight-charts';
import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from "socket.io-client";
import { useCandleChart } from './hooks/useCandleChart';
import { API_BASE_URL, fetchActiveCandle, fetchCandleHistory, fetchOrderbook } from './market/api';
import { BINANCE_TIMEFRAMES, SYMBOLS, type CandleTimeframe, type CandleEvent, type Symbol, type TickEvent, type OrderbookLevel, type OrderbookSnapshotEvent } from '@wts/common';
import { type ActiveCandle, type CandleHistoryItem } from './market/types';

const TIMEFRAME_MS: Record<CandleTimeframe, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "12h": 12 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
}

type OrderbookRow = OrderbookLevel & {
  totalQty: number;
  depthRatio: number;
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol>("BTCUSDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState<CandleTimeframe>("1m");

  const selectedSymbolRef = useRef<Symbol>(selectedSymbol);
  const selectedTimeframeRef = useRef<CandleTimeframe>(selectedTimeframe);
  const orderbookRef = useRef<OrderbookSnapshotEvent | null>(null);

  const [tick, setTick] = useState<TickEvent | null>(null);
  const [lastCandle, setLastCandle] = useState<CandleHistoryItem | null>(null);
  const [orderbook, setOrderbook] = useState<OrderbookSnapshotEvent | null>(null);
  
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

  function withCumulativeQty(levels: OrderbookLevel[]): OrderbookRow[] {
    let total = 0;
    

    const rows = levels.map((level) => {
      total += level.qty;
      return {
        ...level,
        totalQty: total,
        depthRatio: 0
      };
    });

    const maxTotalQty = rows.length > 0 ? rows[rows.length -1].totalQty : 0;

    return rows.map((row) => ({
      ...row,
      depthRatio: maxTotalQty > 0 ? row.totalQty / maxTotalQty : 0
    }));
  }

  function applyOrderbookIfNewer(
    next: OrderbookSnapshotEvent,
    currentSymbol: Symbol,
    orderbookRef: { current: OrderbookSnapshotEvent | null },
    setOrderbook: (v: OrderbookSnapshotEvent) => void
  ) {
    if (next.symbol !== currentSymbol) return;

    const current = orderbookRef.current;

    if (!current || next.ts > current.ts) {
      orderbookRef.current = next;
      setOrderbook(next);
    }
  }

  function applyActiveCandleIfCurrent(next: ActiveCandle) {
    if (next.symbol !== selectedSymbolRef.current) return;
    if (next.timeframe !== selectedTimeframeRef.current) return;

    const current = activeCandleRef.current;

    if (current && next.openTime < current.openTime) {
      return;
    }

    activeCandleRef.current = next;
    updateSeriesFromCandle(next);
    setLastCandle({...next});
  }

  function applyTickToActiveCandle(tick: TickEvent) {
    const active = activeCandleRef.current;
    if (!active) return;
    if (active.symbol !== tick.symbol) return;
    if (active.timeframe !== selectedTimeframeRef.current) return;

    const tickMs = new Date(tick.ts).getTime();
    if (tickMs < active.openTime || tickMs > active.closeTime) return;

    const next: ActiveCandle = {
      ...active,
      high: Math.max(active.high, tick.price),
      low: Math.min(active.low, tick.price),
      close: tick.price,
      volume: active.volume + (tick.qty ?? 0)
    };

    activeCandleRef.current = next;
    updateSeriesFromCandle(next);
    setLastCandle({...next});
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
        const [candles, activeSnapshot] = await Promise.all([
          fetchCandleHistory(selectedSymbol, selectedTimeframe, 200),
          fetchActiveCandle(selectedSymbol, selectedTimeframe)
        ]);

        if (cancelled || !seriesRef.current) return;

        const chartData = candles.map((item) => ({
          time: Math.floor(new Date(item.openTime).getTime() / 1000) as UTCTimestamp,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }));
        
        if (activeSnapshot) {
          const activeTime = Math.floor(new Date(activeSnapshot.openTime).getTime() / 1000) as UTCTimestamp;
          const activeBar = {
            time: activeTime,
            open: activeSnapshot.open,
            high: activeSnapshot.high,
            low: activeSnapshot.low,
            close: activeSnapshot.close
          };

          const lastChartBar = chartData[chartData.length - 1];

          if (lastChartBar && lastChartBar.time === activeTime) {
            chartData[chartData.length - 1] = activeBar;
          } else {
            chartData.push(activeBar);
          }
        }
        
        seriesRef.current.setData(chartData);

        const lastChartBar = chartData[chartData.length - 1];
        lastChartTimeRef.current = lastChartBar ? Number(lastChartBar.time) : null;

        const last = candles[candles.length - 1];
        
        const lastLoadedCandle = last
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
          : null;

        const activeLoadedCandle = activeSnapshot
          ? {
            symbol: activeSnapshot.symbol,
            timeframe: activeSnapshot.timeframe,
            openTime: new Date(activeSnapshot.openTime).getTime(),
            closeTime: new Date(activeSnapshot.closeTime).getTime(),
            open: activeSnapshot.open,
            high: activeSnapshot.high,
            low: activeSnapshot.low,
            close: activeSnapshot.close,
            volume: activeSnapshot.volume,
          }
          : null;

        setLastCandle(activeLoadedCandle ?? lastLoadedCandle);
        activeCandleRef.current = activeLoadedCandle ?? lastLoadedCandle;

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
    let cancelled = false;

    (async () => {
      try {
        const snapshot = await fetchOrderbook(selectedSymbol);

        if (cancelled) return;

        applyOrderbookIfNewer(snapshot, selectedSymbolRef.current, orderbookRef, setOrderbook);

      } catch (error) {
        console.error("failed to load orderbook snapshot:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol]);

  useEffect(() => {
    const socket = io(`${API_BASE_URL}/ws`, {
      transports: ["websocket"]
    });

    socket.on("connect", async () => {
      setConnected(true);

      try {
        const snapshot = await fetchOrderbook(selectedSymbolRef.current);

        applyOrderbookIfNewer(snapshot, selectedSymbolRef.current, orderbookRef, setOrderbook);

      } catch (error) {
        console.error("failed to refresh orderbook after reconnect:", error);
      }
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("tick", (msg: TickEvent) => {
      if (msg.symbol !== selectedSymbolRef.current) return;
      // if (Math.random() < 0.01) {
      //   console.log(`[trace][web-tick] symbol=${msg.symbol} lagMs=${Date.now() - new Date(msg.ts).getTime()}`);
      // }

      setTick(msg);
      applyTickToActiveCandle(msg);
    });

    socket.on("candle", (event: CandleEvent) => {
      if (event.symbol !== selectedSymbolRef.current) return;
      if (event.timeframe !== selectedTimeframeRef.current) return;
      if (isHistoryLoadingRef.current) return;

      const candle = toDisplayCandle(event);
      
      applyActiveCandleIfCurrent(candle);
      // if (!applied) return;

      // if (event.type === "CANDLE_OPENED") {
      //   activeCandleRef.current = candle;
      // } else {
      //   const active = activeCandleRef.current;

      //   if (
      //     active &&
      //     active.symbol === event.symbol &&
      //     active.timeframe === event.timeframe &&
      //     active.openTime === event.openTime
      //   ) {
      //     activeCandleRef.current = null;
      //   }
      // }
    });

    socket.on("orderbook", (msg: OrderbookSnapshotEvent) => {
      if (msg.symbol !== selectedSymbolRef.current) return;

      // if (Math.random() < 0.02) {
      //   console.log(`[trace][web-orderbook] symbol=${msg.symbol} bids=${msg.bids.length} asks=${msg.asks.length}`);
      // }

      applyOrderbookIfNewer(msg, selectedSymbolRef.current, orderbookRef, setOrderbook);

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

  useEffect(() => {
    orderbookRef.current = null;
    setOrderbook(null);
  }, [selectedSymbol]);

  const tickPriceText = useMemo(() => {
    return tick ? tick.price.toFixed(2) : "-";
  }, [tick]);

  const askRows = useMemo(() => {
    if (!orderbook) return [];
    return withCumulativeQty([...orderbook.asks].slice(0, 10).reverse());
  }, [orderbook]);

  const bidRows = useMemo(() => {
    if (!orderbook) return [];
    return withCumulativeQty(orderbook.bids.slice(0, 10));
  }, [orderbook]);

  const bestAsk = orderbook?.asks?.[0]?.price ?? null;
  const bestBid = orderbook?.bids?.[0]?.price ?? null;
  const spread = bestAsk !== null && bestBid !== null ? bestAsk - bestBid : null;

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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          gap: 16,
          marginTop: 16,
          alignItems: "start",
        }}
      >
        <div>
          <h3>Chart</h3>
          <div
            ref={chartContainerRef}
            style={{
              width: "100%",
              height: 420,
              border: "1px solid #ddd",
              borderRadius: 12,
              overflow: "hidden",
            }}
          />
        </div>

        <div>
          <h3>Orderbook</h3>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                padding: "12px 14px",
                fontWeight: 700,
                borderBottom: "1px solid #eee",
                background: "#fafafa",
              }}
            >
              <div>Price</div>
              <div style={{ textAlign: "right" }}>Qty</div>
              <div style={{ textAlign: "right" }}>Total</div>
            </div>

            <div style={{ padding: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#b91c1c" }}>
                ASKS
              </div>

              {askRows.length === 0 ? (
                <div style={{ padding: "8px 6px", color: "#666" }}>No ask data</div>
              ) : (
                askRows.map((row, idx) => (
                  <div
                    key={`ask-${idx}-${row.price}`}
                    style={{
                      position: "relative",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      padding: "6px 6px",
                      fontSize: 13,
                      borderBottom: "1px solid #f5f5f5",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: `${row.depthRatio * 100}%`,
                        background: "rgba(220, 38, 38, 0.10)",
                        pointerEvents: "none",
                      }}
                    />
                
                    <div style={{ color: "#dc2626", position: "relative", zIndex: 1 }}>
                      {row.price.toFixed(2)}
                    </div>
                    <div style={{ textAlign: "right", position: "relative", zIndex: 1 }}>
                      {row.qty.toFixed(6)}
                    </div>
                    <div style={{ textAlign: "right", color: "#666", position: "relative", zIndex: 1 }}>
                      {row.totalQty.toFixed(6)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderTop: "1px solid #eee",
                borderBottom: "1px solid #eee",
                background: "#fafafa",
              }}
            >
              <div style={{ fontSize: 12, color: "#666" }}>Spread</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {spread !== null ? spread.toFixed(2) : "-"}
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                Best Bid: {bestBid !== null ? bestBid.toFixed(2) : "-"}
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                Best Ask: {bestAsk !== null ? bestAsk.toFixed(2) : "-"}
              </div>
            </div>

            <div style={{ padding: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#1d4ed8" }}>
                BIDS
              </div>

              {bidRows.length === 0 ? (
                <div style={{ padding: "8px 6px", color: "#666" }}>No bid data</div>
              ) : (
                bidRows.map((row, idx) => (
                  <div
                    key={`bid-${idx}-${row.price}`}
                    style={{
                      position: "relative",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      padding: "6px 6px",
                      fontSize: 13,
                      borderBottom: "1px solid #f5f5f5",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: `${row.depthRatio * 100}%`,
                        background: "rgba(37, 99, 235, 0.10)",
                        pointerEvents: "none",
                      }}
                    />
                
                    <div style={{ color: "#2563eb", position: "relative", zIndex: 1 }}>
                      {row.price.toFixed(2)}
                    </div>
                    <div style={{ textAlign: "right", position: "relative", zIndex: 1 }}>
                      {row.qty.toFixed(6)}
                    </div>
                    <div style={{ textAlign: "right", color: "#666", position: "relative", zIndex: 1 }}>
                      {row.totalQty.toFixed(6)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
            Snapshot Time: {orderbook?.ts ?? "-"}
          </div>
        </div>
      </div>
    </div>
  );
}