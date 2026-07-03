"use client";

import { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrbitGateStore } from "@/lib/orbitgate-store";
import {
  Shield,
  Radar,
  Rocket,
  TriangleAlert,
  Zap,
  Thermometer,
  Radio,
  ArrowDownToLine,
  Terminal,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

// ─── Types ──────────────────────────────────────────────────────────────────

interface GateDef {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
}

// ─── Gate Definitions ──────────────────────────────────────────────────────

const GATES: GateDef[] = [
  { id: "tle", name: "TLE Gate", icon: Shield, description: "Validates TLE format and physical bounds" },
  { id: "sgp4", name: "SGP4 Gate", icon: Radar, description: "Verifies SGP4 propagation accuracy" },
  { id: "delta-v", name: "Delta-V Gate", icon: Rocket, description: "Checks orbital maneuver feasibility" },
  { id: "collision", name: "Collision Gate", icon: TriangleAlert, description: "Assesses conjunction risk" },
  { id: "power", name: "Power Gate", icon: Zap, description: "Validates power budget claims" },
  { id: "thermal", name: "Thermal Gate", icon: Thermometer, description: "Verifies thermal analysis" },
  { id: "comms", name: "Comms Gate", icon: Radio, description: "Checks link budget feasibility" },
  { id: "deorbit", name: "Deorbit Gate", icon: ArrowDownToLine, description: "Validates deorbit assertions" },
  { id: "command", name: "Command Gate", icon: Terminal, description: "Screens command safety" },
];

// ─── Benchmark Placeholder Data ────────────────────────────────────────────

const BENCHMARK_DATA: Record<string, { total: number; passRate: number }> = {
  tle: { total: 20, passRate: 0.6 },
  sgp4: { total: 20, passRate: 0.5 },
  "delta-v": { total: 20, passRate: 0.4 },
  collision: { total: 20, passRate: 0.45 },
  power: { total: 20, passRate: 0.5 },
  thermal: { total: 20, passRate: 0.45 },
  comms: { total: 20, passRate: 0.5 },
  deorbit: { total: 20, passRate: 0.4 },
  command: { total: 20, passRate: 0.3 },
};

// ─── Mini Donut Chart ──────────────────────────────────────────────────────

function MiniDonut({ passRate }: { passRate: number }) {
  const failRate = 1 - passRate;
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const passLen = passRate * circumference;
  const failLen = failRate * circumference;
  const rotation = -90;

  return (
    <svg width={48} height={48} viewBox="0 0 48 48" className="shrink-0" aria-label={`Pass rate: ${Math.round(passRate * 100)}%`}>
      {/* Background circle */}
      <circle
        cx={24}
        cy={24}
        r={r}
        fill="none"
        className="stroke-gray-200 dark:stroke-slate-700"
        strokeWidth={5}
      />
      {/* Pass arc */}
      {passLen > 0 && (
        <circle
          cx={24}
          cy={24}
          r={r}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={5}
          strokeDasharray={`${passLen} ${circumference - passLen}`}
          strokeDashoffset="0"
          transform={`rotate(${rotation}, 24, 24)`}
          strokeLinecap="round"
        />
      )}
      {/* Fail arc */}
      {failLen > 0 && (
        <circle
          cx={24}
          cy={24}
          r={r}
          fill="none"
          stroke="#fb7185"
          strokeWidth={5}
          strokeDasharray={`${failLen} ${circumference - failLen}`}
          strokeDashoffset={`${-passLen}`}
          transform={`rotate(${rotation}, 24, 24)`}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

// ─── Decision Badge ────────────────────────────────────────────────────────

function LastDecisionBadge({ decision }: { decision: string }) {
  if (!decision) return null;

  const styles: Record<string, string> = {
    ALLOW: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
    BLOCK: "text-rose-400 bg-rose-500/15 border-rose-500/30",
    NEEDS_REVIEW: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    OUT_OF_SCOPE: "text-gray-400 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700",
  };

  const label = decision === "NEEDS_REVIEW" ? "REVIEW" : decision;

  return (
    <Badge
      variant="outline"
      className={`text-[10px] border ${styles[decision] || styles.OUT_OF_SCOPE}`}
    >
      {label}
    </Badge>
  );
}

// ─── Gate Performance Card ─────────────────────────────────────────────────

interface GateMetrics {
  total: number;
  passRate: number;
  lastDecision: string;
}

// Gate theme colors for top border
const GATE_COLORS: Record<string, string> = {
  tle: "border-t-cyan-500",
  sgp4: "border-t-sky-500",
  "delta-v": "border-t-amber-500",
  collision: "border-t-rose-500",
  power: "border-t-yellow-500",
  thermal: "border-t-orange-500",
  comms: "border-t-teal-500",
  deorbit: "border-t-purple-500",
  command: "border-t-violet-500",
};

function GateCard({
  gate,
  metrics,
  onClick,
  index,
}: {
  gate: GateDef;
  metrics: GateMetrics;
  onClick: () => void;
  index: number;
}) {
  const Icon = gate.icon;
  const topBorderColor = GATE_COLORS[gate.id] || "border-t-cyan-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ scale: 1.02 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className={`bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border border-gray-200 dark:border-slate-800 border-t-2 ${topBorderColor} hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 h-full`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="h-4 w-4 text-cyan-400 shrink-0" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {gate.name}
                </h4>
              </div>
              <p className="text-[11px] text-gray-500 leading-snug mb-3">
                {gate.description}
              </p>
            </div>
            <MiniDonut passRate={metrics.passRate} />
          </div>

          <div className="flex items-center justify-between gap-2 mt-auto">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {Math.round(metrics.passRate * 100)}
              <span className="text-xs text-gray-500 font-normal ml-0.5">%</span>
            </span>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-400 border-gray-300 dark:border-slate-700"
              >
                {metrics.total} claims
              </Badge>
              {metrics.lastDecision && (
                <LastDecisionBadge decision={metrics.lastDecision} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function GatePerformanceCards() {
  const { claimHistory } = useOrbitGateStore();

  const gateMetrics = useMemo(() => {
    const result: Record<string, GateMetrics> = {};

    for (const gate of GATES) {
      const gateId = gate.id;

      // Filter claim history for this gate
      const gateClaims = claimHistory.filter(
        (c) => c.gate.toLowerCase().replace(/\s+/g, "-") === gateId
      );

      if (gateClaims.length > 0) {
        const passCount = gateClaims.filter(
          (c) => c.decision === "ALLOW"
        ).length;
        const passRate = passCount / gateClaims.length;
        const lastDecision =
          gateClaims.length > 0 ? gateClaims[0].decision : "";

        result[gateId] = {
          total: gateClaims.length,
          passRate,
          lastDecision,
        };
      } else {
        // Use benchmark placeholder data
        const benchmark = BENCHMARK_DATA[gateId];
        result[gateId] = {
          total: benchmark?.total || 20,
          passRate: benchmark?.passRate || 0.4,
          lastDecision: "",
        };
      }
    }

    return result;
  }, [claimHistory]);

  const navigateToSection = useOrbitGateStore((s) => s.navigateToSection);

  const handleCardClick = useCallback((gateId: string) => {
    // Navigate to verification page and scroll to gate-rules
    navigateToSection("gate-rules");
    // After page transition, find and click the accordion trigger for this gate
    setTimeout(() => {
      const el = document.getElementById("gate-rules");
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // After scrolling, find and click the accordion trigger for this gate
      setTimeout(() => {
        const accordionTriggers = el.querySelectorAll(
          '[data-state="closed"] button[data-radix-accordion-trigger]'
        );
        for (const trigger of accordionTriggers) {
          const item = trigger.closest('[data-radix-accordion-item]');
          if (item && item.getAttribute("data-value") === gateId) {
            (trigger as HTMLElement).click();
            break;
          }
        }
        // Also check for already-open items and close others, open this one
        const openTriggers = el.querySelectorAll(
          '[data-state="open"] button[data-radix-accordion-trigger]'
        );
        for (const trigger of openTriggers) {
          const item = trigger.closest('[data-radix-accordion-item]');
          if (item && item.getAttribute("data-value") !== gateId) {
            (trigger as HTMLElement).click();
          }
        }
        // If the target gate was open, just let it be
        // If it was closed, open it
        const targetItem = el.querySelector(
          `[data-value="${gateId}"]`
        );
        if (targetItem) {
          const targetTrigger = targetItem.querySelector(
            'button[data-radix-accordion-trigger]'
          );
          const targetState = targetItem.getAttribute("data-state");
          if (targetState === "closed" && targetTrigger) {
            (targetTrigger as HTMLElement).click();
          }
        }
      }, 600);
    }, 100);
  }, [navigateToSection]);

  return (
    <section id="gate-performance" className="py-16 sm:py-24 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-slate-950/50 dark:to-transparent">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Gate Performance"
          subtitle="Per-gate verification metrics and pass/fail rates"
          icon={<Activity className="h-6 w-6 text-cyan-400" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GATES.map((gate, index) => (
            <GateCard
              key={gate.id}
              gate={gate}
              metrics={gateMetrics[gate.id]}
              onClick={() => handleCardClick(gate.id)}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}