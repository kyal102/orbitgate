"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Rocket,
  Globe,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Download,
  Cpu,
  Battery,
  Radio,
  Weight,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { SectionHeader } from "./SectionHeader";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrbitOption {
  id: string;
  label: string;
  altitude: number; // km
  inclination: number; // deg
  period: number; // min
  type: "LEO" | "SSO" | "MEO" | "GEO" | "HEO";
  dvToReach: number; // km/s from surface, approximate
  description: string;
}

interface LaunchSite {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  description: string;
}

interface MissionPhase {
  id: string;
  label: string;
  startMonth: number;
  duration: number; // months
  color: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ORBITS: OrbitOption[] = [
  {
    id: "leo-400",
    label: "LEO 400km",
    altitude: 400,
    inclination: 51.6,
    period: 92.5,
    type: "LEO",
    dvToReach: 9.3,
    description: "Low Earth Orbit — ISS altitude, ideal for Earth observation and crewed missions",
  },
  {
    id: "leo-800",
    label: "LEO 800km",
    altitude: 800,
    inclination: 98.6,
    period: 100.9,
    type: "LEO",
    dvToReach: 9.5,
    description: "Higher LEO — reduced drag, good for communications constellations",
  },
  {
    id: "sso-600",
    label: "SSO 600km",
    altitude: 600,
    inclination: 97.8,
    period: 96.7,
    type: "SSO",
    dvToReach: 9.4,
    description: "Sun-Synchronous Orbit — consistent lighting for remote sensing and Earth science",
  },
  {
    id: "meo-20000",
    label: "MEO 20,000km",
    altitude: 20000,
    inclination: 55,
    period: 718,
    type: "MEO",
    dvToReach: 11.3,
    description: "Medium Earth Orbit — GPS-like regime for navigation and timing services",
  },
  {
    id: "geo-35786",
    label: "GEO 35,786km",
    altitude: 35786,
    inclination: 0,
    period: 1436,
    type: "GEO",
    dvToReach: 12.7,
    description: "Geostationary — stationary relative to Earth, ideal for communications and weather",
  },
  {
    id: "molniya",
    label: "Molniya",
    altitude: 500, // perigee
    inclination: 63.4,
    period: 720,
    type: "HEO",
    dvToReach: 11.5,
    description: "Highly Elliptical Orbit — 12h period, extended high-latitude coverage",
  },
];

const LAUNCH_SITES: LaunchSite[] = [
  {
    id: "cape-canaveral",
    name: "Cape Canaveral",
    country: "USA",
    lat: 28.5,
    lon: -80.6,
    description: "Primary US launch site, Atlantic coast, min inclination 28.5°",
  },
  {
    id: "baikonur",
    name: "Baikonur",
    country: "Kazakhstan",
    lat: 45.9,
    lon: 63.3,
    description: "Historic Soviet/Russian launch site, inland, launches to 51.6° and higher",
  },
  {
    id: "kourou",
    name: "Kourou",
    country: "French Guiana",
    lat: 5.2,
    lon: -52.8,
    description: "ESA/Arianespace site near equator, maximum GEO launch efficiency",
  },
  {
    id: "vandenberg",
    name: "Vandenberg",
    country: "USA",
    lat: 34.7,
    lon: -120.6,
    description: "US west coast site, polar and SSO launch capability, ocean overfly",
  },
];

const MISSION_PHASES_TEMPLATE: MissionPhase[] = [
  { id: "design", label: "Design & Review", startMonth: 0, duration: 2, color: "#38bdf8" },
  { id: "build", label: "Build & Test", startMonth: 1, duration: 3, color: "#a78bfa" },
  { id: "launch", label: "Launch Campaign", startMonth: 4, duration: 0.5, color: "#f43f5e" },
  { id: "leop", label: "LEOP", startMonth: 4.5, duration: 0.5, color: "#f59e0b" },
  { id: "commissioning", label: "Commissioning", startMonth: 5, duration: 1, color: "#06b6d4" },
  { id: "ops", label: "Routine Ops", startMonth: 5, duration: 4, color: "#06b6d4" },
];

const ORBIT_TYPE_COLORS: Record<string, string> = {
  LEO: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  SSO: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  MEO: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  GEO: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  HEO: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

const RISK_LEVELS = ["Low", "Medium", "High", "Critical"] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function computeDeltaV(orbit: OrbitOption, site: LaunchSite): number {
  // Approximate: site latitude affects inclination change cost
  const minInclination = Math.abs(site.lat);
  const inclinationChange = Math.abs(orbit.inclination - minInclination);
  const inclinationCost = inclinationChange * 0.015; // rough km/s per deg
  return orbit.dvToReach + inclinationCost;
}

function computeLaunchWindow(orbit: OrbitOption, site: LaunchSite): string {
  if (orbit.type === "GEO" || orbit.type === "MEO") {
    // Geostationary/MEO: windows depend on launch site longitude
    const optimalHour = ((site.lon + 180) / 15 + 24) % 24;
    const h = Math.floor(optimalHour);
    const m = Math.floor((optimalHour - h) * 60);
    return `Daily window ~${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} UTC`;
  }
  if (orbit.type === "SSO" || orbit.inclination > 80) {
    return "Dawn-dusk window, ~10:30 LTAN for SSO";
  }
  return "Multiple windows daily, launch azimuth determines inclination";
}

function computeCost(orbit: OrbitOption, mass: number): string {
  // Very rough cost estimation
  const baseCosts: Record<string, number> = {
    LEO: 2500,
    SSO: 3000,
    MEO: 12000,
    GEO: 20000,
    HEO: 15000,
  };
  const perKg = baseCosts[orbit.type] || 3000;
  const launchCost = Math.round(perKg * (mass / 1000));
  const busCost = Math.round(mass * 200);
  const total = launchCost + busCost;

  if (total > 1_000_000_000) return `$${(total / 1_000_000_000).toFixed(1)}B`;
  if (total > 1_000_000) return `$${(total / 1_000_000).toFixed(0)}M`;
  return `$${(total / 1_000).toFixed(0)}K`;
}

function assessRisk(orbit: OrbitOption, mass: number, power: number, dataRate: number): {
  level: (typeof RISK_LEVELS)[number];
  factors: string[];
  color: string;
} {
  const factors: string[] = [];
  let score = 0;

  if (orbit.type === "GEO" || orbit.type === "MEO") {
    factors.push("High orbit requires precise injection");
    score += 2;
  }
  if (orbit.type === "HEO") {
    factors.push("HEO thermal cycling at perigee/apogee");
    score += 1;
  }
  if (mass > 500) {
    factors.push("High mass — larger launch vehicle required");
    score += 1;
  }
  if (power < 10 && orbit.type !== "LEO") {
    factors.push("Low power may be insufficient for higher orbits");
    score += 1;
  }
  if (dataRate > 5000 && orbit.altitude > 2000) {
    factors.push("High data rate from distant orbit — large antenna or relay needed");
    score += 1;
  }
  if (mass < 10) {
    factors.push("Small mass — CubeSat class, limited propellant budget");
    score += 0;
  }

  if (score >= 3) return { level: "Critical", factors, color: "#f43f5e" };
  if (score >= 2) return { level: "High", factors, color: "#f59e0b" };
  if (score >= 1) return { level: "Medium", factors, color: "#38bdf8" };
  return { level: "Low", factors, color: "#06b6d4" };
}

function downloadJSON(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Orbit Diagram SVG                                                  */
/* ------------------------------------------------------------------ */

function OrbitDiagram({ orbit }: { orbit: OrbitOption }) {
  const isCircular = orbit.type !== "HEO";
  const cx = 100;
  const cy = 100;

  if (orbit.type === "HEO") {
    // Molniya-like ellipse
    return (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <circle cx={cx} cy={cy} r={80} fill="none" stroke="rgba(16,185,129,0.08)" strokeWidth="0.5" />
        <circle cx={cx} cy={cy} r={3} fill="#06b6d4" opacity="0.6" />
        <ellipse
          cx={cx}
          cy={cy}
          rx={75}
          ry={25}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          transform={`rotate(-63.4 ${cx} ${cy})`}
          opacity="0.8"
        />
        <circle cx={cx} cy={cy - 25} r={2.5} fill="#f59e0b" />
        <text x={cx + 6} y={cy - 23} fill="#f59e0b" fontSize="7" fontFamily="monospace">apogee</text>
        <circle cx={cx + 75} cy={cy} r={2.5} fill="#06b6d4" />
        <text x={cx + 60} y={cy - 6} fill="#06b6d4" fontSize="7" fontFamily="monospace">perigee</text>
      </svg>
    );
  }

  const radius = Math.min(75, 30 + (orbit.altitude / 35786) * 45);
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <circle cx={cx} cy={cy} r={80} fill="none" stroke="rgba(16,185,129,0.06)" strokeWidth="0.5" />
      {orbit.type === "LEO" && (
        <circle cx={cx} cy={cy} r={50} fill="none" stroke="rgba(16,185,129,0.06)" strokeWidth="0.5" />
      )}
      <circle cx={cx} cy={cy} r={3} fill="#06b6d4" opacity="0.6" />
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={isCircular ? "#06b6d4" : "#f59e0b"}
        strokeWidth={orbit.type === "GEO" ? 2 : 1.5}
        strokeDasharray={isCircular ? "none" : "4 2"}
        opacity={0.8}
      />
      {orbit.type === "SSO" && (
        <>
          <line x1={20} y1={160} x2={180} y2={40} stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
          <text x={145} y={38} fill="#f59e0b" fontSize="6" fontFamily="monospace" opacity="0.7">☀ sun</text>
        </>
      )}
      {orbit.type === "GEO" && (
        <text x={cx + radius + 4} y={cy + 3} fill="#06b6d4" fontSize="6" fontFamily="monospace" opacity="0.7">35,786 km</text>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini Map                                                           */
/* ------------------------------------------------------------------ */

function MiniMap({ sites, selectedSite }: { sites: LaunchSite[]; selectedSite: string }) {
  // Simple equirectangular projection
  const toX = (lon: number) => ((lon + 180) / 360) * 200;
  const toY = (lat: number) => ((90 - lat) / 180) * 120;

  return (
    <svg viewBox="0 0 200 120" className="w-full h-full rounded-lg bg-slate-900/50 dark:bg-slate-950/50">
      {/* Grid lines */}
      {[-60, -30, 0, 30, 60].map((lon) => (
        <line key={`lon-${lon}`} x1={toX(lon)} y1={0} x2={toX(lon)} y2={120} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      ))}
      {[-60, -30, 0, 30, 60].map((lat) => (
        <line key={`lat-${lat}`} x1={0} y1={toY(lat)} x2={200} y2={toY(lat)} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      ))}
      {/* Equator */}
      <line x1={0} y1={60} x2={200} y2={60} stroke="rgba(16,185,129,0.15)" strokeWidth="0.5" />

      {/* Sites */}
      {sites.map((site) => {
        const isSelected = site.id === selectedSite;
        return (
          <g key={site.id}>
            {isSelected && (
              <circle cx={toX(site.lon)} cy={toY(site.lat)} r={6} fill="#06b6d4" opacity="0.15">
                <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={toX(site.lon)}
              cy={toY(site.lat)}
              r={isSelected ? 3 : 2}
              fill={isSelected ? "#06b6d4" : "rgba(255,255,255,0.4)"}
              stroke={isSelected ? "#06b6d4" : "none"}
              strokeWidth={isSelected ? 1 : 0}
            />
            {isSelected && (
              <text x={toX(site.lon) + 6} y={toY(site.lat) - 4} fill="#06b6d4" fontSize="5.5" fontFamily="monospace">
                {site.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Gantt Chart                                                        */
/* ------------------------------------------------------------------ */

function GanttChart({ phases }: { phases: MissionPhase[] }) {
  const totalMonths = 6;
  const monthLabels = ["M1", "M2", "M3", "M4", "M5", "M6"];

  return (
    <div className="space-y-1.5">
      {/* Month headers */}
      <div className="flex items-center gap-0 pl-24">
        {monthLabels.map((label) => (
          <div key={label} className="flex-1 text-center text-[9px] font-mono text-gray-500">
            {label}
          </div>
        ))}
      </div>
      {/* Phase rows */}
      {phases.map((phase) => {
        const leftPct = (phase.startMonth / totalMonths) * 100;
        const widthPct = (phase.duration / totalMonths) * 100;

        return (
          <div key={phase.id} className="flex items-center gap-0 h-6">
            <span className="w-24 shrink-0 text-[9px] text-gray-400 truncate pr-2 text-right">
              {phase.label}
            </span>
            <div className="flex-1 relative h-full bg-gray-100/50 dark:bg-slate-800/30 rounded">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: phase.startMonth * 0.08 }}
                style={{
                  position: "absolute",
                  top: 2,
                  bottom: 2,
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  backgroundColor: phase.color,
                  opacity: 0.7,
                  borderRadius: 3,
                  transformOrigin: "left center",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SpaceMissionPlanner() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOrbit, setSelectedOrbit] = useState(ORBITS[0]);
  const [selectedSite, setSelectedSite] = useState(LAUNCH_SITES[0]);
  const [mass, setMass] = useState(200);
  const [power, setPower] = useState(50);
  const [dataRate, setDataRate] = useState(1000);

  // All callbacks before JSX const variables
  const handleNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, 3));
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const computedDeltaV = useMemo(() => computeDeltaV(selectedOrbit, selectedSite), [selectedOrbit, selectedSite]);
  const launchWindow = useMemo(() => computeLaunchWindow(selectedOrbit, selectedSite), [selectedOrbit, selectedSite]);
  const estimatedCost = useMemo(() => computeCost(selectedOrbit, mass), [selectedOrbit, mass]);
  const riskAssessment = useMemo(
    () => assessRisk(selectedOrbit, mass, power, dataRate),
    [selectedOrbit, mass, power, dataRate]
  );

  const resourceBudget = useMemo(() => {
    // Simplified resource budget calculation
    const solarPowerEst = power * 0.7; // 70% efficiency margin
    const eclipsePower = mass > 50 ? (power * 0.3) : 0; // Battery fraction
    const powerMargin = solarPowerEst > power * 0.5 ? "Adequate" : "Tight";
    const massMargin = mass > 1000 ? "Heavy" : mass > 100 ? "Medium" : "Light";
    const commsMargin = dataRate < 100 ? "Low BW" : dataRate < 5000 ? "Standard" : "High BW";

    return { solarPowerEst, eclipsePower, powerMargin, massMargin, commsMargin };
  }, [mass, power, dataRate]);

  const missionPlan = useMemo(
    () => ({
      missionName: `${selectedSite.name}-${selectedOrbit.label}-${new Date().getFullYear()}`,
      createdAt: new Date().toISOString(),
      orbit: {
        type: selectedOrbit.type,
        label: selectedOrbit.label,
        altitude: selectedOrbit.altitude,
        inclination: selectedOrbit.inclination,
        period: selectedOrbit.period,
      },
      launchSite: {
        name: selectedSite.name,
        country: selectedSite.country,
        coordinates: { lat: selectedSite.lat, lon: selectedSite.lon },
      },
      payload: {
        massKg: mass,
        powerW: power,
        dataRateKbps: dataRate,
      },
      computed: {
        deltaV: `${computedDeltaV.toFixed(2)} km/s`,
        launchWindow,
        estimatedCost,
        riskLevel: riskAssessment.level,
        riskFactors: riskAssessment.factors,
        resourceBudget,
      },
      timeline: MISSION_PHASES_TEMPLATE.map((p) => ({
        phase: p.label,
        startMonth: p.startMonth,
        durationMonths: p.duration,
      })),
    }),
    [selectedOrbit, selectedSite, mass, power, dataRate, computedDeltaV, launchWindow, estimatedCost, riskAssessment, resourceBudget]
  );

  const handleExportMission = useCallback(() => {
    downloadJSON(missionPlan, `orbitgate-mission-plan-${Date.now()}.json`);
    toast.success("Mission plan exported as JSON");
  }, [missionPlan]);

  const STEPS = [
    { label: "Select Orbit", icon: <Globe className="h-4 w-4" /> },
    { label: "Launch Site", icon: <MapPin className="h-4 w-4" /> },
    { label: "Payload Config", icon: <Cpu className="h-4 w-4" /> },
    { label: "Summary", icon: <Rocket className="h-4 w-4" /> },
  ];

  return (
    <section id="mission-planner" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Mission Planner"
          subtitle="Design a space mission from orbit selection through launch configuration and resource budgeting"
          icon={<MapPin className="h-6 w-6 text-cyan-400" />}
          sectionNumber="§47"
        />

        {/* Step progress indicator */}
        <div className="flex items-center justify-center gap-0 mb-10 max-w-xl mx-auto">
          {STEPS.map((step, index) => (
            <div key={step.label} className="flex items-center">
              <button
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                  currentStep === index
                    ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                    : currentStep > index
                      ? "bg-cyan-500/5 text-cyan-400/60 cursor-pointer"
                      : "bg-gray-100/50 dark:bg-slate-800/30 text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <span
                  className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-mono ${
                    currentStep >= index
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-gray-200 dark:bg-slate-700 text-gray-400"
                  }`}
                >
                  {currentStep > index ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="text-xs font-medium hidden sm:inline">{step.label}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 sm:w-12 h-px mx-1 transition-colors duration-300 ${
                    currentStep > index ? "bg-cyan-500/40" : "bg-gray-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Step 1: Select Orbit */}
            {currentStep === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ORBITS.map((orbit) => {
                  const isSelected = selectedOrbit.id === orbit.id;
                  return (
                    <motion.button
                      key={orbit.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedOrbit(orbit)}
                      className={`text-left p-4 rounded-xl border transition-all duration-200 overflow-hidden ${
                        isSelected
                          ? "bg-cyan-500/5 border-cyan-500/40 shadow-md shadow-cyan-500/10"
                          : "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {orbit.label}
                        </h3>
                        <Badge variant="outline" className={`text-[9px] font-mono ${ORBIT_TYPE_COLORS[orbit.type]}`}>
                          {orbit.type}
                        </Badge>
                      </div>

                      <div className="h-24 mb-3">
                        <OrbitDiagram orbit={orbit} />
                      </div>

                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                        {orbit.description}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400">
                        <span>{orbit.altitude.toLocaleString()} km</span>
                        <span>{orbit.inclination}°</span>
                        <span>{orbit.period} min</span>
                      </div>

                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 flex items-center gap-1 text-[10px] text-cyan-500"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Selected — Δv ≈ {orbit.dvToReach} km/s
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Step 2: Launch Site */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="max-w-md mx-auto">
                  <MiniMap sites={LAUNCH_SITES} selectedSite={selectedSite.id} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LAUNCH_SITES.map((site) => {
                    const isSelected = selectedSite.id === site.id;
                    return (
                      <motion.button
                        key={site.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedSite(site)}
                        className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                          isSelected
                            ? "bg-cyan-500/5 border-cyan-500/40 shadow-md shadow-cyan-500/10"
                            : "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {site.name}
                          </h3>
                          <Badge variant="outline" className="text-[9px] font-mono bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500">
                            {site.country}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                          {site.description}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                          <span>{site.lat.toFixed(1)}°N</span>
                          <span>{Math.abs(site.lon).toFixed(1)}°{site.lon >= 0 ? "E" : "W"}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Payload Config */}
            {currentStep === 2 && (
              <div className="max-w-2xl mx-auto space-y-6">
                <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-gray-200 dark:border-slate-800">
                  <CardContent className="p-6 space-y-6">
                    {/* Mass slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <Weight className="h-4 w-4 text-gray-400" />
                          Payload Mass
                        </label>
                        <span className="text-sm font-mono text-cyan-400">{mass} kg</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={5000}
                        step={10}
                        value={mass}
                        onChange={(e) => setMass(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                      <div className="flex justify-between text-[9px] font-mono text-gray-400">
                        <span>1 kg</span>
                        <span>5,000 kg</span>
                      </div>
                    </div>

                    {/* Power slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <Battery className="h-4 w-4 text-gray-400" />
                          Solar Array Power
                        </label>
                        <span className="text-sm font-mono text-cyan-400">{power} W</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={5000}
                        step={5}
                        value={power}
                        onChange={(e) => setPower(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                      <div className="flex justify-between text-[9px] font-mono text-gray-400">
                        <span>5 W</span>
                        <span>5,000 W</span>
                      </div>
                    </div>

                    {/* Data Rate slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <Radio className="h-4 w-4 text-gray-400" />
                          Data Rate
                        </label>
                        <span className="text-sm font-mono text-cyan-400">{dataRate.toLocaleString()} kbps</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={10000}
                        step={10}
                        value={dataRate}
                        onChange={(e) => setDataRate(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                      <div className="flex justify-between text-[9px] font-mono text-gray-400">
                        <span>10 kbps</span>
                        <span>10,000 kbps</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Resource budget card */}
                <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-gray-200 dark:border-slate-800">
                  <CardContent className="p-5">
                    <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Gauge className="h-3.5 w-3.5" />
                      Computed Resource Budget
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-lg bg-gray-100/50 dark:bg-slate-800/50">
                        <p className="text-lg font-bold font-mono text-gray-900 dark:text-white">
                          {resourceBudget.massMargin}
                        </p>
                        <p className="text-[10px] text-gray-400">Mass Class</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-gray-100/50 dark:bg-slate-800/50">
                        <p className="text-lg font-bold font-mono text-gray-900 dark:text-white">
                          {resourceBudget.powerMargin}
                        </p>
                        <p className="text-[10px] text-gray-400">Power Status</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-gray-100/50 dark:bg-slate-800/50">
                        <p className="text-lg font-bold font-mono text-gray-900 dark:text-white">
                          {resourceBudget.commsMargin}
                        </p>
                        <p className="text-[10px] text-gray-400">Comms Class</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: Mission Summary */}
            {currentStep === 3 && (
              <div className="max-w-3xl mx-auto space-y-4">
                {/* Key metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Δv", value: `${computedDeltaV.toFixed(2)} km/s`, icon: <Rocket className="h-4 w-4" />, color: "#06b6d4" },
                    { label: "Est. Cost", value: estimatedCost, icon: <Gauge className="h-4 w-4" />, color: "#f59e0b" },
                    { label: "Risk Level", value: riskAssessment.level, icon: <AlertTriangle className="h-4 w-4" />, color: riskAssessment.color },
                    { label: "Orbit Type", value: selectedOrbit.type, icon: <Globe className="h-4 w-4" />, color: "#38bdf8" },
                  ].map((metric) => (
                    <Card key={metric.label} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-gray-200 dark:border-slate-800">
                      <CardContent className="p-4 text-center">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: `${metric.color}15` }}>
                          <span style={{ color: metric.color }}>{metric.icon}</span>
                        </div>
                        <p className="text-lg font-bold font-mono text-gray-900 dark:text-white">{metric.value}</p>
                        <p className="text-[10px] text-gray-400">{metric.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Mission details */}
                <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-gray-200 dark:border-slate-800">
                  <CardContent className="p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Info className="h-4 w-4 text-cyan-400" />
                      Mission Configuration
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      {[
                        { label: "Orbit", value: `${selectedOrbit.label} (${selectedOrbit.altitude.toLocaleString()} km)` },
                        { label: "Inclination", value: `${selectedOrbit.inclination}°` },
                        { label: "Period", value: `${selectedOrbit.period} min` },
                        { label: "Launch Site", value: `${selectedSite.name}, ${selectedSite.country}` },
                        { label: "Payload Mass", value: `${mass} kg` },
                        { label: "Solar Power", value: `${power} W` },
                        { label: "Data Rate", value: `${dataRate.toLocaleString()} kbps` },
                        { label: "Launch Window", value: launchWindow },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                          <span className="text-gray-400">{item.label}</span>
                          <span className="text-gray-700 dark:text-gray-300 font-mono">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Risk factors */}
                    {riskAssessment.factors.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg border" style={{ borderColor: `${riskAssessment.color}30`, backgroundColor: `${riskAssessment.color}08` }}>
                        <p className="text-[10px] uppercase tracking-wider font-medium mb-1.5" style={{ color: riskAssessment.color }}>
                          Risk Factors
                        </p>
                        <ul className="space-y-1">
                          {riskAssessment.factors.map((factor, i) => (
                            <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                              <span className="mt-1 h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: riskAssessment.color }} />
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timeline Preview */}
                <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-gray-200 dark:border-slate-800">
                  <CardContent className="p-5">
                    <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Info className="h-3.5 w-3.5" />
                      Mission Timeline Preview (6 months)
                    </h4>
                    <GanttChart phases={MISSION_PHASES_TEMPLATE} />
                  </CardContent>
                </Card>

                {/* Export button */}
                <div className="flex justify-center pt-2">
                  <Button
                    onClick={handleExportMission}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Mission Plan (JSON)
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 max-w-3xl mx-auto">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <span className="text-xs text-gray-400 font-mono">
            Step {currentStep + 1} of 4
          </span>

          <Button
            onClick={handleNext}
            disabled={currentStep === 3}
            className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </section>
  );
}