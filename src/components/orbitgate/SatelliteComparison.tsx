"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeader } from "./SectionHeader";
import { GitCompareArrows, ArrowLeftRight } from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────
const MU = 398600.4418; // km³/s²
const R_EARTH = 6371; // km

// ── Satellite Preset Data ──────────────────────────────────────────
interface SatelliteData {
  id: string;
  name: string;
  noradId: number;
  type: string; // LEO / MEO / GEO / HEO / Debris
  altitudeKm: number;
  inclinationDeg: number;
  periodMin: number;
  launchYear: number;
  country: string;
  massKg: number;
}

const SATELLITES: SatelliteData[] = [
  {
    id: "iss",
    name: "ISS (Zarya)",
    noradId: 25544,
    type: "LEO",
    altitudeKm: 408,
    inclinationDeg: 51.6,
    periodMin: 92.68,
    launchYear: 1998,
    country: "International",
    massKg: 420000,
  },
  {
    id: "hubble",
    name: "Hubble",
    noradId: 20580,
    type: "LEO",
    altitudeKm: 535,
    inclinationDeg: 28.5,
    periodMin: 95.42,
    launchYear: 1990,
    country: "USA",
    massKg: 11110,
  },
  {
    id: "tiangong",
    name: "Tiangong",
    noradId: 48274,
    type: "LEO",
    altitudeKm: 390,
    inclinationDeg: 41.5,
    periodMin: 92.5,
    launchYear: 2021,
    country: "China",
    massKg: 100000,
  },
  {
    id: "starlink1007",
    name: "Starlink-1007",
    noradId: 44713,
    type: "LEO",
    altitudeKm: 550,
    inclinationDeg: 53.0,
    periodMin: 95.85,
    launchYear: 2020,
    country: "USA",
    massKg: 260,
  },
  {
    id: "noaa19",
    name: "NOAA-19",
    noradId: 33591,
    type: "LEO (SSO)",
    altitudeKm: 860,
    inclinationDeg: 99.2,
    periodMin: 102.0,
    launchYear: 2009,
    country: "USA",
    massKg: 2230,
  },
  {
    id: "landsat9",
    name: "Landsat-9",
    noradId: 49260,
    type: "LEO (SSO)",
    altitudeKm: 705,
    inclinationDeg: 98.2,
    periodMin: 98.8,
    launchYear: 2021,
    country: "USA",
    massKg: 2785,
  },
  {
    id: "gps_iir20",
    name: "GPS IIR-20",
    noradId: 28474,
    type: "MEO",
    altitudeKm: 20200,
    inclinationDeg: 55.0,
    periodMin: 718.0,
    launchYear: 2009,
    country: "USA",
    massKg: 2030,
  },
  {
    id: "goes16",
    name: "GOES-16",
    noradId: 41866,
    type: "GEO",
    altitudeKm: 35786,
    inclinationDeg: 0.1,
    periodMin: 1436.0,
    launchYear: 2016,
    country: "USA",
    massKg: 5192,
  },
  {
    id: "sentinel2a",
    name: "Sentinel-2A",
    noradId: 41457,
    type: "LEO (SSO)",
    altitudeKm: 786,
    inclinationDeg: 98.5,
    periodMin: 100.6,
    launchYear: 2015,
    country: "EU",
    massKg: 1140,
  },
  {
    id: "cosmos2251",
    name: "Cosmos 2251 (Debris)",
    noradId: 22675,
    type: "Debris",
    altitudeKm: 790,
    inclinationDeg: 74.0,
    periodMin: 100.8,
    launchYear: 1993,
    country: "Russia",
    massKg: 700,
  },
];

// ── Helper: orbital velocity ───────────────────────────────────────
function orbitalVelocity(altitudeKm: number): number {
  const r = R_EARTH + altitudeKm;
  return Math.sqrt(MU / r);
}

// ── Helper: decay risk ─────────────────────────────────────────────
function decayRisk(sat: SatelliteData): string {
  if (!sat.type.startsWith("LEO")) return "N/A";
  if (sat.altitudeKm < 400) return "High";
  if (sat.altitudeKm < 600) return "Moderate";
  if (sat.altitudeKm < 800) return "Low";
  return "Very Low";
}

// ── Helper: advantage direction ────────────────────────────────────
// Returns "A" if satA is better, "B" if satB is better, "tie" otherwise
type Advantage = "A" | "B" | "tie";

