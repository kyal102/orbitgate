"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import {
  Satellite,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Ruler,
  Clock,
  ArrowRightLeft,
  TrendingDown,
  Info,
  XCircle as XCircleIcon,
} from "lucide-react";
import {
  useOrbitGateStore,
  type TLEEntry,
  type PropagationPoint,
} from "@/lib/orbitgate-store";
import { SectionHeader } from "./SectionHeader";
import { toast } from "sonner";

// ---------- helpers ----------

function computeDistance(
  p1: { lat: number; lon: number; alt: number },
  p2: { lat: number; lon: number; alt: number },
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const horizontalDist = R * c;
  const altDiff = p2.alt - p1.alt;
  return Math.sqrt(horizontalDist ** 2 + altDiff ** 2);
}

interface ConjunctionResult {
  distanceData: { t: number; distance: number }[];
  minDistance: number;
  minDistanceTime: number;
  meanDistance: number;
  stdDev: number;
  primarySummary: { name: string; regime: string; altMin: number; altMax: number };
  secondarySummary: { name: string; regime: string; altMin: number; altMax: number };
}

type RiskLevel = "SAFE" | "CAUTION" | "DANGER";

function getRiskLevel(minDist: number, warning: number, critical: number): RiskLevel {
  if (minDist < critical) return "DANGER";
  if (minDist < warning) return "CAUTION";
  return "SAFE";
}

