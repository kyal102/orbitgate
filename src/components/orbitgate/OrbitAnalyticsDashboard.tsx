"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  ShieldCheck,
  ShieldX,
  TrendingUp,
  Clock,
  Activity,
  PieChartIcon,
  Zap,
  Download,
  Loader2,
} from "lucide-react";
import { useOrbitGateStore } from "@/lib/orbitgate-store";
import { DecisionBadge } from "./DecisionBadge";
import { SectionHeader } from "./SectionHeader";
import { exportReport } from "@/lib/export-utils";
import { toast } from "sonner";
import type { Decision } from "@/lib/orbitgate-constants";

// ─── Constants ───────────────────────────────────────────────────────────────

const GATE_NAMES = [
  "TLE",
  "SGP4",
  "Delta-V",
  "Collision",
  "Power",
  "Thermal",
  "Comms",
  "Deorbit",
  "Command",
];

const DECISION_COLORS: Record<string, string> = {
  ALLOW: "#22d3ee",
  BLOCK: "#fb7185",
  NEEDS_REVIEW: "#fbbf24",
  EVIDENCE_REQUIRED: "#38bdf8",
};

const RISK_LABEL_COLORS: Record<string, string> = {
  PHYSICS_COMPLIANT: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  RISK_TOO_HIGH: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  INSUFFICIENT_DATA: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  EVIDENCE_MISSING: "text-sky-400 bg-sky-500/10 border-sky-500/20",
};

// ─── Mock Data (shown when claimHistory is empty) ───────────────────────────

// Static mock timestamps — avoids hydration mismatch from Date.now()
const _MOCK_BASE = "2026-06-27T04:35:00.000Z";
function _mockTs(offsetMs: number): string {
  return new Date(new Date(_MOCK_BASE).getTime() + offsetMs).toISOString();
}
const MOCK_HISTORY = [
  { id: "m1", claim: "ISS orbit altitude is 408 km", decision: "ALLOW", gate: "SGP4", risk_label: "PHYSICS_COMPLIANT", reason: "Propagation confirms 408±5 km altitude", evidence: ["tle_lines"], missing_evidence: [], timestamp: _mockTs(-2 * 60_000) },
  { id: "m2", claim: "Starlink-1007 is in LEO", decision: "ALLOW", gate: "TLE", risk_label: "PHYSICS_COMPLIANT", reason: "TLE epoch valid, LEO regime confirmed", evidence: ["tle_lines"], missing_evidence: [], timestamp: _mockTs(-3 * 60_000) },
  { id: "m3", claim: "GOES-16 will collide with ISS within 24h", decision: "BLOCK", gate: "Collision", risk_label: "RISK_TOO_HIGH", reason: "No conjunction data available for this claim", evidence: [], missing_evidence: ["conjunction_report"], timestamp: _mockTs(-4 * 60_000) },
  { id: "m4", claim: "Hubble requires deorbit maneuver", decision: "NEEDS_REVIEW", gate: "Deorbit", risk_label: "INSUFFICIENT_DATA", reason: "Deorbit timeline requires operator confirmation", evidence: ["tle_lines"], missing_evidence: ["operator_plan"], timestamp: _mockTs(-5 * 60_000) },
  { id: "m5", claim: "Delta-V budget is sufficient for plane change", decision: "ALLOW", gate: "Delta-V", risk_label: "PHYSICS_COMPLIANT", reason: "Calculated ΔV 2.3 km/s within 3.0 km/s budget", evidence: ["tle_lines"], missing_evidence: [], timestamp: _mockTs(-6 * 60_000) },
  { id: "m6", claim: "Thermal analysis shows safe temps", decision: "EVIDENCE_REQUIRED", gate: "Thermal", risk_label: "EVIDENCE_MISSING", reason: "Thermal model output needed", evidence: [], missing_evidence: ["thermal_model_output"], timestamp: _mockTs(-7 * 60_000) },
  { id: "m7", claim: "TLE epoch is current for NOAA 19", decision: "ALLOW", gate: "TLE", risk_label: "PHYSICS_COMPLIANT", reason: "TLE epoch within 5 days of current time", evidence: ["tle_lines"], missing_evidence: [], timestamp: _mockTs(-1 * 60_000) },
  { id: "m8", claim: "Collision probability with debris exceeds 1e-4", decision: "BLOCK", gate: "Collision", risk_label: "RISK_TOO_HIGH", reason: "Cannot verify without conjunction assessment data", evidence: [], missing_evidence: ["conjunction_data"], timestamp: _mockTs(-8 * 60_000) },
  { id: "m9", claim: "Power generation sufficient for eclipse", decision: "ALLOW", gate: "Power", risk_label: "PHYSICS_COMPLIANT", reason: "Solar array sizing within acceptable bounds", evidence: ["tle_lines"], missing_evidence: [], timestamp: _mockTs(-3 * 30_000) },
  { id: "m10", claim: "Command link margin is positive", decision: "NEEDS_REVIEW", gate: "Comms", risk_label: "INSUFFICIENT_DATA", reason: "Link budget parameters incomplete", evidence: ["tle_lines"], missing_evidence: ["antenna_pattern", "tx_power"], timestamp: _mockTs(-4 * 30_000) },
];

