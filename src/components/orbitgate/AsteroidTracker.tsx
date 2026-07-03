"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  CircleDot,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  Target,
  Clock,
  Zap,
  Globe,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────

type SortField = "name" | "diameter" | "minDistance" | "velocity" | "approachDate" | "torino";
type SortDir = "asc" | "desc";

interface NEA {
  id: string;
  name: string;
  diameter: number;
  minDistance: number;
  velocity: number;
  approachDate: string;
  torino: number;
  orbitAngle: number;
  orbitRadius: number;
}

// ─── Mock NEA Data ────────────────────────────────────────────────────────────

const BASE_DATE = new Date("2026-07-15T00:00:00.000Z");

function futureDate(daysOffset: number): string {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
}

const NEAS: NEA[] = [
  { id: "apophis", name: "99942 Apophis", diameter: 370, minDistance: 0.0002, velocity: 30.7, approachDate: futureDate(12), torino: 0, orbitAngle: 45, orbitRadius: 0.92 },
  { id: "bennu", name: "101955 Bennu", diameter: 490, minDistance: 0.0032, velocity: 28.0, approachDate: futureDate(45), torino: 1, orbitAngle: 120, orbitRadius: 1.13 },
  { id: "2024-mk", name: "2024 MK", diameter: 160, minDistance: 0.0019, velocity: 21.5, approachDate: futureDate(8), torino: 0, orbitAngle: 210, orbitRadius: 0.87 },
  { id: "2023-dw", name: "2023 DW", diameter: 49, minDistance: 0.000012, velocity: 24.6, approachDate: futureDate(72), torino: 1, orbitAngle: 330, orbitRadius: 1.05 },
  { id: "1950-da", name: "29075 (1950 DA)", diameter: 1300, minDistance: 0.0042, velocity: 25.3, approachDate: futureDate(180), torino: 1, orbitAngle: 75, orbitRadius: 1.70 },
  { id: "2024-yr4", name: "2024 YR4", diameter: 55, minDistance: 0.0002, velocity: 17.2, approachDate: futureDate(3), torino: 3, orbitAngle: 160, orbitRadius: 1.02 },
  { id: "touhou", name: "4179 Toutatis", diameter: 2450, minDistance: 0.0063, velocity: 29.0, approachDate: futureDate(200), torino: 0, orbitAngle: 280, orbitRadius: 2.51 },
  { id: "2023-bt", name: "2023 BU", diameter: 4.5, minDistance: 0.00003, velocity: 9.3, approachDate: futureDate(1), torino: 0, orbitAngle: 95, orbitRadius: 1.01 },
  { id: "2021-gm4", name: "2021 GM4", diameter: 85, minDistance: 0.0015, velocity: 19.8, approachDate: futureDate(25), torino: 0, orbitAngle: 15, orbitRadius: 1.38 },
  { id: "2004-bl86", name: "357439 (2004 BL86)", diameter: 325, minDistance: 0.008, velocity: 15.3, approachDate: futureDate(365), torino: 2, orbitAngle: 240, orbitRadius: 1.46 },
];

// ─── Impact Reference Events ─────────────────────────────────────────────────

