"use client";

import { useOrbitGateStore } from "@/lib/orbitgate-store";
import { GATES } from "@/lib/orbitgate-constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  CheckCircle,
  XCircle as XCircleIcon,
  AlertTriangle,
  Info,
  Shield,
  BookOpen,
  FlaskConical,
  GitBranch,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

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

interface GateDetailData {
  examples_allow: string[];
  examples_block: string[];
  checks: string[];
  constants: string[];
  boundary_rules: string[];
}

const GATE_DETAILS: Record<string, GateDetailData> = {
  TLEGate: {
    examples_allow: [
      "ISS (ZARYA) TLE with valid checksum and eccentricity 0.0006703",
      "GOES 16 TLE with near-zero inclination in GEO slot",
      "NOAA 19 TLE with 99.19\u00b0 sun-synchronous inclination",
    ],
    examples_block: [
      "TLE with eccentricity 1.5 (hyperbolic \u2014 not a bound orbit)",
      "TLE with inclination 200\u00b0 (outside [0\u00b0, 180\u00b0] range)",
      "TLE with negative mean motion (retrograde orbit)",
    ],
    checks: [
      "Line 1 checksum (Luhn algorithm mod-10)",
      "Line 2 checksum (Luhn algorithm mod-10)",
      "Eccentricity \u2208 [0, 1)",
      "Inclination \u2208 [0\u00b0, 180\u00b0]",
      "Mean motion > 0",
      "B* drag coefficient range",
      "Epoch year within valid range",
    ],
    constants: [
      "\u03bc = GM\u221a(a\u00b3/(1\u2212e\u00b2))",
      "n = (GM/a\u00b3)^0.5 \u00d7 86164 / (2\u03c0)",
      "T_epoch = day_of_year + fractional_day",
    ],
    boundary_rules: [
      "BLOCKS: Hyperbolic/parabolic orbits (e \u2265 1)",
      "BLOCKS: Physical impossibilities in TLE fields",
      "ALLOWS: Standard NORAD TLE format validation only",
    ],
  },
  SGP4Gate: {
    examples_allow: [
      "ISS propagated 24h via SGP4 \u2014 stable trajectory within LEO bounds",
      "GOES 16 propagated \u2014 stable GEO drift over 100 minutes",
    ],
    examples_block: [
      "LEO satellite with perigee below 80km \u2014 reentry imminent",
      "SGP4 divergence: propagated position NaN after 2 orbits",
    ],
    checks: [
      "Numerical convergence over 2+ orbits",
      "Altitude within physical bounds for declared regime",
      "Speed consistent with vis-viva equation at altitude",
      "No NaN or Inf in propagation chain",
    ],
    constants: [
      "T \u2248 2\u03c0\u221a(a\u00b3/\u03bc) \u00d7 (1/(2\u03c0))",
      "v_circular = \u221a(\u03bc/r) = \u221a(GM/r)",
      "a = p(1\u2212e\u00b2)/(1+e\u00b7cos\u03bd)",
    ],
    boundary_rules: [
      "BLOCKS: Positions that violate physical bounds",
      "BLOCKS: NaN/Inf propagation chains",
      "REVIEW: Results near regime boundaries",
    ],
  },
  DeltaVGate: {
    examples_allow: [
      "Hohmann transfer 400km\u2192800km LEO: \u0394v \u2248 0.33 km/s total",
      "Circularization burn at 400km LEO: \u0394v \u2248 0.07 km/s",
    ],
    examples_block: [
      "Direct LEO\u2192GEO insertion: \u0394v = 0.5 km/s (physically impossible)",
      "Moon transfer with no departure mass specified",
    ],
    checks: [
      "\u0394v \u2265 0 for prograde maneuvers",
      "Hohmann: \u0394v = \u221a(\u03bc\u2082/r\u2081) \u2212 \u221a(\u03bc\u2081/r\u2082) + (\u221a(\u03bc\u2081/r\u2082) \u2212 1)\u00b7\u221a(\u03bc\u2083/r\u2081)",
      "Mass ratio verification (0 < m_f/m_0 < 1)",
      "Isp and exhaust velocity realism",
      "Total \u0394v < escape velocity from current orbit",
    ],
    constants: [
      "\u0394v = v_e \u2212 v_a = Isp\u00b7g\u2080\u00b7ln(m\u2080/m_f)",
      "v_circular = \u221a(\u03bc/r)",
      "v_escape = \u221a(2\u03bc/r) = \u221a(2GM/r)",
      "Tsiolkovsky: \u0394v = Isp\u00b7g\u2080\u00b7ln(m\u2080/m_f)",
    ],
    boundary_rules: [
      "BLOCKS: \u0394v exceeding escape velocity",
      "EVIDENCE_REQ: Missing mass or Isp data",
      "REVIEW: \u0394v near physical feasibility boundary",
    ],
  },
  CollisionGate: {
    examples_allow: [
      "Objects at 500km separation \u2014 no conjunction risk",
      "Close approach analysis: 15km miss distance at TCA",
    ],
    examples_block: [
      "Objects at 2km separation \u2014 high collision probability",
      "Conjunction analysis with unknown covariance",
    ],
    checks: [
      "Minimum separation distance > threshold",
      "Relative velocity within expected range",
      "Time to closest approach > 0",
      "Orbit intersection geometry is physically valid",
    ],
    constants: [
      "d = |r\u2081 \u2212 r\u2082|",
      "P_c \u2248 f(d_miss, v_rel, R, \u03c3_x, \u03c3_y, \u03c3_z)",
      "R = R_sphere + h_alt + uncertainty_margin",
    ],
    boundary_rules: [
      "BLOCKS: Separation below minimum safe distance",
      "EVIDENCE_REQ: Missing covariance data",
      "REVIEW: Separation near threshold",
    ],
  },
  PowerGate: {
    examples_allow: [
      "3U CubeSat: 10W solar array, 35min eclipse, 8Wh battery \u2014 sufficient",
      "GEO satellite: 8kW array, 45min max eclipse \u2014 adequate power",
    ],
    examples_block: [
      "5W array powering 50W satellite through 60min eclipse",
      "Negative power generation during sunlit phase",
    ],
    checks: [
      "P_generated \u2265 P_required (including margin)",
      "Eclipse fraction < 1.0",
      "Battery capacity \u2265 P_eclipse \u00d7 t_eclipse",
      "Solar array degradation factor applied",
      "Panel area sufficient for power output",
    ],
    constants: [
      "P = I \u00d7 A \u00d7 cos(\u03b8_sun) \u00d7 \u03b7",
      "t_eclipse \u2248 (T_orbit/2\u03c0) \u00d7 (arcsin(R_E/r_orbit + z_zenith/cos(i))",
      "E_battery \u2265 P_eclipse \u00d7 t_eclipse",
    ],
    boundary_rules: [
      "BLOCKS: Power deficit > 50%",
      "EVIDENCE_REQ: Missing battery capacity data",
      "REVIEW: Power margin < 20%",
    ],
  },
  ThermalGate: {
    examples_allow: [
      "SSO thermal range: -150\u00b0C to +120\u00b0C within component limits",
      "GEO steady-state thermal: 15\u00b0C to 45\u00b0C",
    ],
    examples_block: [
      "Thermal analysis with no heater power specified",
      "Temperature exceeding component absolute maximum (-270\u00b0C to +250\u00b0C)",
    ],
    checks: [
      "Temperature within component operating range",
      "Heater power sufficient for cold-side maintenance",
      "Thermal equilibrium time < orbit period",
      "Radiation area sufficient for heat rejection",
    ],
    constants: [
      "Q_rad = \u03b5\u00b7\u03c3\u00b7A\u00b7(T\u2074\u2212T_s\u2074)\u2074",
      "Q_sun = S\u00b7A\u00b7cos(\u03b8_sun)\u00b7(1361 W/m\u00b2)",
      "Q_eq = Q_absorbed + Q_generated",
    ],
    boundary_rules: [
      "BLOCKS: Temperature exceeding absolute limits",
      "EVIDENCE_REQ: Missing thermal properties",
      "REVIEW: Near component limit",
    ],
  },
  CommsGate: {
    examples_allow: [
      "S-band link: 10W TX, 3dBi antenna, 600km \u2014 12dB margin",
      "X-band link: 5W TX, 40dBi antenna, 800km \u2014 8dB margin",
    ],
    examples_block: [
      "Link budget with -20dB margin \u2014 insufficient signal",
      "Communication during eclipse without battery relay",
    ],
    checks: [
      "FSPL = 20log\u2081\u2080(4\u03c0df/c) + 20log\u2081\u2080(f)",
      "E_b = P_tx + G_tx + G_rx \u2212 FSPL \u2212 L_misc \u2265 0",
      "Data rate within available bandwidth",
      "Antenna gain pattern within specification",
    ],
    constants: [
      "FSPL = (4\u03c0df/c)\u00b2",
      "E_b = P_tx(dB) + G_tx(dBi) + G_rx(dBi) \u2212 FSPL(dB) \u2212 L_misc(dB)",
      "C/N = (S/N)received > (S/N)required",
      "BER = errors / total_bits_transmitted",
    ],
    boundary_rules: [
      "BLOCKS: Negative link margin",
      "EVIDENCE_REQ: Missing antenna specs",
      "REVIEW: Link margin < 3dB",
    ],
  },
  DeorbitGate: {
    examples_allow: [
      "LEO satellite at 400km with ballistic coefficient 100 kg/m\u00b2: natural decay <25 years",
      "Satellite with planned deorbit burn: \u0394v \u2248 50 m/s retrograde",
    ],
    examples_block: [
      "GEO satellite with no deorbit plan \u2014 non-compliant",
      "Deorbit strategy with insufficient \u0394v for 25-year target",
    ],
    checks: [
      "25-year post-mission disposal compliance",
      "Natural decay time < 25 years (LEO)",
      "Controlled reentry casualty risk < 1/10,000",
      "Deorbit \u0394v sufficient to lower perigee",
    ],
    constants: [
      "t_decay \u2248 -B\u00b7\u03c1\u2080\u00b7A\u00b7H_p\u00b7e^(-\u03b2\u00b7(h\u2212h\u2080))",
      "\u03b2 \u2248 1/2\u00b7\u03c1\u2080\u00b7H_p (scale height parameter ~50-60km)",
      "\u0394v_retrograde \u2248 v_circular \u2212 \u221a(v_circular\u00b2 \u2212 2GM/r_p) + \u221a(v_circular + \u0394v_retrograde)\u00b2 \u2212 2GM/r_p",
    ],
    boundary_rules: [
      "BLOCKS: No deorbit plan for GEO satellites",
      "EVIDENCE_REQ: Missing ballistic coefficient",
      "REVIEW: Decay time near 25-year boundary",
    ],
  },
  CommandGate: {
    examples_allow: [
      "Analysis of thruster firing sequence (read-only verification)",
      "Review of proposed orbit adjustment plan",
    ],
    examples_block: [
      "Fire thruster A for 10 seconds to raise orbit by 50 km",
      "Rotate solar panels 30\u00b0 sunward",
      "Send deorbit command to satellite",
    ],
    checks: [
      "No command directives in verified claim",
      "No real-time control instructions",
      "Read-only verification scope maintained",
    ],
    constants: [],
    boundary_rules: [
      "BLOCKS: Any command to real spacecraft",
      "BLOCKS: Any autonomous operational decision",
      "ALLOWS: Read-only analysis of proposed commands",
    ],
  },
};