// ─── Animated Counter Hook ──────────────────────────────────────────────────

function useAnimatedNumber(target: number, duration = 800) {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (target === display) return;
    const start = display;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, display]);

  return display;
}

// ─── Circular Progress Ring ─────────────────────────────────────────────────

function CircularProgressRing({
  value,
  maxValue,
  color,
  size = 64,
  strokeWidth = 5,
}: {
  value: number;
  maxValue: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeMax = Math.max(maxValue, 1);
  const percentage = Math.min(value / safeMax, 1);
  const [animatedOffset, setAnimatedOffset] = useState(circumference);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedOffset(circumference * (1 - percentage));
    }, 100);
    return () => clearTimeout(timeout);
  }, [percentage, circumference]);

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-800"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={animatedOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-[stroke-dashoffset] duration-1000 ease-out"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white font-bold"
        style={{ fontSize: size * 0.26 }}
      >
        {Math.round(percentage * 100)}%
      </text>
    </svg>
  );
}

// ─── Custom Dark Tooltip ────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-gray-400 mb-1 font-mono">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-700 dark:text-gray-300">{entry.name}:</span>
          <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  children,
  gradient,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  gradient: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <Card
        className={`bg-white dark:bg-white/5 backdrop-blur-xl border-gray-200 dark:border-white/10 overflow-hidden relative hover:shadow-[0_0_15px_rgba(16,185,129,0.08)] transition-all duration-300`}
      >
        {/* Subtle gradient overlay */}
        <div
          className={`absolute inset-0 opacity-[0.04] pointer-events-none ${gradient}`}
        />
        <CardContent className="p-4 sm:p-5 relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-gray-500">{icon}</div>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                  {label}
                </span>
              </div>
              {children}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Export Report Button ──────────────────────────────────────────────────

function ExportReportButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportReport({
        title: "OrbitGate Verification Report",
        sections: ["summary", "claim_history", "analytics", "gate_performance"],
        format: "html",
      });
      toast.success("Report downloaded");
    } catch {
      toast.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className="shrink-0 text-xs bg-gray-100 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700/50 hover:border-gray-400 dark:hover:border-slate-600 h-8 px-3 gap-1.5"
    >
      {isExporting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      📄 Export Report
    </Button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function OrbitAnalyticsDashboard() {
  const { claimHistory } = useOrbitGateStore();

  // Use real data or mock for preview
  const history = Array.isArray(claimHistory) && claimHistory.length > 0
    ? claimHistory
    : MOCK_HISTORY;

  const isEmpty = !Array.isArray(claimHistory) || claimHistory.length === 0;

  // ── Computed Stats ──

  const stats = useMemo(() => {
    const total = history.length;
    const allow = history.filter((e) => e.decision === "ALLOW").length;
    const block = history.filter((e) => e.decision === "BLOCK").length;
    const needsReview = history.filter((e) => e.decision === "NEEDS_REVIEW").length;
    const evidenceRequired = history.filter((e) => e.decision === "EVIDENCE_REQUIRED").length;

    // Most active gate
    const gateCounts: Record<string, number> = {};
    for (const entry of history) {
      gateCounts[entry.gate] = (gateCounts[entry.gate] || 0) + 1;
    }
    let mostActiveGate = "—";
    let mostActiveCount = 0;
    for (const [gate, count] of Object.entries(gateCounts)) {
      if (count > mostActiveCount) {
        mostActiveGate = gate;
        mostActiveCount = count;
      }
    }

    return {
      total,
      allow,
      block,
      needsReview,
      evidenceRequired,
      allowRate: total > 0 ? allow / total : 0,
      blockRate: total > 0 ? block / total : 0,
      mostActiveGate,
      mostActiveCount,
    };
  }, [history]);

  // ── Animated Counters ──

  const animatedTotal = useAnimatedNumber(stats.total);
  const animatedAllow = useAnimatedNumber(stats.allow);
  const animatedBlock = useAnimatedNumber(stats.block);

  // ── Pie Chart Data ──

  const pieData = useMemo(() => {
    const items = [
      { name: "ALLOW", value: stats.allow, color: DECISION_COLORS.ALLOW },
      { name: "BLOCK", value: stats.block, color: DECISION_COLORS.BLOCK },
      { name: "REVIEW", value: stats.needsReview, color: DECISION_COLORS.NEEDS_REVIEW },
      { name: "EVIDENCE", value: stats.evidenceRequired, color: DECISION_COLORS.EVIDENCE_REQUIRED },
    ];
    return items.filter((d) => d.value > 0);
  }, [stats]);

  // ── Bar Chart Data (gate throughput) ──

  const barData = useMemo(() => {
    return GATE_NAMES.map((gate) => {
      const gateEntries = history.filter((e) => e.gate === gate);
      return {
        name: gate,
        ALLOW: gateEntries.filter((e) => e.decision === "ALLOW").length,
        BLOCK: gateEntries.filter((e) => e.decision === "BLOCK").length,
        REVIEW: gateEntries.filter(
          (e) =>
            e.decision === "NEEDS_REVIEW" ||
            e.decision === "EVIDENCE_REQUIRED"
        ).length,
      };
    });
  }, [history]);

  // ── Timeline Data (last 10 minutes, grouped by minute) ──
  // Use mounted state to avoid hydration mismatch from Date.now()
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Force re-render every minute to update relative times
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const relativeTime = useCallback((ts: string) => {
    if (!mounted) return "—";
    const diffMs = Date.now() - new Date(ts).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  }, [mounted]);

  const timelineData = useMemo(() => {
    const now = Date.now();
    const tenMinAgo = now - 10 * 60 * 1000;
    const buckets: Record<string, number> = {};

    // Initialize empty buckets for all 10 minutes
    for (let i = 9; i >= 0; i--) {
      const bucketTime = new Date(now - i * 60_000);
      const key = `${bucketTime.getHours().toString().padStart(2, "0")}:${bucketTime.getMinutes().toString().padStart(2, "0")}`;
      buckets[key] = 0;
    }

    // Count verifications per bucket
    for (const entry of history) {
      const entryTime = new Date(entry.timestamp).getTime();
      if (entryTime >= tenMinAgo && entryTime <= now) {
        const bucketTime = new Date(entryTime);
        const key = `${bucketTime.getHours().toString().padStart(2, "0")}:${bucketTime.getMinutes().toString().padStart(2, "0")}`;
        if (key in buckets) {
          buckets[key]++;
        }
      }
    }

    return Object.entries(buckets).map(([time, count]) => ({
      time,
      count,
    }));
  }, [history, mounted]);

  // ── Recent Decisions (last 10) ──

  const recentDecisions = useMemo(() => {
    return [...history]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [history]);

  // ── Render ──

  return (
    <section id="analytics" className="py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
          <SectionHeader
            title="Orbit Analytics"
            subtitle="Real-time verification metrics, decision distribution, and gate throughput analysis"
            icon={
              <div className="h-10 w-10 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
              </div>
            }
            align="left"
            className="mb-0"
          />
          <ExportReportButton />
        </div>

        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-2 text-xs text-gray-500 bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 border-dashed rounded-lg px-4 py-2.5 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>
              No verification data yet — showing preview with sample data. Submit claims via the Claim Checker to see live analytics.
            </span>
          </motion.div>
        )}

        {/* ── 1. Statistics Cards Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Verifications */}
          <StatCard
            icon={<Activity className="h-4 w-4" />}
            label="Total Verifications"
            gradient="bg-gradient-to-br from-cyan-500 to-transparent"
            delay={0}
          >
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                {animatedTotal}
              </span>
              {stats.total > 0 && (
                <TrendingUp className="h-4 w-4 text-cyan-400 mb-1" />
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              across {GATE_NAMES.length} gates
            </p>
          </StatCard>

          {/* Allow Rate */}
          <StatCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Allow Rate"
            gradient="bg-gradient-to-br from-cyan-500 to-transparent"
            delay={0.05}
          >
            <div className="flex items-center gap-4">
              <CircularProgressRing
                value={stats.allow}
                maxValue={stats.total}
                color="#22d3ee"
                size={64}
                strokeWidth={5}
              />
              <div>
                <span className="text-2xl font-bold text-cyan-400 tabular-nums">
                  {animatedAllow}
                </span>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  of {stats.total} allowed
                </p>
              </div>
            </div>
          </StatCard>

          {/* Block Rate */}
          <StatCard
            icon={<ShieldX className="h-4 w-4" />}
            label="Block Rate"
            gradient="bg-gradient-to-br from-rose-500 to-transparent"
            delay={0.1}
          >
            <div className="flex items-center gap-4">
              <CircularProgressRing
                value={stats.block}
                maxValue={stats.total}
                color="#fb7185"
                size={64}
                strokeWidth={5}
              />
              <div>
                <span className="text-2xl font-bold text-rose-400 tabular-nums">
                  {animatedBlock}
                </span>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  of {stats.total} blocked
                </p>
              </div>
            </div>
          </StatCard>

          {/* Most Active Gate */}
          <StatCard
            icon={<PieChartIcon className="h-4 w-4" />}
            label="Most Active Gate"
            gradient="bg-gradient-to-br from-amber-500 to-transparent"
            delay={0.15}
          >
            <span className="text-2xl font-bold text-amber-400 font-mono">
              {stats.mostActiveGate}
            </span>
            <p className="text-[10px] text-gray-500 mt-1">
              {stats.mostActiveCount} verification{stats.mostActiveCount !== 1 ? "s" : ""}
            </p>
          </StatCard>
        </div>

        {/* ── 2. Charts Row: Pie + Bar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Decision Distribution Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white dark:bg-white/5 backdrop-blur-xl border-gray-200 dark:border-white/10 shadow-[0_0_10px_rgba(16,185,129,0.08)]">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <PieChartIcon className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Decision Distribution
                  </h3>
                </div>
                <div className="relative" style={{ width: "100%", height: 250 }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        animationBegin={200}
                        animationDuration={1000}
                        animationEasing="ease-out"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center total label overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                        {stats.total}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Total
                      </div>
                    </div>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  {[
                    { label: "ALLOW", color: DECISION_COLORS.ALLOW },
                    { label: "BLOCK", color: DECISION_COLORS.BLOCK },
                    { label: "NEEDS_REVIEW", color: DECISION_COLORS.NEEDS_REVIEW },
                    { label: "EVIDENCE_REQUIRED", color: DECISION_COLORS.EVIDENCE_REQUIRED },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[10px] text-gray-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Gate Throughput Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <Card className="bg-white dark:bg-white/5 backdrop-blur-xl border-gray-200 dark:border-white/10 shadow-[0_0_10px_rgba(16,185,129,0.08)]">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Gate Throughput
                  </h3>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={barData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                    barCategoryGap="20%"
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      axisLine={{ stroke: "#334155" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      axisLine={{ stroke: "#334155" }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, color: "#9ca3af" }}
                    />
                    <Bar
                      dataKey="ALLOW"
                      name="Allow"
                      stackId="a"
                      fill={DECISION_COLORS.ALLOW}
                      radius={[0, 0, 0, 0]}
                      animationBegin={400}
                      animationDuration={800}
                    />
                    <Bar
                      dataKey="BLOCK"
                      name="Block"
                      stackId="a"
                      fill={DECISION_COLORS.BLOCK}
                      radius={[0, 0, 0, 0]}
                      animationBegin={500}
                      animationDuration={800}
                    />
                    <Bar
                      dataKey="REVIEW"
                      name="Review"
                      stackId="a"
                      fill={DECISION_COLORS.NEEDS_REVIEW}
                      radius={[4, 4, 0, 0]}
                      animationBegin={600}
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── 3. Verification Timeline ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6"
        >
          <Card className="bg-white dark:bg-white/5 backdrop-blur-xl border-gray-200 dark:border-white/10 shadow-[0_0_10px_rgba(16,185,129,0.08)]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Verification Timeline
                </h3>
                <span className="text-[10px] text-gray-500 ml-auto">
                  Last 10 minutes
                </span>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart
                  data={timelineData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Verifications"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    fill="url(#emeraldGradient)"
                    animationBegin={300}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 4. Recent Decisions Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <Card className="bg-white dark:bg-white/5 backdrop-blur-xl border-gray-200 dark:border-white/10 shadow-[0_0_10px_rgba(16,185,129,0.08)]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Recent Decisions
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono bg-gray-100 dark:bg-slate-800/80 text-gray-500 border-gray-300 dark:border-slate-700 ml-auto"
                >
                  {recentDecisions.length} latest
                </Badge>
              </div>

              {recentDecisions.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center mb-3">
                    <Clock className="h-5 w-5 text-gray-600" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">
                    No Decisions Yet
                  </h4>
                  <p className="text-xs text-gray-600 max-w-sm">
                    Verification results will populate this table as claims are
                    checked through the gates.
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-slate-800 hover:bg-transparent">
                        <TableHead className="text-gray-500 text-xs">
                          Time
                        </TableHead>
                        <TableHead className="text-gray-500 text-xs">
                          Claim
                        </TableHead>
                        <TableHead className="text-gray-500 text-xs">
                          Gate
                        </TableHead>
                        <TableHead className="text-gray-500 text-xs">
                          Decision
                        </TableHead>
                        <TableHead className="text-gray-500 text-xs">
                          Risk
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentDecisions.map((entry) => (
                        <TableRow
                          key={entry.id}
                          className="border-slate-800/50 hover:bg-slate-800/40 transition-colors"
                        >
                          <TableCell className="text-[11px] text-gray-400 font-mono py-2.5" suppressHydrationWarning>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-gray-600" />
                              {relativeTime(entry.timestamp)}
                            </span>
                          </TableCell>
                          <TableCell className="text-[11px] text-gray-700 dark:text-gray-300 max-w-[200px] truncate py-2.5">
                            {entry.claim}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-gray-100 dark:bg-slate-800/80 text-gray-400 border-gray-300 dark:border-slate-700 font-mono"
                            >
                              {entry.gate}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <DecisionBadge
                              decision={entry.decision as Decision}
                              size="sm"
                            />
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-mono ${RISK_LABEL_COLORS[entry.risk_label] ?? "text-gray-400 bg-gray-500/10 border-gray-500/20"}`}
                            >
                              {(entry.risk_label ?? "UNKNOWN").replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}