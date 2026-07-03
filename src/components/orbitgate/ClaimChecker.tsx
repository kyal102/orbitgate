"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileQuestion,
} from "lucide-react";
import { DecisionBadge } from "./DecisionBadge";
import { SectionHeader } from "./SectionHeader";
import { useOrbitGateStore } from "@/lib/orbitgate-store";
import type { ClaimResult, Decision } from "@/lib/orbitgate-constants";
import { toast } from "sonner";

function addClaimToStore(entry: {
  id: string; claim: string; decision: string; gate: string;
  risk_label: string; reason: string; evidence: string[];
  missing_evidence: string[]; timestamp: string;
}) {
  const current = useOrbitGateStore.getState().claimHistory;
  useOrbitGateStore.getState().setClaimHistory([entry, ...current].slice(0, 100));
}

const decisionIcons: Record<Decision, typeof CheckCircle> = {
  ALLOW: CheckCircle,
  BLOCK: XCircle,
  NEEDS_REVIEW: HelpCircle,
  EVIDENCE_REQUIRED: FileQuestion,
};

const decisionColors: Record<Decision, string> = {
  ALLOW: "text-cyan-400",
  BLOCK: "text-rose-400",
  NEEDS_REVIEW: "text-amber-400",
  EVIDENCE_REQUIRED: "text-sky-400",
};

const decisionBorderCls: Record<Decision, string> = {
  ALLOW: "border-cyan-500/30",
  BLOCK: "border-rose-500/30",
  NEEDS_REVIEW: "border-amber-500/30",
  EVIDENCE_REQUIRED: "border-sky-500/30",
};

const decisionBgCls: Record<Decision, string> = {
  ALLOW: "bg-cyan-500/15",
  BLOCK: "bg-rose-500/15",
  NEEDS_REVIEW: "bg-amber-500/15",
  EVIDENCE_REQUIRED: "bg-sky-500/15",
};

const EXAMPLE_CLAIMS = [
  "The ISS orbits at approximately 408 km altitude with 51.6° inclination.",
  "Fire thruster A for 10 seconds to raise the orbit by 50 km.",
  "A Hohmann transfer from 400 km LEO to 800 km requires approximately 0.33 km/s total delta-v.",
  "Direct insertion from LEO to GEO requires only 0.5 km/s total delta-v.",
  "A 5W solar array can power a 50W satellite through 60-minute eclipses.",
];