// Decision type badges mapped to each gate
const GATE_DECISION_TYPES: Record<string, string[]> = {
  TLEGate: ["ALLOW", "BLOCK"],
  SGP4Gate: ["ALLOW", "BLOCK", "REVIEW"],
  DeltaVGate: ["ALLOW", "BLOCK", "EVIDENCE_REQ"],
  CollisionGate: ["ALLOW", "BLOCK", "EVIDENCE_REQ", "REVIEW"],
  PowerGate: ["ALLOW", "BLOCK", "EVIDENCE_REQ", "REVIEW"],
  ThermalGate: ["ALLOW", "BLOCK", "EVIDENCE_REQ", "REVIEW"],
  CommsGate: ["ALLOW", "BLOCK", "EVIDENCE_REQ", "REVIEW"],
  DeorbitGate: ["ALLOW", "BLOCK", "EVIDENCE_REQ", "REVIEW"],
  CommandGate: ["ALLOW", "BLOCK"],
};

function getDecisionBadgeVariant(decision: string) {
  switch (decision) {
    case "ALLOW":
      return (
        <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/25">
          ALLOW
        </Badge>
      );
    case "BLOCK":
      return (
        <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25">
          BLOCK
        </Badge>
      );
    case "REVIEW":
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25">
          REVIEW
        </Badge>
      );
    case "EVIDENCE_REQ":
      return (
        <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/30 hover:bg-sky-500/25">
          EVIDENCE REQ
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-gray-400 border-gray-600">
          {decision}
        </Badge>
      );
  }
}

