import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, createChart, type IChartApi, type ISeriesApi } from "lightweight-charts";
import type { CandleTimeframe } from "@cmp/common";

type CandleTooltip = {
    x: number;
    y: number;
    open: number;
    high: number;
    low: number;
    close: number;
    visible: boolean;
} | null;

export function useCandleChart(selectedTimeframe: CandleTimeframe) {
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const [tooltip, setTooltip] = useState<CandleTooltip>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const container = chartContainerRef.current;

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
                secondsVisible: false,
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

        chart.subscribeCrosshairMove((param) => {
            if (!param.point || !param.time) {
                setTooltip(null);
                return;
            }

            const data = param.seriesData.get(series);
            if (!data || !("open" in data) || !("high" in data) || !("low" in data) || !("close" in data)) {
                setTooltip(null);
                return;
            }

            const tooltipWidth = 150;
            const tooltipHeight = 86;
            const margin = 12;

            let x = param.point.x + margin;
            let y = param.point.y + margin;

            if (x + tooltipWidth > container.clientWidth) {
                x = param.point.x - tooltipWidth - margin;
            }

            if (y + tooltipHeight > container.clientHeight) {
                y = param.point.y - tooltipHeight - margin;
            }

            if (x < 0) x = 8;
            if (y < 0) y = 8;

            setTooltip({
                x,
                y,
                open: data.open,
                high: data.high,
                low: data.low,
                close: data.close,
                visible: true
            });
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
        selectedTimeframe === "1m" ? 10 :
        selectedTimeframe === "5m" ? 9 :
        8;
    
        chartRef.current?.applyOptions({
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 6,
                barSpacing,
                minBarSpacing: 4,
            }
        });
    }, [selectedTimeframe]);

    return {
        chartContainerRef,
        chartRef,
        seriesRef,
        tooltip
    };
}