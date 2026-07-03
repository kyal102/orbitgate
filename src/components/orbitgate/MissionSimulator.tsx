"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Rocket,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Play,
  RotateCcw,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle as XCircleIcon,
  Clock,
  Loader2,
  FileText,
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SectionHeader } from "./SectionHeader";
import { GATES } from "@/lib/orbitgate-constants";
import {
  useOrbitGateStore,
  type MissionClaim,
  type MissionResult,
  type MissionPriority,
} from "@/lib/orbitgate-store";
import { exportReport } from "@/lib/export-utils";

// --- Constants ---
const GATE_OPTIONS = GATES.map((g) => g.id);
const DECISION_OPTIONS = ["ALLOW", "BLOCK", "REVIEW"];
const PRIORITY_CONFIG: Record<
  MissionPriority,
  { label: string; className: string; dotClass: string }
> = {
  CRITICAL: {
    label: "CRITICAL",
    className:
      "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30",
    dotClass: "bg-red-500",
  },
  HIGH: {
    label: "HIGH",
    className:
      "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
    dotClass: "bg-amber-500",
  },
  MEDIUM: {
    label: "MEDIUM",
    className:
      "bg-yellow-50 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/30",
    dotClass: "bg-yellow-500",
  },
  LOW: {
    label: "LOW",
    className:
      "bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30",
    dotClass: "bg-cyan-500",
  },
};

const DECISION_STATUS: Record<string, { icon: string; label: string; color: string; bgClass: string }> = {
  PENDING: {
    icon: "⏳",
    label: "Pending",
    color: "text-gray-400",
    bgClass: "bg-gray-100 dark:bg-gray-800/50",
  },
  VERIFYING: {
    icon: "🔄",
    label: "Verifying...",
    color: "text-amber-500",
    bgClass: "bg-amber-50 dark:bg-amber-500/10",
  },
  ALLOW: {
    icon: "✅",
    label: "ALLOW",
    color: "text-cyan-600 dark:text-cyan-400",
    bgClass: "bg-cyan-50 dark:bg-cyan-500/10",
  },
  BLOCK: {
    icon: "❌",
    label: "BLOCK",
    color: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-50 dark:bg-rose-500/10",
  },
  NEEDS_REVIEW: {
    icon: "⚠️",
    label: "REVIEW",
    color: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-500/10",
  },
  EVIDENCE_REQUIRED: {
    icon: "📋",
    label: "EVIDENCE",
    color: "text-sky-600 dark:text-sky-400",
    bgClass: "bg-sky-50 dark:bg-sky-500/10",
  },
};

const PRESETS = [
  {
    name: "ISS Reboost Assessment",
    description: "Verify ISS reboost maneuver claims",
    claims: [
      { text: "A reboost maneuver of 2 m/s will raise the ISS orbit from 408 km to 412 km altitude.", expectedGate: "DeltaVGate", expectedDecision: "ALLOW", priority: "CRITICAL" as MissionPriority },
      { text: "The ISS solar arrays can provide 120 kW during the reboost phase with 35-minute eclipse periods.", expectedGate: "PowerGate", expectedDecision: "ALLOW", priority: "HIGH" as MissionPriority },
      { text: "Thermal loads during the reboost burn will stay within ±5°C of nominal for the US Lab module.", expectedGate: "ThermalGate", expectedDecision: "ALLOW", priority: "MEDIUM" as MissionPriority },
    ],
  },
  {
    name: "LEO Collision Avoidance",
    description: "Verify conjunction assessment and response",
    claims: [
      { text: "A conjunction event with miss distance of 2 km requires immediate collision avoidance maneuver.", expectedGate: "CollisionGate", expectedDecision: "BLOCK", priority: "CRITICAL" as MissionPriority },
      { text: "A controlled deorbit from 400 km LEO with ballistic coefficient 100 kg/m² will complete reentry within 25 years.", expectedGate: "DeorbitGate", expectedDecision: "ALLOW", priority: "HIGH" as MissionPriority },
      { text: "S-band communication at 2.2 GHz can maintain telemetry during the collision avoidance maneuver at 600 km range.", expectedGate: "CommsGate", expectedDecision: "ALLOW", priority: "MEDIUM" as MissionPriority },
    ],
  },
  {
    name: "GEO Station Keeping",
    description: "Verify geostationary orbit maintenance claims",
    claims: [
      { text: "SGP4 propagation of a GEO satellite with TLE shows stable orbit at 35,786 km over a 24-hour period.", expectedGate: "SGP4Gate", expectedDecision: "ALLOW", priority: "CRITICAL" as MissionPriority },
      { text: "Solar panel degradation of 2.5% per year still meets 10 kW bus power requirement after 15-year mission life.", expectedGate: "PowerGate", expectedDecision: "ALLOW", priority: "HIGH" as MissionPriority },
      { text: "The thermal design maintains battery temperature between 0°C and 25°C during 45-minute eclipse in GEO.", expectedGate: "ThermalGate", expectedDecision: "ALLOW", priority: "MEDIUM" as MissionPriority },
    ],
  },
  {
    name: "Full Mission Validation",
    description: "Comprehensive multi-gate verification",
    claims: [
      { text: "The ISS orbits at approximately 408 km altitude with 51.6° inclination.", expectedGate: "TLEGate", expectedDecision: "ALLOW", priority: "LOW" as MissionPriority },
      { text: "A Hohmann transfer from 400 km LEO to 800 km requires approximately 0.33 km/s total Δv.", expectedGate: "DeltaVGate", expectedDecision: "ALLOW", priority: "HIGH" as MissionPriority },
      { text: "Two objects at 15 km separation in LEO pose a collision probability below 1e-6 threshold.", expectedGate: "CollisionGate", expectedDecision: "ALLOW", priority: "CRITICAL" as MissionPriority },
      { text: "Fire thruster A for 10 seconds to raise the orbit by 50 km.", expectedGate: "CommandGate", expectedDecision: "BLOCK", priority: "CRITICAL" as MissionPriority },
      { text: "A GEO satellite with no end-of-life disposal plan is compliant with 25-year guideline.", expectedGate: "DeorbitGate", expectedDecision: "BLOCK", priority: "HIGH" as MissionPriority },
    ],
  },
];

