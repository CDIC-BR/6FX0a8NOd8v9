"use client";

import { useEffect, useRef } from "react";
import type { EChartsOption } from "echarts";

export default function EChart({ option, height = 280 }: { option: EChartsOption; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let chart: import("echarts").ECharts | null = null;
    let observer: ResizeObserver | null = null;

    (async () => {
      const echarts = await import("echarts");
      if (!ref.current || disposed) return;
      chart = echarts.init(ref.current, undefined, { renderer: "svg" });
      chart.setOption(option, true);
      observer = new ResizeObserver(() => chart?.resize());
      observer.observe(ref.current);
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
      chart?.dispose();
    };
  }, [option]);

  return <div ref={ref} style={{ width: "100%", height }} aria-label="Gráfico do painel" />;
}
