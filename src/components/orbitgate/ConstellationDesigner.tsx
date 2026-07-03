"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "./SectionHeader";
import {
  Satellite,
  Globe2,
  Clock,
  Zap,
  DollarSign,
  Weight,
  BarChart3,
  Crosshair,
  Eye,
  Activity,
  Gauge,
  Braces,
  Layers,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const MU = 398600.4418; // km³/s²
const R_EARTH = 6371; // km
const C_KMS = 299792.458; // km/s

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ConstellationParams {
  altitude: number;
  inclination: number;
  planes: number;
  satsPerPlane: number;
}

interface Preset {
  name: string;
  params: ConstellationParams;
}

interface ComputedMetrics {
  totalSats: number;
  periodMin: number;
  velocityKms: number;
  trackSpacingKm: number;
  latencyMs: number;
  throughputGbps: number;
  totalMassKg: number;
  estCostB: number;
  coveragePct: number;
  revisitMin: number;
  maxGapMin: number;
  simVisibleSats: number;
  walkerNotation: string;
}

/* ------------------------------------------------------------------ */
/*  Presets                                                            */
/* ------------------------------------------------------------------ */
const PRESETS: Preset[] = [
  { name: "Starlink", params: { altitude: 550, inclination: 53, planes: 72, satsPerPlane: 22 } },
  { name: "Iridium", params: { altitude: 780, inclination: 86.4, planes: 6, satsPerPlane: 11 } },
  { name: "GPS", params: { altitude: 20200, inclination: 55, planes: 6, satsPerPlane: 4 } },
  { name: "OneWeb", params: { altitude: 1200, inclination: 87.9, planes: 36, satsPerPlane: 18 } },
  { name: "Galileo", params: { altitude: 23222, inclination: 56, planes: 3, satsPerPlane: 10 } },
];

const PLANE_COLORS = [
  "#06b6d4",
  "#f59e0b",
  "#f43f5e",
  "#38bdf8",
  "#a78bfa",
  "#fb923c",
  "#22d3ee",
  "#f472b6",
  "#22d3ee",
  "#facc15",
  "#c084fc",
  "#f87171",
];

/* ------------------------------------------------------------------ */
/*  Metric computation                                                 */
/* ------------------------------------------------------------------ */
function computeMetrics(p: ConstellationParams): ComputedMetrics {
  const r = R_EARTH + p.altitude;
  const totalSats = p.planes * p.satsPerPlane;

  // Orbital mechanics
  const velocity = Math.sqrt(MU / r);
  const periodSec = 2 * Math.PI * Math.sqrt(Math.pow(r, 3) / MU);
  const periodMin = periodSec / 60;

  // Track spacing at equator (km)
  const inclRad = (p.inclination * Math.PI) / 180;
  const trackSpacing = (2 * Math.PI * R_EARTH * Math.cos(inclRad)) / p.planes;

  // Latency — round-trip, single hop (ms)
  const latencyMs = (2 * p.altitude / C_KMS) * 1e6;

  // Throughput estimate (Gbps) — LEO gets more per sat due to shorter range
  const throughputPerSat = p.altitude < 1000 ? 20 : p.altitude < 10000 ? 10 : 2;
  const throughputGbps = totalSats * throughputPerSat * 0.01; // 1% utilisation

  // Mass & cost estimates
  const massPerSat = 200 + p.altitude * 0.018;
  const totalMassKg = totalSats * massPerSat;
  const costPerSatM = 0.25 + p.altitude * 0.0006;
  const estCostB = (totalSats * costPerSatM) / 1000;

  // Coverage — spherical cap model
  const earthAngularRadius = Math.asin(Math.min(R_EARTH / r, 1));
  const earthCentralAngle = Math.PI / 2 - earthAngularRadius;
  const singleSatCov = (1 - Math.cos(earthCentralAngle)) / 2;
  const effectiveSats = Math.max(totalSats / 3, 1);
  const rawCov = 1 - Math.pow(1 - singleSatCov, effectiveSats);
  const coveragePct = Math.min(rawCov * 100, 99.9);

  // Revisit time (min) — simplified
  const revisitMin = periodMin / Math.max(p.satsPerPlane * Math.sin(inclRad), 1);

  // Max gap — rough multiplier
  const maxGapMin = revisitMin * 2.5;

  // Simultaneous visible sats (above ~10° elevation)
  const simVisibleSats = Math.max(Math.floor(totalSats / 10) + 1, 1);

  // Walker notation i/T/P/F
  const walkerNotation = `${p.inclination}°/${totalSats}/${p.planes}/${p.satsPerPlane}`;

  return {
    totalSats,
    periodMin,
    velocityKms: velocity,
    trackSpacingKm: trackSpacing,
    latencyMs,
    throughputGbps,
    totalMassKg,
    estCostB,
    coveragePct,
    revisitMin,
    maxGapMin,
    simVisibleSats,
    walkerNotation,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function ConstellationDesigner() {
  const [selectedPreset, setSelectedPreset] = useState<string>("Starlink");
  const [customParams, setCustomParams] = useState<ConstellationParams>({
    altitude: 1000,
    inclination: 70,
    planes: 24,
    satsPerPlane: 20,
  });

  /* ---- callbacks (before JSX vars) ---- */
  const handlePresetSelect = useCallback((name: string) => {
    setSelectedPreset(name);
  }, []);

  const handleCustomAlt = useCallback((v: number) => {
    setCustomParams((prev) => ({ ...prev, altitude: v }));
  }, []);

  const handleCustomIncl = useCallback((v: number) => {
    setCustomParams((prev) => ({ ...prev, inclination: v }));
  }, []);

  const handleCustomPlanes = useCallback((v: number) => {
    setCustomParams((prev) => ({ ...prev, planes: Math.max(1, Math.round(v)) }));
  }, []);

  const handleCustomSats = useCallback((v: number) => {
    setCustomParams((prev) => ({ ...prev, satsPerPlane: Math.max(1, Math.round(v)) }));
  }, []);

  /* ---- derived state ---- */
  const activeParams = useMemo<ConstellationParams>(() => {
    if (selectedPreset === "Custom") return customParams;
    const found = PRESETS.find((p) => p.name === selectedPreset);
    return found ? found.params : customParams;
  }, [selectedPreset, customParams]);

  const metrics = useMemo(() => computeMetrics(activeParams), [activeParams]);

  const allMetrics = useMemo(() => {
    const map = new Map<string, ComputedMetrics>();
    PRESETS.forEach((p) => map.set(p.name, computeMetrics(p.params)));
    map.set("Custom", computeMetrics(customParams));
    return map;
  }, [customParams]);

  /* ---- JSX variables ---- */

  const presetButtons = (
    <div className="flex flex-wrap gap-2 mb-6">
      {PRESETS.map((p) => (
        <Button
          key={p.name}
          variant={selectedPreset === p.name ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetSelect(p.name)}
          className={
            selectedPreset === p.name
              ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
              : "border-gray-300 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-gray-200"
          }
        >
          <Satellite className="h-3.5 w-3.5" />
          {p.name}
        </Button>
      ))}
      <Button
        variant={selectedPreset === "Custom" ? "default" : "outline"}
        size="sm"
        onClick={() => handlePresetSelect("Custom")}
        className={
          selectedPreset === "Custom"
            ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            : "border-gray-300 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-gray-200"
        }
      >
        <Braces className="h-3.5 w-3.5" />
        Custom
      </Button>
    </div>
  );

  const customForm = (
    <div className={selectedPreset === "Custom" ? "" : "opacity-50 pointer-events-none"}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 uppercase tracking-wider">Altitude (km)</Label>
          <Input
            type="number"
            value={customParams.altitude}
            onChange={(e) => handleCustomAlt(Number(e.target.value))}
            className="bg-gray-100 dark:bg-slate-800/60 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white font-mono h-9 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 uppercase tracking-wider">Inclination (°)</Label>
          <Input
            type="number"
            value={customParams.inclination}
            onChange={(e) => handleCustomIncl(Number(e.target.value))}
            className="bg-gray-100 dark:bg-slate-800/60 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white font-mono h-9 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 uppercase tracking-wider">Planes</Label>
          <Input
            type="number"
            value={customParams.planes}
            onChange={(e) => handleCustomPlanes(Number(e.target.value))}
            className="bg-gray-100 dark:bg-slate-800/60 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white font-mono h-9 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 uppercase tracking-wider">Sats / Plane</Label>
          <Input
            type="number"
            value={customParams.satsPerPlane}
            onChange={(e) => handleCustomSats(Number(e.target.value))}
            className="bg-gray-100 dark:bg-slate-800/60 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white font-mono h-9 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20"
          />
        </div>
      </div>
    </div>
  );

  /* ---- SVG Visualization ---- */
  const svgViz = useMemo(() => {
    const cx = 200;
    const cy = 200;
    const earthR = 28;
    const maxOrbitR = 175;
    const minOrbitR = 55;
    // Scale orbit radius by altitude (200 km → minOrbitR, 25000 km → maxOrbitR)
    const altFrac = Math.min(
      Math.max((activeParams.altitude - 200) / (25000 - 200), 0),
      1
    );
    const orbitR = minOrbitR + altFrac * (maxOrbitR - minOrbitR);

    // Determine how many planes & sats to show (cap for performance)
    const showPlanes = Math.min(activeParams.planes, 10);
    const showSatsPerPlane = Math.min(activeParams.satsPerPlane, 14);
    const totalSats = activeParams.planes * activeParams.satsPerPlane;

    // Plane RAAN offsets (evenly spaced)
    const planeRaans = Array.from({ length: showPlanes }, (_, i) => (i / showPlanes) * 360);

    // Build satellite dots
    const satDots: { cx: number; cy: number; color: string; plane: number }[] = [];
    for (let pi = 0; pi < showPlanes; pi++) {
      const raanRad = (planeRaans[pi] * Math.PI) / 180;
      for (let si = 0; si < showSatsPerPlane; si++) {
        const angle = raanRad + (si / showSatsPerPlane) * 2 * Math.PI;
        const sx = cx + orbitR * Math.cos(angle);
        const sy = cy + orbitR * Math.sin(angle);
        satDots.push({
          cx: sx,
          cy: sy,
          color: PLANE_COLORS[pi % PLANE_COLORS.length],
          plane: pi,
        });
      }
    }

    // Orbit ring circles for each shown plane
    const orbitRings = planeRaans.map((_, i) => ({
      r: orbitR,
      color: PLANE_COLORS[i % PLANE_COLORS.length],
      opacity: 0.12 + (i / showPlanes) * 0.08,
    }));

    return (
      <div className="relative w-full aspect-square max-w-[380px] mx-auto">
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background glow */}
          <defs>
            <radialGradient id="earth-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.04" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="earth-body" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#064e3b" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r={maxOrbitR + 10} fill="url(#earth-glow)" />

          {/* Orbit rings */}
          {orbitRings.map((ring, i) => (
            <circle
              key={`ring-${i}`}
              cx={cx}
              cy={cy}
              r={ring.r}
              fill="none"
              stroke={ring.color}
              strokeWidth={i === 0 ? 1.2 : 0.6}
              strokeOpacity={ring.opacity}
              strokeDasharray={i > 0 ? "4 4" : "none"}
            />
          ))}

          {/* Earth */}
          <circle cx={cx} cy={cy} r={earthR} fill="url(#earth-body)" />
          <circle
            cx={cx}
            cy={cy}
            r={earthR}
            fill="none"
            stroke="#06b6d4"
            strokeWidth={1}
            strokeOpacity={0.4}
          />

          {/* Rotating satellite group */}
          <g
            className="orbit-satellite-rotate"
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              animation: "orbit-spin 180s linear infinite",
            }}
          >
            {satDots.map((sat, idx) => (
              <circle
                key={`sat-${idx}`}
                cx={sat.cx}
                cy={sat.cy}
                r={totalSats > 500 ? 1.8 : 2.8}
                fill={sat.color}
                opacity={0.9}
              />
            ))}
          </g>

          {/* Center label */}
          <text
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            fill="white"
            fontSize={7}
            fontFamily="monospace"
            opacity={0.8}
          >
            EARTH
          </text>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-x-3 gap-y-1 justify-center">
          {Array.from({ length: Math.min(showPlanes, 6) }).map((_, i) => (
            <div key={`legend-${i}`} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: PLANE_COLORS[i] }}
              />
              <span className="text-[9px] text-gray-500 dark:text-gray-400 font-mono">
                P{i + 1}
              </span>
            </div>
          ))}
          {showPlanes > 6 && (
            <span className="text-[9px] text-gray-500 dark:text-gray-400 font-mono">
              +{showPlanes - 6} more
            </span>
          )}
        </div>
      </div>
    );
  }, [activeParams]);

  /* ---- Walker Notation ---- */
  const walkerDisplay = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="flex items-center justify-center gap-2 mb-6"
    >
      <span className="text-xs text-gray-500 uppercase tracking-wider">Walker Delta</span>
      <code className="px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-sm shadow-[0_0_8px_rgba(16,185,129,0.1)]">
        {metrics.walkerNotation}
      </code>
    </motion.div>
  );

  /* ---- Coverage Metrics (4 cards) ---- */
  const coverageItems = [
    {
      label: "Global Coverage",
      value: `${metrics.coveragePct.toFixed(1)}`,
      unit: "%",
      icon: Globe2,
      color: "#06b6d4",
    },
    {
      label: "Revisit Time",
      value: `${metrics.revisitMin.toFixed(1)}`,
      unit: "min",
      icon: Clock,
      color: "#38bdf8",
    },
    {
      label: "Max Gap",
      value: `${metrics.maxGapMin.toFixed(1)}`,
      unit: "min",
      icon: Crosshair,
      color: "#f59e0b",
    },
    {
      label: "Simultaneous Visible",
      value: `${metrics.simVisibleSats}`,
      unit: "sats",
      icon: Eye,
      color: "#a78bfa",
    },
  ];

  const coverageCards = (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      {coverageItems.map((item) => (
        <Card
          key={item.label}
          className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800"
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${item.color}15` }}
            >
              <item.icon className="h-5 w-5" style={{ color: item.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
                {item.value}{" "}
                <span className="text-xs text-gray-400 font-sans">{item.unit}</span>
              </p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );

  /* ---- Performance Grid (8 cards) ---- */
  const perfItems = [
    { label: "Total Satellites", value: `${metrics.totalSats.toLocaleString()}`, unit: "", icon: Layers, color: "#06b6d4" },
    { label: "Period", value: `${metrics.periodMin.toFixed(1)}`, unit: "min", icon: Clock, color: "#38bdf8" },
    { label: "Velocity", value: `${metrics.velocityKms.toFixed(3)}`, unit: "km/s", icon: Zap, color: "#f59e0b" },
    { label: "Track Spacing", value: `${metrics.trackSpacingKm.toFixed(1)}`, unit: "km", icon: Activity, color: "#a78bfa" },
    { label: "Latency (RT)", value: `${metrics.latencyMs.toFixed(1)}`, unit: "ms", icon: Gauge, color: "#f43f5e" },
    { label: "Throughput", value: `${metrics.throughputGbps.toFixed(2)}`, unit: "Gbps", icon: BarChart3, color: "#22d3ee" },
    { label: "Total Mass", value: `${(metrics.totalMassKg / 1000).toFixed(1)}`, unit: "t", icon: Weight, color: "#fb923c" },
    { label: "Est. Cost", value: `$${metrics.estCostB.toFixed(2)}`, unit: "B", icon: DollarSign, color: "#f472b6" },
  ];

  const performanceGrid = (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {perfItems.map((item) => (
        <Card
          key={item.label}
          className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">{item.label}</span>
            </div>
            <p className="text-xl font-bold font-mono text-gray-900 dark:text-white">
              {item.value}{" "}
              {item.unit && <span className="text-xs text-gray-400 font-sans">{item.unit}</span>}
            </p>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );

  /* ---- Comparison Table ---- */
  const comparisonRows = useMemo(() => {
    const keys = [...PRESETS.map((p) => p.name), "Custom"];
    return keys.map((name) => {
      const m = allMetrics.get(name)!;
      const params = name === "Custom" ? customParams : PRESETS.find((p) => p.name === name)!.params;
      return { name, params, m };
    });
  }, [allMetrics, customParams]);

  const comparisonTable = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.25 }}
    >
      <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            Preset Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-h-96 overflow-y-auto custom-scrollbar rounded-lg border border-gray-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-slate-900 z-10">
                <tr className="border-b border-gray-200 dark:border-slate-800">
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Constellation
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alt (km)
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Incl (°)
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Total Sats
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Coverage
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Latency (ms)
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Cost ($B)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-800/50">
                {comparisonRows.map((row) => {
                  const isSelected = row.name === selectedPreset;
                  return (
                    <tr
                      key={row.name}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-cyan-500/10 dark:bg-cyan-500/5"
                          : "hover:bg-gray-100 dark:hover:bg-slate-800/30"
                      }`}
                      onClick={() => handlePresetSelect(row.name)}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                          )}
                          <span
                            className={`text-xs font-medium ${
                              isSelected
                                ? "text-cyan-400"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {row.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                        {row.params.altitude.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                        {row.params.inclination}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                        {row.m.totalSats.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-600 dark:text-gray-400 hidden md:table-cell">
                        {row.m.coveragePct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-600 dark:text-gray-400 hidden md:table-cell">
                        {row.m.latencyMs.toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                        ${row.m.estCostB.toFixed(2)}B
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  /* ---- Render ---- */
  return (
    <section id="constellation-designer" className="py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Constellation Designer"
          subtitle="Design, visualize, and compare satellite constellation architectures with real-time orbital mechanics"
          icon={<Satellite className="h-6 w-6 text-cyan-400" />}
          sectionNumber="41"
        />

        {/* Preset buttons + Walker notation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          {presetButtons}
          {walkerDisplay}
        </motion.div>

        {/* Main layout: form + visualization side-by-side */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Left: Parameters + Custom form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Active params display */}
            <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Crosshair className="h-4 w-4 text-cyan-400" />
                  Active Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Altitude</p>
                    <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                      {activeParams.altitude.toLocaleString()}{" "}
                      <span className="text-xs text-gray-400 font-sans">km</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Inclination</p>
                    <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                      {activeParams.inclination}°
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Orbital Planes</p>
                    <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                      {activeParams.planes}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Sats / Plane</p>
                    <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                      {activeParams.satsPerPlane}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-slate-800/50">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Custom Parameters</p>
                  {customForm}
                </div>
              </CardContent>
            </Card>

            {/* Walker notation callout */}
            <Card className="bg-cyan-500/5 dark:bg-cyan-500/5 border-cyan-500/20 dark:border-cyan-500/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <Braces className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Walker Delta Configuration</p>
                  <code className="text-base font-mono text-cyan-400 font-bold">
                    {metrics.walkerNotation}
                  </code>
                  <p className="text-[10px] text-gray-500 mt-1 font-mono">
                    i / T / P / F — inclination / total sats / planes / phasing
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right: SVG Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-cyan-400" />
                  Top-Down Orbit View
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex items-center justify-center">
                {svgViz}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Coverage Metrics */}
        <div className="mb-8">
          <motion.h3
            className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
          >
            Coverage Analysis
          </motion.h3>
          {coverageCards}
        </div>

        {/* Performance Grid */}
        <div className="mb-8">
          <motion.h3
            className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
          >
            Performance Metrics
          </motion.h3>
          {performanceGrid}
        </div>

        {/* Comparison Table */}
        {comparisonTable}

        {/* CSS keyframe for orbit rotation */}
        <style jsx global>{`
          @keyframes orbit-spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </section>
  );
}