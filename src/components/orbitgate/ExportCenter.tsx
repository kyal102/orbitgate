"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Download,
  FileText,
  FileJson,
  FileSpreadsheet,
  Printer,
  Settings,
  Loader2,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { useOrbitGateStore } from "@/lib/orbitgate-store";
import { MOCK_BENCHMARK_CASES, MOCK_BENCHMARK_SUMMARY, MOCK_BENCHMARK_PER_GATE } from "@/lib/orbitgate-constants";
import { SectionHeader } from "./SectionHeader";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ExportOption {
  id: string;
  title: string;
  description: string;
  format: "CSV" | "JSON" | "PDF";
  icon: React.ReactNode;
  color: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: "verification-report",
    title: "Verification Report",
    description: "Complete claim history with decisions, risk labels, gate results, and evidence summaries",
    format: "CSV",
    icon: <FileText className="h-5 w-5" />,
    color: "#06b6d4",
  },
  {
    id: "satellite-catalog",
    title: "Satellite Catalog",
    description: "TLE data for all loaded satellites including orbital elements and epoch times",
    format: "CSV",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    color: "#38bdf8",
  },
  {
    id: "orbit-analysis",
    title: "Orbit Analysis",
    description: "Full propagation results with altitude, velocity, latitude, and longitude traces",
    format: "JSON",
    icon: <FileJson className="h-5 w-5" />,
    color: "#f59e0b",
  },
  {
    id: "full-dashboard",
    title: "Full Dashboard",
    description: "Complete dashboard snapshot including all sections, charts, and system status",
    format: "PDF",
    icon: <Printer className="h-5 w-5" />,
    color: "#f43f5e",
  },
  {
    id: "benchmark-results",
    title: "Benchmark Results",
    description: "All benchmark cases with pass/fail rates, per-gate statistics, and regression data",
    format: "CSV",
    icon: <FileText className="h-5 w-5" />,
    color: "#a78bfa",
  },
  {
    id: "custom-report",
    title: "Custom Report",
    description: "Build a tailored report by selecting date range and specific dashboard sections",
    format: "CSV",
    icon: <Settings className="h-5 w-5" />,
    color: "#fb923c",
  },
];

