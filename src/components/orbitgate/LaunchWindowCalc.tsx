"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Rocket, MapPin, Target, Calendar, Clock, Gauge, ChevronDown, CheckCircle, XCircle, AlertTriangle, Diamond } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

// ─── Types ───────────────────────────────────────────────────────────
interface LaunchSite {
  name: string;
  lat: number;
  lon: number;
  location: string;
}

interface TargetOrbit {
  name: string;
  inclination: number;
  altitudeKm: number;
  type: "LEO" | "SSO" | "GEO" | "Polar" | "HEO";
}

interface LaunchVehicle {
  name: string;
  maxPayloadLEO: number;
  maxPayloadGTO: number;
  costM: number;
  availability: "active" | "retired" | "development";
  color: string;
}

interface WindowDay {
  day: number;
  c3: number;
  status: "good" | "marginal" | "nogo";
}

interface DeltaVBudget {
  launchVehicle: number;
  gravityLosses: number;
  steeringLosses: number;
  planeChange: number;
  circularization: number;
  total: number;
}

// ─── Static Data ─────────────────────────────────────────────────────
const LAUNCH_SITES: LaunchSite[] = [
  { name: "Kennedy", lat: 28.5, lon: -80.6, location: "Florida, USA" },
  { name: "Baikonur", lat: 45.6, lon: 63.3, location: "Kazakhstan" },
  { name: "Kourou", lat: 5.2, lon: -52.8, location: "French Guiana" },
  { name: "Vandenberg", lat: 34.7, lon: -120.6, location: "California, USA" },
  { name: "Tanegashima", lat: 30.4, lon: 131.0, location: "Japan" },
];

const TARGET_ORBITS: TargetOrbit[] = [
  { name: "ISS", inclination: 51.6, altitudeKm: 408, type: "LEO" },
  { name: "Sun-sync", inclination: 98, altitudeKm: 700, type: "SSO" },
  { name: "GEO", inclination: 0, altitudeKm: 35786, type: "GEO" },
  { name: "Polar", inclination: 90, altitudeKm: 800, type: "Polar" },
  { name: "Molniya", inclination: 63.4, altitudeKm: 40000, type: "HEO" },
];

const VEHICLES: LaunchVehicle[] = [
  { name: "Falcon 9", maxPayloadLEO: 22800, maxPayloadGTO: 8300, costM: 67, availability: "active", color: "#06b6d4" },
  { name: "Atlas V", maxPayloadLEO: 18850, maxPayloadGTO: 8900, costM: 153, availability: "active", color: "#f59e0b" },
  { name: "Soyuz", maxPayloadLEO: 7020, maxPayloadGTO: 3010, costM: 48, availability: "active", color: "#ef4444" },
  { name: "Ariane 5", maxPayloadLEO: 21000, maxPayloadGTO: 10500, costM: 178, availability: "active", color: "#8b5cf6" },
  { name: "Electron", maxPayloadLEO: 300, maxPayloadGTO: 0, costM: 7.5, availability: "active", color: "#06b6d4" },
];

// ─── Deterministic seed-based random ─────────────────────────────────
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Compute launch windows ──────────────────────────────────────────
function computeWindows(site: LaunchSite, orbit: TargetOrbit, startDate: Date): WindowDay[] {
  const rng = seededRandom(
    site.lat * 1000 + orbit.inclination * 100 + startDate.getDate() + startDate.getMonth() * 31
  );
  const planeAngle = Math.abs(orbit.inclination - site.lat);
  const days: WindowDay[] = [];

  for (let d = 0; d < 30; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);

    // Simulate orbital mechanics: windows repeat roughly daily with variation
    const phase = (dayOfYear + d * 0.97) % 1;
    const windowQuality = Math.cos(phase * Math.PI * 2);

    // C3 energy: lower is better
    const baseC3 = 9.5 + planeAngle * 0.08 + orbit.altitudeKm * 0.0001;
    const noise = (rng() - 0.5) * 4;
    const c3 = Math.max(0, baseC3 + windowQuality * 3 + noise);

    let status: "good" | "marginal" | "nogo";
    if (c3 < 10 && windowQuality > -0.2) {
      status = "good";
    } else if (c3 < 14 && windowQuality > -0.5) {
      status = "marginal";
    } else {
      status = "nogo";
    }

    days.push({ day: d, c3: Math.round(c3 * 100) / 100, status });
  }

  return days;
}

