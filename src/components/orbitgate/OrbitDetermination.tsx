"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crosshair,
  RotateCw,
  Activity,
  Globe2,
  Satellite,
  ArrowUpDown,
  Target,
  Radio,
  TrendingUp,
  MapPin,
  Clock,
  Eye,
  CircleDot,
  VectorSquare,
  BarChart3,
  ScanSearch,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

// ─── Types ──────────────────────────────────────────────────────────────
interface Observation {
  id: number;
  time: string;
  azimuth: string;
  elevation: string;
  range: string;
}

interface OrbitalElements {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  raan: number;
  argPerigee: number;
  meanAnomaly: number;
}

interface StateVector {
  px: number; py: number; pz: number;
  vx: number; vy: number; vz: number;
}

interface Residual {
  obs: number;
  value: number;
}

interface Station {
  name: string;
  location: string;
  obsCount: number;
  lastObs: string;
  online: boolean;
}

// ─── Mock Data ──────────────────────────────────────────────────────────
const DEFAULT_OBSERVATIONS: Observation[] = [
  { id: 1, time: "2025-06-27T12:00:00Z", azimuth: "45.23", elevation: "62.18", range: "487.32" },
  { id: 2, time: "2025-06-27T12:02:30Z", azimuth: "68.91", elevation: "71.45", range: "412.87" },
  { id: 3, time: "2025-06-27T12:05:00Z", azimuth: "97.54", elevation: "54.33", range: "523.14" },
];

const MOCK_ELEMENTS: OrbitalElements = {
  semiMajorAxis: 6778.14,
  eccentricity: 0.0006217,
  inclination: 51.6416,
  raan: 247.4627,
  argPerigee: 130.5360,
  meanAnomaly: 325.0288,
};

const MOCK_STATE_VECTOR: StateVector = {
  px: -3387.45, py: 5432.18, pz: 2671.93,
  vx: -5.142, vy: 3.867, vz: 4.891,
};

const MOCK_RESIDUALS: Residual[] = [
  { obs: 1, value: -0.42 },
  { obs: 2, value: 0.18 },
  { obs: 3, value: -0.87 },
  { obs: 4, value: 2.31 },
  { obs: 5, value: -0.15 },
  { obs: 6, value: 0.63 },
  { obs: 7, value: -1.24 },
  { obs: 8, value: 0.09 },
  { obs: 9, value: 3.78 },
  { obs: 10, value: -0.56 },
  { obs: 11, value: 0.41 },
  { obs: 12, value: -0.33 },
];

const MOCK_STATIONS: Station[] = [
  { name: "MCC-M Moscow", location: "50.5°N, 37.6°E", obsCount: 1847, lastObs: "12:04:32 UTC", online: true },
  { name: "Goldstone DSN", location: "35.4°N, 243.2°E", obsCount: 2103, lastObs: "11:58:17 UTC", online: true },
  { name: "Wallops ISFS", location: "37.9°N, 284.5°E", obsCount: 956, lastObs: "11:47:05 UTC", online: true },
  { name: "Svalbard SGAR", location: "78.2°N, 15.4°E", obsCount: 0, lastObs: "—", online: false },
];

// ─── Helpers ────────────────────────────────────────────────────────────
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
}

function formatNum(v: number, decimals: number = 4): string {
  return v.toFixed(decimals);
}

