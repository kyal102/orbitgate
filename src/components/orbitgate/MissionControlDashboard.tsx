"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Radio,
  Navigation,
  Flame,
  Plane,
  Activity,
  Clock,
  Signal,
  Wifi,
  WifiOff,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

// ─── Types ─────────────────────────────────────────────────────────────
type MissionPhase =
  | "PRE_LAUNCH"
  | "ASCENT"
  | "ORBIT_INSERTION"
  | "COAST"
  | "DEPLOY"
  | "COMMISSIONING";

type SimStatus = "idle" | "running" | "paused" | "complete";

interface FlightData {
  altitude: number;
  velocity: number;
  acceleration: number;
  downrange: number;
}

interface PropulsionData {
  fuelPercent: number;
  thrust: number;
  isp: number;
  burnStatus: "IDLE" | "MAIN ENGINE" | "OMS BURN";
}

interface GNCData {
  pitch: number;
  yaw: number;
  roll: number;
  pitchRate: number;
  yawRate: number;
  rollRate: number;
  navAge: number;
  guidanceMode: string;
}

interface CommsData {
  signalStrength: number;
  dataRate: number;
  bitErrorRate: number;
  antennaAngle: number;
  signalLost: boolean;
}

interface EventEntry {
  timestamp: string;
  tag: "FLT" | "PROP" | "GNC" | "COMMS";
  message: string;
}

interface SimState {
  missionTime: number; // seconds, negative = countdown, positive = elapsed
  phase: MissionPhase;
  flight: FlightData;
  propulsion: PropulsionData;
  gnc: GNCData;
  comms: CommsData;
  events: EventEntry[];
  alerts: string[];
}

// ─── Constants ─────────────────────────────────────────────────────────
const COUNTDOWN_START = -(14 * 60 + 32); // T-14:32 in seconds
const MISSION_END = 30 * 60; // T+30:00 in seconds
const TIME_STEP = 10; // 10 mission-seconds per real second

const PHASE_LABELS: Record<MissionPhase, string> = {
  PRE_LAUNCH: "Pre-Launch",
  ASCENT: "Ascent",
  ORBIT_INSERTION: "Orbit Insertion",
  COAST: "Coast",
  DEPLOY: "Deploy",
  COMMISSIONING: "Commissioning",
};

const PHASE_ORDER: MissionPhase[] = [
  "PRE_LAUNCH",
  "ASCENT",
  "ORBIT_INSERTION",
  "COAST",
  "DEPLOY",
  "COMMISSIONING",
];

const TAG_COLORS: Record<string, string> = {
  FLT: "text-cyan-400",
  PROP: "text-amber-400",
  GNC: "text-cyan-400",
  COMMS: "text-purple-400",
};

const TAG_BG: Record<string, string> = {
  FLT: "bg-cyan-500/15 border-cyan-500/30",
  PROP: "bg-amber-500/15 border-amber-500/30",
  GNC: "bg-cyan-500/15 border-cyan-500/30",
  COMMS: "bg-purple-500/15 border-purple-500/30",
};

// ─── Helpers ───────────────────────────────────────────────────────────
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function jitter(base: number, range: number) {
  return base + (Math.random() - 0.5) * range;
}

