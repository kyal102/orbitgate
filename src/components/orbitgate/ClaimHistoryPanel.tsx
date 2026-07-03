"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  Trash2,
  History,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle as XCircleIcon,
  AlertTriangle,
  Database,
  Loader2,
} from "lucide-react";
import { useOrbitGateStore } from "@/lib/orbitgate-store";
import { toast } from "sonner";
import { DecisionBadge } from "./DecisionBadge";
import { SectionHeader } from "./SectionHeader";
import type { Decision } from "@/lib/orbitgate-constants";

function ExpandableEntry({
  entry,
  index,
}: {
  entry: {
    id: string;
    claim: string;
    decision: string;
    gate: string;
    risk_label: string;
    reason: string;
    evidence: string[];
    missing_evidence: string[];
    timestamp: string;
  };
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const decision = entry.decision as Decision;

  return (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, height: 0 }}
      transition={{ duration: 0.2 }}
      layout
    >
      <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 hover:border-gray-200 dark:border-slate-700/50 transition-colors overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-3 sm:p-4 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50 rounded-lg"
        >
          <div className="flex items-start gap-3">
            {/* Decision dot */}
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                decision === "ALLOW"
                  ? "bg-cyan-500/20 shadow-lg shadow-cyan-500/20"
                  : decision === "BLOCK"
                  ? "bg-rose-500/20 shadow-lg shadow-rose-500/20"
                  : decision === "NEEDS_REVIEW"
                  ? "bg-amber-500/20 shadow-lg shadow-amber-500/20"
                  : "bg-sky-500/20 shadow-lg shadow-sky-500/20"
              }`}
            >
              <span className="text-[10px] font-bold text-gray-900 dark:text-white">
                {index + 1}
              </span>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <DecisionBadge decision={decision} size="sm" />
                <Badge
                  variant="outline"
                  className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-400 border-gray-300 dark:border-slate-700 shrink-0"
                >
                  {entry.gate}
                </Badge>
                <span className="text-[10px] text-gray-600 font-mono ml-auto flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
                {entry.claim}
              </p>
              <p className="text-[10px] text-gray-500 mt-1 truncate">
                {entry.reason}
              </p>
            </div>

            {/* Expand indicator */}
            <div className="shrink-0 text-gray-600 mt-1">
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 sm:px-4 sm:pb-4 border-t border-gray-200 dark:border-slate-800/60 pt-3 mt-1">
                {/* Risk label */}
                <div className="mb-3">
                  <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                    Risk Label
                  </span>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 font-mono">
                    {entry.risk_label}
                  </p>
                </div>

                {/* Evidence & Missing Evidence */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {entry.evidence.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1.5 font-medium">
                        Evidence Found ({entry.evidence.length})
                      </p>
                      <ul className="space-y-1">
                        {entry.evidence.map((e, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5 text-xs text-cyan-400"
                          >
                            <CheckCircle className="h-3 w-3 mt-0.5 shrink-0" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {entry.missing_evidence.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1.5 font-medium">
                        Missing Evidence ({entry.missing_evidence.length})
                      </p>
                      <ul className="space-y-1">
                        {entry.missing_evidence.map((e, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5 text-xs text-amber-400"
                          >
                            <XCircleIcon className="h-3 w-3 mt-0.5 shrink-0" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Full timestamp */}
                <div className="mt-3 pt-2 border-t border-slate-800/40">
                  <p className="text-[10px] text-gray-600 font-mono">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export function ClaimHistoryPanel() {
  const { claimHistory, setClaimHistory, mergeHistoryEntries } = useOrbitGateStore();
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [dbLoadCount, setDbLoadCount] = useState<number | null>(null);

  const handleLoadFromDb = async () => {
    setIsLoadingDb(true);
    setDbLoadCount(null);
    try {
      const res = await fetch("/api/orbitgate/verification-history?limit=50");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        mergeHistoryEntries(data.data);
        const newCount = data.data.length;
        setDbLoadCount(newCount);
        if (newCount > 0) {
          toast.success(`Loaded ${newCount} historical record${newCount !== 1 ? "s" : ""} from database.`);
        } else {
          toast.info("No historical records found in database.");
        }
      } else {
        toast.error(data.error || "Failed to load history from database.");
      }
    } catch {
      toast.error("Failed to connect to database.");
    } finally {
      setIsLoadingDb(false);
    }
  };

  const loadDbButton = (
    <Button
      variant="outline"
      onClick={handleLoadFromDb}
      disabled={isLoadingDb}
      className="border-gray-300 dark:border-slate-700 text-gray-400 hover:bg-cyan-500/10 hover:text-cyan-300 hover:border-cyan-500/30 w-full sm:w-auto"
    >
      {isLoadingDb ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <Database className="h-4 w-4 mr-2" />
          Load from Database
        </>
      )}
    </Button>
  );

  if (claimHistory.length === 0) {
    return (
      <section id="claim-history" className="py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <History className="h-12 w-12 text-gray-700 mx-auto mb-4" />
          <SectionHeader
            title="Claim History"
            subtitle="Verified claims are recorded here with their gate decisions for audit trail purposes. Use the claim checker above to start verifying."
          />
          <div className="mt-6 flex justify-center">
            {loadDbButton}
          </div>
          {dbLoadCount !== null && (
            <p className="text-xs text-gray-500 mt-3">Loaded {dbLoadCount} historical records</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section id="claim-history" className="py-16 sm:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex-1">
            <SectionHeader
              title="Claim History"
              subtitle={`${claimHistory.length} verified claim${claimHistory.length !== 1 ? "s" : ""} recorded`}
              align="left"
              className="mb-0"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {loadDbButton}
            <Button
              variant="outline"
              onClick={() => setClaimHistory([])}
              className="border-gray-300 dark:border-slate-700 text-gray-400 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-300 hover:border-rose-500/30 flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
          {dbLoadCount !== null && (
            <p className="text-xs text-gray-500 mt-1">Loaded {dbLoadCount} historical records</p>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="max-h-[500px] overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2 p-2">
                <AnimatePresence mode="popLayout">
                  {claimHistory.map((entry, i) => (
                    <ExpandableEntry key={entry.id} entry={entry} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        </motion.div>
      </div>
    </section>
  );
}