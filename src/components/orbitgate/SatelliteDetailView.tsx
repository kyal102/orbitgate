"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrbitGateStore, type TLEEntry } from "@/lib/orbitgate-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Satellite,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  Compass,
  CircleDot,
  RotateCcw,
  Navigation,
  Target,
  ChevronDown,
  ChevronUp,
  Play,
  Plus,
  FileArchive,
  Orbit,
  Info,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { toast } from "sonner";

// ─── TLE Parsing Utilities ──────────────────────────────────────────────────

interface ParsedTLE {
  classification: string;
  intlDesignator: string;
  epoch: string;
  meanMotion: number;
  eccentricity: number;
  inclination: number;
  raan: number;
  argPerigee: number;
  meanAnomaly: number;
  bStar: number;
  revNumber: number;
}

function parseTLELines(line1: string, line2: string): ParsedTLE | null {
  if (line1.length < 69 || line2.length < 69) return null;

  try {
    const classification = line1.substring(7, 8);
    const intlDesignator = line1.substring(9, 17).trim();
    const epochRaw = line1.substring(18, 32).trim();
    const meanMotion = parseFloat(line2.substring(52, 63).trim());
    const eccentricityRaw = line2.substring(26, 33).trim();
    const eccentricity = parseFloat("0." + eccentricityRaw);
    const inclination = parseFloat(line2.substring(8, 16).trim());
    const raan = parseFloat(line2.substring(17, 25).trim());
    const argPerigee = parseFloat(line2.substring(34, 42).trim());
    const meanAnomaly = parseFloat(line2.substring(43, 51).trim());
    const bStarRaw = line1.substring(53, 61).trim();
    const bStarExponent = parseInt(line1.substring(61, 63).trim());
    const bStarMantissa = parseFloat(bStarRaw);
    const bStar = bStarMantissa * Math.pow(10, bStarExponent);
    const revNumber = parseInt(line2.substring(63, 68).trim());

    return {
      classification,
      intlDesignator,
      epoch: epochRaw,
      meanMotion,
      eccentricity,
      inclination,
      raan,
      argPerigee,
      meanAnomaly,
      bStar,
      revNumber,
    };
  } catch {
    return null;
  }
}

function determineRegime(altMin: number, altMax: number, period: number): string {
  if (period > 1400) return "GEO";
  if (altMax > 35000) return "HEO";
  if (period > 180 && altMin > 2000) return "MEO";
  return "LEO";
}

function getRegimeColor(regime: string): string {
  const colors: Record<string, string> = {
    LEO: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
    MEO: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    GEO: "text-sky-400 bg-sky-500/15 border-sky-500/30",
    HEO: "text-purple-400 bg-purple-500/15 border-purple-500/30",
  };
  return colors[regime] || "text-gray-400 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700";
}

function getRegimeDescription(regime: string): string {
  const descriptions: Record<string, string> = {
    LEO: "Low Earth Orbit — typical altitude 160–2,000 km, period 88–127 min. Used for ISS, Earth observation, and mega-constellations.",
    MEO: "Medium Earth Orbit — typical altitude 2,000–35,786 km, period 2–24 h. Home to GPS, GLONASS, and Galileo navigation constellations.",
    GEO: "Geostationary Orbit — altitude ~35,786 km, period ~1,436 min (24 h). Appears stationary over the equator. Used for comms and weather satellites.",
    HEO: "Highly Elliptical Orbit — perigee in LEO, apogee beyond GEO. Includes Molniya and Tundra orbits for high-latitude coverage.",
  };
  return descriptions[regime] || "Unknown orbital regime.";
}

// ─── Orbit Mini-Map ──────────────────────────────────────────────────────────