const IMPACT_EVENTS = [
  { name: "Chelyabinsk (2013)", energyMt: 0.44, diameter: 20 },
  { name: "Tunguska (1908)", energyMt: 12, diameter: 60 },
  { name: "Chicxulub (66Ma)", energyMt: 1e8, diameter: 10000 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function torinoColor(torino: number): { bg: string; text: string; dot: string } {
  if (torino === 0) return { bg: "bg-cyan-500/15", text: "text-cyan-400", dot: "bg-cyan-400" };
  if (torino <= 2) return { bg: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400" };
  if (torino <= 4) return { bg: "bg-orange-500/15", text: "text-orange-400", dot: "bg-orange-400" };
  return { bg: "bg-rose-500/15", text: "text-rose-400", dot: "bg-rose-400" };
}

function torinoLabel(torino: number): string {
  if (torino === 0) return "No Hazard";
  if (torino === 1) return "Normal";
  if (torino === 2) return "Meriting Attention";
  if (torino === 3) return "Meriting Concern";
  if (torino === 4) return "Meriting Concern";
  return "Threatening";
}

function formatCountdown(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - BASE_DATE.getTime();
  if (diff <= 0) return "Past";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

function formatShortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function computeImpactEnergy(diameterM: number, velocityKmS: number): number {
  const radiusM = (diameterM / 2) * 100; // cm
  const density = 2.6; // g/cm³ (rocky)
  const massG = (4 / 3) * Math.PI * Math.pow(radiusM, 3) * density;
  const massKg = massG / 1000;
  const velocityMS = velocityKmS * 1000;
  const energyJ = 0.5 * massKg * velocityMS * velocityMS;
  const energyMt = energyJ / 4.184e15;
  return energyMt;
}

function formatEnergy(mt: number): string {
  if (mt < 0.001) return `${(mt * 1e6).toFixed(1)} tons TNT`;
  if (mt < 1) return `${(mt * 1000).toFixed(1)} kt TNT`;
  if (mt < 1e6) return `${mt.toFixed(2)} Mt TNT`;
  if (mt < 1e9) return `${(mt / 1e6).toFixed(2)} Gt TNT`;
  return `${(mt / 1e9).toFixed(2)} Tt TNT`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AsteroidTracker() {
  const [sortField, setSortField] = useState<SortField>("approachDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const mountedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [impDiameter, setImpDiameter] = useState(50);
  const [impVelocity, setImpVelocity] = useState(20);
  const [countdownTick, setCountdownTick] = useState(0);

  // Sync mounted state after hydration via interval callback
  useEffect(() => {
    mountedRef.current = true;
    const iv = setInterval(() => {
      if (!mountedRef.current) return;
      setCountdownTick((t) => t + 1);
    }, 60000);
    // Use requestAnimationFrame to defer the setMounted call outside the synchronous effect body
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(raf);
      clearInterval(iv);
    };
  }, []);

  const sortedNEAs = useMemo(() => {
    const list = [...NEAS];
    list.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      if (sortField === "name") {
        va = a.name;
        vb = b.name;
      } else if (sortField === "diameter") {
        va = a.diameter;
        vb = b.diameter;
      } else if (sortField === "minDistance") {
        va = a.minDistance;
        vb = b.minDistance;
      } else if (sortField === "velocity") {
        va = a.velocity;
        vb = b.velocity;
      } else if (sortField === "approachDate") {
        va = a.approachDate;
        vb = b.approachDate;
      } else {
        va = a.torino;
        vb = b.torino;
      }
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc"
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });
    return list;
  }, [sortField, sortDir]);

  const hazardStats = useMemo(() => {
    const total = NEAS.length;
    const hazardous = NEAS.filter((n) => n.torino >= 1).length;
    const close30 = NEAS.filter((n) => {
      const diff = new Date(n.approachDate).getTime() - BASE_DATE.getTime();
      return diff > 0 && diff <= 30 * 86400000;
    }).length;
    return { total, hazardous, close30 };
  }, []);

  const next5 = useMemo(
    () =>
      [...NEAS]
        .filter((n) => new Date(n.approachDate).getTime() > BASE_DATE.getTime())
        .sort((a, b) => a.approachDate.localeCompare(b.approachDate))
        .slice(0, 5),
    []
  );

  const impactEnergy = useMemo(
    () => computeImpactEnergy(impDiameter, impVelocity),
    [impDiameter, impVelocity]
  );

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ArrowUpDown className="w-3 h-3 text-muted-foreground/40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 text-cyan-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-400" />
    );
  }

  // ── SVG Visualization helpers ──
  const svgSize = 400;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const earthOrbitR = 130;
  const marsOrbitR = 195;

  function polarToXY(angleDeg: number, radius: number): { x: number; y: number } {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  return (
    <section id="asteroid-tracker" className="scroll-mt-24">
      <SectionHeader icon={<CircleDot className="h-6 w-6 text-cyan-400" />} sectionNumber="§49" title="Asteroid Tracker" />

      <div className="space-y-6 mt-6">
        {/* ── Hazard Statistics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              {
                label: "Total Tracked",
                value: hazardStats.total,
                icon: Globe,
                color: "text-cyan-400",
                glow: "glow-cyan",
              },
              {
                label: "Potentially Hazardous",
                value: hazardStats.hazardous,
                icon: ShieldAlert,
                color: "text-amber-400",
                glow: "glow-amber",
              },
              {
                label: "Close Approaches (30d)",
                value: hazardStats.close30,
                icon: Target,
                color: "text-rose-400",
                glow: "glow-rose",
              },
            ] as const
          ).map((stat) => (
            <div
              key={stat.label}
              className={`glass-card glass-card-interactive card-hover-lift rounded-xl p-5 ${stat.glow}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Close Approach Visualization ── */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            Orbital Close Approach Map
          </h3>
          <div className="flex justify-center overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgSize} ${svgSize}`}
              className="w-full max-w-[400px] h-auto"
              role="img"
              aria-label="Orbital visualization of near-Earth asteroids"
            >
              {/* Background glow */}
              <defs>
                <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="earth-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Sun glow */}
              <circle cx={cx} cy={cy} r={60} fill="url(#sun-glow)" />

              {/* Earth orbit */}
              <circle
                cx={cx} cy={cy} r={earthOrbitR}
                fill="none"
                stroke="rgba(148,163,184,0.15)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />

              {/* Mars orbit */}
              <circle
                cx={cx} cy={cy} r={marsOrbitR}
                fill="none"
                stroke="rgba(148,163,184,0.08)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />

              {/* Orbit labels */}
              <text x={cx + earthOrbitR + 6} y={cy - 4} className="text-[9px]" fill="rgba(148,163,184,0.5)">
                Earth orbit
              </text>
              <text x={cx + marsOrbitR + 6} y={cy - 4} className="text-[9px]" fill="rgba(148,163,184,0.35)">
                Mars orbit
              </text>

              {/* Sun */}
              <circle cx={cx} cy={cy} r={12} fill="#fbbf24" />
              <circle cx={cx} cy={cy} r={12} fill="#fbbf24" opacity={0.4}>
                <animate attributeName="r" values="12;16;12" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
              </circle>

              {/* Earth marker */}
              <circle cx={cx} cy={cy - earthOrbitR} r={18} fill="url(#earth-glow)" />
              <circle cx={cx} cy={cy - earthOrbitR} r={5} fill="#3b82f6" />
              <circle cx={cx} cy={cy - earthOrbitR} r={5} fill="#3b82f6" opacity={0.3}>
                <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
              </circle>
              <text x={cx + 10} y={cy - earthOrbitR + 3} className="text-[9px]" fill="rgba(59,130,246,0.7)">
                Earth
              </text>

              {/* Mars marker */}
              <circle cx={cx} cy={cy - marsOrbitR} r={4} fill="#ef4444" opacity={0.7} />
              <text x={cx + 9} y={cy - marsOrbitR + 3} className="text-[9px]" fill="rgba(239,68,68,0.5)">
                Mars
              </text>

              {/* Asteroid dots */}
              {NEAS.map((nea) => {
                const pos = polarToXY(nea.orbitAngle, earthOrbitR * (0.85 + nea.orbitRadius * 0.1));
                const tc = torinoColor(nea.torino);
                const dotSize = Math.max(3, Math.min(10, Math.sqrt(nea.diameter) * 0.2));
                const fillColor =
                  nea.torino === 0
                    ? "#06b6d4"
                    : nea.torino <= 2
                      ? "#f59e0b"
                      : nea.torino <= 4
                        ? "#f97316"
                        : "#ef4444";
                return (
                  <g key={nea.id}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={dotSize}
                      fill={fillColor}
                      opacity={0.7}
                    >
                      <animate
                        attributeName="opacity"
                        values="0.7;0.4;0.7"
                        dur={`${2 + nea.torino * 0.5}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                    {nea.torino >= 2 && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={dotSize + 3}
                        fill="none"
                        stroke={fillColor}
                        strokeWidth={1}
                        opacity={0.4}
                      >
                        <animate
                          attributeName="r"
                          values={`${dotSize + 3};${dotSize + 8};${dotSize + 3}`}
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.4;0;0.4"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                    <text
                      x={pos.x}
                      y={pos.y - dotSize - 4}
                      textAnchor="middle"
                      className="text-[7px]"
                      fill={fillColor}
                      opacity={0.8}
                    >
                      {nea.name.split(" ").pop()}
                    </text>
                  </g>
                );
              })}

              {/* Legend */}
              <g transform={"translate(10, " + (svgSize - 80) + ")"}>
                <text style={{ fontSize: 8 }} fill="rgba(148,163,184,0.6)" y={0}>Hazard Level</text>
                {["#06b6d4", "#f59e0b", "#f97316", "#ef4444"].map((c, i) => (
                  <g key={c} transform={"translate(0, " + (12 + i * 14) + ")"}>
                    <circle cx={4} cy={-3} r={3} fill={c} />
                    <text style={{ fontSize: 7 }} fill="rgba(148,163,184,0.5)" x={12} y={0}>
                      {["Torino 0", "Torino 1-2", "Torino 3-4", "Torino 5+"][i]}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          </div>
        </div>

        {/* ── NEA Table ── */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Near-Earth Object Catalog
            </h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar max-h-[480px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-background/90 backdrop-blur-md">
                <tr className="border-b border-white/10">
                  {(
                    [
                      ["name", "Name"],
                      ["diameter", "Diameter (m)"],
                      ["minDistance", "Min Dist (AU)"],
                      ["velocity", "Velocity (km/s)"],
                      ["approachDate", "Approach Date"],
                      ["torino", "Torino"],
                    ] as [SortField, string][]
                  ).map(([field, label]) => (
                    <th
                      key={field}
                      className="text-left py-3 px-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors select-none"
                      onClick={() => handleSort(field)}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedNEAs.map((nea) => {
                  const tc = torinoColor(nea.torino);
                  return (
                    <tr key={nea.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 text-foreground font-medium whitespace-nowrap">{nea.name}</td>
                      <td className="py-2.5 px-3 text-foreground font-mono">{nea.diameter.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-foreground font-mono">{nea.minDistance.toFixed(4)}</td>
                      <td className="py-2.5 px-3 text-foreground font-mono">{nea.velocity.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-foreground whitespace-nowrap">
                        {mounted ? formatShortDate(nea.approachDate) : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${tc.bg} ${tc.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${tc.dot} ${nea.torino >= 2 ? "dot-pulse-amber" : ""}`} />
                          {nea.torino} — {torinoLabel(nea.torino)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Impact Risk Calculator ── */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-400" />
            Impact Risk Calculator
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sliders */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">Asteroid Diameter</label>
                  <span className="text-xs font-mono text-foreground">{impDiameter.toLocaleString()} m</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={10000}
                  step={1}
                  value={impDiameter}
                  onChange={(e) => setImpDiameter(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-400 focus-glow"
                  aria-label="Asteroid diameter slider"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1">
                  <span>10 m</span>
                  <span>10 km</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">Impact Velocity</label>
                  <span className="text-xs font-mono text-foreground">{impVelocity} km/s</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={70}
                  step={0.5}
                  value={impVelocity}
                  onChange={(e) => setImpVelocity(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-400 focus-glow"
                  aria-label="Impact velocity slider"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1">
                  <span>10 km/s</span>
                  <span>70 km/s</span>
                </div>
              </div>

              {/* Energy Result */}
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">Estimated Impact Energy</p>
                <p className="text-xl font-bold font-mono text-orange-400">
                  {formatEnergy(impactEnergy)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  E = ½mv² (ρ = 2.6 g/cm³, rocky body)
                </p>
              </div>
            </div>

            {/* Comparison to Known Events */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium mb-3">Comparison to Known Events</p>
              {IMPACT_EVENTS.map((event) => {
                const ratio = impactEnergy / event.energyMt;
                const isAbove = ratio >= 1;
                const barPct = Math.min(100, Math.max(2, (Math.log10(Math.max(ratio, 0.001)) / 12) * 100 + 50));

                return (
                  <div
                    key={event.name}
                    className={`rounded-lg border p-3 transition-colors ${
                      isAbove
                        ? "border-rose-500/30 bg-rose-500/5"
                        : "border-white/5 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-foreground font-medium">{event.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 ${
                          isAbove
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                        }`}
                      >
                        {isAbove ? "EXCEEDS" : "Below"}
                      </Badge>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isAbove
                            ? "bg-gradient-to-r from-rose-500/60 to-rose-400/80"
                            : "bg-gradient-to-r from-cyan-500/60 to-cyan-400/80"
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>~{formatEnergy(event.energyMt)}</span>
                      <span>
                        {ratio >= 1000
                          ? `×${ratio.toExponential(1)}`
                          : ratio >= 0.01
                            ? `×${ratio.toFixed(1)}`
                            : `×${ratio.toExponential(1)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Timeline: Next 5 Close Approaches ── */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Upcoming Close Approaches
            {mounted && (
              <span className="text-[10px] text-muted-foreground font-normal ml-1">
                (tick: {countdownTick})
              </span>
            )}
          </h3>

          <div className="space-y-3">
            {next5.map((nea, i) => {
              const tc = torinoColor(nea.torino);
              return (
                <div
                  key={nea.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors animate-fade-in-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Countdown */}
                  <div className="w-16 shrink-0 text-right">
                    <p className={`text-sm font-bold font-mono ${tc.text}`}>
                      {mounted ? formatCountdown(nea.approachDate) : "—"}
                    </p>
                  </div>

                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center shrink-0">
                    <span
                      className={`w-3 h-3 rounded-full ${tc.dot} ${nea.torino >= 1 ? "dot-pulse-amber" : "dot-pulse-green"}`}
                    />
                    {i < next5.length - 1 && (
                      <div className="w-px h-8 bg-white/10 mt-1" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{nea.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                      <span>{nea.diameter}m</span>
                      <span>•</span>
                      <span>{nea.minDistance.toFixed(4)} AU</span>
                      <span>•</span>
                      <span>{nea.velocity} km/s</span>
                    </div>
                  </div>

                  {/* Hazard Badge */}
                  <Badge
                    variant="outline"
                    className={`${tc.bg} ${tc.text} ${tc.dot.replace("bg-", "border-")} border text-[10px] px-2 py-0 shrink-0`}
                  >
                    Torino {nea.torino}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
