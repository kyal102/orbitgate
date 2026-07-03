"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { GateInfo } from "@/lib/orbitgate-constants";
import { useOrbitGateStore } from "@/lib/orbitgate-store";
import {
  Satellite,
  Orbit,
  Zap,
  ShieldAlert,
  Battery,
  Thermometer,
  Radio,
  ArrowDownToLine,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";

const iconMap: Record<string, LucideIcon> = {
  Satellite,
  Orbit,
  Zap,
  ShieldAlert,
  Battery,
  Thermometer,
  Radio,
  ArrowDownToLine,
  Terminal,
};

interface GateCardProps {
  gate: GateInfo;
  index: number;
}

export function GateCard({ gate, index }: GateCardProps) {
  const Icon = iconMap[gate.icon] || Satellite;
  const setSelectedGateForDetail = useOrbitGateStore(
    (s) => s.setSelectedGateForDetail
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <Card
        className="tilt-card bg-white dark:bg-white/5 backdrop-blur-xl border border-white/10 dark:border-white/10 border-gray-200 dark:border-slate-800 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:scale-[1.02] group h-full cursor-pointer relative overflow-hidden hover:glow-cyan transition-shadow duration-300"
        onClick={() => setSelectedGateForDetail(gate.id)}
      >
        {/* Thin emerald top-border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 text-cyan-400 group-hover:from-cyan-500/30 group-hover:to-cyan-500/10 transition-all duration-300 [filter:drop-shadow(0_0_4px_rgba(6,182,212,0.2))] group-hover:[filter:drop-shadow(0_0_8px_rgba(6,182,212,0.35))]">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {gate.name}
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {gate.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}