function getBoundaryRuleIcon(rule: string) {
  if (rule.startsWith("BLOCKS:"))
    return <XCircleIcon className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />;
  if (rule.startsWith("ALLOWS:"))
    return <CheckCircle className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />;
  if (rule.startsWith("REVIEW:"))
    return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />;
  if (rule.startsWith("EVIDENCE_REQ:"))
    return <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />;
  return <Shield className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />;
}

function getBoundaryRuleColor(rule: string) {
  if (rule.startsWith("BLOCKS:"))
    return "text-rose-700 dark:text-rose-300 border-l-rose-500/50 bg-rose-500/5";
  if (rule.startsWith("ALLOWS:"))
    return "text-cyan-700 dark:text-cyan-300 border-l-cyan-500/50 bg-cyan-500/5";
  if (rule.startsWith("REVIEW:"))
    return "text-amber-700 dark:text-amber-300 border-l-amber-500/50 bg-amber-500/5";
  if (rule.startsWith("EVIDENCE_REQ:"))
    return "text-sky-700 dark:text-sky-300 border-l-sky-500/50 bg-sky-500/5";
  return "text-gray-700 dark:text-gray-300 border-l-gray-500/50 bg-gray-500/5";
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.02, staggerDirection: -1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

export function GateDetailDialog() {
  const selectedGateForDetail = useOrbitGateStore((s) => s.selectedGateForDetail);
  const setSelectedGateForDetail = useOrbitGateStore(
    (s) => s.setSelectedGateForDetail
  );

  const gateInfo = useMemo(
    () => GATES.find((g) => g.id === selectedGateForDetail),
    [selectedGateForDetail]
  );
  const gateDetail = useMemo(
    () =>
      selectedGateForDetail ? GATE_DETAILS[selectedGateForDetail] : null,
    [selectedGateForDetail]
  );

  const isOpen = selectedGateForDetail !== null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) setSelectedGateForDetail(null);
      }}
    >
      <AnimatePresence>
        {isOpen && gateInfo && gateDetail && (
          <DialogContent className="bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-gray-100 max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col h-full overflow-hidden"
            >
              {/* Header */}
              <motion.div variants={itemVariants}>
                <DialogHeader className="p-6 pb-4 border-b border-gray-200 dark:border-slate-800/60">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                      {(() => {
                        const Icon =
                          iconMap[gateInfo.icon] || Satellite;
                        return <Icon className="h-6 w-6" />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <DialogTitle className="text-gray-900 dark:text-white text-xl font-bold">
                          {gateInfo.name}
                        </DialogTitle>
                        <code className="text-[11px] text-gray-500 bg-gray-100 dark:bg-slate-800/80 px-2 py-0.5 rounded font-mono">
                          {gateInfo.id}
                        </code>
                      </div>
                      <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed text-sm">
                        {gateInfo.description}
                      </DialogDescription>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(GATE_DECISION_TYPES[gateInfo.id] || []).map((d) => (
                          <span key={d}>{getDecisionBadgeVariant(d)}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogHeader>
              </motion.div>

              {/* Tabs */}
              <motion.div
                variants={itemVariants}
                className="flex-1 overflow-hidden"
              >
                <Tabs
                  defaultValue="checks"
                  className="flex flex-col h-full"
                >
                  <div className="px-6 pt-4 pb-2 border-b border-gray-200 dark:border-slate-800/40">
                    <TabsList className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800/60">
                      <TabsTrigger
                        value="checks"
                        className="data-[state=active]:bg-gray-100 dark:bg-slate-800 data-[state=active]:text-cyan-400 text-gray-400 gap-1.5"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        Checks
                      </TabsTrigger>
                      <TabsTrigger
                        value="examples"
                        className="data-[state=active]:bg-gray-100 dark:bg-slate-800 data-[state=active]:text-cyan-400 text-gray-400 gap-1.5"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Examples
                      </TabsTrigger>
                      <TabsTrigger
                        value="physics"
                        className="data-[state=active]:bg-gray-100 dark:bg-slate-800 data-[state=active]:text-cyan-400 text-gray-400 gap-1.5"
                      >
                        <FlaskConical className="h-3.5 w-3.5" />
                        Physics
                      </TabsTrigger>
                      <TabsTrigger
                        value="boundaries"
                        className="data-[state=active]:bg-gray-100 dark:bg-slate-800 data-[state=active]:text-cyan-400 text-gray-400 gap-1.5"
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                        Boundaries
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Checks Tab */}
                    <TabsContent value="checks" className="p-6 pt-4">
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-cyan-400" />
                          Validation Checks
                        </h4>
                        <div className="space-y-2">
                          {gateDetail.checks.map((check, i) => (
                            <motion.div
                              key={i}
                              variants={itemVariants}
                              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800/50"
                            >
                              <CheckCircle className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                              <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {check}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                        {gateDetail.checks.length === 0 && (
                          <p className="text-sm text-gray-500 italic">
                            No validation checks defined.
                          </p>
                        )}
                      </motion.div>
                    </TabsContent>

                    {/* Examples Tab */}
                    <TabsContent value="examples" className="p-6 pt-4">
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        {/* ALLOW Examples */}
                        <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          ALLOWED Claims
                        </h4>
                        <div className="space-y-2 mb-6">
                          {gateDetail.examples_allow.map((example, i) => (
                            <motion.div
                              key={i}
                              variants={itemVariants}
                              className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/15 border-l-2 border-l-cyan-500/60"
                            >
                              <span className="text-sm text-cyan-800 dark:text-cyan-200/90 leading-relaxed">
                                {example}
                              </span>
                            </motion.div>
                          ))}
                        </div>

                        {/* BLOCK Examples */}
                        <h4 className="text-sm font-semibold text-rose-400 mb-3 flex items-center gap-2">
                          <XCircleIcon className="h-4 w-4" />
                          BLOCKED Claims
                        </h4>
                        <div className="space-y-2">
                          {gateDetail.examples_block.map((example, i) => (
                            <motion.div
                              key={i}
                              variants={itemVariants}
                              className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/15 border-l-2 border-l-rose-500/60"
                            >
                              <span className="text-sm text-rose-800 dark:text-rose-200/90 leading-relaxed">
                                {example}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    </TabsContent>

                    {/* Physics Tab */}
                    <TabsContent value="physics" className="p-6 pt-4">
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-cyan-400" />
                          Constants &amp; Formulas
                        </h4>
                        {gateDetail.constants.length > 0 ? (
                          <div className="space-y-2">
                            {gateDetail.constants.map((constant, i) => (
                              <motion.div
                                key={i}
                                variants={itemVariants}
                                className="p-3 rounded-lg bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800/50 font-mono text-sm"
                              >
                                <code className="text-cyan-700 dark:text-cyan-300/80 break-all leading-relaxed">
                                  {constant}
                                </code>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800/40">
                            <p className="text-sm text-gray-500 italic text-center">
                              This gate does not use physics constants directly.
                            </p>
                          </div>
                        )}

                        {gateDetail.constants.length > 0 && (
                          <>
                            <Separator className="my-5 bg-gray-100/80 dark:bg-slate-800/50" />
                            <div className="p-4 rounded-lg bg-sky-500/5 border border-sky-500/15">
                              <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-sky-600 dark:text-sky-300/70 leading-relaxed">
                                  These formulas are used internally by the gate to
                                  verify claim physics. Values are computed
                                  deterministically from known orbital mechanics
                                  constants.
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                    </TabsContent>

                    {/* Boundaries Tab */}
                    <TabsContent value="boundaries" className="p-6 pt-4">
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-cyan-400" />
                          Boundary Rules
                        </h4>
                        <div className="space-y-2">
                          {gateDetail.boundary_rules.map((rule, i) => {
                            const colorClass = getBoundaryRuleColor(rule);
                            return (
                              <motion.div
                                key={i}
                                variants={itemVariants}
                                className={`flex items-start gap-3 p-3 rounded-lg border border-l-2 ${colorClass}`}
                              >
                                {getBoundaryRuleIcon(rule)}
                                <span className="text-sm leading-relaxed">
                                  {rule}
                                </span>
                              </motion.div>
                            );
                          })}
                        </div>

                        <Separator className="my-5 bg-gray-100/80 dark:bg-slate-800/50" />

                        {/* Legend */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            {
                              icon: <CheckCircle className="h-3.5 w-3.5 text-cyan-400" />,
                              label: "ALLOWS",
                              desc: "Passes through",
                              color: "text-cyan-400",
                            },
                            {
                              icon: <XCircleIcon className="h-3.5 w-3.5 text-rose-400" />,
                              label: "BLOCKS",
                              desc: "Rejected outright",
                              color: "text-rose-400",
                            },
                            {
                              icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
                              label: "REVIEW",
                              desc: "Needs human review",
                              color: "text-amber-400",
                            },
                            {
                              icon: <Info className="h-3.5 w-3.5 text-sky-400" />,
                              label: "EVIDENCE_REQ",
                              desc: "Needs more data",
                              color: "text-sky-400",
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800/40"
                            >
                              {item.icon}
                              <span className={`text-xs font-medium ${item.color}`}>
                                {item.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                \u2014 {item.desc}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </TabsContent>
                  </div>
                </Tabs>
              </motion.div>

              {/* Footer */}
              <motion.div variants={itemVariants}>
                <DialogFooter className="p-4 pt-3 border-t border-gray-200 dark:border-slate-800/60">
                  <div className="flex items-center justify-between w-full">
                    <p className="text-[11px] text-gray-600">
                      OrbitGate v0 \u2014 Research Prototype
                    </p>
                    <button
                      onClick={() => setSelectedGateForDetail(null)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950"
                    >
                      <X className="h-3.5 w-3.5" />
                      Close
                    </button>
                  </div>
                </DialogFooter>
              </motion.div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}