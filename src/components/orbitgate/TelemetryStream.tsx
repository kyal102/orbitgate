"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { Activity, Pause, Play, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SectionHeader } from "./SectionHeader";
import { useOrbitGateStore, type TelemetryPoint } from "@/lib/orbitgate-store";

// ─── Constants ──────────────────────────────────────────────────────────────

const TIME_RANGES = [
  { label: "1m", points: 1 },
  { label: "5m", points: 5 },
  { label: "15m", points: 15 },
  { label: "30m", points: 30 },
  { label: "60m", points: 60 },
];

const POLL_INTERVAL = 3000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatTimeShort(iso: string) {
  const d = new Date(iso);
  return `${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

function getDelta(current: number, previous: number | undefined): { value: number; direction: "up" | "down" | "flat" } {
  if (previous === undefined) return { value: 0, direction: "flat" };
  const diff = current - previous;
  if (Math.abs(diff) < 0.001) return { value: 0, direction: "flat" };
  return { value: Math.abs(diff), direction: diff > 0 ? "up" : "down" };
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg dark:bg-slate-950 dark:border-slate-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-gray-900 dark:text-white" style={{ color: p.color }}>
          {p.dataKey}: <span className="font-mono">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Altitude Gauge ─────────────────────────────────────────────────────────

function AltitudeGauge({ data }: { data: TelemetryPoint[] }) {
  const current = data[data.length - 1];
  if (!current) return null;

  const altitudes = data.map((d) => d.altitude);
  const min = Math.min(...altitudes);
  const max = Math.max(...altitudes);
  const range = max - min || 1;
  const fraction = (current.altitude - min) / range;

  // SVG arc gauge
  const cx = 80;
  const cy = 80;
  const r = 65;
  const startAngle = -225;
  const totalArc = 270;
  const currentAngle = startAngle + fraction * totalArc;

  const polarToCart = (angle: number) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy + r * Math.sin((angle * Math.PI) / 180),
  });

  const bgArc = `M ${polarToCart(startAngle).x} ${polarToCart(startAngle).y} A ${r} ${r} 0 1 1 ${polarToCart(startAngle + totalArc).x} ${polarToCart(startAngle + totalArc).y}`;
  const valArc = `M ${polarToCart(startAngle).x} ${polarToCart(startAngle).y} A ${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${polarToCart(currentAngle).x} ${polarToCart(currentAngle).y}`;

  const color = fraction > 0.25 && fraction < 0.75 ? "#22d3ee" : fraction >= 0.1 && fraction <= 0.9 ? "#f59e0b" : "#ef4444";

  return (
    <Card className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Altitude</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center px-4 pb-4">
        <svg viewBox="0 0 160 120" className="w-40 h-32">
          <path d={bgArc} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-gray-200 dark:text-slate-800" />
          <path d={valArc} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color}50)` }} />
          <text x={cx} y={cy - 8} textAnchor="middle" className="fill-gray-900 dark:fill-white text-2xl font-bold" fontSize="22">
            {current.altitude.toFixed(1)}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="fill-gray-500 dark:fill-gray-400" fontSize="11">
            km
          </text>
          <text x={cx} y={cy + 28} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" fontSize="9">
            {min.toFixed(0)} — {max.toFixed(0)} km
          </text>
        </svg>
        <div className="flex gap-3 mt-1">
          <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />Nominal</span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Warning</span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />Critical</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Velocity Display ───────────────────────────────────────────────────────