function computeAdvantage(
  key: string,
  aVal: number | string,
  bVal: number | string
): Advantage {
  // String comparison for country, type
  if (typeof aVal === "string" || typeof bVal === "string") return "tie";

  if (aVal === bVal) return "tie";

  switch (key) {
    case "altitude":
      // Higher altitude = wider coverage → advantage
      return aVal > bVal ? "A" : "B";
    case "inclination":
      // Lower inclination = more efficient launches → advantage
      return aVal < bVal ? "A" : "B";
    case "period":
      // Shorter period = more frequent revisits → advantage
      return aVal < bVal ? "A" : "B";
    case "velocity":
      // Higher velocity = more energetic orbit → advantage
      return aVal > bVal ? "A" : "B";
    case "launchYear":
      // Newer = better tech → advantage
      return aVal > bVal ? "A" : "B";
    case "mass":
      // Heavier = more payload/capability → advantage
      return aVal > bVal ? "A" : "B";
    default:
      return "tie";
  }
}

// ── Decay risk to numeric for comparison ───────────────────────────
const DECAY_RISK_ORDER: Record<string, number> = {
  "Very Low": 0,
  Low: 1,
  Moderate: 2,
  High: 3,
  "N/A": -1,
};

// ── Advantage Badge ────────────────────────────────────────────────
function AdvantageBadge({ adv }: { adv: Advantage }) {
  if (adv === "tie") {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-mono text-gray-500 bg-gray-100 dark:bg-slate-800/60 dark:text-gray-500">
        —
      </span>
    );
  }
  if (adv === "A") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium text-cyan-700 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-500/15">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
        A
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/15">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      B
    </span>
  );
}

