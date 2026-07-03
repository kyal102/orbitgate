"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, Wifi, WifiOff } from "lucide-react";
import { NotificationCenter } from "./NotificationCenter";
import { ThemeToggle } from "./ThemeToggle";
import { useOrbitGateStore } from "@/lib/orbitgate-store";

function HealthDot() {
  const [opacity, setOpacity] = useState(0.4);

  useEffect(() => {
    const timer = setInterval(() => {
      setOpacity((prev) => (prev === 0.4 ? 1 : 0.4));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400"
      style={{
        opacity,
        boxShadow: `0 0 6px rgba(6, 182, 212, ${0.3 * opacity})`,
      }}
    />
  );
}

function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ scale: 1.3, color: "#06b6d4" }}
      animate={{ scale: 1, color: undefined }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="tabular-nums"
    >
      {value}
    </motion.span>
  );
}

export function SystemStatusBar() {
  const claimHistory = useOrbitGateStore((s) => s.claimHistory);
  const wsConnected = useOrbitGateStore((s) => s.wsConnected);
  const wsConnectedClients = useOrbitGateStore((s) => s.wsConnectedClients);
  const [systemStatus, setSystemStatus] = useState<"healthy" | "degraded">(
    "healthy"
  );
  const prevStatusRef = useRef<"healthy" | "degraded">("healthy");

  // Poll system health
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch("/api/orbitgate/status");
        const data = await res.json();
        if (mounted) {
          const newStatus =
            data.sgp4_available && data.tle_fetcher_available
              ? "healthy"
              : "degraded";
          setSystemStatus(newStatus);
          // Fire notification on status change to degraded
          if (newStatus === "degraded" && prevStatusRef.current === "healthy") {
            useOrbitGateStore.getState().addNotification({
              type: "system",
              title: "System Status Changed",
              message: "Some services may be unavailable",
              icon: "AlertTriangle",
            });
          }
          prevStatusRef.current = newStatus;
        }
      } catch {
        if (mounted) {
          setSystemStatus("degraded");
          if (prevStatusRef.current === "healthy") {
            useOrbitGateStore.getState().addNotification({
              type: "system",
              title: "System Status Changed",
              message: "System health check failed — services may be unavailable",
              icon: "AlertTriangle",
            });
          }
          prevStatusRef.current = "degraded";
        }
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Compute stats from claim history
  const stats = useMemo(() => {
    const total = claimHistory.length;
    const allow = claimHistory.filter((c) => c.decision === "ALLOW").length;
    const block = claimHistory.filter(
      (c) => c.decision === "BLOCK" || c.decision === "EVIDENCE_REQUIRED"
    ).length;
    const review = claimHistory.filter(
      (c) => c.decision === "NEEDS_REVIEW"
    ).length;
    return { total, allow, block, review };
  }, [claimHistory]);

  const isHealthy = systemStatus === "healthy";

  return (
    <div
      className="sticky top-14 z-40 h-8 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 flex items-center px-4 select-none dark:bg-[#030712]/80 dark:border-white/[0.04]"
      role="status"
      aria-label="System status bar"
    >
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Left — System health */}
        <div className="flex items-center gap-2 shrink-0">
          {isHealthy ? (
            <HealthDot />
          ) : (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" style={{ boxShadow: '0 0 6px rgba(245,158,11,0.3)' }} />
          )}
          <span
            className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${
              isHealthy ? "text-cyan-500" : "text-amber-400"
            }`}
          >
            {isHealthy ? "All Systems Go" : "Degraded"}
          </span>
          <span className="hidden sm:inline text-[10px] font-mono text-gray-400 ml-1 dark:text-gray-600">
            v0.4 · 9 Gates · SGP4 Active
          </span>
          {/* WebSocket Live/Offline indicator */}
          <AnimatePresence mode="wait">
            <motion.span
              key={wsConnected ? "live" : "offline"}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
                wsConnected
                  ? "text-cyan-500 bg-cyan-500/5 border-cyan-500/15"
                  : "text-gray-500 bg-gray-100 dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06]"
              }`}
              title={wsConnected ? `Live feed connected · ${wsConnectedClients} client(s)` : "Live feed offline"}
            >
              {wsConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span>Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Center — Real-time verification stats */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={stats.total}
              className="text-gray-400 shrink-0 dark:text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AnimatedNumber value={stats.total} /> verified
            </motion.span>
          </AnimatePresence>
          {stats.total > 0 && (
            <>
              <span className="text-gray-300 dark:text-slate-700">·</span>
              <motion.span
                key={`allow-${stats.allow}`}
                className="text-cyan-600 shrink-0 dark:text-cyan-400"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AnimatedNumber value={stats.allow} /> ALLOW
              </motion.span>
              <span className="text-gray-300 dark:text-slate-700">·</span>
              <motion.span
                key={`block-${stats.block}`}
                className="text-rose-600 shrink-0 dark:text-rose-400"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AnimatedNumber value={stats.block} /> BLOCK
              </motion.span>
              <span className="text-gray-300 dark:text-slate-700">·</span>
              <motion.span
                key={`review-${stats.review}`}
                className="text-amber-600 shrink-0 dark:text-amber-400"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AnimatedNumber value={stats.review} /> REVIEW
              </motion.span>
            </>
          )}
        </div>

        {/* Right — Quick actions */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationCenter />
          <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-md border border-gray-200/60 bg-gray-100 dark:bg-white/[0.03] dark:border-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-gray-500">
            <span className="text-gray-400 dark:text-slate-600">⌘</span>K
          </kbd>
          <ThemeToggle />
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors dark:text-slate-600 dark:hover:text-slate-400"
            aria-label="Settings"
          >
            <Settings2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}