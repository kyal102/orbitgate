"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "./SectionHeader";
import {
  AlertTriangle,
  XCircle,
  ShieldOff,
  Cpu,
  Globe,
  Users,
  Gauge,
  Layers,
} from "lucide-react";

const limitations = [
  {
    icon: ShieldOff,
    title: "No Flight Certification",
    description:
      "OrbitGate v0 is a research prototype. It does not provide flight certification for any mission, spacecraft, or operation.",
  },
  {
    icon: XCircle,
    title: "No Real Spacecraft Control",
    description:
      "OrbitGate is strictly read-only. It never sends commands to real spacecraft, ground stations, or any operational system.",
  },
  {
    icon: Cpu,
    title: "No AI/ML Models",
    description:
      "All verification is deterministic. OrbitGate does not use neural networks, LLMs, or any learned model for verification.",
  },
  {
    icon: Globe,
    title: "No Real-Time Data",
    description:
      "OrbitGate does not ingest live telemetry, space weather data, or real-time conjunction messages (CDMs).",
  },
  {
    icon: Users,
    title: "No Operator Replacement",
    description:
      "OrbitGate is a pre-check tool. It does not replace trained flight dynamics operators, mission planners, or safety reviewers.",
  },
  {
    icon: Gauge,
    title: "No Uncertainty Quantification",
    description:
      "OrbitGate uses point estimates, not Monte Carlo or covariance-based uncertainty propagation. It cannot quantify confidence intervals.",
  },
  {
    icon: Layers,
    title: "Limited Physics Fidelity",
    description:
      "Gates use simplified physics models (e.g., 2-body + J2). High-fidelity perturbation models, atmospheric density variations, and multi-body effects are not included.",
  },
  {
    icon: AlertTriangle,
    title: "Not a Safety System",
    description:
      "OrbitGate is an academic research tool. Passing an OrbitGate check does not guarantee safety, correctness, or mission success.",
  },
];

export function LimitationsSection() {
  return (
    <section id="limitations" className="py-16 sm:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          title="Limitations"
          subtitle="Critical limitations of OrbitGate v0 that must be understood before using this tool."
        />

        <div className="grid sm:grid-cols-2 gap-4">
          {limitations.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 hover:border-amber-500/20 transition-colors h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Big warning box */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-5 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
            <p className="text-sm sm:text-base text-rose-600 dark:text-rose-300 font-semibold mb-1">
              Do Not Use for Real Missions
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
              OrbitGate v0 is a public research prototype for exploring the
              concept of deterministic verification gates for AI-generated
              orbital claims. It does not control spacecraft and does not
              provide flight certification.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