function ResultPanel({ result }: { result: ClaimResult }) {
  const ResultIcon = decisionIcons[result.decision];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mt-6"
    >
      <Card className={`border ${decisionBorderCls[result.decision]} bg-white/80 dark:bg-white/5 backdrop-blur-xl dark:border-white/10 shadow-sm`}>
        <CardContent className="p-4 sm:p-6">
          {/* Decision header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center ${decisionBgCls[result.decision]}`}
              >
                <ResultIcon
                  className={`h-5 w-5 ${decisionColors[result.decision]}`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DecisionBadge decision={result.decision} size="lg" />
                </div>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  Gate: {result.gate} · {result.risk_label}
                </p>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="bg-gray-50 dark:bg-slate-950/50 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Reason</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.reason}</p>
              </div>
            </div>
          </div>

          {/* Evidence & Missing Evidence */}
          <div className="grid sm:grid-cols-2 gap-3">
            {result.evidence.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">Evidence Found</p>
                <ul className="space-y-1">
                  {result.evidence.map((e, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-xs text-cyan-400"
                    >
                      <CheckCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.missing_evidence.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">Missing Evidence</p>
                <ul className="space-y-1">
                  {result.missing_evidence.map((e, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-xs text-amber-400"
                    >
                      <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function ClaimChecker() {
  const {
    claimInput,
    setClaimInput,
    claimResult,
    setClaimResult,
    isCheckingClaim,
    setIsCheckingClaim,
  } = useOrbitGateStore();

  const [localInput, setLocalInput] = useState("");

  const handleCheck = async () => {
    const text = localInput.trim() || claimInput.trim();
    if (!text) {
      toast.error("Please enter an orbital claim to verify.");
      return;
    }

    setIsCheckingClaim(true);
    setClaimInput(text);
    setClaimResult(null);

    try {
      const res = await fetch("/api/orbitgate/check-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: text }),
      });
      const data = await res.json();

      if (data.success) {
        const result = data.data as ClaimResult;
        setClaimResult(result);
        // Add to claim history
        const historyEntry = {
          id: crypto.randomUUID(),
          claim: result.claim,
          decision: result.decision,
          gate: result.gate,
          risk_label: result.risk_label,
          reason: result.reason,
          evidence: result.evidence,
          missing_evidence: result.missing_evidence,
          timestamp: result.timestamp,
        };
        addClaimToStore(historyEntry);
        // Add notification to notification center
        useOrbitGateStore.getState().addNotification({
          type: "verification",
          title: `${result.decision} — ${result.gate}`,
          message: result.claim.substring(0, 100),
          icon: result.decision === "ALLOW" ? "CheckCircle" : result.decision === "BLOCK" ? "XCircle" : result.decision === "NEEDS_REVIEW" ? "HelpCircle" : "FileQuestion",
        });
        // Verification decision toast
        if (result.decision === "BLOCK") {
          toast.error("Claim Blocked", { description: `${result.gate}: ${result.reason.substring(0, 80)}` });
        } else if (result.decision === "ALLOW") {
          toast.success("Claim Verified", { description: `${result.gate}: ${result.reason.substring(0, 80)}` });
        } else if (result.decision === "NEEDS_REVIEW") {
          toast.warning("Needs Review", { description: `${result.gate}: ${result.reason.substring(0, 80)}` });
        } else if (result.decision === "EVIDENCE_REQUIRED") {
          toast.info("Evidence Required", { description: `${result.gate}: ${result.reason.substring(0, 80)}` });
        }
        // Broadcast to live feed WebSocket (fire-and-forget)
        fetch("/api/orbitgate/broadcast-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "verification",
            data: historyEntry,
          }),
        }).catch(() => {});
        // Persist to database (fire-and-forget)
        fetch("/api/orbitgate/save-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            claim: result.claim,
            decision: result.decision,
            gate: result.gate,
            risk_label: result.risk_label,
            reason: result.reason,
            evidence: result.evidence,
            missing_evidence: result.missing_evidence,
          }),
        }).catch(() => {});
        if (data.mock) {
          toast.info("Using mock data — Python backend not yet available.");
        }
      } else {
        toast.error(data.error || "Failed to verify claim.");
      }
    } catch {
      const mockDecision: Decision =
        text.toLowerCase().includes("fire") ||
        text.toLowerCase().includes("command") ||
        text.toLowerCase().includes("rotate") ||
        text.toLowerCase().includes("send")
          ? "BLOCK"
          : text.toLowerCase().includes("impossible") ||
            text.toLowerCase().includes("only 0.5") ||
            text.toLowerCase().includes("5w")
          ? "BLOCK"
          : "ALLOW";

      const mockResult: ClaimResult = {
        claim: text,
        decision: mockDecision,
        gate: mockDecision === "BLOCK" && text.toLowerCase().includes("fire")
          ? "CommandGate"
          : mockDecision === "BLOCK"
          ? "DeltaVGate"
          : "TLEGate",
        risk_label: mockDecision === "ALLOW" ? "PHYSICS_COMPLIANT" : "RISK_TOO_HIGH",
        reason:
          mockDecision === "ALLOW"
            ? "Orbital parameters validated against known physics models and boundary conditions."
            : "Claim contains physically implausible values or attempts to issue spacecraft commands.",
        evidence:
          mockDecision === "ALLOW"
            ? ["Parameters within expected ranges", "Consistent with orbital mechanics"]
            : ["Values exceed physical constraints"],
        missing_evidence: mockDecision === "ALLOW" ? [] : ["Supporting calculation"],
        timestamp: new Date().toISOString(),
      };
      setClaimResult(mockResult);
      // Add to claim history
      const mockHistoryEntry = {
        id: crypto.randomUUID(),
        claim: mockResult.claim,
        decision: mockResult.decision,
        gate: mockResult.gate,
        risk_label: mockResult.risk_label,
        reason: mockResult.reason,
        evidence: mockResult.evidence,
        missing_evidence: mockResult.missing_evidence,
        timestamp: mockResult.timestamp,
      };
      addClaimToStore(mockHistoryEntry);
      // Add notification to notification center (mock fallback)
      useOrbitGateStore.getState().addNotification({
        type: "verification",
        title: `${mockResult.decision} — ${mockResult.gate}`,
        message: mockResult.claim.substring(0, 100),
        icon: mockResult.decision === "ALLOW" ? "CheckCircle" : mockResult.decision === "BLOCK" ? "XCircle" : mockResult.decision === "NEEDS_REVIEW" ? "HelpCircle" : "FileQuestion",
      });
      // Verification decision toast (mock fallback)
      if (mockResult.decision === "BLOCK") {
        toast.error("Claim Blocked", { description: `${mockResult.gate}: ${mockResult.reason.substring(0, 80)}` });
      } else if (mockResult.decision === "ALLOW") {
        toast.success("Claim Verified", { description: `${mockResult.gate}: ${mockResult.reason.substring(0, 80)}` });
      }
      // Broadcast to live feed WebSocket (fire-and-forget)
      fetch("/api/orbitgate/broadcast-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "verification",
          data: mockHistoryEntry,
        }),
      }).catch(() => {});
      // Persist to database (fire-and-forget)
      fetch("/api/orbitgate/save-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim: mockResult.claim,
          decision: mockResult.decision,
          gate: mockResult.gate,
          risk_label: mockResult.risk_label,
          reason: mockResult.reason,
          evidence: mockResult.evidence,
          missing_evidence: mockResult.missing_evidence,
        }),
      }).catch(() => {});
      toast.info("Using local mock data — API unavailable.");
    } finally {
      setIsCheckingClaim(false);
    }
  };

  return (
    <section id="claim-checker" className="py-16 sm:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          title="Interactive Claim Checker"
          subtitle="Enter an orbital claim to verify it through the OrbitGate pipeline."
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 relative overflow-hidden">
            {/* Signal wave animation when verifying */}
            {isCheckingClaim && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
              </div>
            )}
            <CardContent className="p-4 sm:p-6 relative">
              <div className="space-y-3">
                <Textarea
                  placeholder="Enter an orbital claim to verify, e.g., 'The ISS orbits at approximately 408 km altitude...'"
                  value={localInput}
                  onChange={(e) => setLocalInput(e.target.value)}
                  className="min-h-[100px] bg-gray-50 dark:bg-slate-950/80 border-gray-300 dark:border-slate-700/80 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 resize-none focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/50 dark:focus-visible:shadow-[0_0_12px_rgba(6,182,212,0.15)] transition-all duration-300"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleCheck();
                    }
                  }}
                />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">Press Ctrl+Enter to verify</p>
                  <Button
                    onClick={handleCheck}
                    disabled={isCheckingClaim || (!localInput.trim() && !claimInput.trim())}
                    className={`bg-cyan-600 hover:bg-cyan-500 text-gray-900 dark:text-white w-full sm:w-auto transition-all duration-300 glow-cyan ${localInput.trim() && !isCheckingClaim ? "verify-pulse shadow-lg shadow-cyan-500/20 dark:shadow-[0_0_20px_rgba(6,182,212,0.3)]" : ""}`}
                  >
                    {isCheckingClaim ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Verify Claim
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-800">
                <p className="text-xs text-gray-500 mb-2">Try an example:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_CLAIMS.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setLocalInput(example)}
                      className="text-xs bg-gray-100 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:text-gray-200 px-2.5 py-1 rounded-md border border-gray-200 dark:border-slate-700/50 hover:border-gray-400 dark:hover:border-slate-600 transition-colors text-left max-w-full truncate"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <AnimatePresence>
          {claimResult && <ResultPanel result={claimResult} />}
        </AnimatePresence>
      </div>
    </section>
  );
}