// ── Orbit Diagram ──────────────────────────────────────────────────
function OrbitDiagram({ satA, satB }: { satA: SatelliteData; satB: SatelliteData }) {
  const SVG_SIZE = 280;
  const CENTER = SVG_SIZE / 2;

  // Map altitude to visual radius using sqrt scaling for readability
  const minAlt = Math.min(satA.altitudeKm, satB.altitudeKm);
  const maxAlt = Math.max(satA.altitudeKm, satB.altitudeKm);
  const EARTH_RADIUS = 28;
  const MIN_ORBIT_R = 55;
  const MAX_ORBIT_R = SVG_SIZE / 2 - 20;

  function altToRadius(alt: number): number {
    if (maxAlt === minAlt) return (MIN_ORBIT_R + MAX_ORBIT_R) / 2;
    const sqrtMin = Math.sqrt(minAlt);
    const sqrtMax = Math.sqrt(maxAlt);
    const sqrtAlt = Math.sqrt(alt);
    const t = (sqrtAlt - sqrtMin) / (sqrtMax - sqrtMin);
    return MIN_ORBIT_R + t * (MAX_ORBIT_R - MIN_ORBIT_R);
  }

  const rA = altToRadius(satA.altitudeKm);
  const rB = altToRadius(satB.altitudeKm);

  // Satellite positions (on top of orbit circle)
  const satAx = CENTER;
  const satAy = CENTER - rA;
  const satBx = CENTER;
  const satBy = CENTER - rB;

  // Determine which is outer for label placement
  const aIsOuter = rA >= rB;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="overflow-visible"
      >
        {/* Dark background */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={CENTER + 5}
          className="fill-gray-950 dark:fill-slate-950"
        />

        {/* Stars */}
        {[
          [40, 30], [230, 50], [60, 240], [250, 220], [20, 140],
          [260, 130], [130, 20], [150, 260], [80, 60], [200, 250],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={0.6}
            className="fill-gray-500 dark:fill-gray-600"
            opacity={0.4 + (i % 3) * 0.2}
          />
        ))}

        {/* Orbit ring A (emerald) */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={rA}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeDasharray={aIsOuter ? "4 3" : "3 2"}
          className="text-cyan-500/60"
        />

        {/* Orbit ring B (amber) */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={rB}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeDasharray={!aIsOuter ? "4 3" : "3 2"}
          className="text-amber-500/60"
        />

        {/* Earth */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={EARTH_RADIUS}
          className="fill-blue-900 dark:fill-blue-950"
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={EARTH_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.5}
          className="text-cyan-500/40"
        />
        {/* Earth label */}
        <text
          x={CENTER}
          y={CENTER + 3}
          textAnchor="middle"
          className="fill-cyan-400/70 text-[8px] font-mono"
        >
          EARTH
        </text>

        {/* Satellite A dot with orbit animation */}
        <g
          style={{
            transformOrigin: `${CENTER}px ${CENTER}px`,
            animation: "orbitSpin 20s linear infinite",
          }}
        >
          <circle
            cx={satAx}
            cy={satAy}
            r={4}
            className="fill-cyan-400"
            style={{ filter: "drop-shadow(0 0 4px rgba(16,185,129,0.7))" }}
          />
          {/* Small solar panel lines */}
          <line
            x1={satAx - 6}
            y1={satAy}
            x2={satAx - 2}
            y2={satAy}
            className="stroke-cyan-400/60"
            strokeWidth={1.5}
          />
          <line
            x1={satAx + 2}
            y1={satAy}
            x2={satAx + 6}
            y2={satAy}
            className="stroke-cyan-400/60"
            strokeWidth={1.5}
          />
        </g>

        {/* Satellite B dot with orbit animation (slower if higher) */}
        <g
          style={{
            transformOrigin: `${CENTER}px ${CENTER}px`,
            animation: "orbitSpin 28s linear infinite reverse",
          }}
        >
          <circle
            cx={satBx}
            cy={satBy}
            r={4}
            className="fill-amber-400"
            style={{ filter: "drop-shadow(0 0 4px rgba(245,158,11,0.7))" }}
          />
          {/* Small solar panel lines */}
          <line
            x1={satBx - 6}
            y1={satBy}
            x2={satBx - 2}
            y2={satBy}
            className="stroke-amber-400/60"
            strokeWidth={1.5}
          />
          <line
            x1={satBx + 2}
            y1={satBy}
            x2={satBx + 6}
            y2={satBy}
            className="stroke-amber-400/60"
            strokeWidth={1.5}
          />
        </g>
      </svg>

      {/* CSS keyframes injected once */}
      <style>{`
        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] font-mono">
        <span className="flex items-center gap-1.5 text-cyan-400">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          {satA.name.split(" (")[0]}
        </span>
        <span className="flex items-center gap-1.5 text-amber-400">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          {satB.name.split(" (")[0]}
        </span>
      </div>
      <p className="text-[9px] text-gray-500 font-mono">
        Orbit radii scaled by √(altitude) for visibility — not to true scale
      </p>
    </div>
  );
}

// ── Delta-V Calculator ─────────────────────────────────────────────
function DeltaVCalculator({ satA, satB }: { satA: SatelliteData; satB: SatelliteData }) {
  const result = useMemo(() => {
    const r1 = R_EARTH + satA.altitudeKm;
    const r2 = R_EARTH + satB.altitudeKm;

    if (r1 === r2) {
      return { dv1: 0, dv2: 0, total: 0, transferTime: 0, sameOrbit: true };
    }

    // Ensure r1 < r2 for Hohmann formula (transfer from lower to higher)
    const rLow = Math.min(r1, r2);
    const rHigh = Math.max(r1, r2);

    const dv1 =
      Math.sqrt(MU / rLow) * (Math.sqrt((2 * rHigh) / (rLow + rHigh)) - 1);
    const dv2 =
      Math.sqrt(MU / rHigh) * (1 - Math.sqrt((2 * rLow) / (rLow + rHigh)));
    const total = dv1 + dv2;

    // Transfer time in minutes
    const transferTimeSec =
      (Math.PI * Math.sqrt(Math.pow(rLow + rHigh, 3) / (8 * MU)));
    const transferTime = transferTimeSec / 60;

    return { dv1, dv2, total, transferTime, sameOrbit: false };
  }, [satA, satB]);

  if (result.sameOrbit) {
    return (
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
        Both satellites share approximately the same orbit — no transfer needed.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-mono text-cyan-500/80 uppercase tracking-wider flex items-center gap-2">
        <ArrowLeftRight className="h-3.5 w-3.5" />
        Hohmann Transfer Δv
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800/50 p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">First Burn (Δv₁)</p>
          <p className="text-lg font-mono text-gray-900 dark:text-white">
            {result.dv1.toFixed(4)}{" "}
            <span className="text-[10px] text-gray-400 font-sans">km/s</span>
          </p>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            {(result.dv1 * 1000).toFixed(1)} m/s
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800/50 p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Second Burn (Δv₂)</p>
          <p className="text-lg font-mono text-gray-900 dark:text-white">
            {result.dv2.toFixed(4)}{" "}
            <span className="text-[10px] text-gray-400 font-sans">km/s</span>
          </p>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            {(result.dv2 * 1000).toFixed(1)} m/s
          </p>
        </div>
        <div className="rounded-lg bg-cyan-50 dark:bg-cyan-500/5 border border-cyan-200 dark:border-cyan-500/20 p-3 text-center">
          <p className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">
            Total Δv
          </p>
          <p
            className="text-lg font-mono text-cyan-700 dark:text-cyan-300"
            style={{ textShadow: "0 0 8px rgba(16,185,129,0.2)" }}
          >
            {result.total.toFixed(4)}{" "}
            <span className="text-[10px] text-cyan-500 font-sans">km/s</span>
          </p>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            {(result.total * 1000).toFixed(1)} m/s
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-1 border-t border-gray-100 dark:border-slate-800/50">
        <span>Transfer time: {result.transferTime.toFixed(1)} min</span>
        <span>μ = 398600.4418 km³/s²</span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export function SatelliteComparison() {
  const [satAId, setSatAId] = useState("iss");
  const [satBId, setSatBId] = useState("hubble");

  const satA = useMemo(
    () => SATELLITES.find((s) => s.id === satAId) ?? SATELLITES[0],
    [satAId]
  );
  const satB = useMemo(
    () => SATELLITES.find((s) => s.id === satBId) ?? SATELLITES[1],
    [satBId]
  );

  const vA = orbitalVelocity(satA.altitudeKm);
  const vB = orbitalVelocity(satB.altitudeKm);

  const decayA = decayRisk(satA);
  const decayB = decayRisk(satB);
  const bothLEO = satA.type.startsWith("LEO") && satB.type.startsWith("LEO");

  // Comparison rows
  const rows = useMemo(() => {
    const items: {
      label: string;
      valA: string;
      valB: string;
      adv: Advantage;
    }[] = [
      {
        label: "Orbit Type",
        valA: satA.type,
        valB: satB.type,
        adv: "tie" as Advantage,
      },
      {
        label: "Altitude",
        valA: `${satA.altitudeKm.toLocaleString()} km`,
        valB: `${satB.altitudeKm.toLocaleString()} km`,
        adv: computeAdvantage("altitude", satA.altitudeKm, satB.altitudeKm),
      },
      {
        label: "Inclination",
        valA: `${satA.inclinationDeg}°`,
        valB: `${satB.inclinationDeg}°`,
        adv: computeAdvantage("inclination", satA.inclinationDeg, satB.inclinationDeg),
      },
      {
        label: "Period",
        valA: `${satA.periodMin} min`,
        valB: `${satB.periodMin} min`,
        adv: computeAdvantage("period", satA.periodMin, satB.periodMin),
      },
      {
        label: "Velocity",
        valA: `${vA.toFixed(3)} km/s`,
        valB: `${vB.toFixed(3)} km/s`,
        adv: computeAdvantage("velocity", vA, vB),
      },
      {
        label: "Launch Year",
        valA: `${satA.launchYear}`,
        valB: `${satB.launchYear}`,
        adv: computeAdvantage("launchYear", satA.launchYear, satB.launchYear),
      },
      {
        label: "Country",
        valA: satA.country,
        valB: satB.country,
        adv: "tie" as Advantage,
      },
      {
        label: "Mass",
        valA: `${satA.massKg.toLocaleString()} kg`,
        valB: `${satB.massKg.toLocaleString()} kg`,
        adv: computeAdvantage("mass", satA.massKg, satB.massKg),
      },
    ];

    // Decay risk row — only show if both are LEO
    if (bothLEO) {
      const riskA = DECAY_RISK_ORDER[decayA] ?? -1;
      const riskB = DECAY_RISK_ORDER[decayB] ?? -1;
      let decayAdv: Advantage = "tie";
      if (riskA >= 0 && riskB >= 0) {
        if (riskA < riskB) decayAdv = "A";
        else if (riskB < riskA) decayAdv = "B";
      }
      items.push({
        label: "Decay Risk",
        valA: decayA,
        valB: decayB,
        adv: decayAdv,
      });
    }

    return items;
  }, [satA, satB, vA, vB, decayA, decayB, bothLEO]);

  return (
    <section id="sat-compare" className="py-16 sm:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          title="Satellite Comparison Tool"
          subtitle="Compare orbital parameters, visualize relative orbits, and estimate Hohmann transfer delta-v between two satellites"
          icon={<GitCompareArrows className="h-6 w-6 text-cyan-400" />}
          sectionNumber="SEC-25"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          {/* ── Satellite Selectors ── */}
          <Card className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800">
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Satellite A */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-cyan-500/80 uppercase tracking-wider flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    Satellite A
                  </label>
                  <Select value={satAId} onValueChange={setSatAId}>
                    <SelectTrigger className="w-full bg-gray-50 border-gray-200 dark:bg-slate-800/60 dark:border-slate-700 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
                      {SATELLITES.map((sat) => (
                        <SelectItem key={sat.id} value={sat.id}>
                          <span className="font-mono text-xs">
                            {sat.name}
                            <span className="text-gray-400 ml-1.5">
                              [{sat.noradId}]
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-gray-500 font-mono">
                    NORAD {satA.noradId} · {satA.type}
                  </p>
                </div>

                {/* Satellite B */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-amber-500/80 uppercase tracking-wider flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Satellite B
                  </label>
                  <Select value={satBId} onValueChange={setSatBId}>
                    <SelectTrigger className="w-full bg-gray-50 border-gray-200 dark:bg-slate-800/60 dark:border-slate-700 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
                      {SATELLITES.map((sat) => (
                        <SelectItem key={sat.id} value={sat.id}>
                          <span className="font-mono text-xs">
                            {sat.name}
                            <span className="text-gray-400 ml-1.5">
                              [{sat.noradId}]
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-gray-500 font-mono">
                    NORAD {satB.noradId} · {satB.type}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Comparison Table + Orbit Diagram (side by side on desktop) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Table (3/5) */}
            <Card className="lg:col-span-3 bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-xs font-mono text-cyan-500/80 uppercase tracking-wider mb-4">
                  Parameter Comparison
                </h3>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-800">
                        <th className="text-left py-2.5 px-2 text-gray-500 font-medium text-[10px] uppercase tracking-wider">
                          Parameter
                        </th>
                        <th className="text-center py-2.5 px-2 text-cyan-500 font-medium text-[10px] uppercase tracking-wider">
                          {satA.name.split(" (")[0]}
                        </th>
                        <th className="text-center py-2.5 px-2 text-amber-500 font-medium text-[10px] uppercase tracking-wider">
                          {satB.name.split(" (")[0]}
                        </th>
                        <th className="text-center py-2.5 px-2 text-gray-500 font-medium text-[10px] uppercase tracking-wider">
                          Advantage
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr
                          key={row.label}
                          className={
                            i % 2 === 0
                              ? "bg-gray-50/60 dark:bg-slate-800/20"
                              : ""
                          }
                        >
                          <td className="py-2.5 px-2 text-gray-700 dark:text-gray-300 font-medium">
                            {row.label}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-gray-900 dark:text-white">
                            {row.valA}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-gray-900 dark:text-white">
                            {row.valB}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <AdvantageBadge adv={row.adv} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Orbit Diagram (2/5) */}
            <Card className="lg:col-span-2 bg-gray-950 border border-gray-800 dark:bg-slate-950 dark:backdrop-blur-sm dark:border-slate-800 flex items-center justify-center">
              <CardContent className="p-4 sm:p-6 w-full flex flex-col items-center">
                <h3 className="text-xs font-mono text-cyan-500/80 uppercase tracking-wider mb-4 self-start">
                  Orbit Visualization
                </h3>
                <OrbitDiagram satA={satA} satB={satB} />
              </CardContent>
            </Card>
          </div>

          {/* ── Delta-V Calculator ── */}
          <Card className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800">
            <CardContent className="p-4 sm:p-6">
              <DeltaVCalculator satA={satA} satB={satB} />
            </CardContent>
          </Card>

          {/* ── Footnote ── */}
          <p className="text-[10px] text-gray-500 dark:text-gray-600 text-center font-mono">
            Δv = √(μ/r₁) × (√(2r₂/(r₁+r₂)) − 1) + √(μ/r₂) × (1 − √(2r₁/(r₁+r₂)))
            &nbsp;|&nbsp; r = altitude + 6371 km &nbsp;|&nbsp; μ = 398600.4418 km³/s²
          </p>
        </motion.div>
      </div>
    </section>
  );
}