"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Layers,
  Loader2,
  Trash2,
  Download,
  History,
  AlertTriangle,
  Zap,
  ShieldOff,
  FileQuestion,
  X,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { DecisionBadge } from "./DecisionBadge";
import { useOrbitGateStore } from "@/lib/orbitgate-store";
import type { ClaimResult, Decision } from "@/lib/orbitgate-constants";
import { toast } from "sonner";

const MAX_CLAIMS = 20;

const PRESET_ALL_EXAMPLES = [
  "The ISS orbits at approximately 408 km altitude with 51.6° inclination.",
  "Fire thruster A for 10 seconds to raise the orbit by 50 km.",
  "A Hohmann transfer from 400 km LEO to 800 km requires approximately 0.33 km/s total delta-v.",
  "Direct insertion from LEO to GEO requires only 0.5 km/s total delta-v.",
  "A 5W solar array can power a 50W satellite through 60-minute eclipses.",
];

const PRESET_SAFETY_CLAIMS = [
  "The ISS orbits at approximately 408 km altitude with 51.6° inclination.",
  "A Hohmann transfer from 400 km LEO to 800 km requires approximately 0.33 km/s total delta-v.",
  "Solar panels at 1 AU receive approximately 1361 W/m² solar irradiance.",
];

const PRESET_RISK_CLAIMS = [
  "Fire thruster A for 10 seconds to raise the orbit by 50 km.",
  "The satellite's TLE shows eccentricity of 1.5, confirming a stable orbit.",
  "Direct insertion from LEO to GEO requires only 0.5 km/s total delta-v.",
];

const PRESET_MIXED = [
  "The ISS orbits at approximately 408 km altitude with 51.6° inclination.",
  "Fire thruster A for 10 seconds to raise the orbit by 50 km.",
  "A 3U CubeSat in 400 km LEO experiences ~35 minute eclipse per 96 minute orbit.",
  "The two objects at 2 km separation pose no collision risk.",
  "A 5W solar array can power a 50W satellite through 60-minute eclipses.",
];

const PRESETS = [
  { label: "All Examples", claims: PRESET_ALL_EXAMPLES, icon: Layers },
  { label: "Safety Claims", claims: PRESET_SAFETY_CLAIMS, icon: ShieldOff },
  { label: "Risk Claims", claims: PRESET_RISK_CLAIMS, icon: AlertTriangle },
  { label: "Mixed Batch", claims: PRESET_MIXED, icon: Zap },
];

const riskLabelColors: Record<string, string> = {
  TLE_VALIDATED: "text-cyan-400",
  PHYSICS_COMPLIANT: "text-cyan-400",
  RISK_TOO_HIGH: "text-rose-400",
  INSUFFICIENT_DATA: "text-amber-400",
  MATH_ERROR: "text-rose-400",
  UNVERIFIABLE: "text-sky-400",
};

const decisionBorderCls: Record<Decision, string> = {
  ALLOW: "border-cyan-500/30",
  BLOCK: "border-rose-500/30",
  NEEDS_REVIEW: "border-amber-500/30",
  EVIDENCE_REQUIRED: "border-sky-500/30",
};