function formatMissionTime(seconds: number): string {
  const isNeg = seconds < 0;
  const abs = Math.abs(Math.floor(seconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const sign = isNeg ? "-" : "+";
  return `T${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getPhase(t: number): MissionPhase {
  if (t < 0) return "PRE_LAUNCH";
  if (t < 150) return "ASCENT";
  if (t < 300) return "ORBIT_INSERTION";
  if (t < 900) return "COAST";
  if (t < 1500) return "DEPLOY";
  return "COMMISSIONING";
}

function computeFlight(t: number): FlightData {
  if (t < 0) {
    return { altitude: 0, velocity: 0, acceleration: 0, downrange: 0 };
  }
  const progress = clamp(t / 300, 0, 1);
  // Sigmoidal altitude: 0 → ~400km
  const altitude = 400 / (1 + Math.exp(-0.02 * (t - 120)));
  // Velocity: 0 → ~7660 m/s, steep during ascent, levels off
  const velocity = 7660 * (1 - Math.exp(-t / 80));
  // Acceleration: peaks around T+60s then drops
  const accel = t < 300 ? 25 * Math.exp(-((t - 60) ** 2) / 4000) : 0;
  // Downrange: integral approximation
  const downrange = Math.min(2000, velocity * t * 0.001 * 0.3);
  return {
    altitude: Number(altitude.toFixed(1)),
    velocity: Number(velocity.toFixed(1)),
    acceleration: Number(accel.toFixed(2)),
    downrange: Number(downrange.toFixed(1)),
  };
}

function computePropulsion(t: number, prevFuel?: number): PropulsionData {
  if (t < 0) {
    return { fuelPercent: 100, thrust: 0, isp: 311, burnStatus: "IDLE" };
  }
  let fuel = prevFuel ?? 100;
  let thrust = 0;
  let status: PropulsionData["burnStatus"] = "IDLE";

  if (t < 150) {
    // Main engine burn during ascent
    thrust = 7600000; // ~7.6 MN
    status = "MAIN ENGINE";
    fuel = clamp(fuel - 0.25, 0, 100);
  } else if (t >= 150 && t < 300) {
    // OMS burn for orbit insertion
    thrust = 27000; // ~27 kN
    status = "OMS BURN";
    fuel = clamp(fuel - 0.08, 0, 100);
  }

  return {
    fuelPercent: Number(fuel.toFixed(1)),
    thrust: Number(thrust.toFixed(0)),
    isp: 311 + Number(jitter(0, 2).toFixed(1)),
    burnStatus: status,
  };
}

function computeGNC(t: number): GNCData {
  const phase = getPhase(t);
  let guidanceMode = "PAD";
  let pitch = 90; // vertical
  let yaw = 0;
  let roll = 0;
  let navAge = 0;

  if (phase === "ASCENT") {
    guidanceMode = "OPEN LOOP";
    const prog = clamp(t / 150, 0, 1);
    pitch = 90 - prog * 70; // pitch over from 90° to ~20°
    yaw = Number(jitter(0.5, 1.5).toFixed(2));
    roll = Number(jitter(0, 1).toFixed(2));
    navAge = Number(jitter(0.05, 0.08).toFixed(3));
  } else if (phase === "ORBIT_INSERTION") {
    guidanceMode = "CLOSED LOOP";
    pitch = Number(jitter(20, 2).toFixed(2));
    yaw = Number(jitter(0, 3).toFixed(2));
    roll = Number(jitter(0, 1).toFixed(2));
    navAge = Number(jitter(0.02, 0.03).toFixed(3));
  } else if (phase === "COAST" || phase === "DEPLOY") {
    guidanceMode = "COAST / ATT HOLD";
    pitch = Number(jitter(0, 0.5).toFixed(2));
    yaw = Number(jitter(0, 0.5).toFixed(2));
    roll = Number(jitter(0, 0.5).toFixed(2));
    navAge = Number(jitter(1, 2).toFixed(1));
  } else if (phase === "COMMISSIONING") {
    guidanceMode = "NOMINAL OPS";
    pitch = Number(jitter(0, 0.3).toFixed(2));
    yaw = Number(jitter(0, 0.3).toFixed(2));
    roll = Number(jitter(0, 0.3).toFixed(2));
    navAge = Number(jitter(0.1, 0.2).toFixed(2));
  }

  return {
    pitch,
    yaw,
    roll,
    pitchRate: Number(jitter(0, 0.05).toFixed(3)),
    yawRate: Number(jitter(0, 0.03).toFixed(3)),
    rollRate: Number(jitter(0, 0.04).toFixed(3)),
    navAge,
    guidanceMode,
  };
}

function computeComms(t: number): CommsData {
  if (t < 0) {
    return {
      signalStrength: -68,
      dataRate: 9600,
      bitErrorRate: 1e-6,
      antennaAngle: 90,
      signalLost: false,
    };
  }
  // Signal gets weaker as vehicle gets higher, then stabilizes
  const altFactor = t < 150 ? 1 - (t / 150) * 0.4 : 0.6 + Math.random() * 0.3;
  const signalStrength = -68 - (1 - altFactor) * 40 + Number(jitter(0, 3).toFixed(0));
  const dataRate = t < 150 ? 64000 * altFactor : 256000 * altFactor;
  const ber = Number((1e-6 * (1 + (1 - altFactor) * 10)).toExponential(1));
  const antennaAngle = t < 150 ? 90 - (t / 150) * 60 : 30 + Number(jitter(0, 5).toFixed(1));
  // Random signal loss events during ascent
  const signalLost = t > 30 && t < 150 && Math.random() < 0.03;

  return {
    signalStrength: Number(signalStrength.toFixed(0)),
    dataRate: Number(Math.max(0, dataRate).toFixed(0)),
    bitErrorRate: ber,
    antennaAngle: Number(clamp(antennaAngle, 0, 180).toFixed(1)),
    signalLost,
  };
}

// ─── Sub-components ────────────────────────────────────────────────────
function ConsolePanel({
  title,
  icon,
  accentColor,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex flex-col">
      {/* Console header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
        <span className={accentColor}>{icon}</span>
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">
          {title}
        </span>
        <div className="ml-auto flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/40" />
        </div>
      </div>
      {/* Console body */}
      <div className="flex-1 space-y-2 text-xs">{children}</div>
    </div>
  );
}

function DataRow({
  label,
  value,
  unit,
  color,
  mono = true,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-gray-500 text-[10px] uppercase tracking-wider shrink-0">
        {label}
      </span>
      <span className="flex items-baseline gap-1 ml-auto">
        <span
          className={`${
            mono ? "font-mono" : ""
          } text-sm font-semibold text-gray-900 dark:text-white ${
            color ?? ""
          }`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[9px] text-gray-500">{unit}</span>
        )}
      </span>
    </div>
  );
}

function StatusDot({
  status,
  color,
  label,
}: {
  status: string;
  color: string;
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${color} ${
          status === "active" || status === "MAIN ENGINE" || status === "OMS BURN"
            ? "animate-pulse"
            : ""
        }`}
      />
      {label && (
        <span className="text-[10px] font-mono font-bold text-gray-300">
          {label}
        </span>
      )}
    </span>
  );
}

