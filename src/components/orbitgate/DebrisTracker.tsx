"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SectionHeader";
import {
  Radar,
  Radio,
  Flame,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────

interface AltitudeBand {
  label: string;
  range: string;
  low: number;
  high: number;
  density: number; // 0–1 normalized
  objectCount: number;
}

const ALTITUDE_BANDS: AltitudeBand[] = [
  { label: "200–400 km", range: "ISS / Tiangong", low: 200, high: 400, density: 0.45, objectCount: 4200 },
  { label: "400–600 km", range: "Starlink / Hubble", low: 400, high: 600, density: 0.82, objectCount: 12800 },
  { label: "600–800 km", range: "Sun-synchronous", low: 600, high: 800, density: 0.95, objectCount: 9600 },
  { label: "800–1000 km", range: "Legacy / Iridium", low: 800, high: 1000, density: 0.55, objectCount: 4100 },
  { label: "1000–2000 km", range: "Navigation / High LEO", low: 1000, high: 2000, density: 0.25, objectCount: 1800 },
];

interface DebrisEvent {
  name: string;
  year: number;
  altitude: number;
  type: "collision" | "fragmentation" | "ASAT";
  objects: number;
  description: string;
}

const SIGNIFICANT_EVENTS: DebrisEvent[] = [
  { name: "Fengyun-1C ASAT Test", year: 2007, altitude: 865, type: "ASAT", objects: 3527, description: "Chinese anti-satellite missile test" },
  { name: "Cosmos 2251 / Iridium 33", year: 2009, altitude: 790, type: "collision", objects: 2268, description: "First accidental hypervelocity collision" },
  { name: "Briz-M Upper Stage", year: 2012, altitude: 800, type: "fragmentation", objects: 509, description: "Rocket stage explosion over 500 fragments" },
  { name: "NOAA-16 Fragmentation", year: 2015, altitude: 850, type: "fragmentation", objects: 465, description: "Defunct weather satellite breakup" },
  { name: "Cosmos 1408 ASAT Test", year: 2021, altitude: 480, type: "ASAT", objects: 1800, description: "Russian direct-ascent ASAT test" },
];

interface TimelineEvent {
  date: string;
  name: string;
  objects: string;
  altitude: string;
  type: "collision" | "fragmentation" | "ASAT";
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  { date: "Jan 2007", name: "Fengyun-1C ASAT Test", objects: "3,527 fragments", altitude: "865 km", type: "ASAT" },
  { date: "Feb 2009", name: "Cosmos 2251 / Iridium 33", objects: "2,268 fragments", altitude: "790 km", type: "collision" },
  { date: "Jul 2012", name: "Briz-M Upper Stage Explosion", objects: "509 fragments", altitude: "800 km", type: "fragmentation" },
  { date: "Nov 2015", name: "NOAA-16 Breakup", objects: "465 fragments", altitude: "850 km", type: "fragmentation" },
  { date: "Apr 2018", name: "Tiangong-1 Reentry", objects: "Controlled deorbit", altitude: "350 km", type: "fragmentation" },
  { date: "Mar 2021", name: "Cosmos 1408 ASAT Test", objects: "1,800+ fragments", altitude: "480 km", type: "ASAT" },
  { date: "Dec 2021", name: "Fregat SB Debris Cloud", objects: "75 fragments", altitude: "780 km", type: "fragmentation" },
  { date: "Aug 2022", name: "OneWeb Soyuz Failure", objects: "36 satellites lost", altitude: "210 km (low)", type: "fragmentation" },
  { date: "Oct 2023", name: "DMSP-F13 Battery Explosion", objects: "50+ fragments", altitude: "830 km", type: "fragmentation" },
  { date: "Jun 2024", name: "Astra Rocket Debris", objects: "25+ fragments", altitude: "500 km", type: "fragmentation" },
];

// Collision risk matrix: rows = satellite altitude, cols = debris density zones
const RISK_MATRIX = [
  // debris zones: Very Low, Low, Moderate, High, Critical
  [0, 0, 1, 2, 3], // 200-400 km (ISS altitude)
  [0, 1, 1, 2, 3], // 400-600 km
  [1, 1, 2, 3, 4], // 600-800 km
  [0, 1, 2, 3, 4], // 800-1000 km
  [0, 0, 1, 2, 3], // 1000-2000 km
];

const RISK_LABELS = ["Very Low", "Low", "Moderate", "High", "Critical"];
const ALTITUDE_LABELS = ["200–400 km", "400–600 km", "600–800 km", "800–1000 km", "1000–2000 km"];
const DENSITY_LABELS = ["Very Low", "Low", "Moderate", "High", "Critical"];

function riskColor(level: number): string {
  switch (level) {
    case 0: return "bg-cyan-500/30 border-cyan-500/40 text-cyan-300";
    case 1: return "bg-yellow-500/30 border-yellow-500/40 text-yellow-300";
    case 2: return "bg-orange-500/30 border-orange-500/40 text-orange-300";
    case 3: return "bg-red-500/30 border-red-500/40 text-red-300";
    case 4: return "bg-red-700/40 border-red-600/50 text-red-200";
    default: return "bg-slate-700/30 border-slate-600/30 text-slate-400";
  }
}

function riskBgSolid(level: number): string {
  switch (level) {
    case 0: return "rgba(6, 182, 212, 0.15)";
    case 1: return "rgba(234, 179, 8, 0.2)";
    case 2: return "rgba(249, 115, 22, 0.25)";
    case 3: return "rgba(239, 68, 68, 0.3)";
    case 4: return "rgba(185, 28, 28, 0.35)";
    default: return "rgba(100, 116, 139, 0.15)";
  }
}

function eventTypeBadge(type: "collision" | "fragmentation" | "ASAT") {
  switch (type) {
    case "collision": return "bg-rose-500/20 text-rose-300 border-rose-500/30";
    case "fragmentation": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "ASAT": return "bg-red-600/20 text-red-300 border-red-500/30";
  }
}

function heatmapColor(density: number): string {
  // From emerald (low) to red (high)
  if (density < 0.3) return "rgba(6, 182, 212, 0.3)";
  if (density < 0.5) return "rgba(6, 182, 212, 0.55)";
  if (density < 0.7) return "rgba(234, 179, 8, 0.5)";
  if (density < 0.85) return "rgba(249, 115, 22, 0.5)";
  return "rgba(239, 68, 68, 0.6)";
}

function heatmapStroke(density: number): string {
  if (density < 0.3) return "rgba(6, 182, 212, 0.5)";
  if (density < 0.5) return "rgba(6, 182, 212, 0.7)";
  if (density < 0.7) return "rgba(234, 179, 8, 0.6)";
  if (density < 0.85) return "rgba(249, 115, 22, 0.6)";
  return "rgba(239, 68, 68, 0.7)";
}

// ── Component ──────────────────────────────────────────────────────

export function DebrisTracker() {
  // ── Live Debris Counter State ──
  const [counters, setCounters] = useState({
    active: 0,
    defunct: 0,
    debris: 0,
    other: 0,
  });
  const COUNTERS_TARGET = {
    active: 9500,
    defunct: 3700,
    debris: 22600,
    other: 200,
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCounters((prev) => {
        const done =
          prev.active >= COUNTERS_TARGET.active &&
          prev.defunct >= COUNTERS_TARGET.defunct &&
          prev.debris >= COUNTERS_TARGET.debris &&
          prev.other >= COUNTERS_TARGET.other;
        if (done) return prev;

        return {
          active: Math.min(prev.active + Math.ceil(Math.random() * 120 + 40), COUNTERS_TARGET.active),
          defunct: Math.min(prev.defunct + Math.ceil(Math.random() * 50 + 15), COUNTERS_TARGET.defunct),
          debris: Math.min(prev.debris + Math.ceil(Math.random() * 280 + 80), COUNTERS_TARGET.debris),
          other: Math.min(prev.other + Math.ceil(Math.random() * 8 + 2), COUNTERS_TARGET.other),
        };
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  const totalTracked = counters.active + counters.defunct + counters.debris + counters.other;

  // ── Kessler Simulator State ──
  const [simRunning, setSimRunning] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simBands, setSimBands] = useState<number[]>([4200, 12800, 9600, 4100, 1800]);
  const simStartTime = useRef<number | null>(null);
  const animFrame = useRef<number>(0);

  const startSimulation = useCallback(() => {
    setSimRunning(true);
    setSimProgress(0);
    setSimBands([4200, 12800, 9600, 4100, 1800]);
    simStartTime.current = performance.now();
  }, []);

  const resetSimulation = useCallback(() => {
    setSimRunning(false);
    setSimProgress(0);
    setSimBands([4200, 12800, 9600, 4100, 1800]);
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    simStartTime.current = null;
  }, []);

  useEffect(() => {
    if (!simRunning || !simStartTime.current) return;

    const duration = 5000; // 5 seconds for 100 years
    const initialBands = [4200, 12800, 9600, 4100, 1800];
    // Growth rates per band (higher bands fragment more aggressively)
    const growthRates = [2.8, 3.5, 4.2, 3.0, 2.0];

    function tick(now: number) {
      const elapsed = now - simStartTime.current!;
      const t = Math.min(elapsed / duration, 1);
      setSimProgress(t);

      const newBands = initialBands.map((base, i) => {
        const growth = base * (Math.exp(growthRates[i] * t) - 1);
        return Math.round(base + growth);
      });

      setSimBands(newBands);

      if (t < 1) {
        animFrame.current = requestAnimationFrame(tick);
      } else {
        setSimRunning(false);
      }
    }

    animFrame.current = requestAnimationFrame(tick);

    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, [simRunning]);

  // ── Compute Kessler threshold (sum of all bands at threshold) ──
  const kesslerThreshold = 150000;
  const currentSimTotal = simBands.reduce((a, b) => a + b, 0);
  const thresholdCrossed = currentSimTotal >= kesslerThreshold;

  // ── Heatmap event positions ──
  const svgHeight = 300;
  const svgWidth = 600;
  const barHeight = 36;
  const barGap = 16;
  const barStartY = 40;
  const barMaxWidth = svgWidth - 140;

  const eventYForAltitude = useCallback(
    (alt: number) => {
      const band = ALTITUDE_BANDS.find((b) => alt >= b.low && alt < b.high);
      if (!band) return barStartY;
      const idx = ALTITUDE_BANDS.indexOf(band);
      return barStartY + idx * (barHeight + barGap) + barHeight / 2;
    },
    []
  );

  // ── Sub-component: Heatmap ──
  const debrisHeatmap = (
    <Card className="glass-card">
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Radar className="h-4 w-4 text-cyan-400" />
          LEO Debris Density Heatmap
        </h3>
        <p className="text-xs text-gray-400 mb-4">Horizontal bars represent debris density per altitude band (200–2000 km)</p>

        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full min-w-[400px]"
            style={{ maxHeight: 300 }}
          >
            {/* Background */}
            <rect x="0" y="0" width={svgWidth} height={svgHeight} rx="8" fill="rgba(15, 23, 42, 0.5)" />

            {/* Altitude axis label */}
            <text x="12" y="24" className="text-[10px] fill-gray-500" fontFamily="monospace">ALTITUDE BAND</text>
            <text x={svgWidth - 120} y="24" className="text-[10px] fill-gray-500" fontFamily="monospace">DENSITY</text>

            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1.0].map((v) => {
              const x = 130 + v * barMaxWidth;
              return (
                <line
                  key={v}
                  x1={x} y1={barStartY - 4}
                  x2={x} y2={barStartY + ALTITUDE_BANDS.length * (barHeight + barGap)}
                  stroke="rgba(100,116,139,0.15)"
                  strokeDasharray="3,3"
                />
              );
            })}

            {/* Bars */}
            {ALTITUDE_BANDS.map((band, idx) => {
              const y = barStartY + idx * (barHeight + barGap);
              const barWidth = band.density * barMaxWidth;
              return (
                <g key={band.label}>
                  {/* Band label */}
                  <text x="8" y={y + barHeight / 2 + 4} className="text-[11px] fill-gray-300" fontFamily="monospace">
                    {band.label}
                  </text>
                  {/* Bar background */}
                  <rect
                    x="130" y={y}
                    width={barMaxWidth} height={barHeight}
                    rx="4"
                    fill="rgba(30, 41, 59, 0.5)"
                    stroke="rgba(100,116,139,0.2)"
                    strokeWidth="0.5"
                  />
                  {/* Bar fill */}
                  <rect
                    x="130" y={y}
                    width={barWidth} height={barHeight}
                    rx="4"
                    fill={heatmapColor(band.density)}
                    stroke={heatmapStroke(band.density)}
                    strokeWidth="1"
                  />
                  {/* Density percentage */}
                  <text
                    x={135 + barWidth}
                    y={y + barHeight / 2 + 4}
                    className="text-[10px] fill-gray-400"
                    fontFamily="monospace"
                    dx="6"
                  >
                    {(band.density * 100).toFixed(0)}%
                  </text>
                  {/* Object count on bar */}
                  <text
                    x="138"
                    y={y + barHeight / 2 + 4}
                    className="text-[10px] fill-white/80"
                    fontFamily="monospace"
                  >
                    {band.objectCount.toLocaleString()} objects
                  </text>
                </g>
              );
            })}

            {/* Significant debris events as markers */}
            {SIGNIFICANT_EVENTS.map((evt) => {
              const y = eventYForAltitude(evt.altitude);
              const x = 130 + (evt.altitude - 200) / 1800 * barMaxWidth;
              const markerColor =
                evt.type === "ASAT" ? "#ef4444" :
                evt.type === "collision" ? "#f97316" : "#eab308";
              return (
                <g key={evt.name}>
                  {/* Vertical line */}
                  <line
                    x1={x} y1={y - 8}
                    x2={x} y2={y + 8}
                    stroke={markerColor}
                    strokeWidth="1.5"
                    opacity="0.8"
                  />
                  {/* Diamond marker */}
                  <polygon
                    points={`${x},${y - 6} ${x + 5},${y} ${x},${y + 6} ${x - 5},${y}`}
                    fill={markerColor}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="0.5"
                    opacity="0.9"
                  />
                  <text
                    x={x} y={y - 10}
                    className="text-[8px] fill-gray-400"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {evt.year} {evt.name.split(" ")[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-cyan-500/50" /> Low density
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-500/50" /> Moderate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-500/50" /> High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500/60" /> Critical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rotate-45 bg-red-400" /> Event marker
          </span>
        </div>
      </CardContent>
    </Card>
  );

  // ── Sub-component: Live Debris Counter ──
  const liveDebrisCounter = (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="glass-card">
        <CardContent className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-cyan-400/70 mb-1">Active Satellites</p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400 tabular-nums">
            {counters.active.toLocaleString()}
          </p>
          <div className="mt-2 h-1 rounded-full bg-cyan-500/20 overflow-hidden">
            <motion.div
              className="h-full bg-cyan-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(counters.active / COUNTERS_TARGET.active) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-1">Defunct Satellites</p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 tabular-nums">
            {counters.defunct.toLocaleString()}
          </p>
          <div className="mt-2 h-1 rounded-full bg-amber-500/20 overflow-hidden">
            <motion.div
              className="h-full bg-amber-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(counters.defunct / COUNTERS_TARGET.defunct) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-rose-400/70 mb-1">Trackable Debris</p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-rose-400 tabular-nums">
            {counters.debris.toLocaleString()}
          </p>
          <div className="mt-2 h-1 rounded-full bg-rose-500/20 overflow-hidden">
            <motion.div
              className="h-full bg-rose-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(counters.debris / COUNTERS_TARGET.debris) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-400/70 mb-1">Other Objects</p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-gray-300 tabular-nums">
            {counters.other.toLocaleString()}
          </p>
          <div className="mt-2 h-1 rounded-full bg-gray-500/20 overflow-hidden">
            <motion.div
              className="h-full bg-gray-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(counters.other / COUNTERS_TARGET.other) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ── Sub-component: Total counter ──
  const totalCounter = (
    <Card className="glass-card border-cyan-500/20">
      <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Radio className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400">Total Tracked Objects</p>
            <p className="text-3xl sm:text-4xl font-bold font-mono text-white tabular-nums">
              {totalTracked.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500">As cataloged by USSPACECOM</p>
          <p className="text-[10px] text-cyan-500/60 font-mono">
            &gt;10cm in LEO · &gt;1m elsewhere
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // ── Sub-component: Collision Risk Matrix ──
  const collisionRiskMatrix = (
    <Card className="glass-card">
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Collision Risk Matrix
        </h3>
        <p className="text-xs text-gray-400 mb-4">Satellite altitude (rows) vs debris density zones (columns) — ISS altitude highlighted</p>

        <div className="overflow-x-auto">
          <div className="min-w-[440px]">
            {/* Column headers */}
            <div className="grid grid-cols-6 gap-1 mb-1">
              <div className="text-[9px] text-gray-500 font-mono" />
              {DENSITY_LABELS.map((label) => (
                <div key={label} className="text-[9px] text-gray-500 font-mono text-center">
                  {label}
                </div>
              ))}
            </div>

            {/* Matrix rows */}
            {RISK_MATRIX.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-6 gap-1 mb-1">
                <div className="text-[10px] text-gray-400 font-mono flex items-center pr-2">
                  {ALTITUDE_LABELS[rowIdx]}
                </div>
                {row.map((risk, colIdx) => {
                  const isISS = rowIdx === 0 && colIdx >= 2;
                  return (
                    <div
                      key={colIdx}
                      className={`
                        h-12 rounded-md border flex items-center justify-center text-[10px] font-mono font-medium
                        transition-all duration-300
                        ${riskColor(risk)}
                        ${isISS ? "ring-2 ring-cyan-400/60 animate-pulse" : ""}
                      `}
                      style={{ background: riskBgSolid(risk) }}
                    >
                      {isISS && <span className="mr-1 text-[8px]">📍</span>}
                      {RISK_LABELS[risk]}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Row labels for context */}
            <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-gray-500">
              <span>📍 = ISS altitude band (200–400 km)</span>
              <span className="text-cyan-400/60">Green = Low risk</span>
              <span className="text-red-400/60">Red = Critical risk</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ── Sub-component: Recent Events Timeline ──
  const recentEventsTimeline = (
    <Card className="glass-card">
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Flame className="h-4 w-4 text-rose-400" />
          Significant Debris Events Timeline
        </h3>
        <p className="text-xs text-gray-400 mb-5">Last 10 major space debris incidents with collision assessment</p>

        <div className="relative max-h-[480px] overflow-y-auto custom-scrollbar pl-6">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-cyan-500/40 via-rose-500/30 to-transparent" />

          <div className="space-y-4">
            {TIMELINE_EVENTS.map((evt, idx) => (
              <motion.div
                key={idx}
                className="relative pl-6"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                {/* Emerald dot */}
                <div className="absolute left-[-6px] top-1.5 h-3.5 w-3.5 rounded-full bg-cyan-400 border-2 border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />

                <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-3 hover:border-cyan-500/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-gray-200">{evt.name}</span>
                    <span className={`
                      inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border
                      ${eventTypeBadge(evt.type)}
                    `}>
                      {evt.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <span className="text-gray-500">Date</span>
                      <p className="text-gray-300 font-mono">{evt.date}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Objects</span>
                      <p className="text-gray-300 font-mono">{evt.objects}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Altitude</span>
                      <p className="text-gray-300 font-mono">{evt.altitude}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ── Sub-component: Kessler Syndrome Simulator ──
  const maxSimBand = Math.max(...simBands);
  const kesslerSimulator = (
    <Card className="glass-card">
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Zap className="h-4 w-4 text-rose-400" />
          Kessler Syndrome Simulator
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Cascade collision model — debris fragments create more debris, leading to exponential growth
        </p>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-4">
          <Button
            size="sm"
            variant="outline"
            onClick={startSimulation}
            disabled={simRunning}
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Simulate 100 Years
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={resetSimulation}
            className="text-gray-400 hover:text-gray-200"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </Button>
          {simRunning && (
            <span className="text-xs font-mono text-cyan-400 animate-pulse">
              Simulating... {(simProgress * 100).toFixed(0)}% — Year {Math.floor(simProgress * 100)}
            </span>
          )}
          {!simRunning && simProgress > 0 && (
            <span className={`text-xs font-mono ${thresholdCrossed ? "text-red-400" : "text-cyan-400"}`}>
              {thresholdCrossed
                ? "⚠ KESSLER THRESHOLD REACHED — Cascading collisions unstoppable"
                : "Simulation complete — Kessler threshold not reached"}
            </span>
          )}
        </div>

        {/* Chart */}
        <div className="relative bg-slate-900/50 rounded-lg border border-slate-700/40 p-4 overflow-hidden">
          <svg viewBox="0 0 560 240" className="w-full" style={{ maxHeight: 240 }}>
            {/* Grid */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                x1="80" y1={20 + i * 40}
                x2="540" y2={20 + i * 40}
                stroke="rgba(100,116,139,0.1)"
                strokeDasharray="4,4"
              />
            ))}

            {/* Y-axis labels */}
            <text x="75" y="24" className="text-[8px] fill-gray-500" textAnchor="end" fontFamily="monospace">200–400</text>
            <text x="75" y="64" className="text-[8px] fill-gray-500" textAnchor="end" fontFamily="monospace">400–600</text>
            <text x="75" y="104" className="text-[8px] fill-gray-500" textAnchor="end" fontFamily="monospace">600–800</text>
            <text x="75" y="144" className="text-[8px] fill-gray-500" textAnchor="end" fontFamily="monospace">800–1000</text>
            <text x="75" y="184" className="text-[8px] fill-gray-500" textAnchor="end" fontFamily="monospace">1000–2000</text>

            {/* Bands as horizontal bars */}
            {simBands.map((count, idx) => {
              const y = 12 + idx * 40;
              const safeMax = Math.max(maxSimBand, kesslerThreshold);
              const width = Math.min((count / safeMax) * 440, 440);
              const intensity = Math.min(count / kesslerThreshold, 1);
              const barColor = intensity < 0.3
                ? "rgba(6, 182, 212, 0.5)"
                : intensity < 0.6
                  ? "rgba(234, 179, 8, 0.5)"
                  : intensity < 0.9
                    ? "rgba(249, 115, 22, 0.5)"
                    : "rgba(239, 68, 68, 0.6)";

              return (
                <g key={idx}>
                  <rect
                    x="80" y={y}
                    width={width} height="28"
                    rx="3"
                    fill={barColor}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={88 + Math.min(width, 420)}
                    y={y + 18}
                    className="text-[9px] fill-white/80"
                    fontFamily="monospace"
                    dx="6"
                  >
                    {count.toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Kessler Threshold vertical line */}
            {simProgress > 0 && (
              <g>
                <line
                  x1={80 + (kesslerThreshold / Math.max(maxSimBand, kesslerThreshold)) * 440}
                  y1="8"
                  x2={80 + (kesslerThreshold / Math.max(maxSimBand, kesslerThreshold)) * 440}
                  y2="210"
                  stroke={thresholdCrossed ? "rgba(239, 68, 68, 0.7)" : "rgba(234, 179, 8, 0.5)"}
                  strokeWidth="1.5"
                  strokeDasharray="6,3"
                />
                <text
                  x={80 + (kesslerThreshold / Math.max(maxSimBand, kesslerThreshold)) * 440 + 4}
                  y="225"
                  className={`text-[9px] ${thresholdCrossed ? "fill-red-400" : "fill-yellow-400"}`}
                  fontFamily="monospace"
                >
                  Kessler Threshold ({kesslerThreshold.toLocaleString()})
                </text>
              </g>
            )}
          </svg>

          {/* Total count overlay */}
          <div className="absolute top-2 right-3 text-right">
            <p className="text-[9px] text-gray-500">Total Debris</p>
            <p className={`text-lg font-bold font-mono tabular-nums ${thresholdCrossed ? "text-red-400" : "text-cyan-400"}`}>
              {currentSimTotal.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Info */}
        <p className="text-[10px] text-gray-500 mt-3">
          The Kessler Syndrome occurs when debris density reaches a tipping point where collisions generate debris faster than natural orbital decay removes it,
          creating an exponential cascade. The 600–800 km band is most vulnerable due to low atmospheric drag.
        </p>
      </CardContent>
    </Card>
  );

  // ── Render ──
  return (
    <section id="debris-tracker" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Space Debris Tracker"
          subtitle="Real-time monitoring of the orbital debris environment — density analysis, collision risk assessment, and cascade simulation"
          icon={<Radar className="h-6 w-6 text-cyan-400" />}
          sectionNumber="§29"
        />

        {/* Total tracked objects banner */}
        <div className="mb-6">
          {totalCounter}
        </div>

        {/* Live debris counter cards */}
        <div className="mb-6">
          {liveDebrisCounter}
        </div>

        {/* Heatmap + Risk Matrix — side by side on large screens */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-6">
          <div className="xl:col-span-3">
            {debrisHeatmap}
          </div>
          <div className="xl:col-span-2">
            {collisionRiskMatrix}
          </div>
        </div>

        {/* Timeline + Kessler Simulator */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {recentEventsTimeline}
          {kesslerSimulator}
        </div>
      </div>
    </section>
  );
}