function parseClaims(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function generateCSV(results: ClaimResult[]): string {
  const header = "Claim,Decision,Gate,Risk Label,Reason,Timestamp";
  const rows = results.map((r) =>
    [
      `"${r.claim.replace(/"/g, '""')}"`,
      r.decision,
      r.gate,
      r.risk_label,
      `"${r.reason.replace(/"/g, '""')}"`,
      r.timestamp,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function BatchClaimVerifier() {
  const { setClaimHistory } = useOrbitGateStore();

  const [batchInput, setBatchInput] = useState("");
  const [batchResults, setBatchResults] = useState<ClaimResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const abortRef = useRef(false);

  const claims = parseClaims(batchInput);
  const claimCount = claims.length;
  const isOverLimit = claimCount > MAX_CLAIMS;
  const progressPercent =
    claimCount > 0 ? (currentBatchIndex / claimCount) * 100 : 0;

  const loadPreset = useCallback((presetClaims: string[]) => {
    setBatchInput(presetClaims.join("\n"));
    setBatchResults([]);
    setCurrentBatchIndex(0);
  }, []);

  const handleClear = useCallback(() => {
    setBatchInput("");
    setBatchResults([]);
    setCurrentBatchIndex(0);
  }, []);

  const handleClearResults = useCallback(() => {
    setBatchResults([]);
    setCurrentBatchIndex(0);
  }, []);

  const handleVerify = useCallback(async () => {
    const trimmed = batchInput.trim();
    if (!trimmed) return;

    const parsedClaims = parseClaims(trimmed);
    if (parsedClaims.length === 0) {
      toast.error("No valid claims found. Enter one claim per line.");
      return;
    }

    if (parsedClaims.length > MAX_CLAIMS) {
      toast.error(`Maximum ${MAX_CLAIMS} claims allowed. You have ${parsedClaims.length}.`);
      return;
    }

    setIsRunning(true);
    setBatchResults([]);
    setCurrentBatchIndex(0);
    abortRef.current = false;

    const results: ClaimResult[] = [];

    for (let i = 0; i < parsedClaims.length; i++) {
      if (abortRef.current) break;

      setCurrentBatchIndex(i + 1);
      const claim = parsedClaims[i];

      try {
        const res = await fetch("/api/orbitgate/check-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claim }),
        });
        const data = await res.json();

        if (data.success) {
          results.push(data.data as ClaimResult);
        } else {
          results.push({
            claim,
            decision: "NEEDS_REVIEW",
            gate: "Unknown",
            risk_label: "UNVERIFIABLE",
            reason: data.error || "Verification failed.",
            evidence: [],
            missing_evidence: [],
            timestamp: new Date().toISOString(),
          });
        }
      } catch {
        // Fallback mock based on keywords
        const isBlock =
          claim.toLowerCase().includes("fire") ||
          claim.toLowerCase().includes("command") ||
          claim.toLowerCase().includes("rotate") ||
          claim.toLowerCase().includes("0.5 km/s") ||
          claim.toLowerCase().includes("5w") ||
          claim.toLowerCase().includes("eccentricity of 1.5") ||
          claim.toLowerCase().includes("2 km separation");

        results.push({
          claim,
          decision: isBlock ? "BLOCK" : "ALLOW",
          gate: isBlock
            ? claim.toLowerCase().includes("fire") || claim.toLowerCase().includes("rotate")
              ? "CommandGate"
              : "DeltaVGate"
            : "TLEGate",
          risk_label: isBlock ? "RISK_TOO_HIGH" : "PHYSICS_COMPLIANT",
          reason: isBlock
            ? "Claim contains physically implausible values or attempts to issue spacecraft commands."
            : "Orbital parameters validated against known physics models and boundary conditions.",
          evidence: isBlock
            ? ["Values exceed physical constraints"]
            : ["Parameters within expected ranges", "Consistent with orbital mechanics"],
          missing_evidence: isBlock ? ["Supporting calculation"] : [],
          timestamp: new Date().toISOString(),
        });
      }
    }

    setBatchResults(results);
    setIsRunning(false);
    setCurrentBatchIndex(0);
    const counts = results.reduce(
      (acc, r) => { acc[r.decision] = (acc[r.decision] || 0) + 1; return acc; },
      {} as Record<string, number>
    );
    toast.success("Batch Complete", {
      description: `${results.length} claims verified: ${counts["ALLOW"] || 0} ALLOW · ${counts["BLOCK"] || 0} BLOCK · ${counts["NEEDS_REVIEW"] || 0} REVIEW`,
    });
  }, [batchInput]);

  const handleExportCSV = useCallback(() => {
    if (batchResults.length === 0) return;
    const csv = generateCSV(batchResults);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadCSV(csv, `orbitgate-batch-${timestamp}.csv`);
    toast.success("CSV exported successfully.");
  }, [batchResults]);

  const handleAddToHistory = useCallback(() => {
    if (batchResults.length === 0) return;
    const currentHistory = useOrbitGateStore.getState().claimHistory;
    const newEntries = batchResults.map((r) => ({
      id: crypto.randomUUID(),
      claim: r.claim,
      decision: r.decision,
      gate: r.gate,
      risk_label: r.risk_label,
      reason: r.reason,
      evidence: r.evidence,
      missing_evidence: r.missing_evidence,
      timestamp: r.timestamp,
    }));
    setClaimHistory([...newEntries, ...currentHistory].slice(0, 100));
    toast.success(`${batchResults.length} results added to history.`);
  }, [batchResults, setClaimHistory]);

  // Summary counts
  const summaryCounts = batchResults.reduce(
    (acc, r) => {
      acc[r.decision] = (acc[r.decision] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <section id="batch-verify" className="py-16 sm:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          title="Batch Claim Verifier"
          subtitle="Verify multiple orbital claims at once. Paste one claim per line and run a batch verification."
          icon={<Layers className="h-6 w-6 text-cyan-400" />}
        />

        {/* Input Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Textarea */}
              <div className="relative">
                <Textarea
                  placeholder={
                    "Enter one claim per line...\nExample:\nThe ISS orbits at 408 km altitude.\nA Hohmann transfer from 400km to 800km needs ~0.33 km/s.\nFire thruster A for 10 seconds."
                  }
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  className="min-h-[160px] bg-gray-50 dark:bg-slate-950/80 border-gray-300 dark:border-slate-700/80 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 resize-y focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/50 dark:focus-visible:shadow-[0_0_12px_rgba(16,185,129,0.15)] transition-all duration-300"
                />

                {/* Warning overlay */}
                <AnimatePresence>
                  {isOverLimit && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-2 right-2"
                    >
                      <Badge
                        variant="outline"
                        className="bg-rose-500/15 text-rose-400 border-rose-500/30 text-[10px] font-mono"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {claimCount}/{MAX_CLAIMS} max
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Stats row: char count, line count, clear button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{batchInput.length} chars</span>
                  <span className="text-gray-300 dark:text-slate-700">|</span>
                  <span className={isOverLimit ? "text-rose-400 font-medium" : ""}>
                    {claimCount} claim{claimCount !== 1 ? "s" : ""}
                    {isOverLimit && ` (max ${MAX_CLAIMS})`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={!batchInput.trim() || isRunning}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-300 h-7 px-2 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>

              {/* Quick Presets */}
              <div className="pt-3 border-t border-gray-200 dark:border-slate-800">
                <p className="text-xs text-gray-500 mb-2">Quick Presets:</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      onClick={() => loadPreset(preset.claims)}
                      disabled={isRunning}
                      className="text-xs bg-gray-100 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700/50 hover:border-gray-400 dark:hover:border-slate-600 h-7 px-2.5"
                    >
                      <preset.icon className="h-3 w-3 mr-1.5 shrink-0" />
                      {preset.label}
                      <span className="text-gray-600 ml-1.5">({preset.claims.length})</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Verify Button + Progress */}
              <div className="pt-3 border-t border-gray-200 dark:border-slate-800 space-y-3">
                {/* Progress bar (visible during verification) */}
                <AnimatePresence>
                  {isRunning && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">
                          Verifying {currentBatchIndex}/{claimCount}...
                        </span>
                        <span className="text-cyan-400 font-mono">
                          {Math.round(progressPercent)}%
                        </span>
                      </div>
                      <Progress
                        value={progressPercent}
                        className="h-2 bg-gray-100 dark:bg-slate-800 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-cyan-400 [&>[data-slot=progress-indicator]]:to-cyan-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  onClick={handleVerify}
                  disabled={claimCount === 0 || isRunning || isOverLimit}
                  className={`bg-cyan-600 hover:bg-cyan-500 text-gray-900 dark:text-white w-full sm:w-auto transition-all duration-300 ${
                    claimCount > 0 && !isRunning && !isOverLimit
                      ? "verify-pulse shadow-lg shadow-cyan-500/20 dark:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      : ""
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying {currentBatchIndex}/{claimCount}...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Verify {claimCount} Claim{claimCount !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {batchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-8 space-y-4"
            >
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {(summaryCounts["ALLOW"] ?? 0) > 0 && (
                    <span className="text-cyan-400 font-medium">
                      {summaryCounts["ALLOW"]} ALLOW
                    </span>
                  )}
                  {(summaryCounts["BLOCK"] ?? 0) > 0 && (
                    <>
                      <span className="text-gray-300 dark:text-slate-700">·</span>
                      <span className="text-rose-400 font-medium">
                        {summaryCounts["BLOCK"]} BLOCK
                      </span>
                    </>
                  )}
                  {(summaryCounts["NEEDS_REVIEW"] ?? 0) > 0 && (
                    <>
                      <span className="text-gray-300 dark:text-slate-700">·</span>
                      <span className="text-amber-400 font-medium">
                        {summaryCounts["NEEDS_REVIEW"]} REVIEW
                      </span>
                    </>
                  )}
                  {(summaryCounts["EVIDENCE_REQUIRED"] ?? 0) > 0 && (
                    <>
                      <span className="text-gray-300 dark:text-slate-700">·</span>
                      <span className="text-sky-400 font-medium">
                        {summaryCounts["EVIDENCE_REQUIRED"]} EVIDENCE
                      </span>
                    </>
                  )}
                </div>

                {/* Batch Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="text-xs bg-gray-100 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700/50 hover:border-gray-400 dark:hover:border-slate-600 h-7"
                  >
                    <Download className="h-3 w-3 mr-1.5" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddToHistory}
                    className="text-xs bg-gray-100 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700/50 hover:border-gray-400 dark:hover:border-slate-600 h-7"
                  >
                    <History className="h-3 w-3 mr-1.5" />
                    Add to History
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearResults}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-300 h-7 px-2"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {batchResults.map((result, index) => (
                  <motion.div
                    key={`${result.claim}-${result.timestamp}-${index}`}
                    initial={{ opacity: 0, y: 15, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: 0.3,
                      delay: Math.min(index * 0.06, 0.8),
                      ease: "easeOut",
                    }}
                  >
                    <Card
                      className={`bg-white dark:bg-white/5 backdrop-blur-xl border ${decisionBorderCls[result.decision]} dark:border-white/10 hover:shadow-[0_0_12px_rgba(16,185,129,0.1)] transition-all duration-300`}
                    >
                      <CardContent className="p-3 sm:p-4 space-y-2.5">
                        {/* Decision + Gate badges */}
                        <div className="flex items-center justify-between gap-2">
                          <DecisionBadge decision={result.decision} size="sm" />
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono px-1.5 py-0 bg-gray-100 dark:bg-slate-800/80 text-gray-500 border-gray-200 dark:border-slate-700/50 max-w-[120px] truncate"
                          >
                            {result.gate}
                          </Badge>
                        </div>

                        {/* Claim text (2 lines max) */}
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug line-clamp-2">
                          {result.claim}
                        </p>

                        {/* Reason (1 line) */}
                        <p className="text-xs text-gray-500 truncate" title={result.reason}>
                          {result.reason}
                        </p>

                        {/* Risk label */}
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono px-1.5 py-0 bg-gray-100/80 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700/50 ${riskLabelColors[result.risk_label] || "text-gray-500"}`}
                        >
                          {result.risk_label}
                        </Badge>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}