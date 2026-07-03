"use client";

import { useState } from "react";
import { Activity, Clock, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useOrbitGateStore } from "@/lib/orbitgate-store";

export function GlobalStatsCounter() {
  const [collapsed, setCollapsed] = useState(false);
  const claimHistory = useOrbitGateStore((s) => s.claimHistory);

  const stats = [
    { icon: ShieldCheck, value: claimHistory.length.toString(), label: "Verifications" },
    { icon: Clock, value: "99.7%", label: "Uptime" },
    { icon: Activity, value: "9/9", label: "Gates Active" },
  ];

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-6 left-6 z-[9998] w-8 h-8 rounded-full bg-white/80 dark:bg-white/[0.03] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.06] flex items-center justify-center shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 hover:scale-110 group"
        aria-label="Expand stats"
      >
        <div className="w-2 h-2 rounded-full bg-cyan-500 dot-pulse-green" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-[9998] bg-white/80 dark:bg-white/[0.03] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.06] rounded-xl shadow-lg dark:shadow-cyan-500/5 p-3 transition-all duration-300">
      <div className="flex items-center gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1.5">
            <stat.icon className="h-3 w-3 text-cyan-500 dark:text-cyan-400 shrink-0" />
            <span className="font-mono text-xs font-medium text-gray-900 dark:text-white">{stat.value}</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline">{stat.label}</span>
          </div>
        ))}
        <button
          onClick={() => setCollapsed(true)}
          className="ml-1 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          aria-label="Collapse stats"
        >
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
      </div>
    </div>
  );
}