function getRiskColor(risk: RiskLevel) {
  switch (risk) {
    case "DANGER":
      return { text: "text-rose-400", bg: "bg-rose-500/15 border-rose-500/30", stroke: "#f43f5e", glow: "shadow-rose-500/20" };
    case "CAUTION":
      return { text: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30", stroke: "#f59e0b", glow: "shadow-amber-500/20" };
    default:
      return { text: "text-cyan-400", bg: "bg-cyan-500/15 border-cyan-500/30", stroke: "#06b6d4", glow: "shadow-cyan-500/20" };
  }
}

function getRiskExplanation(risk: RiskLevel, minDist: number, warning: number, critical: number): string {
  switch (risk) {
    case "DANGER":
      return `Minimum separation of ${minDist.toFixed(1)} km is below the critical threshold of ${critical} km. Collision probability is elevated. Immediate attention and potential avoidance maneuver recommended.`;
    case "CAUTION":
      return `Minimum separation of ${minDist.toFixed(1)} km is between the critical (${critical} km) and warning (${warning} km) thresholds. Monitor closely — conjunction may become critical with uncertainty growth.`;
    default:
      return `Minimum separation of ${minDist.toFixed(1)} km exceeds the warning threshold of ${warning} km. No immediate collision risk detected based on current state vectors.`;
  }
}

// ---------- component ----------

export function ConjunctionAnalysis() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { tleEntries } = useOrbitGateStore();

  const [primaryId, setPrimaryId] = useState<string>("");
  const [secondaryId, setSecondaryId] = useState<string>("");
  const [duration, setDuration] = useState(100);
  const [step, setStep] = useState(1);
  const [warningThreshold, setWarningThreshold] = useState(10);
  const [criticalThreshold, setCriticalThreshold] = useState(5);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ConjunctionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const primaryTLE = useMemo(
    () => tleEntries.find((t) => t.norad_id === primaryId) ?? null,
    [tleEntries, primaryId],
  );
  const secondaryTLE = useMemo(
    () => tleEntries.find((t) => t.norad_id === secondaryId) ?? null,
    [tleEntries, secondaryId],
  );

  const runAnalysis = useCallback(async () => {
    if (!primaryTLE || !secondaryTLE) {
      toast.error("Please select both a primary and secondary satellite.");
      return;
    }
    if (primaryId === secondaryId) {
      toast.error("Primary and secondary satellites must be different.");
      return;
    }
    if (step <= 0 || duration <= 0) {
      toast.error("Duration and step must be positive values.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const steps = Math.floor(duration / step);
      const body = (tle: TLEEntry) =>
        JSON.stringify({
          line1: tle.line1,
          line2: tle.line2,
          duration_minutes: duration,
          steps,
        });

      const [resPrimary, resSecondary] = await Promise.all([
        fetch("/api/orbitgate/propagate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body(primaryTLE),
        }),
        fetch("/api/orbitgate/propagate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body(secondaryTLE),
        }),
      ]);

      if (!resPrimary.ok || !resSecondary.ok) {
        const errText = !resPrimary.ok ? await resPrimary.text() : await resSecondary.text();
        throw new Error(`Propagation failed: ${errText}`);
      }

      const dataPrimary = await resPrimary.json();
      const dataSecondary = await resSecondary.json();

      const ptsPrimary: PropagationPoint[] = dataPrimary.data?.points ?? [];
      const ptsSecondary: PropagationPoint[] = dataSecondary.data?.points ?? [];

      if (ptsPrimary.length === 0 || ptsSecondary.length === 0) {
        throw new Error("One or both propagations returned no data points.");
      }

      const count = Math.min(ptsPrimary.length, ptsSecondary.length);
      const distanceData: { t: number; distance: number }[] = [];

      for (let i = 0; i < count; i++) {
        const p = ptsPrimary[i]!;
        const s = ptsSecondary[i]!;
        const dist = computeDistance(
          { lat: p.latitude_deg, lon: p.longitude_deg, alt: p.altitude_km },
          { lat: s.latitude_deg, lon: s.longitude_deg, alt: s.altitude_km },
        );
        distanceData.push({ t: p.t_min, distance: Math.round(dist * 100) / 100 });
      }

      // Find minimum
      let minDist = Infinity;
      let minDistTime = 0;
      let sumDist = 0;
      for (const d of distanceData) {
        if (d.distance < minDist) {
          minDist = d.distance;
          minDistTime = d.t;
        }
        sumDist += d.distance;
      }
      const meanDist = sumDist / distanceData.length;

      // Standard deviation
      let sumSqDiff = 0;
      for (const d of distanceData) {
        sumSqDiff += (d.distance - meanDist) ** 2;
      }
      const stdDev = Math.sqrt(sumSqDiff / distanceData.length);

      // Summaries
      const altPrimary = ptsPrimary.map((p) => p.altitude_km);
      const altSecondary = ptsSecondary.map((p) => p.altitude_km);

      setResult({
        distanceData,
        minDistance: minDist,
        minDistanceTime: minDistTime,
        meanDistance: meanDist,
        stdDev: stdDev,
        primarySummary: {
          name: primaryTLE.name,
          regime: dataPrimary.data?.summary?.regime ?? "Unknown",
          altMin: Math.min(...altPrimary),
          altMax: Math.max(...altPrimary),
        },
        secondarySummary: {
          name: secondaryTLE.name,
          regime: dataSecondary.data?.summary?.regime ?? "Unknown",
          altMin: Math.min(...altSecondary),
          altMax: Math.max(...altSecondary),
        },
      });
      toast.success("Conjunction analysis complete.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred.";
      setError(message);
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [primaryTLE, secondaryTLE, primaryId, secondaryId, duration, step]);

  const risk = result
    ? getRiskLevel(result.minDistance, warningThreshold, criticalThreshold)
    : null;
  const riskColor = risk ? getRiskColor(risk) : null;

  // Chart color based on min distance
  const chartStrokeColor = riskColor?.stroke ?? "#06b6d4";
  const chartFillOpacity = risk === "DANGER" ? 0.25 : risk === "CAUTION" ? 0.15 : 0.1;

  return (
    <section id="conjunction" className="w-full py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="Conjunction Analysis"
          subtitle="Analyze close approaches and compute minimum separation distances between two satellites over time"
          icon={<ArrowRightLeft className="h-6 w-6 text-cyan-400" />}
        />

        {/* Satellite Selection */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Primary */}
          <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Satellite className="h-4 w-4 text-cyan-400" />
                Primary Satellite
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={primaryId} onValueChange={setPrimaryId}>
                <SelectTrigger className="w-full bg-gray-100/80 dark:bg-slate-800/50 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white">
                  <SelectValue placeholder={tleEntries.length === 0 ? "No TLEs loaded" : "Select primary satellite"} />
                </SelectTrigger>
                <SelectContent className="bg-gray-50 dark:bg-slate-900 border-gray-300 dark:border-slate-700 max-h-60">
                  {tleEntries.map((tle) => (
                    <SelectItem key={tle.norad_id} value={tle.norad_id} className="text-gray-700 dark:text-gray-200 focus:bg-gray-100 dark:bg-slate-800 focus:text-gray-900 dark:text-white">
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono">{tle.norad_id}</span>
                        <span>{tle.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Secondary */}
          <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Satellite className="h-4 w-4 text-sky-400" />
                Secondary Satellite
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={secondaryId} onValueChange={setSecondaryId}>
                <SelectTrigger className="w-full bg-gray-100/80 dark:bg-slate-800/50 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white">
                  <SelectValue placeholder={tleEntries.length === 0 ? "No TLEs loaded" : "Select secondary satellite"} />
                </SelectTrigger>
                <SelectContent className="bg-gray-50 dark:bg-slate-900 border-gray-300 dark:border-slate-700 max-h-60">
                  {tleEntries.map((tle) => (
                    <SelectItem key={tle.norad_id} value={tle.norad_id} className="text-gray-700 dark:text-gray-200 focus:bg-gray-100 dark:bg-slate-800 focus:text-gray-900 dark:text-white">
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono">{tle.norad_id}</span>
                        <span>{tle.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </motion.div>

        {/* Configuration Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Ruler className="h-4 w-4 text-cyan-400" />
                Analysis Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400">Duration (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="bg-gray-100/80 dark:bg-slate-800/50 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400">Step (min)</Label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={step}
                    onChange={(e) => setStep(Number(e.target.value))}
                    className="bg-gray-100/80 dark:bg-slate-800/50 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Warning (km)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={warningThreshold}
                    onChange={(e) => setWarningThreshold(Number(e.target.value))}
                    className="bg-gray-100/80 dark:bg-slate-800/50 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-rose-400 flex items-center gap-1">
                    <XCircleIcon className="h-3 w-3" />
                    Critical (km)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={criticalThreshold}
                    onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                    className="bg-gray-100/80 dark:bg-slate-800/50 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white h-9 text-sm"
                  />
                </div>
              </div>
              <Button
                onClick={runAnalysis}
                disabled={isAnalyzing || tleEntries.length === 0 || !primaryId || !secondaryId}
                className="bg-cyan-600 hover:bg-cyan-500 text-gray-900 dark:text-white w-full sm:w-auto"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Conjunction...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Analyze Conjunction
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Empty State */}
        {tleEntries.length === 0 && !result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Satellite className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">No TLE entries loaded.</p>
            <p className="text-gray-500 text-xs mt-1">
              Load satellites from the TLE Browser above, then return here to analyze conjunctions.
            </p>
          </motion.div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <Card className="bg-rose-500/10 border-rose-500/30">
                <CardContent className="p-4 flex items-start gap-3">
                  <XCircleIcon className="h-5 w-5 text-rose-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-rose-600 dark:text-rose-300 text-sm font-medium">Analysis Failed</p>
                    <p className="text-rose-400/70 text-xs mt-1">{error}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && risk && riskColor && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Top Row: Min Distance + Risk Badge */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Minimum Distance Card */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className={`lg:col-span-1 rounded-xl border p-6 text-center ${riskColor.bg} shadow-lg ${riskColor.glow}`}
                >
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Minimum Distance</p>
                  <p className={`text-5xl font-bold ${riskColor.text} tabular-nums`}>
                    {result.minDistance < 1
                      ? result.minDistance.toFixed(3)
                      : result.minDistance < 100
                        ? result.minDistance.toFixed(1)
                        : Math.round(result.minDistance)}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">km</p>
                  <Separator className="my-4 bg-slate-700/50" />
                  <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    <span>T+{result.minDistanceTime.toFixed(1)} min</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Time of closest approach</p>
                </motion.div>

                {/* Distance vs Time Chart */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="lg:col-span-2"
                >
                  <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-cyan-400" />
                        Distance vs Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={result.distanceData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                            <defs>
                              <linearGradient id="conjGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={chartStrokeColor} stopOpacity={chartFillOpacity} />
                                <stop offset="100%" stopColor={chartStrokeColor} stopOpacity={0.01} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e5e7eb"} />
                            <XAxis
                              dataKey="t"
                              stroke={isDark ? "#475569" : "#d1d5db"}
                              tick={{ fill: isDark ? "#64748b" : "#6b7280", fontSize: 11 }}
                              label={{
                                value: "Time (min)",
                                position: "insideBottom",
                                offset: -2,
                                fill: isDark ? "#64748b" : "#6b7280",
                                fontSize: 11,
                              }}
                              tickLine={false}
                            />
                            <YAxis
                              stroke={isDark ? "#475569" : "#d1d5db"}
                              tick={{ fill: isDark ? "#64748b" : "#6b7280", fontSize: 11 }}
                              label={{
                                value: "Distance (km)",
                                angle: -90,
                                position: "insideLeft",
                                fill: isDark ? "#64748b" : "#6b7280",
                                fontSize: 11,
                              }}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                                border: isDark ? "1px solid #1e293b" : "1px solid rgba(209,213,219,0.8)",
                                borderRadius: "8px",
                                fontSize: "12px",
                                color: isDark ? "#e2e8f0" : "#374151",
                              }}
                              formatter={(value: number) => [`${value.toFixed(2)} km`, "Distance"]}
                              labelFormatter={(label: number) => `T+${label} min`}
                            />
                            {/* Warning threshold line */}
                            <ReferenceLine
                              y={warningThreshold}
                              stroke="#f59e0b"
                              strokeDasharray="8 4"
                              strokeWidth={1.5}
                              label={{
                                value: `Warning ${warningThreshold} km`,
                                position: "right",
                                fill: "#f59e0b",
                                fontSize: 10,
                              }}
                            />
                            {/* Critical threshold line */}
                            <ReferenceLine
                              y={criticalThreshold}
                              stroke="#f43f5e"
                              strokeDasharray="8 4"
                              strokeWidth={1.5}
                              label={{
                                value: `Critical ${criticalThreshold} km`,
                                position: "right",
                                fill: "#f43f5e",
                                fontSize: 10,
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="distance"
                              fill="url(#conjGradient)"
                              stroke="none"
                            />
                            <Line
                              type="monotone"
                              dataKey="distance"
                              stroke={chartStrokeColor}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 5, strokeWidth: 2, fill: "#0f172a" }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Minimum distance dot indicator */}
                      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-0.5 bg-amber-500" style={{ borderTop: "2px dashed #f59e0b" }} />
                          Warning threshold
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-0.5 bg-rose-500" style={{ borderTop: "2px dashed #f43f5e" }} />
                          Critical threshold
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Risk Assessment Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="flex justify-center"
              >
                <div className="flex items-center gap-3">
                  {risk === "SAFE" && <ShieldCheck className="h-5 w-5 text-cyan-400" />}
                  {risk === "CAUTION" && <ShieldAlert className="h-5 w-5 text-amber-400" />}
                  {risk === "DANGER" && <ShieldAlert className="h-5 w-5 text-rose-400" />}
                  <Badge
                    className={`text-sm px-4 py-1.5 border font-semibold ${riskColor.bg} ${riskColor.text}`}
                  >
                    {risk === "SAFE" && "✓ "}
                    {risk === "CAUTION" && "⚠ "}
                    {risk === "DANGER" && "✕ "}
                    RISK LEVEL: {risk}
                  </Badge>
                </div>
              </motion.div>

              {/* Summary Panel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
              >
                <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 relative overflow-hidden">
                  {/* Subtle nebula background at 5% opacity */}
                  <div className="absolute inset-0 bg-cover bg-center opacity-[0.03] pointer-events-none dark:opacity-[0.05]" style={{ backgroundImage: "url('https://sfile.chatglm.cn/images-ppt/b73a09db6230.jpg')" }} />
                  <CardHeader className="pb-3 relative">
                    <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Info className="h-4 w-4 text-cyan-400" />
                      Conjunction Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Satellite Info Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Primary */}
                      <div className="rounded-lg bg-gray-100/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 p-4 space-y-2">
                        <p className="text-xs text-cyan-400 font-medium uppercase tracking-wider">Primary Satellite</p>
                        <p className="text-gray-900 dark:text-white font-medium text-sm">{result.primarySummary.name}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                          <Badge variant="outline" className="text-xs border-slate-600 text-gray-700 dark:text-gray-300">
                            {result.primarySummary.regime}
                          </Badge>
                          <span>
                            Alt: {result.primarySummary.altMin.toFixed(1)}–{result.primarySummary.altMax.toFixed(1)} km
                          </span>
                        </div>
                      </div>
                      {/* Secondary */}
                      <div className="rounded-lg bg-gray-100/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 p-4 space-y-2">
                        <p className="text-xs text-sky-400 font-medium uppercase tracking-wider">Secondary Satellite</p>
                        <p className="text-gray-900 dark:text-white font-medium text-sm">{result.secondarySummary.name}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                          <Badge variant="outline" className="text-xs border-slate-600 text-gray-700 dark:text-gray-300">
                            {result.secondarySummary.regime}
                          </Badge>
                          <span>
                            Alt: {result.secondarySummary.altMin.toFixed(1)}–{result.secondarySummary.altMax.toFixed(1)} km
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-slate-700/50" />

                    {/* Statistics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Closest Approach</p>
                        <p className={`text-lg font-bold tabular-nums ${riskColor.text}`}>
                          {result.minDistance.toFixed(1)} km
                        </p>
                        <p className="text-xs text-gray-500">at T+{result.minDistanceTime.toFixed(1)} min</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Mean Distance</p>
                        <p className="text-lg font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                          {result.meanDistance.toFixed(1)} km
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Std Deviation</p>
                        <p className="text-lg font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                          {result.stdDev.toFixed(1)} km
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Data Points</p>
                        <p className="text-lg font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                          {result.distanceData.length}
                        </p>
                      </div>
                    </div>

                    <Separator className="bg-slate-700/50" />

                    {/* Risk Explanation */}
                    <div className={`rounded-lg p-4 ${riskColor.bg} border`}>
                      <div className="flex items-start gap-2">
                        {risk === "SAFE" && <ShieldCheck className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />}
                        {risk === "CAUTION" && <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />}
                        {risk === "DANGER" && <ShieldAlert className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />}
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                          {getRiskExplanation(risk, result.minDistance, warningThreshold, criticalThreshold)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No-analysis-yet empty state (when TLEs exist but no analysis run) */}
        {tleEntries.length > 0 && !result && !isAnalyzing && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <ArrowRightLeft className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Select two satellites and run the analysis to see conjunction data.</p>
            <p className="text-gray-500 text-xs mt-1">
              Distance will be computed at each time step using haversine-based 3D approximation.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}