// --- Sub-components ---

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: "Build" },
    { num: 2, label: "Run" },
    { num: 3, label: "Report" },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, idx) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                step.num === currentStep
                  ? "border-cyan-500 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : step.num < currentStep
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                    : "border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-400 dark:text-gray-600"
              }`}
            >
              {step.num < currentStep ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                step.num
              )}
            </div>
            <span
              className={`text-[10px] mt-1.5 font-medium uppercase tracking-wider ${
                step.num === currentStep
                  ? "text-cyan-600 dark:text-cyan-400"
                  : "text-gray-400 dark:text-gray-600"
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`w-12 sm:w-20 h-0.5 mx-2 mt-[-16px] transition-colors duration-300 ${
                step.num < currentStep
                  ? "bg-cyan-500"
                  : "bg-gray-200 dark:bg-slate-800"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ClaimForm({
  onAdd,
}: {
  onAdd: (claim: MissionClaim) => void;
}) {
  const [text, setText] = useState("");
  const [gate, setGate] = useState<string>("none");
  const [decision, setDecision] = useState<string>("none");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      text: text.trim(),
      expectedGate: gate !== "none" ? gate : undefined,
      expectedDecision: decision !== "none" ? decision : undefined,
      priority: priority as MissionPriority,
    });
    setText("");
    setGate("none");
    setDecision("none");
    setPriority("MEDIUM");
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Plus className="w-4 h-4" />
        Add Claim Step
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="glass-card p-4 space-y-3 border border-cyan-500/20">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Claim Text *</Label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter the orbital claim to verify..."
                  className="min-h-[60px] bg-white/5 dark:bg-slate-950/40 border-gray-200 dark:border-slate-800 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Expected Gate</Label>
                  <Select value={gate} onValueChange={setGate}>
                    <SelectTrigger className="bg-white/5 dark:bg-slate-950/40 border-gray-200 dark:border-slate-800 text-sm h-9">
                      <SelectValue placeholder="Any gate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any gate</SelectItem>
                      {GATE_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g.replace("Gate", "")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Expected Decision</Label>
                  <Select value={decision} onValueChange={setDecision}>
                    <SelectTrigger className="bg-white/5 dark:bg-slate-950/40 border-gray-200 dark:border-slate-800 text-sm h-9">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any</SelectItem>
                      {DECISION_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="bg-white/5 dark:bg-slate-950/40 border-gray-200 dark:border-slate-800 text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORITY_CONFIG) as MissionPriority[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!text.trim()}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Step
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="text-xs h-8 text-gray-500 hover:text-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClaimsList({
  claims,
  verifyingIndex,
  results,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  claims: MissionClaim[];
  verifyingIndex: number;
  results: MissionResult[];
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [verifyingIndex]);

  if (claims.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-600 text-sm">
        <Rocket className="w-8 h-8 mx-auto mb-2 opacity-30" />
        No claims added yet. Add claims or select a preset.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1"
    >
      {claims.map((claim, idx) => {
        const result = results.find((r) => r.step === idx + 1);
        const isVerifying = verifyingIndex === idx;
        const isDone = result !== undefined;
        const status = isVerifying
          ? "VERIFYING"
          : isDone
            ? result.decision
            : "PENDING";
        const statusCfg = DECISION_STATUS[status] || DECISION_STATUS.PENDING;
        const prioCfg = PRIORITY_CONFIG[claim.priority];

        return (
          <motion.div
            key={claim.id}
            ref={isVerifying ? activeRef : undefined}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={`glass-card p-3 border transition-all duration-300 ${
              isVerifying
                ? "border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                : isDone && result?.decision === "BLOCK"
                  ? "border-rose-500/30"
                  : isDone && result?.decision === "ALLOW"
                    ? "border-cyan-500/20"
                    : "border-gray-200 dark:border-slate-800/60"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Step number */}
              <div
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
                  isVerifying
                    ? "border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse"
                    : isDone
                      ? result?.decision === "ALLOW"
                        ? "border-cyan-500 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
                        : result?.decision === "BLOCK"
                          ? "border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          : "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "border-gray-300 dark:border-slate-700 text-gray-400 dark:text-gray-600"
                }`}
              >
                {isVerifying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isDone ? (
                  <span className="text-[10px]">{statusCfg.icon}</span>
                ) : (
                  idx + 1
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p
                    className={`text-sm font-medium truncate max-w-md ${
                      isDone
                        ? "text-gray-900 dark:text-white"
                        : isVerifying
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {claim.text}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`${prioCfg.className} text-[10px] px-1.5 py-0 font-mono`}
                  >
                    <span className={`h-1 w-1 rounded-full ${prioCfg.dotClass}`} />
                    {prioCfg.label}
                  </Badge>
                  {claim.expectedGate && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 font-mono bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400"
                    >
                      {claim.expectedGate.replace("Gate", "")}
                    </Badge>
                  )}
                  {claim.expectedDecision && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 font-mono bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400"
                    >
                      {claim.expectedDecision}
                    </Badge>
                  )}
                  {isDone && result && (
                    <Badge
                      variant="outline"
                      className={`${statusCfg.bgClass} ${statusCfg.color} text-[10px] px-1.5 py-0 font-mono border-current/20`}
                    >
                      {statusCfg.icon} {statusCfg.label}
                    </Badge>
                  )}
                </div>
                {isDone && result && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 truncate font-mono">
                    {result.gate.replace("Gate", "")}: {result.reason}
                  </p>
                )}
              </div>

              {/* Actions */}
              {!isVerifying && !isDone && (
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onMoveUp(idx)}
                    disabled={idx === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDown(idx)}
                    disabled={idx === claims.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(claim.id)}
                    className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// --- Main Component ---

export function MissionSimulator() {
  const {
    missionState,
    setMissionState,
    addMissionClaim,
    removeMissionClaim,
    reorderMissionClaims,
    resetMission,
    mergeHistoryEntries,
  } = useOrbitGateStore();

  const [verifyingIndex, setVerifyingIndex] = useState(-1);
  const abortRef = useRef(false);

  // --- Callbacks (defined before JSX to avoid TDZ) ---
  const startSimulation = useCallback(async () => {
    abortRef.current = false;
    const startTime = Date.now();
    setMissionState({
      ...missionState,
      currentStep: 2,
      isRunning: true,
      results: [],
      startTime,
    });
    setVerifyingIndex(0);
  }, [missionState, setMissionState]);

  // Step 1: Mission Builder
  const missionBuilder = (
    <AnimatePresence mode="wait">
      <motion.div
        key="builder"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Mission Info */}
          <div className="space-y-4">
            <Card className="glass-card border-gray-200 dark:border-slate-800/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-500" />
                  Mission Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Mission Name *</Label>
                  <Input
                    value={missionState.name}
                    onChange={(e) =>
                      setMissionState({ ...missionState, name: e.target.value })
                    }
                    placeholder="e.g. ISS Reboost Campaign"
                    className="bg-white/5 dark:bg-slate-950/40 border-gray-200 dark:border-slate-800 text-sm h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Description (optional)</Label>
                  <Textarea
                    value={missionState.description}
                    onChange={(e) =>
                      setMissionState({
                        ...missionState,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe the mission objectives..."
                    className="min-h-[60px] bg-white/5 dark:bg-slate-950/40 border-gray-200 dark:border-slate-800 text-sm"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Presets */}
            <Card className="glass-card border-gray-200 dark:border-slate-800/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Quick Presets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setMissionState({
                        ...missionState,
                        name: preset.name,
                        description: preset.description,
                        claims: preset.claims.map((c) => ({
                          id: crypto.randomUUID(),
                          text: c.text,
                          expectedGate: c.expectedGate,
                          expectedDecision: c.expectedDecision,
                          priority: c.priority,
                        })),
                      });
                      toast.success(`Loaded "${preset.name}" preset`);
                    }}
                    className="w-full text-left p-2.5 rounded-lg border border-gray-200 dark:border-slate-800 hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:bg-cyan-50/50 dark:hover:bg-cyan-500/5 transition-all duration-200 group"
                  >
                    <p className="text-xs font-medium text-gray-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors">
                      {preset.name}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {preset.description} &middot; {preset.claims.length} claims
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right: Claims */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="glass-card border-gray-200 dark:border-slate-800/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-cyan-500" />
                    Claim Steps
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 font-mono bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30"
                    >
                      {missionState.claims.length}
                    </Badge>
                  </CardTitle>
                  {missionState.claims.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMissionState({
                          ...missionState,
                          claims: [],
                        });
                      }}
                      className="text-[10px] text-gray-500 hover:text-rose-500 h-6 px-2"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ClaimForm onAdd={addMissionClaim} />
                <ClaimsList
                  claims={missionState.claims}
                  verifyingIndex={-1}
                  results={[]}
                  onRemove={removeMissionClaim}
                  onMoveUp={(idx) =>
                    idx > 0 && reorderMissionClaims(idx, idx - 1)
                  }
                  onMoveDown={(idx) =>
                    idx < missionState.claims.length - 1 &&
                    reorderMissionClaims(idx, idx + 1)
                  }
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={startSimulation}
                disabled={
                  !missionState.name.trim() ||
                  missionState.claims.length < 1
                }
                className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.2)] hover:shadow-[0_0_24px_rgba(16,185,129,0.3)] transition-all duration-300"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Simulation
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  // Step 2: Simulation Runner
  const simulationRunner = (
    <AnimatePresence mode="wait">
      <motion.div
        key="runner"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-card border-gray-200 dark:border-slate-800/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                {missionState.isRunning ? (
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-cyan-500" />
                )}
                {missionState.isRunning
                  ? `Verifying Step ${verifyingIndex + 1}/${missionState.claims.length}...`
                  : "Simulation Complete"}
              </CardTitle>
              {missionState.isRunning && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    abortRef.current = true;
                  }}
                  className="text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 h-7"
                >
                  <XCircleIcon className="w-3.5 h-3.5 mr-1" />
                  Abort
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Progress</span>
                <span className="font-mono">
                  {missionState.results.length}/{missionState.claims.length}
                </span>
              </div>
              <Progress
                value={
                  missionState.claims.length > 0
                    ? (missionState.results.length / missionState.claims.length) * 100
                    : 0
                }
                className="h-2 [&>div]:bg-cyan-500 [&>div]:shadow-[0_0_8px_rgba(16,185,129,0.4)]"
              />
            </div>

            {/* Claims list with statuses */}
            <ClaimsList
              claims={missionState.claims}
              verifyingIndex={verifyingIndex}
              results={missionState.results}
              onRemove={() => {}}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
            />

            {/* Auto-advance to report when done */}
            {!missionState.isRunning && missionState.results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end gap-2 pt-2"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setMissionState({ ...missionState, currentStep: 1 })
                  }
                  className="text-xs h-8"
                >
                  Back to Builder
                </Button>
                <Button
                  onClick={() =>
                    setMissionState({
                      ...missionState,
                      currentStep: 3,
                    })
                  }
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8"
                >
                  View Report
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );

  // Step 3: Mission Report
  const missionReport = (
    <AnimatePresence mode="wait">
      <motion.div
        key="report"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
      >
        <ReportView />
      </motion.div>
    </AnimatePresence>
  );

  // Sequential verification effect
  useEffect(() => {
    if (!missionState.isRunning || verifyingIndex < 0) return;

    const claim = missionState.claims[verifyingIndex];
    if (!claim) {
      // Done
      setMissionState({
        ...missionState,
        isRunning: false,
        currentStep: 3,
      });
      setVerifyingIndex(-1);
      toast.success("Mission simulation complete!");
      return;
    }

    const claimStart = performance.now();

    const timer = setTimeout(async () => {
      if (abortRef.current) {
        setMissionState({ ...missionState, isRunning: false });
        setVerifyingIndex(-1);
        toast.info("Simulation aborted");
        return;
      }

      try {
        const res = await fetch("/api/orbitgate/check-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claim: claim.text }),
        });
        const json = await res.json();
        const duration_ms = Math.round(performance.now() - claimStart);

        if (json.success && json.data) {
          const result: MissionResult = {
            step: verifyingIndex + 1,
            claim: claim.text,
            gate: json.data.gate || "Unknown",
            decision: json.data.decision || "NEEDS_REVIEW",
            risk_label: json.data.risk_label || "INSUFFICIENT_DATA",
            reason: json.data.reason || "No reason provided",
            duration_ms,
          };

          // Merge into claim history
          mergeHistoryEntries([
            {
              id: crypto.randomUUID(),
              claim: claim.text,
              decision: result.decision,
              gate: result.gate,
              risk_label: result.risk_label,
              reason: result.reason,
              evidence: json.data.evidence || [],
              missing_evidence: json.data.missing_evidence || [],
              timestamp: new Date().toISOString(),
            },
          ]);

          setMissionState((prev) => ({
            ...prev,
            results: [...prev.results, result],
          }));
        } else {
          const result: MissionResult = {
            step: verifyingIndex + 1,
            claim: claim.text,
            gate: "Error",
            decision: "NEEDS_REVIEW",
            risk_label: "INSUFFICIENT_DATA",
            reason: json.error || "Verification failed",
            duration_ms,
          };
          setMissionState((prev) => ({
            ...prev,
            results: [...prev.results, result],
          }));
        }
      } catch {
        const duration_ms = Math.round(performance.now() - claimStart);
        const result: MissionResult = {
          step: verifyingIndex + 1,
          claim: claim.text,
          gate: "Error",
          decision: "NEEDS_REVIEW",
          risk_label: "INSUFFICIENT_DATA",
          reason: "Network error during verification",
          duration_ms,
        };
        setMissionState((prev) => ({
          ...prev,
          results: [...prev.results, result],
        }));
      }

      setVerifyingIndex((prev) => prev + 1);
    }, 600); // Small delay between claims for visual effect

    return () => clearTimeout(timer);
  }, [missionState.isRunning, verifyingIndex, missionState.claims, setMissionState, mergeHistoryEntries]);

  // --- Report sub-component (uses closures from parent) ---
  function ReportView() {
    const results = missionState.results;
    const totalDuration = missionState.startTime
      ? Date.now() - missionState.startTime
      : 0;

    const allowCount = results.filter((r) => r.decision === "ALLOW").length;
    const blockCount = results.filter((r) => r.decision === "BLOCK").length;
    const reviewCount = results.filter(
      (r) => r.decision === "NEEDS_REVIEW" || r.decision === "EVIDENCE_REQUIRED"
    ).length;

    const overallStatus =
      blockCount > 0
        ? { label: "ISSUES FOUND", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-200 dark:border-rose-500/30" }
        : reviewCount > 0
          ? { label: "NEEDS REVIEW", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/30" }
          : { label: "ALL CLEAR", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-500/10", border: "border-cyan-200 dark:border-cyan-500/30" };

    const handleExport = async () => {
      try {
        await exportReport({
          title: `Mission Report: ${missionState.name}`,
          format: "html",
          sections: ["summary", "claim_history", "analytics", "gate_performance"],
        });
        toast.success("Mission report exported");
      } catch {
        toast.error("Export failed");
      }
    };

    const handleRerunFailed = () => {
      const failedClaims = missionState.claims.filter((c) => {
        const result = results.find((r) => r.claim === c.text);
        return result && (result.decision === "BLOCK" || result.decision === "NEEDS_REVIEW" || result.decision === "EVIDENCE_REQUIRED");
      });

      if (failedClaims.length === 0) {
        toast.info("No failed claims to re-run");
        return;
      }

      setMissionState({
        ...missionState,
        claims: failedClaims,
        results: [],
        currentStep: 2,
        isRunning: true,
        startTime: Date.now(),
      });
      setVerifyingIndex(0);
      toast.info(`Re-running ${failedClaims.length} failed claims`);
    };

    const formatDuration = (ms: number) => {
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
      return `${(ms / 60000).toFixed(1)}m`;
    };

    return (
      <div className="space-y-6">
        {/* Summary Card */}
        <Card className="glass-card border-gray-200 dark:border-slate-800/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-500" />
              Mission Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Mission</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {missionState.name}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Timestamp</p>
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                  {new Date().toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Duration</p>
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                  {formatDuration(totalDuration)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  Overall Status
                </p>
                <Badge
                  variant="outline"
                  className={`${overallStatus.bg} ${overallStatus.color} ${overallStatus.border} text-xs font-mono font-semibold px-2 py-0.5`}
                >
                  {blockCount > 0 ? "🔴" : reviewCount > 0 ? "🟡" : "🟢"}{" "}
                  {overallStatus.label}
                </Badge>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 bg-cyan-50 dark:bg-cyan-500/10 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-lg font-bold text-cyan-700 dark:text-cyan-400 font-mono">
                  {allowCount}
                </span>
                <span className="text-xs text-cyan-600 dark:text-cyan-500">Passed</span>
              </div>
              <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">
                <XCircleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span className="text-lg font-bold text-rose-700 dark:text-rose-400 font-mono">
                  {blockCount}
                </span>
                <span className="text-xs text-rose-600 dark:text-rose-500">Blocked</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-lg font-bold text-amber-700 dark:text-amber-400 font-mono">
                  {reviewCount}
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-500">Review</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Results Table */}
        <Card className="glass-card border-gray-200 dark:border-slate-800/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-500" />
              Detailed Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-800">
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">#</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Claim</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Gate</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Decision</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium hidden sm:table-cell">Risk</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium hidden md:table-cell">Reason</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => {
                    const statusCfg = DECISION_STATUS[result.decision] || DECISION_STATUS.PENDING;
                    const rowBg =
                      result.decision === "BLOCK"
                        ? "bg-rose-50/50 dark:bg-rose-500/5"
                        : result.decision === "ALLOW"
                          ? "bg-cyan-50/50 dark:bg-cyan-500/5"
                          : result.decision === "NEEDS_REVIEW" || result.decision === "EVIDENCE_REQUIRED"
                            ? "bg-amber-50/50 dark:bg-amber-500/5"
                            : "";

                    return (
                      <tr
                        key={idx}
                        className={`border-b border-gray-100 dark:border-slate-800/50 ${rowBg}`}
                      >
                        <td className="py-2 px-2 font-mono text-gray-500">{result.step}</td>
                        <td className="py-2 px-2 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                          {result.claim}
                        </td>
                        <td className="py-2 px-2 font-mono text-gray-600 dark:text-gray-400">
                          {result.gate.replace("Gate", "")}
                        </td>
                        <td className="py-2 px-2">
                          <span className={`${statusCfg.color} text-[11px] font-mono font-semibold`}>
                            {statusCfg.icon} {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-2 px-2 hidden sm:table-cell">
                          <span className="font-mono text-gray-500 text-[11px]">
                            {(result.risk_label ?? "").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-2 px-2 hidden md:table-cell text-gray-500 max-w-[250px] truncate">
                          {result.reason}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-gray-400">
                          {formatDuration(result.duration_ms)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRerunFailed}
            disabled={blockCount + reviewCount === 0}
            className="text-xs h-8"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Re-run Failed ({blockCount + reviewCount})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="text-xs h-8"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Mission Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetMission}
            className="text-xs h-8 text-gray-500 hover:text-gray-300"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset Simulation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section id="mission-sim" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Mission Simulation"
          subtitle="Build mission plans, verify claims step by step, and generate comprehensive mission reports"
          icon={<Rocket className="w-6 h-6 text-cyan-400" />}
          sectionNumber="22"
        />

        <StepIndicator currentStep={missionState.currentStep} />

        {/* Step 1: Builder */}
        {missionState.currentStep === 1 && missionBuilder}

        {/* Step 2: Runner */}
        {missionState.currentStep === 2 && simulationRunner}

        {/* Step 3: Report */}
        {missionState.currentStep === 3 && missionReport}
      </div>
    </section>
  );
}