// ─── Component ──────────────────────────────────────────────────────────
export function OrbitDetermination() {
  const [observations, setObservations] = useState<Observation[]>(DEFAULT_OBSERVATIONS);
  const [calculated, setCalculated] = useState(false);
  const [showStateVector, setShowStateVector] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const handleObservationChange = useCallback((id: number, field: keyof Observation, value: string) => {
    setObservations((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  }, []);

  const handleCalculate = useCallback(() => {
    setCalculating(true);
    setTimeout(() => {
      setCalculated(true);
      setCalculating(false);
    }, 1200);
  }, []);

  const handleReset = useCallback(() => {
    setObservations(DEFAULT_OBSERVATIONS);
    setCalculated(false);
    setShowStateVector(false);
  }, []);

  const handleToggleView = useCallback(() => {
    setShowStateVector((prev) => !prev);
  }, []);

  const rmsResidual = useMemo(() => {
    const sumSq = MOCK_RESIDUALS.reduce((s, r) => s + r.value * r.value, 0);
    return Math.sqrt(sumSq / MOCK_RESIDUALS.length);
  }, []);

  const qualityBadge = useMemo(() => {
    if (rmsResidual < 1.5) return { label: "Good", color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30" };
    if (rmsResidual < 3.0) return { label: "Fair", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" };
    return { label: "Poor", color: "text-red-400 bg-red-500/15 border-red-500/30" };
  }, [rmsResidual]);

  // ─── Observation form field ────────────────────────────────────────
  const observationFields = observations.map((obs) => (
    <motion.div
      key={obs.id}
      className="grid grid-cols-4 gap-3 items-end"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: obs.id * 0.08 }}
    >
      <div className="space-y-1.5">
        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
          Time (UTC)
        </label>
        <input
          type="text"
          value={obs.time}
          onChange={(e) => handleObservationChange(obs.id, "time", e.target.value)}
          className="w-full bg-gray-100 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 dark:text-white focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/20 focus:outline-none transition-colors"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
          Azimuth (°)
        </label>
        <input
          type="text"
          value={obs.azimuth}
          onChange={(e) => handleObservationChange(obs.id, "azimuth", e.target.value)}
          className="w-full bg-gray-100 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 dark:text-white focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/20 focus:outline-none transition-colors"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
          Elevation (°)
        </label>
        <input
          type="text"
          value={obs.elevation}
          onChange={(e) => handleObservationChange(obs.id, "elevation", e.target.value)}
          className="w-full bg-gray-100 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 dark:text-white focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/20 focus:outline-none transition-colors"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
          Range (km)
        </label>
        <input
          type="text"
          value={obs.range}
          onChange={(e) => handleObservationChange(obs.id, "range", e.target.value)}
          className="w-full bg-gray-100 dark:bg-slate-800/60 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 dark:text-white focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/20 focus:outline-none transition-colors"
        />
      </div>
    </motion.div>
  ));

  // ─── Orbital element cards ────────────────────────────────────────
  const elementCards = [
    { label: "Semi-major Axis", value: formatNum(MOCK_ELEMENTS.semiMajorAxis, 2), unit: "km", icon: <ArrowUpDown className="h-4 w-4" />, desc: "Half the longest diameter of the orbital ellipse" },
    { label: "Eccentricity", value: formatNum(MOCK_ELEMENTS.eccentricity, 7), unit: "", icon: <Target className="h-4 w-4" />, desc: "Deviation from circular orbit (0 = circle)" },
    { label: "Inclination", value: formatNum(MOCK_ELEMENTS.inclination, 4), unit: "°", icon: <RotateCw className="h-4 w-4" />, desc: "Tilt of orbit plane relative to equator" },
    { label: "RAAN", value: formatNum(MOCK_ELEMENTS.raan, 4), unit: "°", icon: <Crosshair className="h-4 w-4" />, desc: "Right Ascension of Ascending Node" },
    { label: "Arg of Perigee", value: formatNum(MOCK_ELEMENTS.argPerigee, 4), unit: "°", icon: <CircleDot className="h-4 w-4" />, desc: "Angle from ascending node to perigee" },
    { label: "Mean Anomaly", value: formatNum(MOCK_ELEMENTS.meanAnomaly, 4), unit: "°", icon: <Activity className="h-4 w-4" />, desc: "Position along orbit at epoch" },
  ];

  const orbitalElementsGrid = elementCards.map((el, i) => (
    <motion.div
      key={el.label}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)]"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + i * 0.07 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-cyan-400 [filter:drop-shadow(0_0_4px_rgba(16,185,129,0.4))]">
          {el.icon}
        </span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">{el.label}</span>
      </div>
      <p className="text-lg font-mono text-white font-semibold" style={{ textShadow: "0 0 8px rgba(16,185,129,0.15)" }}>
        {el.value}
        {el.unit && <span className="text-xs text-gray-400 font-sans ml-1">{el.unit}</span>}
      </p>
      <p className="text-[10px] text-gray-500 mt-1.5 leading-tight">{el.desc}</p>
    </motion.div>
  ));

  // ─── State vector component ───────────────────────────────────────
  const stateVectorBlock = (
    <GlassCard className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <VectorSquare className="h-4 w-4 text-cyan-400" />
        <h4 className="text-xs font-mono text-gray-300 uppercase tracking-wider">ECI State Vector</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-cyan-400/70 uppercase tracking-wider font-mono mb-2">Position (km)</p>
          <div className="space-y-1.5">
            {(["px", "py", "pz"] as const).map((axis) => (
              <div key={axis} className="flex items-center justify-between bg-slate-900/60 rounded-lg px-3 py-1.5">
                <span className="text-[10px] font-mono text-gray-500">{axis.toUpperCase()}</span>
                <span className="text-sm font-mono text-white">{formatNum(MOCK_STATE_VECTOR[axis], 2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-cyan-400/70 uppercase tracking-wider font-mono mb-2">Velocity (km/s)</p>
          <div className="space-y-1.5">
            {(["vx", "vy", "vz"] as const).map((axis) => (
              <div key={axis} className="flex items-center justify-between bg-slate-900/60 rounded-lg px-3 py-1.5">
                <span className="text-[10px] font-mono text-gray-500">{axis.toUpperCase()}</span>
                <span className="text-sm font-mono text-white">{formatNum(MOCK_STATE_VECTOR[axis], 3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );

  // ─── Station cards ────────────────────────────────────────────────
  const stationCards = MOCK_STATIONS.map((s, i) => (
    <motion.div
      key={s.name}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-cyan-500/30 transition-all duration-300"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + i * 0.06 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-xs font-medium text-white">{s.name}</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
          s.online
            ? "text-cyan-400 bg-cyan-500/15 border-cyan-500/30"
            : "text-gray-500 bg-gray-500/10 border-gray-500/20"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.online ? "bg-cyan-400 animate-pulse" : "bg-gray-600"}`} />
          {s.online ? "ONLINE" : "OFFLINE"}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-2">
        <MapPin className="h-3 w-3" />
        <span className="font-mono">{s.location}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-gray-600">Obs Count</p>
          <p className="text-sm font-mono text-white">{s.obsCount.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-600">Last Obs</p>
          <p className="text-sm font-mono text-white">{s.lastObs}</p>
        </div>
      </div>
    </motion.div>
  ));

  // ─── Residuals SVG ────────────────────────────────────────────────
  const residualSvgWidth = 520;
  const residualSvgHeight = 180;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = residualSvgWidth - padL - padR;
  const plotH = residualSvgHeight - padT - padB;

  const maxRes = Math.max(...MOCK_RESIDUALS.map((r) => Math.abs(r.value)), 1);
  const yRange = Math.ceil(maxRes / 1) * 1;

  const residualDots = MOCK_RESIDUALS.map((r, i) => {
    const x = padL + (i / (MOCK_RESIDUALS.length - 1)) * plotW;
    const y = padT + (0.5 - r.value / (2 * yRange)) * plotH;
    const color =
      Math.abs(r.value) < 1
        ? "#22d3ee"
        : Math.abs(r.value) < 5
        ? "#fbbf24"
        : "#f87171";
    return (
      <g key={i}>
        <circle cx={x} cy={y} r={4} fill={color} opacity={0.9} className="hover:opacity-100 transition-opacity" />
        <circle cx={x} cy={y} r={7} fill="none" stroke={color} strokeWidth={1} opacity={0.3} />
      </g>
    );
  });

  const residualsSvg = (
    <svg
      viewBox={`0 0 ${residualSvgWidth} ${residualSvgHeight}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background */}
      <rect width={residualSvgWidth} height={residualSvgHeight} rx={8} className="fill-slate-900/60" />

      {/* Grid lines */}
      {[1, 0, -1].map((v) => {
        const y = padT + (0.5 - v / (2 * yRange)) * plotH;
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={residualSvgWidth - padR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-gray-500 text-[8px] font-mono">{v}</text>
          </g>
        );
      })}

      {/* Zero line (dashed) */}
      {(() => {
        const zeroY = padT + 0.5 * plotH;
        return (
          <line
            x1={padL} y1={zeroY} x2={residualSvgWidth - padR} y2={zeroY}
            stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="4 3"
          />
        );
      })()}

      {/* X-axis labels */}
      {MOCK_RESIDUALS.map((r, i) => {
        if (i % 3 !== 0 && i !== MOCK_RESIDUALS.length - 1) return null;
        const x = padL + (i / (MOCK_RESIDUALS.length - 1)) * plotW;
        return (
          <text key={i} x={x} y={residualSvgHeight - 6} textAnchor="middle" className="fill-gray-500 text-[8px] font-mono">
            {r.obs}
          </text>
        );
      })}

      {/* Axis titles */}
      <text x={residualSvgWidth / 2} y={residualSvgHeight - 1} textAnchor="middle" className="fill-gray-600 text-[8px]">Observation #</text>
      <text x={10} y={residualSvgHeight / 2} textAnchor="middle" transform={`rotate(-90, 10, ${residualSvgHeight / 2})`} className="fill-gray-600 text-[8px]">Residual (km)</text>

      {/* Dots */}
      {residualDots}

      {/* Legend */}
      <circle cx={padL + 4} cy={padT - 4} r={3} fill="#22d3ee" />
      <text x={padL + 10} y={padT - 1} className="fill-gray-500 text-[7px]">&lt;1 km</text>
      <circle cx={padL + 52} cy={padT - 4} r={3} fill="#fbbf24" />
      <text x={padL + 58} y={padT - 1} className="fill-gray-500 text-[7px]">1–5 km</text>
      <circle cx={padL + 104} cy={padT - 4} r={3} fill="#f87171" />
      <text x={padL + 110} y={padT - 1} className="fill-gray-500 text-[7px]">&gt;5 km</text>
    </svg>
  );

  // ─── Ground Track SVG ─────────────────────────────────────────────
  const gtW = 520;
  const gtH = 200;
  const gtPadL = 24;
  const gtPadR = 24;
  const gtPadT = 12;
  const gtPadB = 20;
  const gtPlotW = gtW - gtPadL - gtPadR;
  const gtPlotH = gtH - gtPadT - gtPadB;

  // Generate ISS-like ground track points
  const groundTrackPoints: { x: number; y: number; isObs: boolean }[] = [];
  const numTrackPts = 200;
  for (let i = 0; i < numTrackPts; i++) {
    const lon = -180 + (360 / numTrackPts) * i;
    const lat = 51.6 * Math.sin(((lon + 30) * Math.PI) / 180);
    const x = gtPadL + ((lon + 180) / 360) * gtPlotW;
    const y = gtPadT + (0.5 - (lat + 70) / 140) * gtPlotH;
    const isObs = i === 45 || i === 78 || i === 112;
    groundTrackPoints.push({ x, y, isObs });
  }

  // Equator line
  const equatorY = gtPadT + (0.5 - 70 / 140) * gtPlotH;

  const groundTrackSvg = (
    <svg
      viewBox={`0 0 ${gtW} ${gtH}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={gtW} height={gtH} rx={8} className="fill-slate-900/60" />

      {/* Equator */}
      <line x1={gtPadL} y1={equatorY} x2={gtW - gtPadR} y2={equatorY} stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="3 3" />

      {/* Latitude labels */}
      <text x={gtPadL - 4} y={gtPadT + 4} textAnchor="end" className="fill-gray-600 text-[7px] font-mono">70°N</text>
      <text x={gtPadL - 4} y={equatorY + 3} textAnchor="end" className="fill-gray-600 text-[7px] font-mono">0°</text>
      <text x={gtPadL - 4} y={gtH - gtPadB - 2} textAnchor="end" className="fill-gray-600 text-[7px] font-mono">70°S</text>

      {/* Ground track line */}
      <polyline
        points={groundTrackPoints.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="rgba(16,185,129,0.3)"
        strokeWidth={1.5}
      />

      {/* Track dots (subsample for performance) */}
      {groundTrackPoints
        .filter((_, i) => i % 4 === 0 || _.isObs)
        .map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.isObs ? 4.5 : 1.2}
            fill={p.isObs ? "#fbbf24" : "rgba(16,185,129,0.5)"}
            stroke={p.isObs ? "#fbbf24" : "none"}
            strokeWidth={p.isObs ? 1.5 : 0}
          />
        ))}

      {/* Observation labels */}
      {groundTrackPoints
        .filter((p) => p.isObs)
        .map((p, i) => (
          <g key={`label-${i}`}>
            <circle cx={p.x} cy={p.y} r={8} fill="none" stroke="#fbbf24" strokeWidth={1} opacity={0.4} />
            <text x={p.x + 8} y={p.y - 6} className="fill-amber-400 text-[7px] font-mono">
              OBS-{i + 1}
            </text>
          </g>
        ))}

      {/* Legend */}
      <circle cx={gtW - gtPadR - 90} cy={gtPadT + 6} r={1.5} fill="rgba(16,185,129,0.5)" />
      <text x={gtW - gtPadR - 85} y={gtPadT + 9} className="fill-gray-500 text-[7px]">Ground Track</text>
      <circle cx={gtW - gtPadR - 42} cy={gtPadT + 6} r={3} fill="#fbbf24" />
      <text x={gtW - gtPadR - 36} y={gtPadT + 9} className="fill-gray-500 text-[7px]">Observation</text>
    </svg>
  );

  return (
    <section id="orbit-determination" className="relative py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          sectionNumber="§37"
          title="Orbit Determination & Tracking"
          subtitle="Gauss/Least-Squares ODTS — compute classical orbital elements from ground-based tracking observations"
          icon={<ScanSearch className="h-5 w-5 text-cyan-400" />}
        />

        {/* ── Tracking Data Input ─────────────────────────────────── */}
        <GlassCard className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Satellite className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-medium text-white">Tracking Data Input</h3>
            <span className="text-[10px] font-mono text-gray-500 ml-auto">Pre-filled: ISS sample pass</span>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-4 gap-3 mb-2">
            {["Time (UTC)", "Azimuth (°)", "Elevation (°)", "Range (km)"].map((h) => (
              <span key={h} className="text-[10px] text-cyan-400/60 uppercase tracking-wider font-mono">
                {h}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            {observationFields}
          </div>

          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-all duration-200 hover:shadow-[0_0_16px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {calculating ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  Computing...
                </>
              ) : (
                <>
                  <Crosshair className="h-3.5 w-3.5" />
                  Calculate Orbit
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-xs transition-all duration-200"
            >
              <RotateCw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </GlassCard>

        {/* ── Results (after calculation) ────────────────────────── */}
        <AnimatePresence>
          {calculated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Toggle: Orbital Elements vs State Vector */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleView}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                    !showStateVector
                      ? "bg-cyan-600/20 border-cyan-500/40 text-cyan-400"
                      : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Orbital Elements
                </button>
                <button
                  onClick={handleToggleView}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                    showStateVector
                      ? "bg-cyan-600/20 border-cyan-500/40 text-cyan-400"
                      : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <VectorSquare className="h-3.5 w-3.5" />
                  State Vector (ECI)
                </button>
              </div>

              {/* Orbital Elements Grid */}
              {!showStateVector && (
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {orbitalElementsGrid}
                </motion.div>
              )}

              {/* State Vector */}
              {showStateVector && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {stateVectorBlock}
                </motion.div>
              )}

              {/* ── Quality Metrics ──────────────────────────────── */}
              <GlassCard>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-sm font-medium text-white">Orbit Quality Metrics</h3>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${qualityBadge.color}`}>
                    {qualityBadge.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "RMS Residual", value: `${rmsResidual.toFixed(3)} km`, icon: <Activity className="h-3.5 w-3.5 text-cyan-400" /> },
                    { label: "Condition Number", value: "1.24e+3", icon: <BarChart3 className="h-3.5 w-3.5 text-cyan-400" /> },
                    { label: "Observations", value: "12", icon: <Eye className="h-3.5 w-3.5 text-cyan-400" /> },
                    { label: "Arc Length", value: "4m 27s", icon: <Clock className="h-3.5 w-3.5 text-cyan-400" /> },
                  ].map((m) => (
                    <div key={m.label} className="bg-slate-900/60 rounded-lg px-3 py-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        {m.icon}
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">{m.label}</span>
                      </div>
                      <p className="text-base font-mono text-white font-semibold">{m.value}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* ── Residuals Plot ───────────────────────────────── */}
              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-medium text-white">Observation Residuals</h3>
                  <span className="text-[10px] font-mono text-gray-500 ml-auto">RMS: {rmsResidual.toFixed(3)} km</span>
                </div>
                {residualsSvg}
              </GlassCard>

              {/* ── Ground Track Fit Visualization ───────────────── */}
              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Globe2 className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-medium text-white">Ground Track Fit</h3>
                  <span className="text-[10px] font-mono text-gray-500 ml-auto">Determined orbit projection</span>
                </div>
                {groundTrackSvg}
              </GlassCard>

              {/* ── Observation Stations ─────────────────────────── */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Radio className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-medium text-white">Observation Stations</h3>
                  <span className="text-[10px] font-mono text-gray-500 ml-auto">3/4 online</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stationCards}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}