function VelocityDisplay({ data }: { data: TelemetryPoint[] }) {
  const current = data[data.length - 1];
  if (!current) return null;

  const last10 = data.slice(-10);
  const vMin = Math.min(...last10.map((d) => d.velocity));
  const vMax = Math.max(...last10.map((d) => d.velocity));
  const vRange = vMax - vMin || 0.001;
  const sparkPoints = last10
    .map((d, i) => {
      const x = (i / (last10.length - 1)) * 100;
      const y = 36 - ((d.velocity - vMin) / vRange) * 30;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Card className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Velocity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center px-4 pb-4">
        <div className="text-3xl font-bold text-cyan-400 tabular-nums">
          {current.velocity.toFixed(3)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">km/s</div>
        <svg viewBox="0 0 100 40" className="w-full h-10 mt-2">
          <polyline
            points={sparkPoints}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </CardContent>
    </Card>
  );
}

// ─── Power Chart ────────────────────────────────────────────────────────────

function PowerChart({ data }: { data: TelemetryPoint[] }) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        time: formatTimeShort(d.timestamp),
        power: d.power,
        raw: d,
      })),
    [data]
  );

  // Detect eclipse zones (power < 50% of max)
  const maxPower = Math.max(...data.map((d) => d.power), 1);
  const eclipseThreshold = maxPower * 0.5;
  const eclipseZones = useMemo(() => {
    const zones: { start: number; end: number }[] = [];
    let inEclipse = false;
    let startIdx = 0;
    chartData.forEach((d, i) => {
      if (d.raw.power < eclipseThreshold) {
        if (!inEclipse) {
          inEclipse = true;
          startIdx = i;
        }
      } else if (inEclipse) {
        zones.push({ start: startIdx, end: i - 1 });
        inEclipse = false;
      }
    });
    if (inEclipse) zones.push({ start: startIdx, end: chartData.length - 1 });
    return zones;
  }, [chartData, eclipseThreshold]);

  return (
    <Card className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Power (W)</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#6b7280" }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} domain={["auto", "auto"]} />
            {eclipseZones.map((zone, i) => (
              <ReferenceArea key={i} x1={zone.start} x2={zone.end} fill="#475569" fillOpacity={0.2} />
            ))}
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="power" stroke="#8b5cf6" fill="url(#powerGrad)" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Temperature Chart ──────────────────────────────────────────────────────

function TemperatureChart({ data }: { data: TelemetryPoint[] }) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        time: formatTimeShort(d.timestamp),
        temp: d.temperature,
      })),
    [data]
  );

  return (
    <Card className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Temperature (°C)</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#6b7280" }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} domain={["auto", "auto"]} />
            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" opacity={0.4} />
            <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="3 3" opacity={0.4} />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="temp"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: "#f59e0b" }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 pb-2">
          <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />&lt; 30°C</span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />30–40°C</span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />&gt; 40°C</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Signal Strength Gauge ──────────────────────────────────────────────────

