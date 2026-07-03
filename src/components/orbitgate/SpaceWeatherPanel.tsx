"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudLightning, AlertTriangle } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SolarWindMetric {
  label: string;
  value: number;
  unit: string;
  history: number[];
  decimals: number;
  color: string;
  colorForValue?: (v: number) => string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function kpColor(kp: number): string {
  if (kp < 3) return "#22c55e";
  if (kp < 5) return "#eab308";
  return "#ef4444";
}

function kpBandColor(kp: number): string {
  if (kp < 2) return "#22c55e";
  if (kp < 3) return "#84cc16";
  if (kp < 5) return "#eab308";
  return "#ef4444";
}

function randomWalk(current: number, max: number, min: number, step: number): number {
  const delta = (Math.random() - 0.5) * 2 * step;
  return Math.max(min, Math.min(max, current + delta));
}

function trendArrow(history: number[]): string {
  if (history.length < 2) return "→";
  const diff = history[history.length - 1] - history[history.length - 2];
  if (Math.abs(diff) < 0.01) return "→";
  return diff > 0 ? "↑" : "↓";
}

function trendColor(history: number[], baseColor: string): string {
  if (history.length < 2) return baseColor;
  const diff = history[history.length - 1] - history[history.length - 2];
  if (Math.abs(diff) < 0.01) return baseColor;
  return diff > 0 ? "#22c55e" : "#ef4444";
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

function SparklineSVG({ values, color, width = 80, height = 28 }: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${width - padding},${height - padding} L${padding},${height - padding} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <defs>
        <linearGradient id={`spark-grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-grad-${color.replace("#", "")})`} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Kp Gauge SVG ─────────────────────────────────────────────────────────────

function KpGauge({ kp }: { kp: number }) {
  const cx = 100;
  const cy = 100;
  const r = 80;
  const startAngle = -180;
  const endAngle = 0;

  function polarToCartesian(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  const bandWidth = endAngle - startAngle; // 180 degrees
  const needleAngle = startAngle + (Math.min(kp, 9) / 9) * bandWidth;
  const needlePos = polarToCartesian(needleAngle);

  // Build color arc segments
  const segments = [
    { from: 0, to: 2, color: "#22c55e" },
    { from: 2, to: 3, color: "#84cc16" },
    { from: 3, to: 4, color: "#eab308" },
    { from: 4, to: 5, color: "#f97316" },
    { from: 5, to: 7, color: "#ef4444" },
    { from: 7, to: 9, color: "#dc2626" },
  ];

  const arcPaths = segments.map((seg) => {
    const a1 = startAngle + (seg.from / 9) * bandWidth;
    const a2 = startAngle + (seg.to / 9) * bandWidth;
    const p1 = polarToCartesian(a1);
    const p2 = polarToCartesian(a2);
    const largeArc = a2 - a1 > 180 ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
  });

  // Tick marks
  const ticks = Array.from({ length: 10 }, (_, i) => {
    const angle = startAngle + (i / 9) * bandWidth;
    const outer = polarToCartesian(angle);
    const innerR = r - 8;
    const rad = (angle * Math.PI) / 180;
    const inner = {
      x: cx + innerR * Math.cos(rad),
      y: cy + innerR * Math.sin(rad),
    };
    const labelR = r + 14;
    const label = {
      x: cx + labelR * Math.cos(rad),
      y: cy + labelR * Math.sin(rad),
    };
    return { outer, inner, label, value: i };
  });

  return (
    <svg viewBox="0 0 200 130" className="w-full max-w-[280px] mx-auto">
      {/* Color arc bands */}
      {segments.map((seg, i) => (
        <path
          key={i}
          d={arcPaths[i]}
          fill="none"
          stroke={seg.color}
          strokeWidth="10"
          strokeLinecap="butt"
          opacity="0.6"
        />
      ))}

      {/* Tick marks and labels */}
      {ticks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={tick.inner.x}
            y1={tick.inner.y}
            x2={tick.outer.x}
            y2={tick.outer.y}
            stroke="white"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <text
            x={tick.label.x}
            y={tick.label.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-white/60 text-[8px] font-mono"
          >
            {tick.value}
          </text>
        </g>
      ))}

      {/* Needle */}
      <motion.line
        x1={cx}
        y1={cy}
        x2={needlePos.x}
        y2={needlePos.y}
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        animate={{ x2: needlePos.x, y2: needlePos.y }}
        transition={{ type: "spring", stiffness: 60, damping: 15 }}
      />
      <circle cx={cx} cy={cy} r="4" fill="white" />
      <circle cx={cx} cy={cy} r="2" fill="#0f172a" />

      {/* Kp value display */}
      <text
        x={cx}
        y={cy + 30}
        textAnchor="middle"
        className="font-mono text-xl font-bold"
        style={{ fill: kpColor(kp) }}
      >
        {kp.toFixed(1)}
      </text>
      <text
        x={cx}
        y={cy + 44}
        textAnchor="middle"
        className="fill-white/40 text-[9px] uppercase tracking-widest"
      >
        Kp Index
      </text>
    </svg>
  );
}

// ─── Solar Wind Card ──────────────────────────────────────────────────────────

function SolarWindCard({ metric }: { metric: SolarWindMetric }) {
  const arrow = trendArrow(metric.history);
  const arrowColor = trendColor(metric.history, metric.color);
  const displayColor = metric.colorForValue
    ? metric.colorForValue(metric.value)
    : metric.color;

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex flex-col gap-3">
      <span className="text-[10px] uppercase tracking-wider text-white/50">
        {metric.label}
      </span>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-2xl font-mono font-semibold"
            style={{ color: displayColor }}
          >
            {metric.value.toFixed(metric.decimals)}
          </span>
          <span className="text-xs text-white/40">{metric.unit}</span>
        </div>
        <span
          className="text-lg leading-none"
          style={{ color: arrowColor }}
        >
          {arrow}
        </span>
      </div>
      <div className="flex justify-end">
        <SparklineSVG
          values={metric.history}
          color={metric.color}
        />
      </div>
    </div>
  );
}

// ─── 24h Solar Activity Timeline ──────────────────────────────────────────────

function ActivityTimeline() {
  // Generate 24 one-hour segments with mock activity levels
  const segments = useRef(
    Array.from({ length: 24 }, (_, i) => {
      const r = Math.random();
      let level: "quiet" | "moderate" | "active" | "storm";
      if (r < 0.5) level = "quiet";
      else if (r < 0.75) level = "moderate";
      else if (r < 0.9) level = "active";
      else level = "storm";
      return { hour: i, level };
    })
  );

  const levelColors: Record<string, string> = {
    quiet: "#22c55e",
    moderate: "#eab308",
    active: "#f97316",
    storm: "#ef4444",
  };

  const currentHour = new Date().getHours();

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
      <h3 className="text-xs uppercase tracking-wider text-white/50 mb-3">
        24h Solar Activity
      </h3>
      <div className="relative">
        {/* Bar segments */}
        <div className="flex rounded-md overflow-hidden h-6 gap-px">
          {segments.current.map((seg) => (
            <div
              key={seg.hour}
              className="flex-1 transition-all duration-300"
              style={{
                backgroundColor: levelColors[seg.level],
                opacity: seg.hour <= currentHour ? 0.85 : 0.25,
              }}
              title={`${seg.hour.toString().padStart(2, "0")}:00 — ${seg.level}`}
            />
          ))}
        </div>
        {/* Current time marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)] transition-all duration-1000"
          style={{
            left: `${((currentHour + new Date().getMinutes() / 60) / 24) * 100}%`,
          }}
        />
        {/* Hour labels */}
        <div className="flex justify-between mt-1.5 px-0.5">
          <span className="text-[9px] text-white/30 font-mono">00:00</span>
          <span className="text-[9px] text-white/30 font-mono">06:00</span>
          <span className="text-[9px] text-white/30 font-mono">12:00</span>
          <span className="text-[9px] text-white/30 font-mono">18:00</span>
          <span className="text-[9px] text-white/30 font-mono">23:00</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        {(["quiet", "moderate", "active", "storm"] as const).map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: levelColors[level] }}
            />
            <span className="text-[9px] text-white/40 capitalize">{level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Aurora Forecast ──────────────────────────────────────────────────────────

function AuroraForecast({ kp }: { kp: number }) {
  const zones = [
    {
      name: "High Latitude",
      lat: ">65°",
      probability: Math.min(100, Math.max(0, Math.round(kp * 10 + 10))),
    },
    {
      name: "Mid Latitude",
      lat: "50°–65°",
      probability: Math.min(100, Math.max(0, Math.round((kp - 3) * 15 + 10))),
    },
    {
      name: "Low Latitude",
      lat: "<50°",
      probability: Math.min(100, Math.max(0, Math.round((kp - 5) * 20 + 5))),
    },
  ];

  const barColor = (prob: number): string => {
    if (prob > 70) return "#22c55e";
    if (prob > 40) return "#eab308";
    if (prob > 15) return "#f97316";
    return "#ef4444";
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
      <h3 className="text-xs uppercase tracking-wider text-white/50 mb-4">
        Aurora Forecast
      </h3>
      <div className="space-y-4">
        {zones.map((zone) => (
          <div key={zone.name}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/80">{zone.name}</span>
                <span className="text-[10px] text-white/30 font-mono">
                  {zone.lat}
                </span>
              </div>
              <span
                className="text-sm font-mono font-semibold"
                style={{ color: barColor(zone.probability) }}
              >
                {zone.probability}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: barColor(zone.probability) }}
                initial={{ width: 0 }}
                whileInView={{ width: `${zone.probability}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

function AlertBanner({ kp }: { kp: number }) {
  return (
    <AnimatePresence>
      {kp >= 5 && (
        <motion.div
          className="relative overflow-hidden rounded-xl border border-red-500/40 bg-red-500/10 backdrop-blur-xl px-5 py-3.5"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
        >
          {/* Animated pulsing glow bar */}
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          />
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            </motion.div>
            <div>
              <p className="text-sm font-semibold text-red-300">
                ⚠️ GEOMAGNETIC STORM — Kp {kp.toFixed(1)}
              </p>
              <p className="text-xs text-red-400/60 mt-0.5">
                Elevated geomagnetic activity detected. Satellite operations may be affected.
                Monitor Kp index and adjust operations as needed.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SpaceWeatherPanel() {
  const [kp, setKp] = useState(3.0);
  const [solarWindSpeed, setSolarWindSpeed] = useState(400);
  const [imfBz, setImfBz] = useState(2.0);
  const [protonDensity, setProtonDensity] = useState(5.0);
  const [dynPressure, setDynPressure] = useState(2.0);

  const [speedHistory, setSpeedHistory] = useState<number[]>(Array(8).fill(400));
  const [bzHistory, setBzHistory] = useState<number[]>(Array(8).fill(2.0));
  const [densityHistory, setDensityHistory] = useState<number[]>(Array(8).fill(5.0));
  const [pressureHistory, setPressureHistory] = useState<number[]>(Array(8).fill(2.0));

  const updateMetrics = useCallback(() => {
    setKp((prev) => randomWalk(prev, 9, 0, 0.5));
    setSolarWindSpeed((prev) => {
      const next = randomWalk(prev, 800, 250, 25);
      setSpeedHistory((h) => [...h.slice(1), next]);
      return next;
    });
    setImfBz((prev) => {
      const next = randomWalk(prev, 15, -15, 1.5);
      setBzHistory((h) => [...h.slice(1), next]);
      return next;
    });
    setProtonDensity((prev) => {
      const next = randomWalk(prev, 25, 0.5, 1.5);
      setDensityHistory((h) => [...h.slice(1), next]);
      return next;
    });
    setDynPressure((prev) => {
      const next = randomWalk(prev, 15, 0.5, 1.0);
      setPressureHistory((h) => [...h.slice(1), next]);
      return next;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(updateMetrics, 30000);
    return () => clearInterval(interval);
  }, [updateMetrics]);

  const bzColorForValue = useCallback((v: number) => {
    return v >= 0 ? "#22c55e" : "#ef4444";
  }, []);

  // Define metrics AFTER callbacks to avoid TDZ
  const metrics: SolarWindMetric[] = [
    {
      label: "Solar Wind Speed",
      value: solarWindSpeed,
      unit: "km/s",
      history: speedHistory,
      decimals: 0,
      color: "#38bdf8",
    },
    {
      label: "IMF Bz",
      value: imfBz,
      unit: "nT",
      history: bzHistory,
      decimals: 1,
      color: "#a78bfa",
      colorForValue: bzColorForValue,
    },
    {
      label: "Proton Density",
      value: protonDensity,
      unit: "p/cm³",
      history: densityHistory,
      decimals: 1,
      color: "#f97316",
    },
    {
      label: "Dynamic Pressure",
      value: dynPressure,
      unit: "nPa",
      history: pressureHistory,
      decimals: 1,
      color: "#ec4899",
    },
  ];

  // Kp description
  const kpDescription = (() => {
    if (kp < 2) return "Quiet";
    if (kp < 3) return "Unsettled";
    if (kp < 5) return "Active";
    if (kp < 7) return "G1-G2 Storm";
    return "G3+ Severe Storm";
  })();

  return (
    <section id="space-weather" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Space Weather"
          subtitle="Real-time geomagnetic and solar wind conditions for satellite operations"
          icon={<CloudLightning className="h-6 w-6 text-cyan-400" />}
          sectionNumber="§26"
        />

        {/* Alert Banner */}
        <div className="mb-6">
          <AlertBanner kp={kp} />
        </div>

        {/* Top row: Kp Gauge + Solar Wind Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Kp Gauge Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex flex-col items-center">
            <KpGauge kp={kp} />
            <div className="mt-1 text-center">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: kpColor(kp) }}
              >
                {kpDescription}
              </span>
            </div>
          </div>

          {/* Solar Wind 2x2 Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {metrics.map((m) => (
              <SolarWindCard key={m.label} metric={m} />
            ))}
          </div>
        </div>

        {/* Bottom row: Timeline + Aurora Forecast */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActivityTimeline />
          <AuroraForecast kp={kp} />
        </div>
      </div>
    </section>
  );
}