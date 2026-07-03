"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import {
  MOCK_ALLOWED_CLAIMS,
  MOCK_BLOCKED_CLAIMS,
} from "@/lib/orbitgate-constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function ClaimItem({
  claim,
  gate,
  reason,
  isAllowed,
  index,
}: {
  claim: string;
  gate: string;
  reason: string;
  isAllowed: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={`group cursor-default transition-all duration-200 hover:scale-[1.01] ${
              isAllowed
                ? "bg-cyan-500/5 border-cyan-500/15 hover:border-cyan-500/30 hover:bg-cyan-500/10"
                : "bg-rose-500/5 border-rose-500/15 hover:border-rose-500/30 hover:bg-rose-500/10"
            }`}
          >
            <CardContent className="p-3 flex items-start gap-3">
              {isAllowed ? (
                <CheckCircle className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {claim}
                </p>
                <p className="text-[10px] font-mono text-gray-600 mt-1">
                  {gate}
                </p>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-xs bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs"
        >
          <p className="font-medium mb-1 text-gray-700 dark:text-gray-200">Reason:</p>
          <p>{reason}</p>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

export function ClaimBoundaryExplorer() {
  return (
    <section id="boundaries" className="py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Claim Boundary Explorer"
          subtitle="Explore which types of claims pass through OrbitGate and which are blocked. Hover over any claim to see the verification reason."
        />

        <div className="grid md:grid-cols-2 gap-6">
          {/* Allowed */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="h-3 w-3 rounded-full bg-cyan-400" />
              <h3 className="text-lg font-semibold text-cyan-400">
                Allowed Claims
              </h3>
              <span className="text-xs text-gray-500 font-mono ml-auto">
                {MOCK_ALLOWED_CLAIMS.length} examples
              </span>
            </div>
            <div className="space-y-3">
              {MOCK_ALLOWED_CLAIMS.map((item, i) => (
                <ClaimItem
                  key={i}
                  claim={item.claim}
                  gate={item.gate}
                  reason={item.reason}
                  isAllowed={true}
                  index={i}
                />
              ))}
            </div>
          </motion.div>

          {/* Blocked */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="h-3 w-3 rounded-full bg-rose-400" />
              <h3 className="text-lg font-semibold text-rose-400">
                Blocked Claims
              </h3>
              <span className="text-xs text-gray-500 font-mono ml-auto">
                {MOCK_BLOCKED_CLAIMS.length} examples
              </span>
            </div>
            <div className="space-y-3">
              {MOCK_BLOCKED_CLAIMS.map((item, i) => (
                <ClaimItem
                  key={i}
                  claim={item.claim}
                  gate={item.gate}
                  reason={item.reason}
                  isAllowed={false}
                  index={i}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}