// ─── Initial State ─────────────────────────────────────────────────────
function createInitialState(): SimState {
  return {
    missionTime: COUNTDOWN_START,
    phase: "PRE_LAUNCH",
    flight: { altitude: 0, velocity: 0, acceleration: 0, downrange: 0 },
    propulsion: { fuelPercent: 100, thrust: 0, isp: 311, burnStatus: "IDLE" },
    gnc: {
      pitch: 90,
      yaw: 0,
      roll: 0,
      pitchRate: 0,
      yawRate: 0,
      rollRate: 0,
      navAge: 0,
      guidanceMode: "PAD",
    },
    comms: {
      signalStrength: -68,
      dataRate: 9600,
      bitErrorRate: 1e-6,
      antennaAngle: 90,
      signalLost: false,
    },
    events: [
      {
        timestamp: formatMissionTime(COUNTDOWN_START),
        tag: "FLT",
        message: "Mission clock initialized. Countdown hold release pending.",
      },
    ],
    alerts: [],
  };
}

// ─── Main Component ────────────────────────────────────────────────────
export function MissionControlDashboard() {
  const [state, setState] = useState<SimState>(createInitialState);
  const [simStatus, setSimStatus] = useState<SimStatus>("idle");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventLogRef = useRef<HTMLDivElement>(null);
  const prevPhaseRef = useRef<MissionPhase>("PRE_LAUNCH");

  // Compute alerts from state
  const computeAlerts = useCallback((s: SimState): string[] => {
    const alerts: string[] = [];
    if (s.propulsion.fuelPercent < 30 && s.missionTime > 0) {
      alerts.push("CAUTION: FUEL LOW");
    }
    if (s.comms.signalLost) {
      alerts.push("WARNING: COMM LOSS");
    }
    return alerts;
  }, []);

  // Simulation tick
  const tick = useCallback(() => {
    setState((prev) => {
      const newTime = prev.missionTime + TIME_STEP;
      if (newTime > MISSION_END) {
        setSimStatus("complete");
        return prev;
      }

      const phase = getPhase(newTime);
      const flight = computeFlight(newTime);
      const propulsion = computePropulsion(newTime, prev.propulsion.fuelPercent);
      const gnc = computeGNC(newTime);
      const comms = computeComms(newTime);

      // Generate events on phase transitions and milestones
      const newEvents = [...prev.events];
      if (phase !== prevPhaseRef.current) {
        prevPhaseRef.current = phase;
        const tagMap: Record<MissionPhase, EventEntry["tag"]> = {
          PRE_LAUNCH: "FLT",
          ASCENT: "FLT",
          ORBIT_INSERTION: "PROP",
          COAST: "GNC",
          DEPLOY: "FLT",
          COMMISSIONING: "GNC",
        };
        newEvents.push({
          timestamp: formatMissionTime(newTime),
          tag: tagMap[phase],
          message: `Phase transition: ${PHASE_LABELS[phase]}`,
        });
      }

      // LIFTOFF event
      if (prev.missionTime < 0 && newTime >= 0) {
        newEvents.push({
          timestamp: "T+00:00:00",
          tag: "FLT",
          message: "★ LIFTOFF — All engines nominal. Tower cleared.",
        });
      }

      // MECO at T+2:30
      if (prev.missionTime < 150 && newTime >= 150) {
        newEvents.push({
          timestamp: formatMissionTime(150),
          tag: "FLT",
          message: "MECO — Main Engine Cutoff confirmed. Altitude: 120.4 km",
        });
        newEvents.push({
          timestamp: formatMissionTime(150),
          tag: "PROP",
          message: "MECO: Main engines shutdown. OMS prep in progress.",
        });
      }

      // SECO at T+5:00
      if (prev.missionTime < 300 && newTime >= 300) {
        newEvents.push({
          timestamp: formatMissionTime(300),
          tag: "FLT",
          message: "SECO — Second Engine Cutoff confirmed. Orbit achieved.",
        });
        newEvents.push({
          timestamp: formatMissionTime(300),
          tag: "PROP",
          message: "SECO: OMS shutdown. Orbital parameters nominal.",
        });
        newEvents.push({
          timestamp: formatMissionTime(300),
          tag: "GNC",
          message: "Navigation solution: 408×406 km, 51.6° inclination",
        });
      }

      // Solar array deploy
      if (prev.missionTime < 910 && newTime >= 910) {
        newEvents.push({
          timestamp: formatMissionTime(910),
          tag: "GNC",
          message: "Solar array deployment initiated",
        });
      }

      // Satellite deploy
      if (prev.missionTime < 1510 && newTime >= 1510) {
        newEvents.push({
          timestamp: formatMissionTime(1510),
          tag: "FLT",
          message: "Satellite separation confirmed. Deploy sequence complete.",
        });
        newEvents.push({
          timestamp: formatMissionTime(1510),
          tag: "COMMS",
          message: "Telemetry link established with deployed payload.",
        });
      }

      // Random nominal events
      if (newTime > 0 && Math.random() < 0.08) {
        const nominalEvents: EventEntry[] = [
          { timestamp: formatMissionTime(newTime), tag: "FLT", message: "Trajectory within nominal corridor" },
          { timestamp: formatMissionTime(newTime), tag: "GNC", message: "INS alignment verified" },
          { timestamp: formatMissionTime(newTime), tag: "COMMS", message: "Uplink command acknowledged" },
          { timestamp: formatMissionTime(newTime), tag: "PROP", message: "Tank pressures nominal" },
          { timestamp: formatMissionTime(newTime), tag: "FLT", message: "Structural loads within limits" },
          { timestamp: formatMissionTime(newTime), tag: "GNC", message: "Rate gyros calibrated" },
          { timestamp: formatMissionTime(newTime), tag: "COMMS", message: "Ranging data valid" },
          { timestamp: formatMissionTime(newTime), tag: "PROP", message: "Propellant temp stable" },
        ];
        newEvents.push(
          nominalEvents[Math.floor(Math.random() * nominalEvents.length)]
        );
      }

      // Comm loss / restore events
      if (comms.signalLost && !prev.comms.signalLost) {
        newEvents.push({
          timestamp: formatMissionTime(newTime),
          tag: "COMMS",
          message: "⚠ Signal degraded — switching to backup antenna",
        });
      }
      if (!comms.signalLost && prev.comms.signalLost) {
        newEvents.push({
          timestamp: formatMissionTime(newTime),
          tag: "COMMS",
          message: "✓ Signal restored — primary antenna locked",
        });
      }

      // Keep only last 100 events
      const trimmedEvents = newEvents.length > 100 ? newEvents.slice(-100) : newEvents;

      const newState: SimState = {
        missionTime: newTime,
        phase,
        flight,
        propulsion,
        gnc,
        comms,
        events: trimmedEvents,
        alerts: [],
      };
      newState.alerts = computeAlerts(newState);
      return newState;
    });
  }, [computeAlerts]);

  // Start simulation
  const handleStart = useCallback(() => {
    if (simStatus === "complete") return;
    setSimStatus("running");
  }, [simStatus]);

  // Pause simulation
  const handlePause = useCallback(() => {
    setSimStatus("paused");
  }, []);

  // Reset simulation
  const handleReset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    prevPhaseRef.current = "PRE_LAUNCH";
    setState(createInitialState());
    setSimStatus("idle");
  }, []);

  // Simulation loop
  useEffect(() => {
    if (simStatus === "running") {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [simStatus, tick]);

  // Auto-scroll event log
  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [state.events.length]);

  // Mission time display
  const missionTimeStr = useMemo(
    () => formatMissionTime(state.missionTime),
    [state.missionTime]
  );

  const isCountdown = state.missionTime < 0;
  const isLiftoff = state.missionTime >= 0 && state.missionTime < 3;
  const isMECO =
    state.missionTime >= 147 && state.missionTime < 153;
  const isSECO =
    state.missionTime >= 297 && state.missionTime < 303;

  // Phase progress (percentage through current phase)
  const phaseProgress = useMemo(() => {
    const boundaries = [0, 150, 300, 900, 1500, 1800];
    const idx = PHASE_ORDER.indexOf(state.phase);
    if (state.missionTime < 0) {
      const total = Math.abs(COUNTDOWN_START);
      return clamp((state.missionTime - COUNTDOWN_START) / total, 0, 1);
    }
    const start = boundaries[idx] ?? 0;
    const end = boundaries[idx + 1] ?? MISSION_END;
    return clamp((state.missionTime - start) / (end - start), 0, 1);
  }, [state.missionTime, state.phase]);

  const totalProgress = useMemo(() => {
    const total = MISSION_END - COUNTDOWN_START;
    return clamp((state.missionTime - COUNTDOWN_START) / total, 0, 1);
  }, [state.missionTime]);

  // Burn status color
  const burnColor =
    state.propulsion.burnStatus === "IDLE"
      ? "bg-gray-500"
      : state.propulsion.burnStatus === "MAIN ENGINE"
        ? "bg-amber-400"
        : "bg-cyan-400";

  const burnStatusColor =
    state.propulsion.burnStatus === "IDLE"
      ? "text-gray-400"
      : state.propulsion.burnStatus === "MAIN ENGINE"
        ? "text-amber-400"
        : "text-cyan-400";

  // Signal status color
  const signalColor = state.comms.signalLost
    ? "text-rose-400"
    : state.comms.signalStrength > -80
      ? "text-cyan-400"
      : "text-amber-400";

  // Nav solution age color
  const navAgeColor =
    state.gnc.navAge > 5
      ? "text-amber-400"
      : state.gnc.navAge > 10
        ? "text-rose-400"
        : "text-cyan-400";

  // Fuel bar color
  const fuelBarColor =
    state.propulsion.fuelPercent > 50
      ? "bg-cyan-500"
      : state.propulsion.fuelPercent > 30
        ? "bg-amber-500"
        : "bg-rose-500";

  // Guidance mode color
  const guidanceColor =
    state.gnc.guidanceMode === "PAD"
      ? "text-gray-400"
      : state.gnc.guidanceMode === "OPEN LOOP"
        ? "text-amber-400"
        : "text-cyan-400";

  // Current phase index for progress bar
  const currentPhaseIdx = PHASE_ORDER.indexOf(state.phase);

  return (
    <section id="mission-control" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Mission Control Dashboard"
          subtitle="Real-time telemetry simulation — launch to orbit commissioning"
          icon={<Rocket className="h-5 w-5 text-cyan-400" />}
          sectionNumber="39"
        />

        {/* ── Mission Clock Header ── */}
        <div className="relative mb-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 overflow-hidden">
          {/* Subtle background pulse */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                simStatus === "running"
                  ? `radial-gradient(circle at 50% 50%, rgba(16,185,129,0.06) 0%, transparent 70%)`
                  : "none",
            }}
          />

          <div className="relative flex flex-col items-center gap-3">
            {/* Event markers */}
            <div className="flex gap-4 mb-1">
              <AnimatePresence>
                {isLiftoff && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold animate-pulse"
                  >
                    ★ LIFTOFF
                  </motion.span>
                )}
                {isMECO && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-xs font-bold animate-pulse"
                  >
                    MECO
                  </motion.span>
                )}
                {isSECO && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold animate-pulse"
                  >
                    SECO
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Mission time display */}
            <div className="flex items-center gap-3">
              <Clock
                className={`h-5 w-5 ${
                  simStatus === "running"
                    ? "text-cyan-400 animate-pulse"
                    : "text-gray-500"
                }`}
              />
              <span
                className={`font-mono text-3xl sm:text-4xl font-bold tracking-wider ${
                  isCountdown
                    ? "text-amber-400"
                    : "text-cyan-400"
                } ${
                  simStatus === "running" ? "animate-[pulse_1s_ease-in-out_infinite]" : ""
                }`}
                style={
                  simStatus === "running"
                    ? {
                        animation: "pulse 1s ease-in-out infinite",
                        textShadow:
                          "0 0 20px rgba(16,185,129,0.4)",
                      }
                    : undefined
                }
              >
                {missionTimeStr}
              </span>
            </div>

            {/* Phase label */}
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
              {PHASE_LABELS[state.phase]}
            </span>
          </div>
        </div>

        {/* ── Alert System ── */}
        <AnimatePresence>
          {state.alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mb-4"
            >
              {state.alerts.map((alert) => {
                const isWarning = alert.startsWith("WARNING");
                const isCaution = alert.startsWith("CAUTION");
                return (
                  <motion.span
                    key={alert}
                    animate={
                      isWarning
                        ? { scale: [1, 1.05, 1] }
                        : {}
                    }
                    transition={
                      isWarning
                        ? { duration: 1, repeat: Infinity }
                        : {}
                    }
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border ${
                      isWarning
                        ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                        : isCaution
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                          : "bg-white/5 border-white/10 text-gray-300"
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3 inline mr-1.5" />
                    {alert}
                  </motion.span>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Console Panels (2x2 grid) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* FLIGHT Console */}
          <ConsolePanel
            title="FLIGHT"
            icon={<Plane className="h-3.5 w-3.5 text-cyan-400" />}
            accentColor="text-cyan-400"
          >
            <DataRow
              label="Altitude"
              value={state.flight.altitude.toLocaleString()}
              unit="km"
              color="text-cyan-400"
            />
            <DataRow
              label="Velocity"
              value={state.flight.velocity.toLocaleString()}
              unit="m/s"
              color="text-cyan-400"
            />
            <DataRow
              label="Acceleration"
              value={state.flight.acceleration.toFixed(2)}
              unit="m/s²"
              color={
                state.flight.acceleration > 15
                  ? "text-amber-400"
                  : "text-gray-300"
              }
            />
            <DataRow
              label="Downrange"
              value={state.flight.downrange.toLocaleString()}
              unit="km"
              color="text-sky-400"
            />
          </ConsolePanel>

          {/* PROPULSION Console */}
          <ConsolePanel
            title="PROPULSION"
            icon={<Flame className="h-3.5 w-3.5 text-amber-400" />}
            accentColor="text-amber-400"
          >
            {/* Fuel bar */}
            <div className="mb-1">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-gray-500 text-[10px] uppercase tracking-wider">
                  Fuel
                </span>
                <span
                  className={`font-mono text-sm font-semibold ${
                    state.propulsion.fuelPercent > 50
                      ? "text-cyan-400"
                      : state.propulsion.fuelPercent > 30
                        ? "text-amber-400"
                        : "text-rose-400"
                  }`}
                >
                  {state.propulsion.fuelPercent.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${fuelBarColor}`}
                  initial={{ width: "100%" }}
                  animate={{
                    width: `${state.propulsion.fuelPercent}%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
            <DataRow
              label="Thrust"
              value={
                state.propulsion.thrust > 0
                  ? (state.propulsion.thrust / 1e6).toFixed(2)
                  : "0.00"
              }
              unit="MN"
              color={state.propulsion.thrust > 0 ? "text-amber-400" : "text-gray-500"}
            />
            <DataRow
              label="Isp"
              value={state.propulsion.isp.toFixed(1)}
              unit="s"
            />
            <div className="flex items-baseline justify-between">
              <span className="text-gray-500 text-[10px] uppercase tracking-wider">
                Burn Status
              </span>
              <StatusDot
                status={state.propulsion.burnStatus}
                color={burnColor}
                label={state.propulsion.burnStatus}
              />
            </div>
          </ConsolePanel>

          {/* GNC Console */}
          <ConsolePanel
            title="GNC"
            icon={<Navigation className="h-3.5 w-3.5 text-cyan-400" />}
            accentColor="text-cyan-400"
          >
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-gray-600 text-[8px] uppercase">Pitch</span>
                <p className="font-mono text-xs text-gray-200">
                  {state.gnc.pitch.toFixed(2)}°
                </p>
              </div>
              <div>
                <span className="text-gray-600 text-[8px] uppercase">Yaw</span>
                <p className="font-mono text-xs text-gray-200">
                  {state.gnc.yaw.toFixed(2)}°
                </p>
              </div>
              <div>
                <span className="text-gray-600 text-[8px] uppercase">Roll</span>
                <p className="font-mono text-xs text-gray-200">
                  {state.gnc.roll.toFixed(2)}°
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-2">
              <div>
                <span className="text-gray-600 text-[8px] uppercase">
                  P Rate
                </span>
                <p className="font-mono text-xs text-gray-400">
                  {state.gnc.pitchRate.toFixed(3)}°/s
                </p>
              </div>
              <div>
                <span className="text-gray-600 text-[8px] uppercase">
                  Y Rate
                </span>
                <p className="font-mono text-xs text-gray-400">
                  {state.gnc.yawRate.toFixed(3)}°/s
                </p>
              </div>
              <div>
                <span className="text-gray-600 text-[8px] uppercase">
                  R Rate
                </span>
                <p className="font-mono text-xs text-gray-400">
                  {state.gnc.rollRate.toFixed(3)}°/s
                </p>
              </div>
            </div>
            <div className="border-t border-white/5 pt-2">
              <DataRow
                label="Nav Solution Age"
                value={state.gnc.navAge.toFixed(2)}
                unit="s"
                color={navAgeColor}
              />
              <div className="flex items-baseline justify-between">
                <span className="text-gray-500 text-[10px] uppercase tracking-wider">
                  Guidance
                </span>
                <span
                  className={`font-mono text-xs font-bold ${guidanceColor}`}
                >
                  {state.gnc.guidanceMode}
                </span>
              </div>
            </div>
          </ConsolePanel>

          {/* COMMS Console */}
          <ConsolePanel
            title="COMMS"
            icon={<Radio className="h-3.5 w-3.5 text-purple-400" />}
            accentColor="text-purple-400"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-gray-500 text-[10px] uppercase tracking-wider">
                Signal
              </span>
              <span className="flex items-center gap-1.5">
                {state.comms.signalLost ? (
                  <WifiOff className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                ) : (
                  <Wifi className={`h-3.5 w-3.5 ${signalColor}`} />
                )}
                <span
                  className={`font-mono text-sm font-semibold ${signalColor}`}
                >
                  {state.comms.signalLost
                    ? "LOST"
                    : `${state.comms.signalStrength} dBm`}
                </span>
              </span>
            </div>
            <DataRow
              label="Data Rate"
              value={
                state.comms.signalLost
                  ? "—"
                  : state.comms.dataRate > 1000
                    ? `${(state.comms.dataRate / 1000).toFixed(1)}k`
                    : state.comms.dataRate.toString()
              }
              unit="bps"
              color={state.comms.signalLost ? "text-rose-400" : "text-purple-300"}
            />
            <DataRow
              label="Bit Error Rate"
              value={
                state.comms.signalLost ? "—" : state.comms.bitErrorRate
              }
              mono={false}
            />
            <DataRow
              label="Antenna Pointing"
              value={state.comms.antennaAngle.toFixed(1)}
              unit="°"
              color="text-purple-300"
            />
            {/* Signal strength bar */}
            <div className="pt-1">
              <div className="flex gap-0.5 items-end h-4">
                {[1, 2, 3, 4, 5].map((bar) => {
                  const threshold = -60 - bar * 8;
                  const active =
                    !state.comms.signalLost &&
                    state.comms.signalStrength >= threshold;
                  return (
                    <div
                      key={bar}
                      className={`flex-1 rounded-sm transition-colors duration-300 ${
                        active
                          ? state.comms.signalStrength > -75
                            ? "bg-cyan-400"
                            : "bg-amber-400"
                          : "bg-white/10"
                      }`}
                      style={{ height: `${bar * 20}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </ConsolePanel>
        </div>

        {/* ── Mission Phases Progress Bar ── */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">
              Mission Phases
            </span>
            <span className="ml-auto text-[9px] text-gray-600 font-mono">
              {phaseProgress.toFixed(0)}% of {PHASE_LABELS[state.phase]}
            </span>
          </div>
          <div className="relative">
            {/* Overall progress track */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-cyan-500 to-purple-500"
                animate={{ width: `${totalProgress * 100}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            {/* Phase labels */}
            <div className="flex mt-2">
              {PHASE_ORDER.map((phase, idx) => {
                const isActive = idx === currentPhaseIdx;
                const isComplete = idx < currentPhaseIdx;
                const isFuture = idx > currentPhaseIdx;
                return (
                  <div
                    key={phase}
                    className={`flex-1 text-center transition-opacity duration-500 ${
                      isFuture ? "opacity-30" : isActive ? "opacity-100" : "opacity-50"
                    }`}
                  >
                    <span
                      className={`text-[8px] sm:text-[9px] font-mono uppercase tracking-wider ${
                        isActive
                          ? "text-cyan-400 font-bold"
                          : isComplete
                            ? "text-gray-500"
                            : "text-gray-600"
                      }`}
                    >
                      {PHASE_LABELS[phase]}
                    </span>
                    {isActive && (
                      <div className="mt-1 h-0.5 bg-cyan-400 rounded-full mx-auto w-8" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Event Log ── */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Signal className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">
              Event Log
            </span>
            <span className="ml-auto text-[9px] text-gray-600 font-mono">
              {state.events.length} entries
            </span>
          </div>
          <div
            ref={eventLogRef}
            className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-1"
          >
            {state.events.map((event, idx) => (
              <div
                key={`${event.timestamp}-${idx}`}
                className="flex gap-2 py-0.5 border-b border-white/5 last:border-0"
              >
                <span className="text-[9px] font-mono text-gray-600 shrink-0 pt-0.5">
                  {event.timestamp}
                </span>
                <span
                  className={`text-[9px] font-mono font-bold shrink-0 pt-0.5 ${TAG_COLORS[event.tag]}`}
                >
                  [{event.tag}]
                </span>
                <span className="text-[10px] text-gray-300 leading-snug">
                  {event.message}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleStart}
            disabled={simStatus === "running" || simStatus === "complete"}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider transition-all hover:bg-cyan-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-cyan-500/20 disabled:hover:shadow-none"
          >
            <Play className="h-3.5 w-3.5" />
            Start
          </button>
          <button
            onClick={handlePause}
            disabled={simStatus !== "running"}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider transition-all hover:bg-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-amber-500/20 disabled:hover:shadow-none"
          >
            <Pause className="h-3.5 w-3.5" />
            Pause
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 font-mono text-xs font-bold uppercase tracking-wider transition-all hover:bg-white/10 hover:text-gray-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <div className="ml-4 text-[9px] text-gray-600 font-mono">
            {simStatus === "idle" && "READY"}
            {simStatus === "running" && (
              <span className="text-cyan-400 animate-pulse">● RUNNING</span>
            )}
            {simStatus === "paused" && (
              <span className="text-amber-400">❚❚ PAUSED</span>
            )}
            {simStatus === "complete" && (
              <span className="text-cyan-400">✓ COMPLETE</span>
            )}
            <span className="ml-2 text-gray-700">
              {TIME_STEP}× real-time
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}