function SignalGauge({ data }: { data: TelemetryPoint[] }) {
  const current = data[data.length - 1];
  if (!current) return null;

  // dBm range: -100 (worst) to -60 (best)
  const minDb = -100;
  const maxDb = -60;
  const fraction = Math.max(0, Math.min(1, (current.signal - minDb) / (maxDb - minDb)));

  const color = fraction > 0.6 ? "#38bdf8" : fraction > 0.3 ? "#f59e0b" : "#ef4444";
  const label = fraction > 0.6 ? "Excellent" : fraction > 0.3 ? "Fair" : "Poor";

  const barHeight = 120;
  const fillHeight = fraction * barHeight;

  return (
    <Card className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Signal</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center gap-4 px-4 pb-4">
        {/* Vertical bar */}
        <div className="relative w-6 h-[120px] bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded-full"
            style={{ backgroundColor: color, height: `${fillHeight}px` }}
            initial={{ height: 0 }}
            animate={{ height: `${fillHeight}px` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        {/* Scale labels */}
        <div className="flex flex-col justify-between h-[120px] text-[10px] text-gray-400 font-mono">
          <span>-60</span>
          <span>-70</span>
          <span>-80</span>
          <span>-90</span>
          <span>-100</span>
        </div>
        {/* Value */}
        <div className="flex flex-col items-center">
          <div className="text-xl font-bold tabular-nums" style={{ color }}>
            {current.signal.toFixed(1)}
          </div>
          <div className="text-[10px] text-gray-500">dBm</div>
          <Badge variant="outline" className="mt-1 text-[10px] border-gray-300 dark:border-gray-600" style={{ color }}>
            {label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Battery Bar ────────────────────────────────────────────────────────────

function BatteryBar({ data }: { data: TelemetryPoint[] }) {
  const current = data[data.length - 1];
  if (!current) return null;

  const color = current.battery > 40 ? "#22d3ee" : current.battery > 20 ? "#f59e0b" : "#ef4444";

  return (
    <Card className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Battery</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold tabular-nums" style={{ color }}>
            {current.battery.toFixed(1)}%
          </div>
        </div>
        <div className="mt-3 h-3 w-full bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, current.battery))}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-500">
          <span>0%</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />&gt;40%</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />20–40%</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />&lt;20%</span>
          <span>100%</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status Indicators ──────────────────────────────────────────────────────

function StatusCard({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: string;
  unit: string;
  delta: { value: number; direction: "up" | "down" | "flat" };
}) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/60 dark:backdrop-blur-sm dark:border-slate-800 rounded-lg p-3 flex items-center justify-between gap-2 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300">
      <div className="min-w-0">
        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">{label}</div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums truncate">
          {value} <span className="text-[10px] text-gray-400 font-normal">{unit}</span>
        </div>
      </div>
      {delta.direction !== "flat" && (
        <div className={`flex items-center gap-0.5 text-[10px] font-medium shrink-0 ${delta.direction === "up" ? "text-cyan-400" : "text-red-400"}`}>
          {delta.direction === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {delta.value.toFixed(2)}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function TelemetryStream() {
  const {
    telemetryData,
    setTelemetryData,
    telemetrySatellite,
    setTelemetrySatellite,
    telemetryStreaming,
    setTelemetryStreaming,
    tleEntries,
  } = useOrbitGateStore();

  const [timeRange, setTimeRange] = useState(60);
  const [paused, setPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Satellite options
  const satelliteOptions = useMemo(() => {
    const defaults = ["ISS (25544)", "HUBBLE (20580)", "STARLINK", "GPS (PRN)", "GOES-16", "INMARSAT (3F)"];
    const fromStore = tleEntries.map((e) => `${e.name} (${e.norad_id})`);
    const combined = [...new Set([...defaults, ...fromStore])];
    return combined;
  }, [tleEntries]);

  // Extract NORAD ID from satellite string for API
  const apiSatellite = useMemo(() => {
    // Try to extract name from "NAME (NORAD)" or "NORAD"
    const match = telemetrySatellite.match(/\((\d+)\)/);
    return match ? match[1] : telemetrySatellite;
  }, [telemetrySatellite]);

  // Fetch telemetry data
  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ satellite: apiSatellite, points: String(timeRange) });
      const res = await fetch(`/api/orbitgate/telemetry?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setTelemetryData(json.data);
        setLastUpdated(Date.now());
      }
    } catch {
      // Silently fail — will retry on next poll
    }
  }, [apiSatellite, timeRange, setTelemetryData]);

  // Polling logic
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);

    // Fetch immediately
    fetchData();

    if (telemetryStreaming && !paused) {
      intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
      elapsedRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [telemetryStreaming, paused, fetchData]);

  // Elapsed time display
  const timeAgo = useMemo(() => {
    const sec = Math.floor((Date.now() - lastUpdated) / 1000);
    if (sec < 2) return "just now";
    if (sec < 60) return `${sec}s ago`;
    return `${Math.floor(sec / 60)}m ago`;
  }, [lastUpdated, elapsed]);

  // Current and previous points for delta calculations
  const currentPoint = telemetryData[telemetryData.length - 1];
  const prevPoint = telemetryData.length > 1 ? telemetryData[telemetryData.length - 2] : undefined;

  const deltas = useMemo(() => {
    if (!currentPoint) return null;
    return {
      altitude: getDelta(currentPoint.altitude, prevPoint?.altitude),
      velocity: getDelta(currentPoint.velocity, prevPoint?.velocity),
      temperature: getDelta(currentPoint.temperature, prevPoint?.temperature),
      power: getDelta(currentPoint.power, prevPoint?.power),
      signal: getDelta(currentPoint.signal, prevPoint?.signal),
      battery: getDelta(currentPoint.battery, prevPoint?.battery),
    };
  }, [currentPoint, prevPoint]);

  return (
    <section id="telemetry" className="max-w-6xl mx-auto px-4 py-16">
      <SectionHeader
        title="Real-time Telemetry Stream"
        subtitle="Live mock telemetry feed with orbital parameters, power systems, and thermal data"
        icon={<Activity className="h-6 w-6 text-cyan-400" />}
      />

      {/* Controls Row */}
      <motion.div
        className="mb-6 flex flex-wrap items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Satellite Selector */}
        <Select value={telemetrySatellite} onValueChange={setTelemetrySatellite}>
          <SelectTrigger className="w-[180px] bg-gray-100 dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 text-sm">
            <SelectValue placeholder="Select satellite" />
          </SelectTrigger>
          <SelectContent>
            {satelliteOptions.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-sm">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Auto-refresh toggle */}
        <div className="flex items-center gap-2">
          <Switch
            checked={telemetryStreaming}
            onCheckedChange={setTelemetryStreaming}
            id="telemetry-stream-toggle"
          />
          <label htmlFor="telemetry-stream-toggle" className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
            Auto-refresh
          </label>
        </div>

        {/* Time range buttons */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-slate-800">
          {TIME_RANGES.map((tr) => (
            <Button
              key={tr.points}
              variant={timeRange === tr.points ? "default" : "ghost"}
              size="sm"
              className={`h-8 px-3 text-xs ${timeRange === tr.points ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
              onClick={() => setTimeRange(tr.points)}
            >
              {tr.label}
            </Button>
          ))}
        </div>

        {/* Pause / Resume */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400"
          onClick={() => setPaused((p) => !p)}
          disabled={!telemetryStreaming}
        >
          {paused ? <Play className="h-3.5 w-3.5 mr-1.5" /> : <Pause className="h-3.5 w-3.5 mr-1.5" />}
          {paused ? "Resume" : "Pause"}
        </Button>

        {/* Stream indicator */}
        <div className="flex items-center gap-2 ml-auto bg-gray-100 dark:bg-slate-900/60 dark:border dark:border-slate-800 rounded-full px-3 py-1.5">
          <AnimatePresence>
            {telemetryStreaming && !paused && (
              <motion.span
                className="relative flex h-2 w-2"
                initial={{ opacity: 0 }}
                exit={{ opacity: 0 }}
              >
                <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-50" />
                <span className="relative h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              </motion.span>
            )}
          </AnimatePresence>
          <span className={`text-xs font-medium ${telemetryStreaming && !paused ? "text-cyan-500" : "text-gray-500 dark:text-gray-400"}`}>
            {telemetryStreaming && !paused ? "Streaming" : paused ? "Paused" : "Stopped"}
          </span>
        </div>
      </motion.div>

      {/* Main Dashboard Grid */}
      {telemetryData.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}>
            <AltitudeGauge data={telemetryData} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            <VelocityDisplay data={telemetryData} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}>
            <SignalGauge data={telemetryData} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
            <PowerChart data={telemetryData} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.25 }}>
            <TemperatureChart data={telemetryData} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
            <BatteryBar data={telemetryData} />
          </motion.div>
        </div>
      )}

      {/* Bottom Row: Status Indicators + Quality Badge */}
      {deltas && currentPoint && (
        <motion.div
          className="mt-6 space-y-3"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35 }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <StatusCard label="Altitude" value={currentPoint.altitude.toFixed(1)} unit="km" delta={deltas.altitude} />
            <StatusCard label="Velocity" value={currentPoint.velocity.toFixed(3)} unit="km/s" delta={deltas.velocity} />
            <StatusCard label="Temp" value={currentPoint.temperature.toFixed(1)} unit="°C" delta={deltas.temperature} />
            <StatusCard label="Power" value={currentPoint.power.toFixed(1)} unit="W" delta={deltas.power} />
            <StatusCard label="Signal" value={currentPoint.signal.toFixed(1)} unit="dBm" delta={deltas.signal} />
            <StatusCard label="Battery" value={currentPoint.battery.toFixed(1)} unit="%" delta={deltas.battery} />
          </div>

          <div className="flex justify-center">
            <Badge variant="outline" className="text-[10px] text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-700 font-mono">
              Mock Data · {telemetryData.length} points · Updated {timeAgo}
            </Badge>
          </div>
        </motion.div>
      )}
    </section>
  );
}