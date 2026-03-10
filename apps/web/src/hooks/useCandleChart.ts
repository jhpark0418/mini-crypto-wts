import { useEffect, useRef } from "react";
import type { Timeframe } from "../market/types";
import { CandlestickSeries, createChart, type IChartApi, type ISeriesApi } from "lightweight-charts";

export function useCandleChart(selectedTimeframe: Timeframe) {
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth || 900,
            height: 420,
            layout: {
            textColor: "#111",
            background: { color: "#ffffff" },
            },
            grid: {
            vertLines: { visible: true, color: "#f0f3fa" },
            horzLines: { visible: true, color: "#f0f3fa" },
            },
            crosshair: {
            mode: 1,
            },
            rightPriceScale: {
            borderVisible: true,
            autoScale: true,
            scaleMargins: {
                top: 0.15,
                bottom: 0.15,
            },
            },
            timeScale: {
            timeVisible: true,
            secondsVisible: selectedTimeframe === "10s" || selectedTimeframe === "30s",
            borderVisible: true,
            rightOffset: 6,
            barSpacing: 12,
            minBarSpacing: 6,
            fixLeftEdge: false,
            fixRightEdge: false,
            lockVisibleTimeRangeOnResize: false,
            },
            handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true,
            },
            handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            priceLineVisible: true,
            lastValueVisible: true,
        });

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
        const barSpacing =
        selectedTimeframe === "10s" ? 14 :
        selectedTimeframe === "30s" ? 12 :
        selectedTimeframe === "1m" ? 10 :
        8;
    
        chartRef.current?.applyOptions({
        timeScale: {
            timeVisible: true,
            secondsVisible: selectedTimeframe === "10s" || selectedTimeframe === "30s",
            rightOffset: 6,
            barSpacing,
            minBarSpacing: 4,
        }
        });
    }, [selectedTimeframe]);

    return {
        chartContainerRef,
        chartRef,
        seriesRef
    };
}