function OrbitMiniMap({
  eccentricity,
  inclination,
}: {
  eccentricity: number;
  inclination: number;
}) {
  const cx = 60;
  const cy = 60;
  const earthR = 14;
  const semiMajor = 42;
  const semiMinor = semiMajor * Math.sqrt(1 - Math.min(eccentricity, 0.99) ** 2);

  // Tilt the ellipse based on inclination (visual effect)
  const tiltAngle = (inclination / 180) * 30;

  return (
    <svg
      width={120}
      height={120}
      viewBox="0 0 120 120"
      className="shrink-0"
      aria-label="Orbit visualization mini-map"
    >
      {/* Background */}
      <rect width="120" height="120" fill="transparent" />
      {/* Orbit ellipse */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={semiMajor}
        ry={semiMinor}
        fill="none"
        stroke="rgba(34, 211, 238, 0.4)"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        transform={`rotate(${tiltAngle}, ${cx}, ${cy})`}
        style={{ filter: "drop-shadow(0 0 6px rgba(16,185,129,0.25))" }}
      />
      {/* Earth */}
      <circle cx={cx} cy={cy} r={earthR} className="fill-gray-200 dark:fill-slate-700 stroke-gray-300 dark:stroke-slate-600" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={earthR * 0.7} className="fill-gray-100 dark:fill-slate-800" />
      {/* Earth label */}
      <text
        x={cx}
        y={cy + 3}
        textAnchor="middle"
        fontSize="6"
        className="fill-gray-400 dark:fill-slate-500"
        fontFamily="monospace"
      >
        E
      </text>
      {/* Satellite dot on orbit */}
      <circle
        cx={cx + semiMajor * 0.85}
        cy={cy - 3}
        r="3"
        fill="#22d3ee"
        opacity="0.9"
        style={{ filter: "drop-shadow(0 0 4px rgba(16,185,129,0.6))" }}
      />
    </svg>
  );
}

// ─── TLE Syntax Highlighting ─────────────────────────────────────────────────

function HighlightedTLE({ line, type }: { line: string; type: "line1" | "line2" }) {
  if (type === "line1") {
    // Highlight: classification (pos 7), epoch (18-31), b* drag (53-60)
    const prefix = line.substring(0, 7);
    const classification = line.substring(7, 8);
    const between1 = line.substring(8, 18);
    const epoch = line.substring(18, 32);
    const between2 = line.substring(32, 53);
    const bStar = line.substring(53, 69);
    const checksum = line.substring(68);

    return (
      <span className="font-mono text-xs leading-relaxed break-all">
        <span className="text-gray-500">{prefix}</span>
        <span className="text-amber-400 font-semibold">{classification}</span>
        <span className="text-gray-500">{between1}</span>
        <span className="text-cyan-400 font-semibold">{epoch}</span>
        <span className="text-gray-500">{between2}</span>
        <span className="text-rose-400 font-semibold">{bStar}</span>
        <span className="text-sky-400">{checksum}</span>
      </span>
    );
  }

  // Line 2
  const prefix = line.substring(0, 8);
  const inclination = line.substring(8, 16);
  const raan = line.substring(17, 25);
  const eccentricity = line.substring(26, 33);
  const argPerigee = line.substring(34, 42);
  const meanAnomaly = line.substring(43, 51);
  const meanMotion = line.substring(52, 63);
  const revNum = line.substring(63, 68);
  const checksum = line.substring(68);

  return (
    <span className="font-mono text-xs leading-relaxed break-all">
      <span className="text-gray-500">{prefix}</span>
      <span className="text-sky-400 font-semibold">{inclination}</span>
      <span className="text-gray-600">{line.substring(16, 17)}</span>
      <span className="text-amber-400 font-semibold">{raan}</span>
      <span className="text-gray-600">{line.substring(25, 26)}</span>
      <span className="text-gray-400">{eccentricity}</span>
      <span className="text-gray-600">{line.substring(33, 34)}</span>
      <span className="text-purple-400 font-semibold">{argPerigee}</span>
      <span className="text-gray-600">{line.substring(42, 43)}</span>
      <span className="text-teal-400 font-semibold">{meanAnomaly}</span>
      <span className="text-gray-600">{line.substring(51, 52)}</span>
      <span className="text-cyan-400 font-semibold">{meanMotion}</span>
      <span className="text-gray-400">{revNum}</span>
      <span className="text-sky-400">{checksum}</span>
    </span>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/60 dark:backdrop-blur-sm dark:border-slate-700/50 rounded-lg p-3 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`h-3.5 w-3.5 ${color || "text-gray-500"}`} />
        <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-gray-900 dark:text-white font-mono text-sm font-semibold">
        {value}
        {unit && <span className="text-gray-500 text-xs ml-1">{unit}</span>}
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SatelliteDetailView() {
  const {
    selectedTLE,
    setSelectedTLE,
    comparisonMode,
    addToComparison,
    comparisonSatellites,
    propagationResult,
  } = useOrbitGateStore();

  const [tleExpanded, setTleExpanded] = useState(false);

  const parsed = useMemo(() => {
    if (!selectedTLE) return null;
    return parseTLELines(selectedTLE.line1, selectedTLE.line2);
  }, [selectedTLE]);

  const orbitalData = useMemo(() => {
    if (!parsed) return null;
    const { meanMotion, eccentricity, inclination } = parsed;

    // Calculate period from mean motion
    const periodMin = (24 * 60) / meanMotion;

    // Semi-major axis (km) from period: T = 2π√(a³/μ), μ = 398600.4418 km³/s²
    const periodSec = periodMin * 60;
    const mu = 398600.4418;
    const semiMajorKm = Math.pow((periodSec * periodSec * mu) / (4 * Math.PI * Math.PI), 1 / 3);

    // Apogee and perigee from semi-major axis and eccentricity
    const earthRadiusKm = 6371;
    const perigeeKm = semiMajorKm * (1 - eccentricity) - earthRadiusKm;
    const apogeeKm = semiMajorKm * (1 + eccentricity) - earthRadiusKm;

    const regime = determineRegime(perigeeKm, apogeeKm, periodMin);

    return {
      periodMin,
      semiMajorKm,
      perigeeKm,
      apogeeKm,
      regime,
    };
  }, [parsed]);

  const isAlreadyInComparison = selectedTLE
    ? comparisonSatellites.some((s) => s.norad_id === selectedTLE.norad_id)
    : false;

  const handlePropagate = useCallback(() => {
    if (!selectedTLE) return;
    const el = document.getElementById("propagator");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedTLE]);

  const handleAddToCompare = useCallback(() => {
    if (!selectedTLE || isAlreadyInComparison) return;
    addToComparison(selectedTLE);
    toast.success(`Added ${selectedTLE.name} to comparison`);
  }, [selectedTLE, isAlreadyInComparison, addToComparison]);

  const navigateToSection = useOrbitGateStore((s) => s.navigateToSection);

  const handleEvidencePack = useCallback(() => {
    navigateToSection("evidence-pack");
  }, [navigateToSection]);

  // Empty state
  if (!selectedTLE) {
    return (
      <section id="satellite-detail" className="py-16 sm:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            title="Satellite Detail"
            subtitle="Detailed orbital information for the selected satellite"
            icon={<Satellite className="h-6 w-6 text-cyan-400" />}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
              <CardContent className="p-8 sm:p-12 text-center">
                <Satellite className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">
                  Select a satellite from the TLE Browser above to view detailed information
                </p>
                <p className="text-gray-600 text-xs mt-2">
                  Click &quot;Propagate&quot; on any satellite card to populate this panel
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="satellite-detail" className="py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Satellite Detail"
          subtitle={`Inspecting ${selectedTLE.name}`}
          icon={<Satellite className="h-6 w-6 text-cyan-400" />}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          {/* Top Row: Info Card + Mini-Map */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Satellite Info Card */}
            <Card className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800 lg:col-span-2 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                        {selectedTLE.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-400 border-gray-300 dark:border-slate-700 font-mono"
                      >
                        NORAD {selectedTLE.norad_id}
                      </Badge>
                      {orbitalData && (
                        <Badge
                          variant="outline"
                          className={`text-xs border ${getRegimeColor(orbitalData.regime)}`}
                        >
                          {orbitalData.regime}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Classification:{" "}
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {parsed?.classification === "U"
                            ? "Unclassified"
                            : parsed?.classification || "Unknown"}
                        </span>
                      </span>
                      {parsed?.intlDesignator && (
                        <span>
                          Intl Designator:{" "}
                          <span className="text-gray-700 dark:text-gray-300 font-mono">
                            {parsed.intlDesignator}
                          </span>
                        </span>
                      )}
                      <span>
                        Source: <span className="text-gray-700 dark:text-gray-300">{selectedTLE.source}</span>
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTLE(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-300 shrink-0"
                  >
                    Clear
                  </Button>
                </div>

                {/* Regime Description */}
                {orbitalData && (
                  <div className="mt-4 p-3 rounded-lg bg-gray-100/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {getRegimeDescription(orbitalData.regime)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Orbit Mini-Map */}
            <Card className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300">
              <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-medium">
                  Orbit Map
                </p>
                <OrbitMiniMap
                  eccentricity={parsed?.eccentricity || 0}
                  inclination={parsed?.inclination || 0}
                />
                <p className="text-[10px] text-gray-600 mt-2">
                  Top-down view · simplified
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TLE Details — Expandable */}
          <Card className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300">
            <button
              onClick={() => setTleExpanded(!tleExpanded)}
              className="w-full flex items-center justify-between p-4 sm:p-6 text-left"
            >
              <div className="flex items-center gap-2">
                <FileArchive className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  TLE Data
                </span>
                <span className="text-xs text-gray-600 font-mono ml-2">
                  Epoch: {selectedTLE.epoch}
                </span>
              </div>
              {tleExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <AnimatePresence>
              {tleExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Separator className="bg-gray-100 dark:bg-slate-800 mx-4 sm:mx-6" />
                  <div className="p-4 sm:p-6 space-y-3">
                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-cyan-400" />
                        Epoch / Mean Motion
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-sky-400" />
                        Inclination
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                        RAAN
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-purple-400" />
                        Arg. Perigee
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-teal-400" />
                        Mean Anomaly
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-rose-400" />
                        B* Drag
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-600 mb-1">Line 1</p>
                      <div className="bg-gray-50 dark:bg-slate-950/50 rounded p-3 overflow-x-auto">
                        <HighlightedTLE line={selectedTLE.line1} type="line1" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-600 mb-1">Line 2</p>
                      <div className="bg-gray-50 dark:bg-slate-950/50 rounded p-3 overflow-x-auto">
                        <HighlightedTLE line={selectedTLE.line2} type="line2" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Quick Stats Grid */}
          {parsed && orbitalData && (
            <Card className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300">
              <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <Orbit className="h-4 w-4 text-cyan-400" />
                  Orbital Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard
                    icon={ArrowUpCircle}
                    label="Apogee"
                    value={Math.round(orbitalData.apogeeKm).toLocaleString()}
                    unit="km"
                    color="text-rose-400"
                  />
                  <StatCard
                    icon={ArrowDownCircle}
                    label="Perigee"
                    value={Math.round(orbitalData.perigeeKm).toLocaleString()}
                    unit="km"
                    color="text-cyan-400"
                  />
                  <StatCard
                    icon={Clock}
                    label="Period"
                    value={orbitalData.periodMin.toFixed(1)}
                    unit="min"
                    color="text-sky-400"
                  />
                  <StatCard
                    icon={Compass}
                    label="Inclination"
                    value={parsed.inclination.toFixed(4)}
                    unit="°"
                    color="text-sky-400"
                  />
                  <StatCard
                    icon={CircleDot}
                    label="Eccentricity"
                    value={parsed.eccentricity.toFixed(7)}
                    color="text-purple-400"
                  />
                  <StatCard
                    icon={RotateCcw}
                    label="Mean Motion"
                    value={parsed.meanMotion.toFixed(6)}
                    unit="rev/day"
                    color="text-cyan-400"
                  />
                  <StatCard
                    icon={Navigation}
                    label="RAAN"
                    value={parsed.raan.toFixed(4)}
                    unit="°"
                    color="text-amber-400"
                  />
                  <StatCard
                    icon={Target}
                    label="Arg. Perigee"
                    value={parsed.argPerigee.toFixed(4)}
                    unit="°"
                    color="text-purple-400"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handlePropagate}
              className="bg-cyan-600 hover:bg-cyan-500 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] text-gray-900 dark:text-white transition-all duration-300"
              size="sm"
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Propagate
            </Button>
            {comparisonMode && (
              <Button
                onClick={handleAddToCompare}
                disabled={isAlreadyInComparison}
                variant={isAlreadyInComparison ? "secondary" : "outline"}
                size="sm"
                className={
                  isAlreadyInComparison
                    ? "bg-gray-100 dark:bg-slate-800 text-gray-500"
                    : "border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/50 hover:shadow-[0_0_10px_rgba(245,158,11,0.2)] transition-all duration-300"
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {isAlreadyInComparison ? "In Comparison" : "Add to Compare"}
              </Button>
            )}
            <Button
              onClick={handleEvidencePack}
              variant="outline"
              size="sm"
              className="border-gray-200 dark:border-slate-700 text-gray-500 hover:text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-all duration-300"
            >
              <FileArchive className="h-3.5 w-3.5 mr-1.5" />
              Evidence Pack
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}