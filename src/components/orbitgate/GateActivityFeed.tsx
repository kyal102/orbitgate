"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Activity,
  Clock,
  Trash2,
  Zap,
  Shield,
  ArrowDownUp,
  Filter,
  Radio,
  Wifi,
} from "lucide-react";
import { useOrbitGateStore } from "@/lib/orbitgate-store";
import { DecisionBadge } from "./DecisionBadge";
import { SectionHeader } from "./SectionHeader";
import type { Decision } from "@/lib/orbitgate-constants";

// --- Helpers ---

const EXPIRE_MS = 10 * 60 * 1000; // 10 minutes
const LIVE_THRESHOLD_MS = 30 * 1000; // 30 seconds

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const absDiff = Math.abs(diff);
  if (absDiff < 1000) return "just now";
  if (absDiff < 60_000) return `${Math.floor(absDiff / 1000)}s ago`;
  if (absDiff < 3_600_000) return `${Math.floor(absDiff / 60_000)}m ago`;
  if (absDiff < 86_400_000) return `${Math.floor(absDiff / 3_600_000)}h ago`;
  return `${Math.floor(absDiff / 86_400_000)}d ago`;
}

const barColors: Record<string, string> = {
  ALLOW: "bg-cyan-400",
  BLOCK: "bg-rose-400",
  NEEDS_REVIEW: "bg-amber-400",
  EVIDENCE_REQUIRED: "bg-sky-400",
};

const riskLabelColor: Record<string, string> = {
  PHYSICS_COMPLIANT: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  RISK_TOO_HIGH: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  INSUFFICIENT_DATA: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  EVIDENCE_MISSING: "text-sky-400 bg-sky-500/10 border-sky-500/20",
};

type FilterOption = "ALL" | "ALLOW" | "BLOCK" | "NEEDS_REVIEW" | "EVIDENCE_REQUIRED";

// --- Animated Counter ---

function AnimatedCounter({ value, label, color }: { value: number; label: string; color: string }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDisplay(value), 50);
    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-lg sm:text-2xl font-bold tabular-nums ${color}`}>
        {display}
      </span>
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// --- Feed Item ---

interface FeedEntry {
  id: string;
  claim: string;
  decision: string;
  gate: string;
  risk_label: string;
  reason: string;
  evidence: string[];
  missing_evidence: string[];
  timestamp: string;
}

function FeedItem({ entry }: { entry: FeedEntry }) {
  const decision = entry.decision as Decision;
  const barColor = barColors[decision] || "bg-gray-500";
  const rlColor = riskLabelColor[entry.risk_label] || "text-gray-400 bg-gray-500/10 border-gray-500/20";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mb-2 last:mb-0"
    >
      <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 hover:border-gray-200 dark:border-slate-700/50 transition-colors overflow-hidden">
        <div className="flex">
          {/* Left color bar */}
          <div className={`w-1 shrink-0 ${barColor}`} />

          <CardContent className="p-3 sm:p-4 flex-1 min-w-0">
            {/* Top row: decision + gate + timestamp */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <DecisionBadge decision={decision} size="sm" />
              <Badge
                variant="outline"
                className="text-[10px] bg-gray-100 dark:bg-slate-800/80 text-gray-400 border-gray-300 dark:border-slate-700 font-mono"
              >
                {entry.gate}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono ${rlColor}`}
              >
                {entry.risk_label}
              </Badge>
              <span className="text-[10px] text-gray-500 font-mono ml-auto flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                <RelativeTime timestamp={entry.timestamp} />
              </span>
            </div>

            {/* Claim text (truncated) */}
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2 mb-1">
              {entry.claim}
            </p>

            {/* Reason */}
            <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-1">
              {entry.reason}
            </p>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}

// --- Relative time that ticks ---

function RelativeTime({ timestamp }: { timestamp: string }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  return <>{relativeTime(timestamp)}</>;
}

// --- Main Component ---