// ─── Compute delta-v budget ──────────────────────────────────────────
function computeDeltaV(site: LaunchSite, orbit: TargetOrbit): DeltaVBudget {
  const planeAngle = Math.abs(orbit.inclination - site.lat) * (Math.PI / 180);
  const altFactor = orbit.altitudeKm / 400;

  const launchVehicle = 9.4 + altFactor * 0.15;
  const gravityLosses = 1.2 + altFactor * 0.08;
  const steeringLosses = 0.3 + planeAngle * 0.5;
  const planeChange = planeAngle * 3.2 + (orbit.type === "GEO" ? 1.5 : 0);
  const circularization = orbit.type === "GEO" ? 1.8 : orbit.type === "HEO" ? 0.4 : 0.2;

  const total = launchVehicle + gravityLosses + steeringLosses + planeChange + circularization;

  return {
    launchVehicle: Math.round(launchVehicle * 100) / 100,
    gravityLosses: Math.round(gravityLosses * 100) / 100,
    steeringLosses: Math.round(steeringLosses * 100) / 100,
    planeChange: Math.round(planeChange * 100) / 100,
    circularization: Math.round(circularization * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// ─── Compute porkchop plot grid (10x10) ──────────────────────────────
function computePorkchopGrid(site: LaunchSite, orbit: TargetOrbit, startDate: Date): { grid: number[][]; minVal: number; minI: number; minJ: number } {
  const rng = seededRandom(
    site.lat * 500 + orbit.inclination * 50 + startDate.getMonth() * 100 + startDate.getDate()
  );
  const grid: number[][] = [];
  let minVal = Infinity;
  let minI = 0;
  let minJ = 0;

  for (let i = 0; i < 10; i++) {
    const row: number[] = [];
    for (let j = 0; j < 10; j++) {
      // Departure date offset (0-27 days mapped to 0-9)
      const depOffset = j * 3;
      // Arrival time of flight (hours, mapped)
      const tof = 30 + i * 25 + (orbit.type === "GEO" ? 150 : 0) + (orbit.type === "HEO" ? 300 : 0);

      const baseDv = 9.5 + Math.abs(orbit.inclination - site.lat) * 0.08 + orbit.altitudeKm * 0.0001;
      const depPhase = Math.sin((depOffset / 27) * Math.PI * 2) * 1.5;
      const tofFactor = Math.sin(((tof - 30) / 300) * Math.PI) * 1.2;
      const noise = (rng() - 0.5) * 1.5;

      const dv = baseDv + depPhase + tofFactor + noise;
      row.push(Math.round(dv * 100) / 100);

      if (dv < minVal) {
        minVal = dv;
        minI = i;
        minJ = j;
      }
    }
    grid.push(row);
  }

  return { grid, minVal, minI, minJ };
}

// ─── Payload to target orbit (simplified) ────────────────────────────
function payloadToOrbit(vehicle: LaunchVehicle, orbit: TargetOrbit): number {
  const basePayload = orbit.type === "GEO" || orbit.type === "HEO" ? vehicle.maxPayloadGTO : vehicle.maxPayloadLEO;
  // Reduce by inclination change difficulty
  const inclinationPenalty = 1 - Math.min(0.4, orbit.inclination * 0.002);
  // GEO penalty
  const altitudePenalty = orbit.type === "GEO" ? 0.45 : orbit.type === "HEO" ? 0.5 : 0.85;
  return Math.round(basePayload * inclinationPenalty * altitudePenalty);
}

// ─── Countdown formatter ─────────────────────────────────────────────
function formatCountdown(targetDate: Date): string {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  if (diff <= 0) return "T+00:00:00:00";

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return `T-${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ─── Main Component ──────────────────────────────────────────────────
export function LaunchWindowCalc() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [originIdx, setOriginIdx] = useState(0);
  const [orbitIdx, setOrbitIdx] = useState(0);
  const [launchDate, setLaunchDate] = useState(todayStr);
  const [selectedWindow, setSelectedWindow] = useState<number | null>(null);
  const [countdown, setCountdown] = useState("");

  // Derived values
  const site = LAUNCH_SITES[originIdx];
  const orbit = TARGET_ORBITS[orbitIdx];
  const launchDateObj = useMemo(() => new Date(launchDate + "T00:00:00"), [launchDate]);

  // Computed data
  const windows = useMemo(() => computeWindows(site, orbit, launchDateObj), [site, orbit, launchDateObj]);
  const deltaV = useMemo(() => computeDeltaV(site, orbit), [site, orbit]);
  const porkchop = useMemo(() => computePorkchopGrid(site, orbit, launchDateObj), [site, orbit, launchDateObj]);
  const vehiclePayloads = useMemo(() => VEHICLES.map((v) => ({ ...v, payloadToTarget: payloadToOrbit(v, orbit) })), [orbit]);

  // Good windows for selecting
  const goodWindows = useMemo(() => windows.filter((w) => w.status === "good"), [windows]);

  // Callbacks
  const handleOriginChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setOriginIdx(Number(e.target.value));
    setSelectedWindow(null);
  }, []);

  const handleOrbitChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setOrbitIdx(Number(e.target.value));
    setSelectedWindow(null);
  }, []);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLaunchDate(e.target.value);
    setSelectedWindow(null);
  }, []);

  const handleWindowSelect = useCallback((day: number) => {
    setSelectedWindow(day);
  }, []);

  // Countdown effect — only runs the interval when a window is selected
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (selectedWindow === null) return;
    const target = new Date(launchDateObj);
    target.setDate(target.getDate() + selectedWindow);
    target.setHours(12, 0, 0, 0);

    const tick = () => setCountdown(formatCountdown(target));
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [selectedWindow, launchDateObj]);

  // ─── SVG Dimensions ────────────────────────────────────────────────
  const timelineW = 700;
  const timelineH = 140;
  const barWidth = (timelineW - 40) / 30;
  const maxC3 = Math.max(...windows.map((w) => w.c3), 1);

  const porkchopW = 280;
  const porkchopH = 280;
  const cellW = porkchopW / 10;
  const cellH = porkchopH / 10;
  const porkchopMax = Math.max(...porkchop.grid.flat());
  const porkchopMin = Math.min(...porkchop.grid.flat());

  // Delta-v bar chart
  const dvSegments = [
    { label: "Launch Δv", value: deltaV.launchVehicle, color: "#06b6d4" },
    { label: "Gravity Loss", value: deltaV.gravityLosses, color: "#f59e0b" },
    { label: "Steering Loss", value: deltaV.steeringLosses, color: "#ef4444" },
    { label: "Plane Change", value: deltaV.planeChange, color: "#8b5cf6" },
    { label: "Circularize", value: deltaV.circularization, color: "#06b6d4" },
  ];
  const dvTotal = deltaV.total;
  const dvBarW = 600;

  // ─── Render Helpers ────────────────────────────────────────────────
  const statusColor = (status: "good" | "marginal" | "nogo") => {
    if (status === "good") return "#06b6d4";
    if (status === "marginal") return "#f59e0b";
    return "#4b5563";
  };

  const statusLabel = (status: "good" | "marginal" | "nogo") => {
    if (status === "good") return "GO";
    if (status === "marginal") return "MARGINAL";
    return "NO GO";
  };

  const isTodayInWindow = () => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const ld = new Date(launchDate);
    ld.setHours(0, 0, 0, 0);
    const diff = Math.floor((todayDate.getTime() - ld.getTime()) / 86400000);
    return diff >= 0 && diff < 30 ? diff : -1;
  };

  const todayIdx = isTodayInWindow();

  return (
    <section id="launch-window" className="max-w-6xl mx-auto px-4 py-16">
      <SectionHeader
        sectionNumber="§36"
        title="Launch Window Calculator"
        subtitle="Orbital mechanics-based launch window analysis with porkchop plots, Δv budgets, and vehicle selection"
        icon={<Rocket className="h-6 w-6 text-cyan-400" />}
      />

      {/* ─── Mission Parameters ──────────────────────────────────── */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Mission Parameters
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Origin */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              Launch Site
            </label>
            <div className="relative">
              <select
                value={originIdx}
                onChange={handleOriginChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                {LAUNCH_SITES.map((s, i) => (
                  <option key={s.name} value={i} className="bg-slate-900 text-white">
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
            <div className="flex gap-3 text-[10px] text-gray-500 font-mono">
              <span>Lat: {site.lat}°</span>
              <span>Lon: {site.lon}°</span>
            </div>
            <div className="text-[10px] text-gray-600">{site.location}</div>
          </div>

          {/* Target Orbit */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 flex items-center gap-1.5">
              <Target className="h-3 w-3" />
              Target Orbit
            </label>
            <div className="relative">
              <select
                value={orbitIdx}
                onChange={handleOrbitChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                {TARGET_ORBITS.map((o, i) => (
                  <option key={o.name} value={i} className="bg-slate-900 text-white">
                    {o.name} ({o.inclination}°)
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
            <div className="flex gap-3 text-[10px] text-gray-500 font-mono">
              <span>Incl: {orbit.inclination}°</span>
              <span>Alt: {orbit.altitudeKm.toLocaleString()} km</span>
            </div>
            <div className="text-[10px] text-gray-600">{orbit.type} orbit</div>
          </div>

          {/* Launch Date */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Launch Date
            </label>
            <input
              type="date"
              value={launchDate}
              onChange={handleDateChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white cursor-pointer focus:outline-none focus:border-cyan-500/50 transition-colors [color-scheme:dark]"
            />
            <div className="text-[10px] text-gray-500 font-mono">
              Window: {new Date(launchDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} —{" "}
              {new Date(new Date(launchDate).getTime() + 29 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div className="text-[10px] text-gray-600">{goodWindows.length} optimal windows found</div>
          </div>
        </div>
      </div>

      {/* ─── Launch Window Timeline ─────────────────────────────── */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          30-Day Launch Window Timeline
          <span className="ml-auto text-[10px] text-gray-500 normal-case font-normal">
            Bar height = C3 launch energy (km²/s²) · lower is better
          </span>
        </h3>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${timelineW} ${timelineH + 30}`} className="w-full min-w-[500px]" style={{ maxHeight: 200 }}>
            {/* Y-axis labels */}
            <text x="0" y="12" fill="#6b7280" fontSize="9" fontFamily="monospace">C3</text>
            {[0, 5, 10, 15, 20].map((val) => {
              const y = timelineH - (val / (maxC3 + 2)) * (timelineH - 20) + 10;
              return (
                <g key={val}>
                  <line x1="28" y1={y} x2={timelineW} y2={y} stroke="#ffffff08" strokeWidth="0.5" />
                  <text x="26" y={y + 3} fill="#4b5563" fontSize="8" fontFamily="monospace" textAnchor="end">{val}</text>
                </g>
              );
            })}

            {/* Bars */}
            {windows.map((w, i) => {
              const x = 32 + i * barWidth;
              const barH = Math.max(2, (w.c3 / (maxC3 + 2)) * (timelineH - 20));
              const y = timelineH - barH + 10;
              const col = statusColor(w.status);
              const isSelected = selectedWindow === w.day;
              return (
                <g key={i} className="cursor-pointer" onClick={() => handleWindowSelect(w.day)}>
                  <rect
                    x={x + 1}
                    y={y}
                    width={barWidth - 2}
                    height={barH}
                    fill={col}
                    opacity={isSelected ? 1 : 0.7}
                    rx={2}
                    className="transition-all duration-200"
                  />
                  {isSelected && (
                    <rect
                      x={x}
                      y={y - 2}
                      width={barWidth}
                      height={barH + 4}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      rx={3}
                      opacity={0.8}
                    />
                  )}
                  {/* Day label every 5 days */}
                  {i % 5 === 0 && (
                    <text x={x + barWidth / 2} y={timelineH + 22} fill="#6b7280" fontSize="8" fontFamily="monospace" textAnchor="middle">
                      D+{i}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Today marker */}
            {todayIdx >= 0 && todayIdx < 30 && (
              <g>
                <line
                  x1={32 + todayIdx * barWidth + barWidth / 2}
                  y1="5"
                  x2={32 + todayIdx * barWidth + barWidth / 2}
                  y2={timelineH + 12}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="3,2"
                />
                <text
                  x={32 + todayIdx * barWidth + barWidth / 2}
                  y={timelineH + 22}
                  fill="#ef4444"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  TODAY
                </text>
              </g>
            )}

            {/* Legend */}
            <g transform={`translate(${timelineW - 180}, ${timelineH + 14})`}>
              <rect x="0" y="0" width="8" height="8" fill="#06b6d4" rx="1" />
              <text x="12" y="7" fill="#6b7280" fontSize="8">GO</text>
              <rect x="40" y="0" width="8" height="8" fill="#f59e0b" rx="1" />
              <text x="52" y="7" fill="#6b7280" fontSize="8">MARGINAL</text>
              <rect x="115" y="0" width="8" height="8" fill="#4b5563" rx="1" />
              <text x="127" y="7" fill="#6b7280" fontSize="8">NO GO</text>
            </g>
          </svg>
        </div>

        {/* Selected window info */}
        {selectedWindow !== null && windows[selectedWindow] && (
          <div className="mt-4 flex flex-wrap gap-4 items-center">
            <div className="glass-card rounded-lg px-4 py-2 flex items-center gap-3">
              <span className="text-xs text-gray-400">Selected:</span>
              <span className="text-sm font-mono text-white">
                {new Date(launchDateObj.getTime() + selectedWindow * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="glass-card rounded-lg px-4 py-2 flex items-center gap-3">
              <span className="text-xs text-gray-400">C3:</span>
              <span className="text-sm font-mono text-white">{windows[selectedWindow].c3} km²/s²</span>
            </div>
            <div className={`glass-card rounded-lg px-4 py-2 flex items-center gap-2 ${
              windows[selectedWindow].status === "good"
                ? "border-cyan-500/30"
                : windows[selectedWindow].status === "marginal"
                ? "border-yellow-500/30"
                : "border-gray-500/30"
            }`}>
              {windows[selectedWindow].status === "good" && <CheckCircle className="h-3.5 w-3.5 text-cyan-400" />}
              {windows[selectedWindow].status === "marginal" && <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />}
              {windows[selectedWindow].status === "nogo" && <XCircle className="h-3.5 w-3.5 text-gray-400" />}
              <span className={`text-xs font-semibold ${
                windows[selectedWindow].status === "good" ? "text-cyan-400"
                : windows[selectedWindow].status === "marginal" ? "text-yellow-400"
                : "text-gray-400"
              }`}>
                {statusLabel(windows[selectedWindow].status)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Orbital Mechanics + Porkchop Plot row ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Delta-v Budget */}
        <div className="lg:col-span-3 glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Δv Budget Breakdown
          </h3>

          {/* Stacked bar chart */}
          <div className="overflow-x-auto mb-4">
            <svg viewBox={`0 0 ${dvBarW + 80} 60`} className="w-full min-w-[400px]">
              {(() => {
                let accX = 0;
                return dvSegments.map((seg, i) => {
                  const w = (seg.value / dvTotal) * dvBarW;
                  const el = (
                    <g key={i}>
                      <rect x={accX} y="0" width={w} height="24" fill={seg.color} rx={i === 0 ? 4 : 0} opacity={0.85} />
                      {w > 35 && (
                        <text
                          x={accX + w / 2}
                          y="16"
                          fill="#ffffff"
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="middle"
                          fontWeight="bold"
                        >
                          {seg.value} km/s
                        </text>
                      )}
                    </g>
                  );
                  accX += w;
                  return el;
                });
              })()}
              {/* Total label */}
              <text x={dvBarW + 10} y="16" fill="#06b6d4" fontSize="12" fontFamily="monospace" fontWeight="bold">
                Σ {dvTotal} km/s
              </text>
            </svg>
          </div>

          {/* Legend table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dvSegments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-gray-400">{seg.label}</span>
                <span className="ml-auto font-mono text-white">{seg.value} km/s</span>
              </div>
            ))}
          </div>
        </div>

        {/* Porkchop Plot */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Diamond className="h-4 w-4" />
            Porkchop Plot (Simplified)
          </h3>

          <div className="flex justify-center">
            <svg viewBox={`-5 -5 ${porkchopW + 55} ${porkchopH + 45}`} className="w-full max-w-[320px]">
              {/* Y-axis label */}
              <text
                x="-2"
                y={porkchopH / 2}
                fill="#6b7280"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
                transform={`rotate(-90, -2, ${porkchopH / 2})`}
              >
                Arrival TOF (hrs)
              </text>

              {/* X-axis label */}
              <text x={porkchopW / 2} y={porkchopH + 38} fill="#6b7280" fontSize="9" fontFamily="monospace" textAnchor="middle">
                Departure Date
              </text>

              {/* Grid cells */}
              {porkchop.grid.map((row, i) =>
                row.map((val, j) => {
                  const normalized = porkchopMax === porkchopMin ? 0.5 : (val - porkchopMin) / (porkchopMax - porkchopMin);
                  // Darker = less Δv = better; use emerald intensity
                  const intensity = 1 - normalized;
                  const r = Math.round(16 * intensity);
                  const g = Math.round(185 * intensity);
                  const b = Math.round(129 * intensity);
                  const alpha = 0.3 + intensity * 0.7;
                  return (
                    <rect
                      key={`${i}-${j}`}
                      x={j * cellW}
                      y={i * cellH}
                      width={cellW}
                      height={cellH}
                      fill={`rgba(${r}, ${g}, ${b}, ${alpha})`}
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="0.5"
                    />
                  );
                })
              )}

              {/* Optimal point diamond */}
              <polygon
                points={`${porkchop.minJ * cellW + cellW / 2},${porkchop.minI * cellH}
                          ${porkchop.minJ * cellW + cellW},${porkchop.minI * cellH + cellH / 2}
                          ${porkchop.minJ * cellW + cellW / 2},${porkchop.minI * cellH + cellH}
                          ${porkchop.minJ * cellW},${porkchop.minI * cellH + cellH / 2}`}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
              />

              {/* Optimal label */}
              <text
                x={porkchop.minJ * cellW + cellW + 4}
                y={porkchop.minI * cellH + cellH / 2 + 3}
                fill="#ffffff"
                fontSize="8"
                fontFamily="monospace"
              >
                {porkchop.minVal} km/s
              </text>

              {/* X-axis tick labels */}
              {[0, 3, 6, 9].map((d) => (
                <text key={d} x={d / 3 * cellW + cellW / 2} y={porkchopH + 14} fill="#4b5563" fontSize="7" fontFamily="monospace" textAnchor="middle">
                  D+{d * 3}
                </text>
              ))}

              {/* Y-axis tick labels */}
              {[0, 3, 6, 9].map((d) => {
                const tofBase = 30 + d * 25 + (orbit.type === "GEO" ? 150 : 0) + (orbit.type === "HEO" ? 300 : 0);
                return (
                  <text key={d} x={-4} y={d / 3 * cellH + cellH / 2 + 3} fill="#4b5563" fontSize="7" fontFamily="monospace" textAnchor="end">
                    {tofBase}
                  </text>
                );
              })}

              {/* Color scale legend */}
              <defs>
                <linearGradient id="porkchop-scale" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(6, 182, 212, 1)" />
                  <stop offset="100%" stopColor="rgba(6, 182, 212, 0.15)" />
                </linearGradient>
              </defs>
              <rect
                x={porkchopW + 8}
                y="0"
                width="10"
                height={porkchopH}
                fill="url(#porkchop-scale)"
                rx="2"
              />
              <text x={porkchopW + 22} y="8" fill="#4b5563" fontSize="7" fontFamily="monospace">
                Low Δv
              </text>
              <text x={porkchopW + 22} y={porkchopH - 2} fill="#4b5563" fontSize="7" fontFamily="monospace">
                High Δv
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* ─── Vehicle Selection ───────────────────────────────────── */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          Vehicle Selection
          <span className="ml-auto text-[10px] text-gray-500 normal-case font-normal">
            Payload capacity to {orbit.name} ({orbit.type})
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto custom-scrollbar">
          {vehiclePayloads.map((v) => {
            const canReach = v.payloadToTarget > 0 && v.availability === "active";
            return (
              <div
                key={v.name}
                className={`glass-card glass-card-hover rounded-lg p-4 space-y-3 transition-all duration-300 ${
                  canReach ? "border-cyan-500/20" : "border-gray-700/30 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{v.name}</span>
                  {canReach ? (
                    <CheckCircle className="h-4 w-4 text-cyan-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-600" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500">LEO Payload</span>
                    <span className="text-gray-300 font-mono">{v.maxPayloadLEO.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500">To {orbit.name}</span>
                    <span className={`font-mono ${canReach ? "text-cyan-400" : "text-red-400"}`}>
                      {v.payloadToTarget > 0 ? `${v.payloadToTarget.toLocaleString()} kg` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500">Cost</span>
                    <span className="text-gray-300 font-mono">${v.costM}M</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-mono ${v.availability === "active" ? "text-cyan-400" : "text-gray-500"}`}>
                      {v.availability.toUpperCase()}
                    </span>
                  </div>
                </div>

                {canReach && v.payloadToTarget > 0 && (
                  <div className="pt-2 border-t border-white/5">
                    <div className="text-[9px] text-gray-500 mb-1">Capacity Utilization</div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (v.payloadToTarget / v.maxPayloadLEO) * 100)}%`,
                          backgroundColor: v.color,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Countdown Timer ─────────────────────────────────────── */}
      {selectedWindow !== null && countdown && (
        <div className="glass-card rounded-xl p-6 border-cyan-500/20">
          <div className="flex flex-col items-center text-center space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Launch Countdown
            </h3>
            <div className="font-orbitron text-3xl sm:text-4xl font-bold text-white tracking-wider glow-text-cyan">
              {countdown}
            </div>
            <div className="text-xs text-gray-500">
              Target: {new Date(launchDateObj.getTime() + selectedWindow * 86400000).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })} · 12:00 UTC
            </div>
            <div className="flex gap-4 text-[10px] text-gray-600">
              <span>{site.name} → {orbit.name}</span>
              <span>·</span>
              <span>C3: {windows[selectedWindow].c3} km²/s²</span>
              <span>·</span>
              <span>Δv: {dvTotal} km/s</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}