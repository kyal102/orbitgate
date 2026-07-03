"use client";

import { useState, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  TrendingDown,
  Activity,
  Clock,
  Target,
  BarChart3,
  Sun,
  Zap,
  Shield,
  Flame,
  MapPin,
  AlertOctagon,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

// ─── Types ───────────────────────────────────────────────────────────
interface SatelliteOption {
  id: string;
  name: string;
  altitude: number; // km
  areaToMass: number; // m²/kg
  decayRate: number; // m/day (base, medium solar)
  controlled: boolean;
}

interface DecayPoint {
  year: number;
  altitude: number;
}

interface HistoricalReentry {
  object: string;
  date: string;
  location: string;
  outcome: "Controlled" | "Uncontrolled";
}

type SolarLevel = "Low" | "Medium" | "High";

// ─── Constants ───────────────────────────────────────────────────────
const SATELLITES: SatelliteOption[] = [
  { id: "iss", name: "ISS (ZARYA)", altitude: 408, areaToMass: 0.011, decayRate: 52, controlled: true },
  { id: "hubble", name: "Hubble Space Telescope", altitude: 535, areaToMass: 0.028, decayRate: 18, controlled: false },
  { id: "cosmos2251", name: "Cosmos 2251 Debris", altitude: 780, areaToMass: 0.005, decayRate: 0.8, controlled: false },
  { id: "tiangong", name: "Tiangong Space Station", altitude: 390, areaToMass: 0.013, decayRate: 65, controlled: true },
  { id: "falcon9s2", name: "Falcon 9 Stage 2", altitude: 340, areaToMass: 0.008, decayRate: 120, controlled: false },
];

const SOLAR_MULTIPLIER: Record<SolarLevel, number> = { Low: 0.5, Medium: 1.0, High: 2.5 };

const HISTORICAL_REENTRIES: HistoricalReentry[] = [
  { object: "Tiangong-1", date: "2018-04-02", location: "South Pacific", outcome: "Uncontrolled" },
  { object: "Progress MS-09", date: "2019-10-03", location: "Pacific Ocean", outcome: "Controlled" },
  { object: "Cosmos 2251 Debris", date: "2020-01-17", location: "Indian Ocean", outcome: "Uncontrolled" },
  { object: "Long March 5B Core", date: "2022-07-30", location: "Sulu Sea", outcome: "Uncontrolled" },
  { object: "ESA Aeolus", date: "2023-07-28", location: "Antarctica", outcome: "Controlled" },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function computeDecayCurve(
  sat: SatelliteOption,
  solar: SolarLevel
): DecayPoint[] {
  const mult = SOLAR_MULTIPLIER[solar];
  const points: DecayPoint[] = [];
  let alt = sat.altitude;
  for (let y = 0; y <= 10; y += 0.25) {
    // Drag increases exponentially as altitude drops (density ∝ exp(-h/H))
    // Scale height H ~ 58km for thermosphere
    const densityFactor = Math.exp(-(alt - 200) / 58);
    const decay = sat.decayRate * mult * (0.1 + 0.9 * densityFactor);
    points.push({ year: y, altitude: alt });
    alt -= decay * 0.25 / 365; // 0.25 year step
    if (alt <= 0) { alt = 0; }
  }
  return points;
}

function findReentryYear(points: DecayPoint[]): number | null {
  for (let i = 1; i < points.length; i++) {
    if (points[i].altitude <= 0 && points[i - 1].altitude > 0) {
      const frac = points[i - 1].altitude / (points[i - 1].altitude - points[i].altitude);
      return points[i - 1].year + frac * (points[i].year - points[i - 1].year);
    }
  }
  return null;
}

function formatReentryDate(yearsFromNow: number | null): string {
  if (yearsFromNow === null) return ">10 years";
  const date = new Date();
  date.setFullYear(date.getFullYear() + yearsFromNow);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function getRiskLevel(sat: SatelliteOption): { label: string; color: string; bg: string } {
  if (sat.controlled) return { label: "Very Low", color: "text-cyan-400", bg: "bg-cyan-500/10" };
  if (sat.altitude < 350) return { label: "Moderate", color: "text-amber-400", bg: "bg-amber-500/10" };
  if (sat.areaToMass > 0.02) return { label: "Low", color: "text-sky-400", bg: "bg-sky-500/10" };
  return { label: "Very Low", color: "text-cyan-400", bg: "bg-cyan-500/10" };
}

function computeBreakup(sat: SatelliteOption, reentryYears: number | null) {
  if (reentryYears === null) return null;
  const mass = sat.id === "iss" ? 420000 : sat.id === "hubble" ? 11110 : sat.id === "cosmos2251" ? 900 : sat.id === "tiangong" ? 100000 : 4000;
  const areaToMass = sat.areaToMass;
  const casualtyArea = Math.round(mass * areaToMass * 0.0015 + Math.random() * 5 + 8);
  const fragments = Math.max(3, Math.round(mass / 5000 + Math.random() * 10 + 15));
  return { casualtyArea, fragments, mass };
}

// ─── Component ───────────────────────────────────────────────────────

export function ReentryPredictor() {
  const [selectedId, setSelectedId] = useState<string>("falcon9s2");
  const [solarLevel, setSolarLevel] = useState<SolarLevel>("Medium");

  // ── Callbacks (defined before JSX const variables) ──
  const handleSatelliteChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedId(e.target.value);
    },
    []
  );

  const handleSolarChange = useCallback(
    (level: SolarLevel) => {
      setSolarLevel(level);
    },
    []
  );

  // ── Derived state ──
  const satellite = useMemo(
    () => SATELLITES.find((s) => s.id === selectedId) ?? SATELLITES[0],
    [selectedId]
  );

  const decayCurve = useMemo(
    () => computeDecayCurve(satellite, solarLevel),
    [satellite, solarLevel]
  );

  const reentryYear = useMemo(() => findReentryYear(decayCurve), [decayCurve]);

  const breakup = useMemo(
    () => computeBreakup(satellite, reentryYear),
    [satellite, reentryYear]
  );

  const risk = useMemo(() => getRiskLevel(satellite), [satellite]);

  const currentDecayRate = useMemo(() => {
    const mult = SOLAR_MULTIPLIER[solarLevel];
    const densityFactor = Math.exp(-(satellite.altitude - 200) / 58);
    return (satellite.decayRate * mult * (0.1 + 0.9 * densityFactor)).toFixed(1);
  }, [satellite, solarLevel]);

  const remainingOrbits = useMemo(() => {
    if (reentryYear === null) return ">100,000";
    const period = 2 * Math.PI * Math.sqrt(Math.pow(6371 + satellite.altitude, 3) / 398600);
    const totalSeconds = reentryYear * 365.25 * 86400;
    return Math.round(totalSeconds / period).toLocaleString();
  }, [satellite, reentryYear]);

  // ── Chart dimensions ──
  const chartW = 700;
  const chartH = 260;
  const chartPad = { top: 20, right: 20, bottom: 36, left: 52 };
  const plotW = chartW - chartPad.left - chartPad.right;
  const plotH = chartH - chartPad.top - chartPad.bottom;

  const maxAlt = 900;

  // ── Decay chart helpers ──
  const decayPoints = useMemo(() => {
    return decayCurve
      .map((p) => ({
        x: chartPad.left + (p.year / 10) * plotW,
        y: chartPad.top + plotH - (Math.max(0, p.altitude) / maxAlt) * plotH,
      }))
      .filter((_, i) => i % 2 === 0); // thin out for perf
  }, [decayCurve]);

  const decayPathD = useMemo(() => {
    if (decayPoints.length < 2) return "";
    return `M ${decayPoints.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  }, [decayPoints]);

  const reentryChartPoint = useMemo(() => {
    if (reentryYear === null) return null;
    const x = chartPad.left + (reentryYear / 10) * plotW;
    const y = chartPad.top + plotH;
    return { x, y };
  }, [reentryYear]);

  const currentAltPoint = useMemo(() => {
    return {
      x: chartPad.left,
      y: chartPad.top + plotH - (satellite.altitude / maxAlt) * plotH,
    };
  }, [satellite.altitude]);

  // ── Atmospheric density chart ──
  const densChartW = 700;
  const densChartH = 200;
  const densPad = { top: 16, right: 20, bottom: 36, left: 62 };
  const densPlotW = densChartW - densPad.left - densPad.right;
  const densPlotH = densChartH - densPad.top - densPad.bottom;

  const densityPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let alt = 100; alt <= 1000; alt += 10) {
      const density = Math.pow(10, -7.5 + (1000 - alt) / 120); // simplified exponential
      const logDensity = Math.log10(density);
      const minLog = -14;
      const maxLog = -6;
      const x = densPad.left + ((alt - 100) / 900) * densPlotW;
      const y = densPad.top + densPlotH - ((logDensity - minLog) / (maxLog - minLog)) * densPlotH;
      pts.push({ x, y: Math.max(densPad.top, Math.min(densPad.top + densPlotH, y)) });
    }
    return pts;
  }, []);

  const densityPathD = useMemo(() => {
    if (densityPoints.length < 2) return "";
    return `M ${densityPoints.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  }, [densityPoints]);

  const satDensityPoint = useMemo(() => {
    const alt = satellite.altitude;
    const density = Math.pow(10, -7.5 + (1000 - alt) / 120);
    const logDensity = Math.log10(density);
    const minLog = -14;
    const maxLog = -6;
    const x = densPad.left + ((alt - 100) / 900) * densPlotW;
    const y = densPad.top + densPlotH - ((logDensity - minLog) / (maxLog - minLog)) * densPlotH;
    return { x, y: Math.max(densPad.top, Math.min(densPad.top + densPlotH, y)) };
  }, [satellite.altitude]);

  // ── Solar cycle chart ──
  const solarChartW = 700;
  const solarChartH = 180;
  const solarPad = { top: 16, right: 20, bottom: 36, left: 52 };
  const solarPlotW = solarChartW - solarPad.left - solarPad.right;
  const solarPlotH = solarChartH - solarPad.top - solarPad.bottom;

  const solarCyclePoints = useMemo(() => {
    const pts: { x: number; y: number; altY: number }[] = [];
    for (let y = 0; y <= 10; y += 0.1) {
      const solarActivity = 0.5 + 0.5 * Math.sin(2 * Math.PI * (y - 2) / 11);
      const x = solarPad.left + (y / 10) * solarPlotW;
      const y1 = solarPad.top + solarPlotH - solarActivity * solarPlotH;
      // Altitude overlay (normalized)
      const idx = Math.min(Math.floor(y / 0.25), decayCurve.length - 1);
      const alt = decayCurve[idx]?.altitude ?? 0;
      const altNorm = Math.max(0, alt) / maxAlt;
      const altY = solarPad.top + solarPlotH - altNorm * solarPlotH;
      pts.push({ x, y: y1, altY });
    }
    return pts;
  }, [decayCurve]);

  const solarPathD = useMemo(() => {
    if (solarCyclePoints.length < 2) return "";
    return `M ${solarCyclePoints.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  }, [solarCyclePoints]);

  const solarAltPathD = useMemo(() => {
    if (solarCyclePoints.length < 2) return "";
    return `M ${solarCyclePoints.map((p) => `${p.x},${p.altY}`).join(" L ")}`;
  }, [solarCyclePoints]);

  // ── JSX ──
  const solarButtons = (["Low", "Medium", "High"] as SolarLevel[]).map((level) => {
    const isActive = solarLevel === level;
    const colors: Record<SolarLevel, string> = {
      Low: isActive ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "border-slate-700 text-slate-400 hover:text-slate-200",
      Medium: isActive ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "border-slate-700 text-slate-400 hover:text-slate-200",
      High: isActive ? "bg-red-500/20 border-red-500/50 text-red-400" : "border-slate-700 text-slate-400 hover:text-slate-200",
    };
    return (
      <button
        key={level}
        onClick={() => handleSolarChange(level)}
        className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${colors[level]}`}
      >
        {level === "Low" && <Sun className="inline h-3 w-3 mr-1" />}
        {level === "Medium" && <Activity className="inline h-3 w-3 mr-1" />}
        {level === "High" && <Zap className="inline h-3 w-3 mr-1" />}
        {level}
      </button>
    );
  });

  const statCards = [
    {
      icon: <Clock className="h-4 w-4 text-cyan-400" />,
      label: "Est. Reentry Date",
      value: formatReentryDate(reentryYear),
      sub: reentryYear !== null ? `~${reentryYear.toFixed(1)} yrs` : "Beyond prediction window",
    },
    {
      icon: <Activity className="h-4 w-4 text-sky-400" />,
      label: "Remaining Orbits",
      value: remainingOrbits,
      sub: `At ${satellite.altitude}km`,
    },
    {
      icon: <TrendingDown className="h-4 w-4 text-amber-400" />,
      label: "Current Decay Rate",
      value: `${currentDecayRate} m/day`,
      sub: solarLevel + " solar activity",
    },
    {
      icon: <BarChart3 className="h-4 w-4 text-purple-400" />,
      label: "Area-to-Mass Ratio",
      value: `${satellite.areaToMass} m²/kg`,
      sub: satellite.areaToMass > 0.02 ? "High drag" : satellite.areaToMass > 0.01 ? "Moderate drag" : "Low drag",
    },
  ].map((card) => (
    <div
      key={card.label}
      className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-4 flex flex-col gap-2 hover:border-cyan-500/30 transition-colors duration-300"
    >
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {card.icon}
        {card.label}
      </div>
      <div className="text-lg font-bold text-white font-mono">{card.value}</div>
      <div className="text-[10px] text-slate-500">{card.sub}</div>
    </div>
  ));

  const historicalRows = HISTORICAL_REENTRIES.map((entry, i) => {
    const isControlled = entry.outcome === "Controlled";
    return (
      <tr
        key={i}
        className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 transition-colors"
      >
        <td className="py-2.5 px-3 text-sm text-white font-medium">{entry.object}</td>
        <td className="py-2.5 px-3 text-sm text-slate-300 font-mono">{entry.date}</td>
        <td className="py-2.5 px-3 text-sm text-slate-400 flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-slate-500" />
          {entry.location}
        </td>
        <td className="py-2.5 px-3 text-right">
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              isControlled
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
            }`}
          >
            <Shield className="h-3 w-3" />
            {entry.outcome}
          </span>
        </td>
      </tr>
    );
  });

  return (
    <section id="reentry-predictor" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Reentry & Orbital Decay Predictor"
          subtitle="Simulate long-term orbital decay under variable solar activity and assess reentry risk"
          icon={<Flame className="h-6 w-6 text-red-400" />}
          sectionNumber="SEC-42"
        />

        {/* Satellite Selection + Solar Slider */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Satellite / Debris Object</label>
              <select
                value={selectedId}
                onChange={handleSatelliteChange}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
              >
                {SATELLITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.altitude}km
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                <Sun className="inline h-3.5 w-3.5 mr-1 text-amber-400" />
                Solar Activity Level
              </label>
              <div className="flex gap-2">{solarButtons}</div>
            </div>
          </div>
        </div>

        {/* Key Predictions — 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards}
        </div>

        {/* Decay Prediction Chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-cyan-400" />
            Altitude Decay Prediction (10-Year Horizon)
          </h3>
          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[500px]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="decayFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(16,185,129)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="rgb(16,185,129)" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="reentryZone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(239,68,68)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="rgb(239,68,68)" stopOpacity="0.08" />
                </linearGradient>
              </defs>

              {/* Reentry zone below 200km */}
              {(() => {
                const zoneTop = chartPad.top + plotH - (200 / maxAlt) * plotH;
                return (
                  <rect
                    x={chartPad.left}
                    y={zoneTop}
                    width={plotW}
                    height={chartPad.top + plotH - zoneTop}
                    fill="url(#reentryZone)"
                  />
                );
              })()}
              {/* Reentry zone label */}
              {(() => {
                const zoneTop = chartPad.top + plotH - (200 / maxAlt) * plotH;
                return (
                  <text
                    x={chartPad.left + plotW - 8}
                    y={zoneTop + 14}
                    textAnchor="end"
                    className="text-[9px] fill-red-400/60"
                  >
                    REENTRY ZONE
                  </text>
                );
              })()}

              {/* 200km dashed line */}
              {(() => {
                const y200 = chartPad.top + plotH - (200 / maxAlt) * plotH;
                return (
                  <line
                    x1={chartPad.left}
                    y1={y200}
                    x2={chartPad.left + plotW}
                    y2={y200}
                    stroke="rgb(239,68,68)"
                    strokeWidth={0.5}
                    strokeDasharray="6,4"
                    opacity={0.5}
                  />
                );
              })()}

              {/* Grid lines */}
              {[0, 200, 400, 600, 800].map((alt) => {
                const y = chartPad.top + plotH - (alt / maxAlt) * plotH;
                return (
                  <g key={alt}>
                    <line
                      x1={chartPad.left}
                      y1={y}
                      x2={chartPad.left + plotW}
                      y2={y}
                      stroke="rgb(51,65,85)"
                      strokeWidth={0.5}
                    />
                    <text
                      x={chartPad.left - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[9px] fill-slate-500"
                    >
                      {alt}
                    </text>
                  </g>
                );
              })}
              {[0, 2, 4, 6, 8, 10].map((yr) => {
                const x = chartPad.left + (yr / 10) * plotW;
                return (
                  <g key={yr}>
                    <line
                      x1={x}
                      y1={chartPad.top}
                      x2={x}
                      y2={chartPad.top + plotH}
                      stroke="rgb(51,65,85)"
                      strokeWidth={0.5}
                    />
                    <text
                      x={x}
                      y={chartPad.top + plotH + 16}
                      textAnchor="middle"
                      className="text-[9px] fill-slate-500"
                    >
                      {yr}yr
                    </text>
                  </g>
                );
              })}

              {/* Axis labels */}
              <text
                x={chartPad.left + plotW / 2}
                y={chartH - 4}
                textAnchor="middle"
                className="text-[9px] fill-slate-500"
              >
                Years from now
              </text>
              <text
                x={12}
                y={chartPad.top + plotH / 2}
                textAnchor="middle"
                className="text-[9px] fill-slate-500"
                transform={`rotate(-90, 12, ${chartPad.top + plotH / 2})`}
              >
                Altitude (km)
              </text>

              {/* Fill under curve */}
              {decayPoints.length >= 2 && (
                <path
                  d={`${decayPathD} L ${decayPoints[decayPoints.length - 1].x},${chartPad.top + plotH} L ${decayPoints[0].x},${chartPad.top + plotH} Z`}
                  fill="url(#decayFill)"
                />
              )}

              {/* Main decay line */}
              {decayPoints.length >= 2 && (
                <path
                  d={decayPathD}
                  fill="none"
                  stroke="rgb(16,185,129)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Current altitude marker */}
              <circle
                cx={currentAltPoint.x}
                cy={currentAltPoint.y}
                r={5}
                fill="rgb(16,185,129)"
                stroke="rgb(16,185,129)"
                strokeWidth={2}
                opacity={0.9}
              />
              <text
                x={currentAltPoint.x + 10}
                y={currentAltPoint.y - 6}
                className="text-[10px] fill-cyan-400 font-mono"
              >
                {satellite.altitude}km
              </text>
              <text
                x={currentAltPoint.x + 10}
                y={currentAltPoint.y + 6}
                className="text-[8px] fill-slate-500"
              >
                Current
              </text>

              {/* Reentry explosion marker */}
              {reentryChartPoint && (
                <g>
                  <circle
                    cx={reentryChartPoint.x}
                    cy={reentryChartPoint.y}
                    r={8}
                    fill="rgb(239,68,68)"
                    opacity={0.15}
                  >
                    <animate
                      attributeName="r"
                      values="8;14;8"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.15;0.05;0.15"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <text
                    x={reentryChartPoint.x}
                    y={reentryChartPoint.y - 16}
                    textAnchor="middle"
                    className="text-[10px] fill-red-400 font-mono"
                  >
                    &#x1F4A5; REENTRY
                  </text>
                  <text
                    x={reentryChartPoint.x}
                    y={reentryChartPoint.y - 5}
                    textAnchor="middle"
                    className="text-[8px] fill-red-400/70 font-mono"
                  >
                    ~{reentryYear?.toFixed(1)}yr
                  </text>
                  <circle
                    cx={reentryChartPoint.x}
                    cy={reentryChartPoint.y}
                    r={4}
                    fill="rgb(239,68,68)"
                  />
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Atmospheric Density Model + Breakup Analysis — 2 column */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Atmospheric Density */}
          <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-sky-400" />
              Atmospheric Density vs Altitude
            </h3>
            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${densChartW} ${densChartH}`} className="w-full min-w-[400px]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="densFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(56,189,248)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="rgb(56,189,248)" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Grid */}
                {[-14, -12, -10, -8, -6].map((logV) => {
                  const y = densPad.top + densPlotH - ((logV - (-14)) / ((-6) - (-14))) * densPlotH;
                  const expLabel = `10^${logV}`;
                  return (
                    <g key={logV}>
                      <line
                        x1={densPad.left}
                        y1={y}
                        x2={densPad.left + densPlotW}
                        y2={y}
                        stroke="rgb(51,65,85)"
                        strokeWidth={0.5}
                      />
                      <text
                        x={densPad.left - 6}
                        y={y + 3}
                        textAnchor="end"
                        className="text-[8px] fill-slate-500 font-mono"
                      >
                        {expLabel}
                      </text>
                    </g>
                  );
                })}
                {[100, 300, 500, 700, 1000].map((alt) => {
                  const x = densPad.left + ((alt - 100) / 900) * densPlotW;
                  return (
                    <g key={alt}>
                      <line
                        x1={x}
                        y1={densPad.top}
                        x2={x}
                        y2={densPad.top + densPlotH}
                        stroke="rgb(51,65,85)"
                        strokeWidth={0.5}
                      />
                      <text
                        x={x}
                        y={densPad.top + densPlotH + 16}
                        textAnchor="middle"
                        className="text-[9px] fill-slate-500"
                      >
                        {alt}
                      </text>
                    </g>
                  );
                })}

                {/* Axis labels */}
                <text
                  x={densPad.left + densPlotW / 2}
                  y={densChartH - 4}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-500"
                >
                  Altitude (km)
                </text>
                <text
                  x={10}
                  y={densPad.top + densPlotH / 2}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-500"
                  transform={`rotate(-90, 10, ${densPad.top + densPlotH / 2})`}
                >
                  Density (kg/m³) log scale
                </text>

                {/* Fill + line */}
                {densityPoints.length >= 2 && (
                  <path
                    d={`${densityPathD} L ${densityPoints[densityPoints.length - 1].x},${densPad.top + densPlotH} L ${densityPoints[0].x},${densPad.top + densPlotH} Z`}
                    fill="url(#densFill)"
                  />
                )}
                {densityPoints.length >= 2 && (
                  <path
                    d={densityPathD}
                    fill="none"
                    stroke="rgb(56,189,248)"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                )}

                {/* Satellite position marker */}
                <circle
                  cx={satDensityPoint.x}
                  cy={satDensityPoint.y}
                  r={6}
                  fill="rgb(16,185,129)"
                  opacity={0.2}
                >
                  <animate
                    attributeName="r"
                    values="6;10;6"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx={satDensityPoint.x}
                  cy={satDensityPoint.y}
                  r={4}
                  fill="rgb(16,185,129)"
                  stroke="rgb(16,185,129)"
                  strokeWidth={1.5}
                />
                <text
                  x={satDensityPoint.x + 12}
                  y={satDensityPoint.y - 4}
                  className="text-[9px] fill-cyan-400 font-mono"
                >
                  {satellite.name.split(" ")[0]}
                </text>
                <text
                  x={satDensityPoint.x + 12}
                  y={satDensityPoint.y + 7}
                  className="text-[8px] fill-slate-500 font-mono"
                >
                  {satellite.altitude}km
                </text>
              </svg>
            </div>
          </div>

          {/* Breakup Analysis */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-red-400" />
              Breakup Analysis
            </h3>
            {breakup ? (
              <div className="space-y-4">
                {/* Casualty area */}
                <div className="rounded-lg bg-slate-800/60 p-3">
                  <div className="text-[10px] text-slate-500 mb-1">Casualty Area Estimate</div>
                  <div className="text-xl font-bold text-white font-mono">{breakup.casualtyArea} m²</div>
                </div>
                {/* Fragments */}
                <div className="rounded-lg bg-slate-800/60 p-3">
                  <div className="text-[10px] text-slate-500 mb-1">Fragments Reaching Ground</div>
                  <div className="text-xl font-bold text-white font-mono">{breakup.fragments}</div>
                </div>
                {/* Population risk */}
                <div className="rounded-lg bg-slate-800/60 p-3">
                  <div className="text-[10px] text-slate-500 mb-1">Population Risk Assessment</div>
                  <span
                    className={`inline-flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full ${risk.color} ${risk.bg} border border-current/20`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {risk.label}
                  </span>
                </div>
                {/* Debris Footprint SVG */}
                <div className="rounded-lg bg-slate-800/60 p-3">
                  <div className="text-[10px] text-slate-500 mb-2">Debris Footprint (simplified)</div>
                  <svg viewBox="0 0 240 80" className="w-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <radialGradient id="footGrad" cx="50%" cy="50%" rx="50%" ry="50%">
                        <stop offset="0%" stopColor="rgb(239,68,68)" stopOpacity="0.35" />
                        <stop offset="70%" stopColor="rgb(239,68,68)" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="rgb(239,68,68)" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    {/* Elongated ellipse */}
                    <ellipse
                      cx="120"
                      cy="40"
                      rx="100"
                      ry="28"
                      fill="url(#footGrad)"
                      stroke="rgb(239,68,68)"
                      strokeWidth={1}
                      strokeDasharray="4,3"
                      opacity={0.7}
                    />
                    {/* Center line */}
                    <line
                      x1="20"
                      y1="40"
                      x2="220"
                      y2="40"
                      stroke="rgb(239,68,68)"
                      strokeWidth={0.8}
                      strokeDasharray="2,3"
                      opacity={0.4}
                    />
                    {/* Impact point */}
                    <circle cx="120" cy="40" r={3} fill="rgb(239,68,68)" />
                    <text
                      x="120"
                      y="25"
                      textAnchor="middle"
                      className="text-[8px] fill-red-400/70"
                    >
                      ~800km long track
                    </text>
                    {/* Arrows */}
                    <text x="30" y="43" className="text-[8px] fill-slate-600">&#x2190;</text>
                    <text x="208" y="43" className="text-[8px] fill-slate-600">&#x2192;</text>
                  </svg>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="h-8 w-8 text-cyan-500/40 mb-3" />
                <div className="text-sm text-slate-400">No reentry predicted</div>
                <div className="text-xs text-slate-600 mt-1">
                  Object remains above critical altitude for 10+ years at {solarLevel} solar activity
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Solar Cycle Impact */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-400" />
            11-Year Solar Cycle Impact on Orbital Decay
          </h3>
          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${solarChartW} ${solarChartH}`} className="w-full min-w-[500px]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(251,191,36)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="rgb(251,191,36)" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((v) => {
                const y = solarPad.top + solarPlotH - v * solarPlotH;
                return (
                  <g key={v}>
                    <line
                      x1={solarPad.left}
                      y1={y}
                      x2={solarPad.left + solarPlotW}
                      y2={y}
                      stroke="rgb(51,65,85)"
                      strokeWidth={0.5}
                    />
                    <text
                      x={solarPad.left - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[8px] fill-slate-500"
                    >
                      {v.toFixed(2)}
                    </text>
                  </g>
                );
              })}
              {[0, 2, 4, 6, 8, 10].map((yr) => {
                const x = solarPad.left + (yr / 10) * solarPlotW;
                return (
                  <g key={yr}>
                    <line
                      x1={x}
                      y1={solarPad.top}
                      x2={x}
                      y2={solarPad.top + solarPlotH}
                      stroke="rgb(51,65,85)"
                      strokeWidth={0.5}
                    />
                    <text
                      x={x}
                      y={solarPad.top + solarPlotH + 16}
                      textAnchor="middle"
                      className="text-[9px] fill-slate-500"
                    >
                      {yr}yr
                    </text>
                  </g>
                );
              })}

              {/* Axis labels */}
              <text
                x={solarPad.left + solarPlotW / 2}
                y={solarChartH - 4}
                textAnchor="middle"
                className="text-[9px] fill-slate-500"
              >
                Years from now
              </text>
              <text
                x={10}
                y={solarPad.top + solarPlotH / 2}
                textAnchor="middle"
                className="text-[9px] fill-slate-500"
                transform={`rotate(-90, 10, ${solarPad.top + solarPlotH / 2})`}
              >
                Normalized value
              </text>

              {/* Solar activity fill */}
              {solarCyclePoints.length >= 2 && (
                <path
                  d={`${solarPathD} L ${solarCyclePoints[solarCyclePoints.length - 1].x},${solarPad.top + solarPlotH} L ${solarCyclePoints[0].x},${solarPad.top + solarPlotH} Z`}
                  fill="url(#solarFill)"
                />
              )}

              {/* Solar activity sine wave */}
              {solarCyclePoints.length >= 2 && (
                <path
                  d={solarPathD}
                  fill="none"
                  stroke="rgb(251,191,36)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.8}
                />
              )}

              {/* Altitude overlay curve */}
              {solarCyclePoints.length >= 2 && (
                <path
                  d={solarAltPathD}
                  fill="none"
                  stroke="rgb(16,185,129)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeDasharray="6,3"
                  opacity={0.7}
                />
              )}

              {/* Legend */}
              <line
                x1={solarPad.left + 8}
                y1={solarPad.top + 10}
                x2={solarPad.left + 28}
                y2={solarPad.top + 10}
                stroke="rgb(251,191,36)"
                strokeWidth={2}
              />
              <text
                x={solarPad.left + 32}
                y={solarPad.top + 13}
                className="text-[9px] fill-amber-400"
              >
                Solar activity (F10.7 proxy)
              </text>
              <line
                x1={solarPad.left + 8}
                y1={solarPad.top + 24}
                x2={solarPad.left + 28}
                y2={solarPad.top + 24}
                stroke="rgb(16,185,129)"
                strokeWidth={1.5}
                strokeDasharray="6,3"
              />
              <text
                x={solarPad.left + 32}
                y={solarPad.top + 27}
                className="text-[9px] fill-cyan-400"
              >
                Normalized altitude ({satellite.name.split(" ")[0]})
              </text>
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Target className="h-3 w-3 text-amber-500/60" />
              Solar maxima accelerate atmospheric expansion, increasing drag
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingDown className="h-3 w-3 text-cyan-500/60" />
              During solar max, decay rate can increase 2-5x
            </span>
          </div>
        </div>

        {/* Historical Reentries Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Recent Historical Reentries
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700/60">
                  <th className="py-2.5 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Object</th>
                  <th className="py-2.5 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="py-2.5 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Location</th>
                  <th className="py-2.5 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">Outcome</th>
                </tr>
              </thead>
              <tbody>{historicalRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}