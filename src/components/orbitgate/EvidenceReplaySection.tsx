"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "./SectionHeader";
import {
  RotateCcw,
  Terminal,
  CheckCircle,
  Copy,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const cliCommands = [
  {
    label: "Run full benchmark",
    command: "python -m orbitgate.orbit_cli --json results.json",
  },
  {
    label: "Check single claim",
    command: "echo 'The ISS orbits at 408 km' | python -m orbitgate.orbit_cli --check-stdin",
  },
  {
    label: "Replay from certificate",
    command: "python -m orbitgate.orbit_cli --replay sha256:a3f7e2... --verify",
  },
  {
    label: "Output deterministic report",
    command: "python -m orbitgate.orbit_cli --json /dev/stdout | jq '.certificate.hash'",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Command copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="h-7 w-7 rounded flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-slate-800 transition-colors"
    >
      {copied ? (
        <CheckCircle className="h-3.5 w-3.5 text-cyan-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function EvidenceReplaySection() {
  return (
    <section id="evidence" className="py-16 sm:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          title="Evidence & Deterministic Replay"
          subtitle="Every verification result is fully reproducible. The same input always produces the same output with the same certificate hash."
        />

        {/* Replay concept */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-white">
                <RotateCcw className="h-5 w-5 text-cyan-400" />
                How Deterministic Replay Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-sm font-bold text-cyan-400 font-mono">1</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Run the benchmark suite to produce a certificate with a
                    SHA-256 hash.
                  </p>
                </div>
                <div className="text-center">
                  <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-sm font-bold text-cyan-400 font-mono">2</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Share the hash and benchmark version. Anyone can replay
                    the exact same run.
                  </p>
                </div>
                <div className="text-center">
                  <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-sm font-bold text-cyan-400 font-mono">3</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Re-runs produce the identical hash, confirming
                    deterministic behavior.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Badge
                  variant="outline"
                  className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  100% Reproducible
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Content-Addressed
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CLI commands */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-white">
                <Terminal className="h-5 w-5 text-cyan-400" />
                CLI Replay Commands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cliCommands.map((cmd, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-gray-50 dark:bg-slate-950/50 rounded-lg p-3 border border-gray-200 dark:border-slate-800"
                  >
                    <span className="text-xs text-gray-500 shrink-0 w-28 hidden sm:block">
                      {cmd.label}
                    </span>
                    <code className="text-xs font-mono text-cyan-700 dark:text-cyan-300 flex-1 truncate">
                      {cmd.command}
                    </code>
                    <CopyButton text={cmd.command} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
