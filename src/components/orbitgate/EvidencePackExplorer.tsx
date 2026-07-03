"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Package,
  Loader2,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle as XCircleIcon,
  ChevronDown,
  Hash,
  Clock,
  Satellite,
  FileJson,
  ShieldCheck,
  ArrowUpDown,
  Activity,
} from "lucide-react";
import {
  useOrbitGateStore,
  type EvidencePack,
  type EvidencePackEntry,
  type TLEEntry,
} from "@/lib/orbitgate-store";
import { SectionHeader } from "./SectionHeader";
import { toast } from "sonner";

function EntryCard({
  entry,
  index,
}: {
  entry: EvidencePackEntry;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 hover:border-cyan-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.08)] transition-all duration-300">
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-gray-600 shrink-0">
                    #{index + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {entry.name}
                    </h4>
                    <p className="text-xs text-gray-500 font-mono">
                      NORAD {entry.norad_id} · {entry.epoch}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.propagation_summary && (
                    <Badge className="text-[10px] bg-cyan-500/15 text-cyan-400 border-cyan-500/30">
                      {entry.propagation_summary.regime}
                    </Badge>
                  )}
                  {entry.gate_result && (
                    <Badge
                      className={`text-[10px] border ${
                        entry.gate_result.decision === "ALLOW"
                          ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                          : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {entry.gate_result.decision}
                    </Badge>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>
            </CardContent>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 sm:px-4 pb-4">
            <Separator className="bg-gray-100 dark:bg-slate-800 mb-3" />

            {/* TLE Validation */}
            {entry.tle_validation && (
              <div className="mb-3">
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1.5">
                  TLE Validation
                </p>
                <div className="bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 rounded-lg p-2.5 space-y-1">
                  {Object.entries(entry.tle_validation).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-gray-500">{key}</span>
                      <span className="text-gray-700 dark:text-gray-300 font-mono">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Propagation Summary */}
            {entry.propagation_summary && (
              <div className="mb-3">
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Activity className="h-3 w-3" />
                  Propagation Summary
                </p>
                <div className="bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 rounded-lg p-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-600">Alt Range</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-mono flex items-center gap-1">
                        <ArrowUpDown className="h-3 w-3 text-cyan-400" />
                        {entry.propagation_summary.altitude_range_km?.toFixed(2)} km
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600">Regime</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                        {entry.propagation_summary.regime}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gate Result */}
            {entry.gate_result && (
              <div>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3" />
                  Gate Result
                </p>
                <div
                  className={`rounded-lg p-2.5 border ${
                    entry.gate_result.decision === "ALLOW"
                      ? "bg-cyan-500/10 border-cyan-500/20"
                      : "bg-rose-500/10 border-rose-500/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {entry.gate_result.decision === "ALLOW" ? (
                      <CheckCircle className="h-4 w-4 text-cyan-400" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-rose-400" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        entry.gate_result.decision === "ALLOW"
                          ? "text-cyan-400"
                          : "text-rose-400"
                      }`}
                    >
                      {entry.gate_result.decision}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-400 border-gray-300 dark:border-slate-700"
                    >
                      {entry.gate_result.gate}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">
                    {entry.gate_result.reason}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function EvidencePackExplorer() {
  const {
    tleEntries,
    evidencePack,
    setEvidencePack,
    isGeneratingPack,
    setIsGeneratingPack,
    propagationSettings,
  } = useOrbitGateStore();

  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (tleEntries.length === 0) {
      toast.error("No TLE entries selected. Browse and load TLEs first.");
      return;
    }

    setError(null);
    setEvidencePack(null);
    setIsGeneratingPack(true);

    // Take up to 10 entries for the pack
    const entries = tleEntries.slice(0, 10).map((e: TLEEntry) => ({
      name: e.name,
      line1: e.line1,
      line2: e.line2,
      norad_id: e.norad_id,
      source: e.source,
      epoch: e.epoch,
    }));

    try {
      const res = await fetch("/api/orbitgate/evidence-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries,
          include_propagation: true,
          duration_min: propagationSettings.duration_min,
          step_min: Math.max(propagationSettings.step_min * 2, 2), // Use coarser step for packs
        }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        // Map API response to store type
        const pack = data.data;
        const mappedPack: EvidencePack = {
          pack_hash: pack.pack_hash || "",
          timestamp: pack.generated_at || pack.timestamp || "",
          num_entries: pack.total_entries || pack.entries?.length || 0,
          sgp4_status: pack.sgp4_available ? "Available" : "Unavailable",
          entries: (pack.entries || []).map((e: Record<string, unknown>) => {
            const prop = e.propagation as Record<string, unknown> | undefined;
            const summary = prop?.summary as Record<string, unknown> | undefined;
            return {
              name: (e.name as string) || "",
              norad_id: (e.norad_id as string) || "",
              source: (e.source as string) || "",
              epoch: (e.epoch as string) || "",
              tle_validation: e.tle_validation as Record<string, unknown> | undefined,
              propagation_summary: summary ? {
                altitude_range_km: (summary.altitude_range_km as number) || 0,
                regime: (summary.regime as string) || "UNKNOWN",
              } : undefined,
              gate_result: undefined,
            };
          }),
        };
        setEvidencePack(mappedPack);
        toast.success(
          `Evidence pack generated with ${mappedPack.num_entries} entries`
        );
      } else {
        setError(data.error || "Failed to generate evidence pack.");
        toast.error("Failed to generate evidence pack.");
      }
    } catch {
      setError("Network error — unable to reach the API.");
      toast.error("Network error generating evidence pack.");
    } finally {
      setIsGeneratingPack(false);
    }
  };

  const handleDownload = () => {
    if (!evidencePack) return;

    const blob = new Blob([JSON.stringify(evidencePack, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orbitgate-evidence-${evidencePack.timestamp?.replace(/[:.]/g, "-") || Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Evidence pack downloaded.");
  };

  return (
    <section id="evidence-pack" className="py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Evidence Pack Explorer"
          subtitle="Generate deterministic evidence packs with TLE data, SGP4 propagation results, and gate decisions for verifiable audit trails."
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Generate Button Card */}
          <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <Package className="h-4 w-4 text-cyan-400" />
                    Generate Evidence Pack
                  </h3>
                  <p className="text-xs text-gray-500">
                    {tleEntries.length > 0 ? (
                      <>
                        {tleEntries.length} TLE entries loaded
                        {tleEntries.length > 10 && " (using first 10)"} ·{" "}
                        Includes SGP4 propagation
                      </>
                    ) : (
                      "No TLE entries loaded — browse TLEs first"
                    )}
                  </p>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={isGeneratingPack || tleEntries.length === 0}
                  className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-gray-900 dark:text-white w-full sm:w-auto shadow-lg shadow-cyan-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-300"
                >
                  {isGeneratingPack ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileJson className="h-4 w-4 mr-2" />
                      Generate Evidence Pack
                    </>
                  )}
                </Button>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mt-4"
                  >
                    <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isGeneratingPack && (
            <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Generating Evidence Pack...
                    </p>
                    <p className="text-xs text-gray-500">
                      Propagating orbits and building audit trail
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 bg-gray-100 dark:bg-slate-800 rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pack Result */}
          <AnimatePresence>
            {evidencePack && !isGeneratingPack && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                {/* Pack Summary Header */}
                <Card className="bg-white dark:bg-slate-900/80 border-cyan-500/20">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                          <Package className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            Evidence Pack Generated
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Satellite className="h-3 w-3" />
                              {evidencePack.num_entries} entries
                            </span>
                            <span className="text-gray-600">·</span>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-cyan-400" />
                              SGP4: {evidencePack.sgp4_status}
                            </span>
                            <span className="text-gray-600">·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {evidencePack.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleDownload}
                        variant="outline"
                        className="border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:border-cyan-500/50 w-full sm:w-auto"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download JSON
                      </Button>
                    </div>

                    {/* Pack Hash */}
                    <div className="mt-4 bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="h-3.5 w-3.5 text-gray-500" />
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                          Pack Hash (SHA-256)
                        </p>
                      </div>
                      <p className="text-xs font-mono text-gray-400 break-all">
                        {evidencePack.pack_hash}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Entries List */}
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-3">
                    Pack Entries
                  </p>
                  <div className="space-y-2">
                    {evidencePack.entries.map((entry, i) => (
                      <EntryCard key={`${entry.norad_id}-${i}`} entry={entry} index={i} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {!evidencePack && !isGeneratingPack && !error && (
            <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
              <CardContent className="p-12 text-center">
                <Package className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Load TLE entries from the browser above, then generate an
                  evidence pack
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Evidence packs include TLE data, propagation results, and gate
                  decisions
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </section>
  );
}