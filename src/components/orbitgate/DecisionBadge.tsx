"use client";

import { Badge } from "@/components/ui/badge";
import type { Decision } from "@/lib/orbitgate-constants";

const decisionConfig: Record<
  Decision,
  { label: string; className: string; dotClass: string }
> = {
  ALLOW: {
    label: "ALLOW",
    className:
      "bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30 hover:bg-cyan-100 dark:hover:bg-cyan-500/25",
    dotClass: "bg-cyan-500 dark:bg-cyan-400",
  },
  BLOCK: {
    label: "BLOCK",
    className:
      "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/25",
    dotClass: "bg-rose-500 dark:bg-rose-400",
  },
  NEEDS_REVIEW: {
    label: "NEEDS REVIEW",
    className:
      "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/25",
    dotClass: "bg-amber-500 dark:bg-amber-400",
  },
  EVIDENCE_REQUIRED: {
    label: "EVIDENCE REQUIRED",
    className:
      "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30 hover:bg-sky-100 dark:hover:bg-sky-500/25",
    dotClass: "bg-sky-500 dark:bg-sky-400",
  },
};

interface DecisionBadgeProps {
  decision: Decision;
  size?: "sm" | "md" | "lg";
}

export function DecisionBadge({ decision, size = "md" }: DecisionBadgeProps) {
  const config = decisionConfig[decision];
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-3 py-1",
  };

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${sizeClasses[size]} font-mono font-semibold`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </Badge>
  );
}