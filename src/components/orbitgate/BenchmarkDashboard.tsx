"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  XCircle,
  HelpCircle,
  FileQuestion,
  BarChart3,
  Play,
  Loader2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DecisionBadge } from "./DecisionBadge";
import { SectionHeader } from "./SectionHeader";
import {
  MOCK_BENCHMARK_SUMMARY,
  MOCK_BENCHMARK_PER_GATE,
  MOCK_BENCHMARK_CASES,
} from "@/lib/orbitgate-constants";
import type { Decision, BenchmarkCase } from "@/lib/orbitgate-constants";

const PIE_COLORS: Record<Decision, string> = {
  ALLOW: "#06b6d4",
  BLOCK: "#f43f5e",
  NEEDS_REVIEW: "#f59e0b",
  EVIDENCE_REQUIRED: "#38bdf8",
};

const FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "ALLOW", value: "ALLOW" },
  { label: "BLOCK", value: "BLOCK" },
  { label: "NEEDS REVIEW", value: "NEEDS_REVIEW" },
  { label: "EVIDENCE REQ.", value: "EVIDENCE_REQUIRED" },
];

function SummaryCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: typeof CheckCircle;
}) {
  return (
    <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BenchmarkTable({
  cases,
  filter,
}: {
  cases: BenchmarkCase[];
  filter: string;
}) {
  const filtered = useMemo(() => {
    if (filter === "all") return cases;
    return cases.filter((c) => c.expected_decision === filter);
  }, [cases, filter]);

  return (
    <div className="max-h-96 overflow-y-auto custom-scrollbar rounded-lg border border-gray-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-50 dark:bg-slate-900 z-10">
          <tr className="border-b border-gray-200 dark:border-slate-800">
            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Case ID
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
              Claim Type
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Input
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Decision
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
              Gate
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
              Risk Label
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-800/50">
          {filtered.map((c) => (
            <tr
              key={c.case_id}
              className="hover:bg-gray-100 dark:hover:bg-slate-800/30 transition-colors"
            >
              <td className="px-3 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">
                {c.case_id}
              </td>
              <td className="px-3 py-2.5 text-xs text-gray-500 hidden sm:table-cell">
                {c.claim_type}
              </td>
              <td className="px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300 max-w-[200px] sm:max-w-[280px] truncate">
                {c.input}
              </td>
              <td className="px-3 py-2.5">
                <DecisionBadge decision={c.expected_decision} size="sm" />
              </td>
              <td className="px-3 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell">
                {c.gate}
              </td>
              <td className="px-3 py-2.5 font-mono text-xs text-gray-500 hidden lg:table-cell">
                {c.risk_label}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-3 py-8 text-center text-gray-500 text-sm"
              >
                No cases match the selected filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const tooltipStyle = (isDark: boolean) => ({
  backgroundColor: isDark ? "#1e293b" : "#ffffff",
  border: isDark ? "1px solid rgba(148,163,184,0.15)" : "1px solid rgba(209,213,219,0.8)",
  borderRadius: "8px",
  color: isDark ? "#f1f5f9" : "#111827",
  fontSize: "12px",
});

const axisTickStyle = (isDark: boolean) => ({
  fill: isDark ? "#94a3b8" : "#6b7280",
  fontSize: 11,
});

const axisLineStyle = (isDark: boolean) => ({
  stroke: isDark ? "rgba(148,163,184,0.2)" : "rgba(209,213,219,0.6)",
});

export function BenchmarkDashboard() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [filter, setFilter] = useState("all");
  const [isRunning, setIsRunning] = useState(false);

  const pieData = useMemo(
    () => [
      { name: "ALLOW", value: MOCK_BENCHMARK_SUMMARY.passed },
      { name: "BLOCK", value: MOCK_BENCHMARK_SUMMARY.blocked },
      {
        name: "NEEDS_REVIEW",
        value: MOCK_BENCHMARK_SUMMARY.needs_review,
      },
      {
        name: "EVIDENCE_REQUIRED",
        value: MOCK_BENCHMARK_SUMMARY.evidence_required,
      },
    ],
    []
  );

  const barData = useMemo(
    () =>
      MOCK_BENCHMARK_PER_GATE.map((g) => ({
        name: g.gate,
        ALLOW: g.passed,
        BLOCK: g.blocked,
        "NEEDS_REVIEW": g.needsReview,
        "EVIDENCE_REQUIRED": g.evidenceRequired,
      })),
    []
  );

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/orbitgate/run", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        // Could update state with real data
      }
    } catch {
      // Ignore — mock data is already displayed
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section id="benchmarks" className="py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div className="flex-1">
            <SectionHeader
              title="Benchmark Results"
              subtitle="160 test cases across 9 verification gates"
              align="left"
              className="mb-0"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleRunBenchmark}
            disabled={isRunning}
            className="border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-slate-800 hover:text-gray-900 dark:text-white"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunning ? "Running..." : "Run Full Benchmark"}
          </Button>
        </div>

        {/* Summary cards */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <SummaryCard
            label="Total Cases"
            value={MOCK_BENCHMARK_SUMMARY.total_cases}
            color="#94a3b8"
            icon={BarChart3}
          />
          <SummaryCard
            label="Passed"
            value={MOCK_BENCHMARK_SUMMARY.passed}
            color="#06b6d4"
            icon={CheckCircle}
          />
          <SummaryCard
            label="Blocked"
            value={MOCK_BENCHMARK_SUMMARY.blocked}
            color="#f43f5e"
            icon={XCircle}
          />
          <SummaryCard
            label="Needs Review"
            value={MOCK_BENCHMARK_SUMMARY.needs_review}
            color="#f59e0b"
            icon={HelpCircle}
          />
          <SummaryCard
            label="Evidence Req."
            value={MOCK_BENCHMARK_SUMMARY.evidence_required}
            color="#38bdf8"
            icon={FileQuestion}
          />
        </motion.div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* Pie chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-700 dark:text-gray-300">
                  Decision Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={PIE_COLORS[entry.name as Decision]}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle(isDark)} />
                      <Legend
                        wrapperStyle={{ fontSize: "12px", color: isDark ? "#94a3b8" : "#6b7280" }}
                        formatter={(value: string) => (
                          <span style={{ color: isDark ? "#94a3b8" : "#6b7280" }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Bar chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-700 dark:text-gray-300">
                  Results per Gate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={axisTickStyle(isDark)}
                        axisLine={axisLineStyle(isDark)}
                        tickLine={false}
                      />
                      <YAxis
                        tick={axisTickStyle(isDark)}
                        axisLine={axisLineStyle(isDark)}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={tooltipStyle(isDark)} />
                      <Bar
                        dataKey="ALLOW"
                        stackId="a"
                        fill="#06b6d4"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="BLOCK"
                        stackId="a"
                        fill="#f43f5e"
                      />
                      <Bar
                        dataKey="NEEDS_REVIEW"
                        stackId="a"
                        fill="#f59e0b"
                      />
                      <Bar
                        dataKey="EVIDENCE_REQUIRED"
                        stackId="a"
                        fill="#38bdf8"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-base text-gray-700 dark:text-gray-300">
                  Benchmark Cases
                </CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={filter === opt.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter(opt.value)}
                      className={
                        filter === opt.value
                          ? "bg-cyan-600 hover:bg-cyan-500 text-gray-900 dark:text-white h-7 text-xs"
                          : "border-gray-300 dark:border-slate-700 text-gray-400 hover:bg-gray-100 dark:bg-slate-800 hover:text-gray-700 dark:text-gray-200 h-7 text-xs"
                      }
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <BenchmarkTable
                cases={MOCK_BENCHMARK_CASES}
                filter={filter}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}