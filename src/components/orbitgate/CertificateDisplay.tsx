"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Fingerprint,
  Clock,
  ShieldAlert,
  Hash,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import { MOCK_CERTIFICATE } from "@/lib/orbitgate-constants";
import { SectionHeader } from "./SectionHeader";

export function CertificateDisplay() {
  return (
    <section id="certificate" className="py-16 sm:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          title="Verification Certificate"
          subtitle="Each benchmark run produces a deterministic certificate with a content-addressed hash."
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 relative overflow-hidden">
            {/* Faint holographic rainbow gradient overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(56,189,248,0.3), rgba(168,85,247,0.3), rgba(251,191,36,0.3))" }} />
            {/* Official border treatment */}
            <div className="absolute inset-0 rounded-lg border-2 border-cyan-500/10 dark:border-cyan-500/15 pointer-events-none" />
            <CardHeader className="pb-4 relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
                  <Fingerprint className="h-5 w-5 text-cyan-400" />
                  OrbitGate Benchmark Certificate
                </CardTitle>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Not Flight Certified
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-xs"
                  >
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    Research Only
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hash */}
              <div className="bg-gray-50 dark:bg-slate-950/50 rounded-lg p-4 border border-cyan-500/15 dark:border-cyan-500/10 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    Certificate Hash
                  </span>
                </div>
                <p className="font-mono text-xs text-cyan-300 break-all leading-relaxed">
                  {MOCK_CERTIFICATE.hash}
                </p>
              </div>

              {/* Metadata grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Timestamp</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                      {MOCK_CERTIFICATE.timestamp}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileCheck className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Version</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                      {MOCK_CERTIFICATE.version}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Benchmark Cases</p>
                    <p className="text-sm text-gray-900 dark:text-white font-bold font-mono">
                      {MOCK_CERTIFICATE.benchmark_cases}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Fingerprint className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Active Gates</p>
                    <p className="text-sm text-gray-900 dark:text-white font-bold font-mono">
                      {MOCK_CERTIFICATE.gates.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Decision breakdown */}
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">
                  Decision Breakdown
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(MOCK_CERTIFICATE.decisions).map(
                    ([key, value]) => {
                      const colorMap: Record<string, string> = {
                        ALLOW: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
                        BLOCK: "text-rose-400 bg-rose-500/10 border-rose-500/20",
                        NEEDS_REVIEW:
                          "text-amber-400 bg-amber-500/10 border-amber-500/20",
                        EVIDENCE_REQUIRED:
                          "text-sky-400 bg-sky-500/10 border-sky-500/20",
                      };
                      return (
                        <div
                          key={key}
                          className={`rounded-lg border p-3 text-center ${colorMap[key] || "text-gray-400 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700"}`}
                        >
                          <p className="text-xl font-bold font-mono">
                            {value}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider mt-0.5">
                            {key.replace("_", " ")}
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Gates list */}
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">
                  Verification Gates
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MOCK_CERTIFICATE.gates.map((gate) => (
                    <Badge
                      key={gate}
                      variant="outline"
                      className="bg-gray-100 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-700 text-xs font-mono"
                    >
                      {gate}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Warning note */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 relative">
                {/* Official seal */}
                <div className="absolute -top-3 -right-3 h-10 w-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Fingerprint className="h-5 w-5 text-cyan-400/50" />
                </div>
                <p className="text-xs text-amber-400/80 italic">
                  {MOCK_CERTIFICATE.note}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}