const FORMAT_COLORS: Record<string, string> = {
  CSV: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  JSON: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PDF: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const REPORT_SECTIONS = [
  { id: "overview", label: "System Overview" },
  { id: "claim-checker", label: "Claim Checker" },
  { id: "analytics", label: "Analytics" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "telemetry", label: "Telemetry" },
  { id: "tle-browser", label: "TLE Browser" },
  { id: "propagator", label: "Propagator" },
  { id: "conjunction", label: "Conjunction" },
  { id: "evidence-pack", label: "Evidence Pack" },
  { id: "certificate", label: "Certificate" },
  { id: "boundaries", label: "Boundaries" },
  { id: "history", label: "Claim History" },
];

/* ------------------------------------------------------------------ */
/*  CSV / JSON generation helpers                                       */
/* ------------------------------------------------------------------ */

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function generateVerificationCSV(): string {
  const history = useOrbitGateStore.getState().claimHistory;
  if (history.length === 0) {
    toast.info("No claim history to export — run some verifications first!");
    return "";
  }
  const header = "ID,Timestamp,Claim,Decision,Gate,Risk Label,Reason,Evidence,Missing Evidence\n";
  const rows = history.map((e) =>
    [
      escapeCSV(e.id),
      escapeCSV(e.timestamp),
      escapeCSV(e.claim),
      escapeCSV(e.decision),
      escapeCSV(e.gate),
      escapeCSV(e.risk_label ?? "—"),
      escapeCSV(e.reason),
      escapeCSV(e.evidence.join("; ")),
      escapeCSV(e.missing_evidence.join("; ")),
    ].join(",")
  );
  return header + rows.join("\n");
}

function generateTLECSV(): string {
  const tleEntries = useOrbitGateStore.getState().tleEntries;
  if (tleEntries.length === 0) {
    toast.info("No TLE data loaded — fetch some satellites first!");
    return "";
  }
  const header = "Name,NORAD ID,Line 1,Line 2,Source,Fetched At,Epoch\n";
  const rows = tleEntries.map((e) =>
    [
      escapeCSV(e.name),
      escapeCSV(e.norad_id),
      escapeCSV(e.line1),
      escapeCSV(e.line2),
      escapeCSV(e.source),
      escapeCSV(e.fetched_at),
      escapeCSV(e.epoch),
    ].join(",")
  );
  return header + rows.join("\n");
}

function generateOrbitJSON(): string {
  const propagationResult = useOrbitGateStore.getState().propagationResult;
  if (!propagationResult) {
    toast.info("No propagation results — run a propagation first!");
    return "";
  }
  return JSON.stringify(propagationResult, null, 2);
}

function generateBenchmarkCSV(): string {
  const header = "Case ID,Claim Type,Input,Expected Decision,Gate,Risk Label\n";
  const rows = MOCK_BENCHMARK_CASES.map((c) =>
    [
      escapeCSV(c.case_id),
      escapeCSV(c.claim_type),
      escapeCSV(c.input),
      escapeCSV(c.expected_decision),
      escapeCSV(c.gate),
      escapeCSV(c.risk_label),
    ].join(",")
  );
  const perGateHeader = "\n\nGate,Passed,Blocked,Needs Review,Evidence Required\n";
  const perGateRows = MOCK_BENCHMARK_PER_GATE.map((g) =>
    [
      escapeCSV(g.gate),
      escapeCSV(g.passed),
      escapeCSV(g.blocked),
      escapeCSV(g.needsReview),
      escapeCSV(g.evidenceRequired),
    ].join(",")
  );
  const summaryHeader = "\n\nMetric,Value\n";
  const summaryRows = [
    `Total Cases,${MOCK_BENCHMARK_SUMMARY.total_cases}`,
    `Passed,${MOCK_BENCHMARK_SUMMARY.passed}`,
    `Blocked,${MOCK_BENCHMARK_SUMMARY.blocked}`,
    `Needs Review,${MOCK_BENCHMARK_SUMMARY.needs_review}`,
    `Evidence Required,${MOCK_BENCHMARK_SUMMARY.evidence_required}`,
  ].join("\n");

  return header + rows.join("\n") + perGateHeader + perGateRows.join("\n") + summaryHeader + summaryRows;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ExportCenter() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState<Set<string>>(new Set());

  // Custom report state
  const [showCustom, setShowCustom] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(REPORT_SECTIONS.map((s) => s.id))
  );

  const handleExport = useCallback(
    (optionId: string, format: string) => {
      setExporting(optionId);
      setExported((prev) => {
        const next = new Set(prev);
        next.delete(optionId);
        return next;
      });

      // Simulate short generation delay for UX
      setTimeout(() => {
        try {
          let content = "";
          let filename = "";
          let mimeType = "text/csv";

          switch (optionId) {
            case "verification-report":
              content = generateVerificationCSV();
              filename = "orbitgate-verification-report.csv";
              break;
            case "satellite-catalog":
              content = generateTLECSV();
              filename = "orbitgate-satellite-catalog.csv";
              break;
            case "orbit-analysis":
              content = generateOrbitJSON();
              filename = "orbitgate-orbit-analysis.json";
              mimeType = "application/json";
              break;
            case "full-dashboard":
              setExporting(null);
              toast.info("PDF generation is not yet available in this version. Stay tuned for v0.3!");
              return;
            case "benchmark-results":
              content = generateBenchmarkCSV();
              filename = "orbitgate-benchmark-results.csv";
              break;
            case "custom-report":
              content = generateCustomReportCSV(dateFrom, dateTo, selectedSections);
              filename = "orbitgate-custom-report.csv";
              break;
          }

          if (!content) {
            setExporting(null);
            return;
          }

          const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
          downloadBlob(blob, filename);
          setExported((prev) => {
            const next = new Set(prev);
            next.add(optionId);
            return next;
          });
          toast.success(`Exported ${filename}`);
        } catch (err) {
          toast.error("Export failed — see console for details");
          console.error("Export error:", err);
        } finally {
          setExporting(null);
        }
      }, 600);
    },
    [dateFrom, dateTo, selectedSections]
  );

  const toggleSection = useCallback((id: string) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <section id="export-center" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Export Center"
          subtitle="Download verification data, satellite catalogs, orbit analyses, and custom reports"
          icon={<Download className="h-6 w-6 text-cyan-400" />}
          sectionNumber="§45"
        />

        {/* Export Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPORT_OPTIONS.map((option, index) => {
            const isExporting = exporting === option.id;
            const isExported = exported.has(option.id);
            const isCustom = option.id === "custom-report";

            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
              >
                <Card className="group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-slate-800 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5 overflow-hidden">
                  {/* Subtle top accent */}
                  <div
                    className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `linear-gradient(to right, transparent, ${option.color}60, transparent)`,
                    }}
                  />

                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${option.color}15` }}
                      >
                        <span style={{ color: option.color }}>{option.icon}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${FORMAT_COLORS[option.format]}`}
                      >
                        {option.format}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                      {option.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                      {option.description}
                    </p>

                    {isCustom && showCustom && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 space-y-3"
                      >
                        {/* Date range */}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              type="date"
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                              className="h-8 text-xs bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
                              placeholder="From"
                            />
                            <span className="text-gray-400 text-xs">→</span>
                            <Input
                              type="date"
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                              className="h-8 text-xs bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
                              placeholder="To"
                            />
                          </div>
                        </div>

                        {/* Section selector */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                            Include Sections
                          </p>
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                            {REPORT_SECTIONS.map((section) => (
                              <button
                                key={section.id}
                                onClick={() => toggleSection(section.id)}
                                className={`text-[10px] px-2 py-1 rounded-md border transition-all duration-200 ${
                                  selectedSections.has(section.id)
                                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
                                    : "bg-gray-100 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-400 hover:border-gray-300 dark:hover:border-slate-600"
                                }`}
                              >
                                {section.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <Button
                      size="sm"
                      onClick={() => {
                        if (isCustom) {
                          setShowCustom(!showCustom);
                          if (showCustom) {
                            handleExport(option.id, option.format);
                          }
                          return;
                        }
                        handleExport(option.id, option.format);
                      }}
                      disabled={isExporting}
                      className={`w-full text-xs font-medium transition-all duration-300 ${
                        isCustom && !showCustom
                          ? "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 shadow-none border border-gray-200 dark:border-slate-700"
                          : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
                      }`}
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Generating...
                        </>
                      ) : isExported ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          Export Again
                        </>
                      ) : isCustom && !showCustom ? (
                        <>
                          <Settings className="h-3.5 w-3.5 mr-1.5" />
                          Configure
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Export
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400"
        >
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
            {exported.size} export{exported.size !== 1 ? "s" : ""} completed this session
          </span>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <span>
            {useOrbitGateStore.getState().claimHistory.length} claims in history
          </span>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <span>
            {useOrbitGateStore.getState().tleEntries.length} TLE entries loaded
          </span>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom report CSV generator                                         */
/* ------------------------------------------------------------------ */

function generateCustomReportCSV(
  dateFrom: string,
  dateTo: string,
  sections: Set<string>
): string {
  const lines: string[] = [];
  lines.push("OrbitGate Custom Report");
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push(`Date Range,${dateFrom || "All"} to ${dateTo || "All"}`);
  lines.push(`Sections,${[...sections].join("; ")}`);
  lines.push("");

  // Claim history section
  if (sections.has("history")) {
    const history = useOrbitGateStore.getState().claimHistory;
    const filtered = history.filter((e) => {
      if (dateFrom && e.timestamp < dateFrom) return false;
      if (dateTo && e.timestamp > dateTo) return false;
      return true;
    });

    lines.push("=== CLAIM HISTORY ===");
    lines.push("ID,Timestamp,Claim,Decision,Gate,Risk Label,Reason");
    for (const e of filtered) {
      lines.push(
        [
          escapeCSV(e.id),
          escapeCSV(e.timestamp),
          escapeCSV(e.claim),
          escapeCSV(e.decision),
          escapeCSV(e.gate),
          escapeCSV(e.risk_label ?? ""),
          escapeCSV(e.reason),
        ].join(",")
      );
    }
    lines.push("");
  }

  // TLE section
  if (sections.has("tle-browser")) {
    const tles = useOrbitGateStore.getState().tleEntries;
    lines.push("=== SATELLITE CATALOG ===");
    lines.push("Name,NORAD ID,Source,Epoch");
    for (const t of tles) {
      lines.push(
        [escapeCSV(t.name), escapeCSV(t.norad_id), escapeCSV(t.source), escapeCSV(t.epoch)].join(
          ","
        )
      );
    }
    lines.push("");
  }

  // Benchmark section
  if (sections.has("benchmarks")) {
    lines.push("=== BENCHMARK SUMMARY ===");
    lines.push("Metric,Value");
    lines.push(`Total Cases,${MOCK_BENCHMARK_SUMMARY.total_cases}`);
    lines.push(`Passed,${MOCK_BENCHMARK_SUMMARY.passed}`);
    lines.push(`Blocked,${MOCK_BENCHMARK_SUMMARY.blocked}`);
    lines.push("");
  }

  // Propagation section
  if (sections.has("propagator")) {
    const result = useOrbitGateStore.getState().propagationResult;
    if (result) {
      lines.push("=== PROPAGATION SUMMARY ===");
      lines.push(`Satellite,${escapeCSV(result.satellite_name ?? "N/A")}`);
      lines.push(`Total Points,${result.points.length}`);
      lines.push(`Duration (min),${result.settings.duration_min}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}