export function GateActivityFeed() {
  const { claimHistory, setClaimHistory, wsConnected } = useOrbitGateStore();
  const topAnchorRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<FilterOption>("ALL");
  const [now, setNow] = useState(Date.now());

  // Tick for expiration / live indicator
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter out expired events (>10 min)
  const activeEntries = useMemo(() => {
    if (!Array.isArray(claimHistory)) return [];
    return claimHistory.filter((e) => {
      const age = Date.now() - new Date(e.timestamp).getTime();
      return age < EXPIRE_MS;
    });
  }, [claimHistory, now]);

  // Filter by decision
  const filteredEntries = useMemo(() => {
    if (filter === "ALL") return activeEntries;
    return activeEntries.filter((e) => e.decision === filter);
  }, [activeEntries, filter]);

  // Stats
  const stats = useMemo(() => {
    const total = activeEntries.length;
    const allow = activeEntries.filter((e) => e.decision === "ALLOW").length;
    const block = activeEntries.filter((e) => e.decision === "BLOCK").length;
    const needsReview = activeEntries.filter((e) => e.decision === "NEEDS_REVIEW").length;

    // Throughput: verifications in last 60 seconds
    const oneMinAgo = Date.now() - 60_000;
    const recent = activeEntries.filter(
      (e) => new Date(e.timestamp).getTime() > oneMinAgo
    ).length;

    return { total, allow, block, needsReview, throughput: recent };
  }, [activeEntries, now]);

  // Is live? (any event < 30s ago OR WebSocket connected)
  const isLive = useMemo(() => {
    const hasRecentEvent = activeEntries.some(
      (e) => Date.now() - new Date(e.timestamp).getTime() < LIVE_THRESHOLD_MS
    );
    return hasRecentEvent || wsConnected;
  }, [activeEntries, now, wsConnected]);

  // Auto-scroll to top when new entries arrive
  useEffect(() => {
    if (topAnchorRef.current) {
      topAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [claimHistory.length]);

  const handleClearAll = useCallback(() => {
    setClaimHistory([]);
  }, [setClaimHistory]);

  return (
    <section id="activity-feed" className="py-16 sm:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="mb-8">
          <SectionHeader
            title="Gate Activity Feed"
            subtitle="Real-time verification timeline with live decision tracking"
            icon={
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-cyan-400" />
                </div>
                {isLive && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                    </span>
                    LIVE
                    {wsConnected && <Wifi className="h-3 w-3 ml-0.5" />}
                  </motion.span>
                )}
              </div>
            }
            align="left"
            className="mb-0"
          />
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6 sm:gap-8">
                  <AnimatedCounter value={stats.total} label="Total" color="text-gray-900 dark:text-white" />
                  <AnimatedCounter value={stats.allow} label="Allow" color="text-cyan-400" />
                  <AnimatedCounter value={stats.block} label="Block" color="text-rose-400" />
                  <AnimatedCounter value={stats.needsReview} label="Review" color="text-amber-400" />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    <span className="text-gray-700 dark:text-gray-300 font-mono font-semibold">{stats.throughput}</span> /min
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Controls bar: filter + clear */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="flex items-center justify-between gap-3 mb-3"
        >
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="h-3.5 w-3.5 text-gray-500 shrink-0" />
            {(["ALL", "ALLOW", "BLOCK", "NEEDS_REVIEW", "EVIDENCE_REQUIRED"] as FilterOption[]).map(
              (opt) => (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-colors whitespace-nowrap ${
                    filter === opt
                      ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                      : "bg-gray-100 dark:bg-slate-800/60 text-gray-500 border-gray-200 dark:border-slate-700/50 hover:text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-slate-600"
                  }`}
                >
                  {opt === "ALL" ? "All" : opt}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-gray-600">
              {wsConnected && (
                <span className="flex items-center gap-1 text-cyan-500">
                  <Wifi className="h-3 w-3" />
                  <span>WebSocket</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span>Auto-expires 10m</span>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={claimHistory.length === 0}
              className="h-7 text-[10px] border-gray-300 dark:border-slate-700 text-gray-400 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-300 hover:border-rose-500/30 px-2"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          </div>
        </motion.div>

        {/* Feed list */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {filteredEntries.length === 0 ? (
            <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 border-dashed">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center px-6">
                <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Radio className="h-6 w-6 text-gray-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-400 mb-1">
                  No Activity Yet
                </h3>
                <p className="text-xs text-gray-600 max-w-sm">
                  Verification events will appear here in real-time as claims are checked.
                  Use the Claim Checker to start verifying orbital claims.
                </p>
                <div className="flex items-center gap-2 mt-4 text-[10px] text-gray-600">
                  <ArrowDownUp className="h-3 w-3" />
                  <span>Events are newest-first and auto-expire after 10 minutes</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="max-h-[600px] overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800">
              <ScrollArea className="h-[600px]">
                <div ref={topAnchorRef} className="p-2">
                  <AnimatePresence mode="popLayout">
                    {filteredEntries.map((entry) => (
                      <FeedItem key={entry.id} entry={entry} />
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </div>
          )}
        </motion.div>

        {/* Footer note */}
        {activeEntries.length > 0 && (
          <div className="flex items-center justify-between mt-3 px-1">
            <p className="text-[10px] text-gray-600">
              Showing {filteredEntries.length} active event{filteredEntries.length !== 1 ? "s" : ""}
              {filter !== "ALL" && ` (${filter})`}
            </p>
            <p className="text-[10px] text-gray-600 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Events auto-expire after 10 minutes
            </p>
          </div>
        )}
      </div>
    </section>
  );
}