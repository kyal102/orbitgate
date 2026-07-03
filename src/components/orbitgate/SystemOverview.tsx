"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle as XCircleIcon, Info } from "lucide-react";
import { GateCard } from "./GateCard";
import { SectionHeader } from "./SectionHeader";
import { GATES } from "@/lib/orbitgate-constants";

const allowedItems = [
  "Validating TLE orbital elements against NORAD specifications",
  "Verifying SGP4 propagation for numerical stability",
  "Checking delta-v budgets with Tsiolkovsky equation constraints",
  "Evaluating conjunction geometry for collision risk",
  "Confirming solar power budgets with eclipse analysis",
  "Validating thermal equilibrium models",
  "Verifying link budgets for ground station passes",
  "Checking 25-year deorbit disposal compliance",
];

const blockedItems = [
  "Sending commands to real spacecraft",
  "Providing flight certification for missions",
  "Replacing mission operations teams",
  "Guaranteeing collision avoidance decisions",
  "Real-time telemetry processing",
  "Replacing Monte Carlo uncertainty analysis",
  "Validating proprietary mission data",
  "Making autonomous operational decisions",
];

export function SystemOverview() {
  return (
    <section id="overview" className="py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="System Overview"
          subtitle="OrbitGate is a deterministic pipeline of verification gates that evaluates AI-generated orbital claims before they reach operators."
          className="mb-12"
        />

        {/* What it is / What it is not */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white dark:bg-slate-900/80 border-cyan-500/20 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-cyan-400 text-lg">
                  <CheckCircle className="h-5 w-5" />
                  What OrbitGate Is
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {allowedItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white dark:bg-slate-900/80 border-rose-500/20 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-rose-400 text-lg">
                  <XCircleIcon className="h-5 w-5" />
                  What OrbitGate Is Not
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {blockedItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <XCircleIcon className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* 9 Gates */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Info className="h-5 w-5 text-cyan-400" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              9 Verification Gates
            </h3>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GATES.map((gate, index) => (
            <GateCard key={gate.id} gate={gate} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}