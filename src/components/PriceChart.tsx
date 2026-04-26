import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, LineSeries, type IChartApi } from "lightweight-charts";
import * as api from "../api/investApi";
import type { HistoryPoint } from "../types";

const RANGES = [
  { label: "1일", value: "1d" },
  { label: "1주", value: "1w" },
  { label: "1달", value: "1mo" },
  { label: "3달", value: "3mo" },
  { label: "6달", value: "6mo" },
  { label: "1년", value: "1y" },
] as const;

type Range = (typeof RANGES)[number]["value"];

type Props = { symbol: string };

export function PriceChart({ symbol }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [range, setRange] = useState<Range>("1mo");
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // 데이터 로드
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    api.getHistory(symbol, range)
      .then((pts) => { if (!cancelled) setData(pts); })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, range]);

  // 차트 렌더링
  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: dark ? "#94a3b8" : "#475569",
      },
      grid: {
        vertLines: { color: dark ? "#1e293b" : "#f1f5f9" },
        horzLines: { color: dark ? "#1e293b" : "#f1f5f9" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { horzLine: { visible: true }, vertLine: { visible: true } },
      handleScroll: false,
      handleScale: false,
      width: containerRef.current.clientWidth,
      height: 200,
    });
    chartRef.current = chart;

    const series = chart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // 날짜 형식 통일 (YYYY-MM-DD or ISO datetime → UTCTimestamp)
    const isIntraday = data[0]?.date.includes("T");
    const points = data
      .filter((p) => p.close != null)
      .map((p) => ({
        time: (isIntraday
          ? Math.floor(new Date(p.date).getTime() / 1000)
          : p.date) as Parameters<typeof series.setData>[0][number]["time"],
        value: p.close,
      }));

    series.setData(points);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data]);

  return (
    <div style={{ marginTop: "1rem" }}>
      <div className="chart-ranges">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            className={`chart-range-btn${range === r.value ? " chart-range-btn--active" : ""}`}
            onClick={() => setRange(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>
      {loading && <p className="app__meta" style={{ textAlign: "center", padding: "1rem" }}>불러오는 중…</p>}
      <div ref={containerRef} style={{ display: loading ? "none" : "block" }} />
    </div>
  );
}
