"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Activity,
  Zap,
  Thermometer,
  Compass,
  Radio,
  Package,
  Cpu,
  Rocket,
  Settings,
  Box,
  Fan,
  Target,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

// ─── Types ───────────────────────────────────────────────────────────
type SubsystemStatus = "NOM" | "WARN" | "CRIT" | "OFF";
type AlertSeverity = "critical" | "warning" | "informational";

interface SubsystemTelemetry {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: SubsystemStatus;
  temperature: number;
  telemetryAge: number; // seconds
  details: string[];
  parameters: Record<string, string>;
}

interface AlertEntry {
  id: string;
  severity: AlertSeverity;
  timestamp: number;
  subsystem: string;
  message: string;
  acknowledged: boolean;
}

interface TrendPoint {
  value: number;
}

interface AnomalyScore {
  subsystem: string;
  score: number; // 0-100, lower = more anomalous
}

// ─── Helpers ─────────────────────────────────────────────────────────
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function jitter(base: number, range: number) {
  return clamp(base + (Math.random() - 0.5) * range, -Infinity, Infinity);
}

function getStatusColor(status: SubsystemStatus): string {
  switch (status) {
    case "NOM":
      return "border-cyan-500/60";
    case "WARN":
      return "border-amber-500/60";
    case "CRIT":
      return "border-rose-500/60";
    case "OFF":
      return "border-gray-600/40";
  }
}

function getStatusBg(status: SubsystemStatus): string {
  switch (status) {
    case "NOM":
      return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
    case "WARN":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "CRIT":
      return "bg-rose-500/20 text-rose-400 border-rose-500/30";
    case "OFF":
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

function getTelemetryLabel(age: number): { label: string; color: string } {
  if (age < 60) return { label: "FRESH", color: "text-cyan-400" };
  if (age <= 300) return { label: "STALE", color: "text-amber-400" };
  return { label: "TIMEOUT", color: "text-rose-400" };
}

function getHealthColor(pct: number): string {
  if (pct > 80) return "#06b6d4";
  if (pct >= 50) return "#f59e0b";
  return "#f43f5e";
}

function getHealthColorClass(pct: number): string {
  if (pct > 80) return "text-cyan-400";
  if (pct >= 50) return "text-amber-400";
  return "text-rose-400";
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── Subsystem Definitions ───────────────────────────────────────────
const SUBSYSTEM_DEFS = [
  { id: "power", name: "Power", icon: <Zap className="h-4 w-4" /> },
  { id: "thermal", name: "Thermal", icon: <Thermometer className="h-4 w-4" /> },
  { id: "adcs", name: "ADCS", icon: <Compass className="h-4 w-4" /> },
  { id: "comms", name: "Comms", icon: <Radio className="h-4 w-4" /> },
  { id: "payload", name: "Payload", icon: <Package className="h-4 w-4" /> },
  { id: "cdh", name: "C&DH", icon: <Cpu className="h-4 w-4" /> },
  { id: "propulsion", name: "Propulsion", icon: <Rocket className="h-4 w-4" /> },
  { id: "gnc", name: "GN&C", icon: <Target className="h-4 w-4" /> },
  { id: "mechanisms", name: "Mechanisms", icon: <Settings className="h-4 w-4" /> },
  { id: "structure", name: "Structure", icon: <Box className="h-4 w-4" /> },
  { id: "thermal-ctrl", name: "Thermal Ctrl", icon: <Fan className="h-4 w-4" /> },
  { id: "aocs", name: "AOCS", icon: <Target className="h-4 w-4" /> },
];

const PARAM_MAP: Record<string, Record<string, string>> = {
  power: { "Bus Voltage": "28.2V", "Solar Current": "4.8A", "Load": "195W" },
  thermal: { "Heater 1": "ON", "Radiator": "OPEN", "MLI Intact": "YES" },
  adcs: { "Pointing Err": "0.012°", "Wheel Speed": "4500rpm", "Mode": "NOMINAL" },
  comms: { "Uplink": "-92dBm", "Downlink": "-78dBm", "Data Rate": "9.6kbps" },
  payload: { "Detector": "ACTIVE", "Data Vol": "2.4GB", "Mode": "SCIENCE" },
  cdh: { "CPU Load": "34%", "Memory": "52%", "Uptime": "847d 14h" },
  propulsion: { "Tank Press": "21.4bar", "Temp": "18°C", "Thruster": "STANDBY" },
  gnc: { "Orbit Err": "12m", "Maneuver": "NONE", "Delta-V Rem": "48m/s" },
  mechanisms: { "Solar Deploy": "LOCKED", "Antenna": "DEPLOYED", "Door": "CLOSED" },
  "thermal-ctrl": { "Loop Temp": "12.4°C", "Pump": "ON", "Flow Rate": "0.8L/min" },
  structure: { "Vib Level": "0.02g", "Strain": "NOM", "Pressure": "1atm" },
  aocs: { "Star Trk": "TRACKING", "Gyro Drift": "0.001°/h", "Mag Cal": "VALID" },
};

const DETAIL_MAP: Record<string, string[]> = {
  power: ["Solar array generating 285W", "Battery SOC at 78.2%", "Power budget balanced for next 3 orbits"],
  thermal: ["All heaters within limits", "Radiator view factor nominal", "No thermal excursion detected"],
  adcs: ["Fine pointing mode active", "Reaction wheels desaturated 2 orbits ago", "Magnetorquer calibration current"],
  comms: ["S-band link established", "TC/TM frames processing normally", "Bit error rate < 1e-6"],
  payload: ["Science data collection active", "Buffer usage at 42%", "All detectors responding"],
  cdh: ["Flight software v3.2.1 running", "Watchdog timer reset nominal", "File system health OK"],
  propulsion: ["Propellant budget: 48m/s remaining", "Tank pressure stable", "No leak detection alerts"],
  gnc: ["Navigation solution converged", "Ephemeris valid for 48h", "Station-keeping delta-V planned"],
  mechanisms: ["All deployables locked in position", "Deployment switches confirmed", "Latching current nominal"],
  structure: ["No structural anomaly detected", "Vibration within spec", "Pressure vessel integrity confirmed"],
  "thermal-ctrl": ["Fluid loop circulation normal", "Heat exchanger efficiency > 95%", "Cryocooler head temp stable"],
  aocs: ["Star tracker acquiring 15+ stars", "IMU alignment within 0.01°", "Sun sensor calibrated"],
};

// ─── Initial Data ────────────────────────────────────────────────────
function generateInitialSubsystems(): SubsystemTelemetry[] {
  return SUBSYSTEM_DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    icon: def.icon,
    status: "NOM" as SubsystemStatus,
    temperature: Math.round(15 + Math.random() * 15),
    telemetryAge: Math.round(Math.random() * 40),
    details: DETAIL_MAP[def.id] ?? [],
    parameters: PARAM_MAP[def.id] ?? {},
  }));
}

function generateInitialAlerts(): AlertEntry[] {
  const base = Date.now();
  return [
    { id: "a1", severity: "informational", timestamp: base - 340000, subsystem: "Comms", message: "S-band link reacquired after eclipse passage", acknowledged: true },
    { id: "a2", severity: "warning", timestamp: base - 180000, subsystem: "Thermal", message: "Battery temperature approaching upper limit (32°C)", acknowledged: false },
    { id: "a3", severity: "informational", timestamp: base - 120000, subsystem: "ADCS", message: "Reaction wheel desaturation maneuver completed", acknowledged: true },
    { id: "a4", severity: "critical", timestamp: base - 60000, subsystem: "Power", message: "Solar array current drop detected — possible partial shadow", acknowledged: false },
    { id: "a5", severity: "warning", timestamp: base - 30000, subsystem: "Payload", message: "Detector 2 noise floor elevated by 12%", acknowledged: false },
  ];
}

function generateInitialTrends(): Record<string, TrendPoint[]> {
  const base: Record<string, number> = { voltage: 28.2, soc: 78, obcTemp: 24, rxSignal: -85 };
  const trends: Record<string, TrendPoint[]> = {};
  for (const key of Object.keys(base)) {
    const points: TrendPoint[] = [];
    let val = base[key];
    for (let i = 0; i < 20; i++) {
      val = jitter(val, key === "rxSignal" ? 3 : key === "obcTemp" ? 1.5 : key === "voltage" ? 0.8 : 2);
      points.push({ value: Number(val.toFixed(2)) });
    }
    trends[key] = points;
  }
  return trends;
}

function generateInitialAnomalies(subsystems: SubsystemTelemetry[]): AnomalyScore[] {
  return subsystems.map((s) => ({
    subsystem: s.name,
    score: s.status === "WARN" ? clamp(25 + Math.random() * 20, 10, 45) : s.status === "CRIT" ? clamp(5 + Math.random() * 15, 0, 25) : clamp(70 + Math.random() * 28, 65, 98),
  }));
}

// ─── Sparkline Component ─────────────────────────────────────────────
function Sparkline({ data, color, unit, label }: { data: TrendPoint[]; color: string; unit: string; label: string }) {
  const width = 120;
  const height = 32;
  const padding = 2;

  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M${points.join(" L")}`;
  const areaD = `${pathD} L${width - padding},${height - padding} L${padding},${height - padding} Z`;

  const latest = data[data.length - 1]?.value ?? 0;
  const prev = data[data.length - 2]?.value ?? latest;
  const trend = latest > prev ? "up" : latest < prev ? "down" : "stable";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div className="flex items-center gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-[120px] h-8 shrink-0">
        <defs>
          <linearGradient id={`grad-${label.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${label.replace(/\s+/g, "-")})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={padding + ((data.length - 1) / (data.length - 1)) * (width - padding * 2)} cy={height - padding - ((latest - min) / range) * (height - padding * 2)} r="2.5" fill={color} />
      </svg>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-gray-300 dark:text-gray-300">
            {latest.toFixed(1)}{unit}
          </span>
          <TrendIcon className="h-3 w-3 text-gray-500" />
        </div>
      </div>
    </div>
  );
}

// ─── Health Gauge Component ──────────────────────────────────────────
function HealthGauge({ percentage }: { percentage: number }) {
  const [animated, setAnimated] = useState(false);
  const displayPct = animated ? percentage : 0;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const radius = 80;
  const stroke = 8;
  const center = 100;
  const startAngle = -225;
  const endAngle = 45;
  const totalArc = endAngle - startAngle; // 270 degrees
  const angle = startAngle + (displayPct / 100) * totalArc;
  const rad = (a: number) => (a * Math.PI) / 180;

  const arcPath = (from: number, to: number) => {
    const x1 = center + radius * Math.cos(rad(from));
    const y1 = center + radius * Math.sin(rad(from));
    const x2 = center + radius * Math.cos(rad(to));
    const y2 = center + radius * Math.sin(rad(to));
    const largeArc = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const needleX = center + (radius - 14) * Math.cos(rad(angle));
  const needleY = center + (radius - 14) * Math.sin(rad(angle));

  const color = getHealthColor(displayPct);

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-48 h-48 sm:w-56 sm:h-56">
        {/* Background arc */}
        <path d={arcPath(startAngle, endAngle)} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-gray-700/40" strokeLinecap="round" />
        {/* Value arc */}
        <path d={arcPath(startAngle, angle)} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" style={{ transition: "d 0.8s ease-in-out, stroke 0.3s" }} />
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const tAngle = startAngle + (tick / 100) * totalArc;
          const x1 = center + (radius + 6) * Math.cos(rad(tAngle));
          const y1 = center + (radius + 6) * Math.sin(rad(tAngle));
          const x2 = center + (radius + 12) * Math.cos(rad(tAngle));
          const y2 = center + (radius + 12) * Math.sin(rad(tAngle));
          return (
            <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.5" className="text-gray-600" />
          );
        })}
        {/* Needle */}
        <line x1={center} y1={center} x2={needleX} y2={needleY} stroke={color} strokeWidth="2" strokeLinecap="round" style={{ transition: "x2 0.8s ease-in-out, y2 0.8s ease-in-out, stroke 0.3s" }} />
        <circle cx={center} cy={center} r="4" fill={color} />
        {/* Center text */}
        <text x={center} y={center - 8} textAnchor="middle" className="fill-gray-300" fontSize="28" fontWeight="bold" fontFamily="monospace">
          {Math.round(displayPct)}%
        </text>
        <text x={center} y={center + 14} textAnchor="middle" className="fill-gray-500" fontSize="9" fontFamily="monospace" letterSpacing="1">
          OVERALL HEALTH
        </text>
      </svg>
    </div>
  );
}

// ─── Subsystem Card Component ────────────────────────────────────────
function SubsystemCard({ sub, onExpand }: { sub: SubsystemTelemetry; onExpand: (id: string) => void }) {
  const tel = getTelemetryLabel(sub.telemetryAge);

  return (
    <button
      onClick={() => onExpand(sub.id)}
      className={`relative text-left w-full rounded-xl border-2 ${getStatusColor(sub.status)} bg-gray-900/50 dark:bg-slate-900/50 backdrop-blur-sm p-3 transition-all duration-300 hover:bg-gray-800/70 dark:hover:bg-slate-800/70 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)] group cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${getStatusBg(sub.status)} border`}>
            {sub.icon}
          </div>
          <div>
            <div className="text-xs font-medium text-gray-200 dark:text-gray-200 group-hover:text-white transition-colors">{sub.name}</div>
            <div className="text-[10px] text-gray-500">{sub.temperature}°C</div>
          </div>
        </div>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getStatusBg(sub.status)} uppercase tracking-wider`}>
          {sub.status}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono font-bold ${tel.color} animate-pulse`}>
          {tel.label}
        </span>
        <span className="text-[10px] text-gray-600 font-mono">{formatAge(sub.telemetryAge)} ago</span>
      </div>
    </button>
  );
}

// ─── Alert Row Component ─────────────────────────────────────────────
function AlertRow({ alert, onAck }: { alert: AlertEntry; onAck: (id: string) => void }) {
  const SeverityIcon = alert.severity === "critical" ? AlertCircle : alert.severity === "warning" ? AlertTriangle : Info;
  const severityColor = alert.severity === "critical" ? "text-rose-400" : alert.severity === "warning" ? "text-amber-400" : "text-sky-400";
  const bgOpacity = alert.acknowledged ? "opacity-50" : "";

  return (
    <div className={`flex items-start gap-3 px-3 py-2 rounded-lg bg-gray-900/40 dark:bg-slate-900/40 border border-gray-800/50 dark:border-slate-800/50 transition-all duration-300 ${bgOpacity}`}>
      <SeverityIcon className={`h-4 w-4 mt-0.5 shrink-0 ${severityColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-mono text-gray-500">{formatTime(alert.timestamp)}</span>
          <span className="text-[10px] font-medium text-gray-400">{alert.subsystem}</span>
          {alert.acknowledged && (
            <span className="text-[9px] text-cyan-500/70 font-mono flex items-center gap-0.5">
              <Check className="h-2.5 w-2.5" /> ACK
            </span>
          )}
        </div>
        <p className="text-xs text-gray-300 dark:text-gray-300 leading-relaxed truncate">{alert.message}</p>
      </div>
      {!alert.acknowledged && (
        <button
          onClick={() => onAck(alert.id)}
          className="shrink-0 text-[10px] font-medium text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50 rounded-md px-2 py-1 transition-all duration-200 hover:bg-cyan-500/10"
        >
          Acknowledge
        </button>
      )}
    </div>
  );
}

// ─── Expanded Detail Panel ───────────────────────────────────────────
function ExpandedPanel({ sub, onClose }: { sub: SubsystemTelemetry; onClose: () => void }) {
  const tel = getTelemetryLabel(sub.telemetryAge);
  return (
    <div className="rounded-xl border border-gray-700/50 dark:border-slate-700/50 bg-gray-900/60 dark:bg-slate-900/60 backdrop-blur-sm p-4 space-y-4 animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${getStatusBg(sub.status)} border`}>{sub.icon}</div>
          <h4 className="text-sm font-medium text-gray-200">{sub.name} Subsystem</h4>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getStatusBg(sub.status)} uppercase tracking-wider`}>{sub.status}</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-gray-800/50 dark:bg-slate-800/50 p-2.5 border border-gray-700/30 dark:border-slate-700/30">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Temperature</div>
          <div className="text-sm font-mono text-gray-200">{sub.temperature}°C</div>
        </div>
        <div className="rounded-lg bg-gray-800/50 dark:bg-slate-800/50 p-2.5 border border-gray-700/30 dark:border-slate-700/30">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Telemetry</div>
          <div className={`text-sm font-mono font-bold ${tel.color}`}>{tel.label} <span className="text-gray-500 font-normal">({formatAge(sub.telemetryAge)})</span></div>
        </div>
        <div className="rounded-lg bg-gray-800/50 dark:bg-slate-800/50 p-2.5 border border-gray-700/30 dark:border-slate-700/30 col-span-2 sm:col-span-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Status</div>
          <div className="text-sm text-gray-200">{sub.status === "NOM" ? "Nominal" : sub.status === "WARN" ? "Warning" : sub.status === "CRIT" ? "Critical" : "Offline"}</div>
        </div>
      </div>
      {/* Parameters */}
      <div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Parameters</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(sub.parameters).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between rounded-md bg-gray-800/30 dark:bg-slate-800/30 px-2.5 py-1.5 border border-gray-800/30 dark:border-slate-800/30">
              <span className="text-[10px] text-gray-500">{key}</span>
              <span className="text-xs font-mono text-gray-300">{val}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Details */}
      <div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Status Details</div>
        <ul className="space-y-1">
          {sub.details.map((d, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-400">
              <span className="h-1 w-1 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Anomaly Bar Component ───────────────────────────────────────────
function AnomalyBar({ score, name }: { score: number; name: string }) {
  const isAnomalous = score < 30;
  const barColor = isAnomalous ? "bg-rose-500" : score < 60 ? "bg-amber-500" : "bg-cyan-500";
  const textColor = isAnomalous ? "text-rose-400" : score < 60 ? "text-amber-400" : "text-cyan-400";
  const glowClass = isAnomalous ? "shadow-[0_0_8px_rgba(244,63,94,0.4)]" : "";

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-20 truncate text-right shrink-0">{name}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-800/60 dark:bg-slate-800/60 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} ${glowClass} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-[10px] font-mono font-bold w-7 text-right ${textColor}`}>{Math.round(score)}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export function SatelliteHealthMonitor() {
  const [subsystems, setSubsystems] = useState<SubsystemTelemetry[]>(generateInitialSubsystems);
  const [alerts, setAlerts] = useState<AlertEntry[]>(generateInitialAlerts);
  const [trends, setTrends] = useState<Record<string, TrendPoint[]>>(generateInitialTrends);
  const [anomalies, setAnomalies] = useState<AnomalyScore[]>(() => generateInitialAnomalies(generateInitialSubsystems()));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const tickRef = useRef(0);

  // Derived values
  const nominalCount = useMemo(() => subsystems.filter((s) => s.status === "NOM").length, [subsystems]);
  const overallHealth = useMemo(() => {
    const statusWeight: Record<SubsystemStatus, number> = { NOM: 100, WARN: 60, CRIT: 20, OFF: 0 };
    const avg = subsystems.reduce((sum, s) => sum + statusWeight[s.status], 0) / subsystems.length;
    return Math.round(clamp(avg, 0, 100));
  }, [subsystems]);

  const overallAnomaly = useMemo(() => {
    if (anomalies.length === 0) return 100;
    return Math.round(anomalies.reduce((sum, a) => sum + a.score, 0) / anomalies.length);
  }, [anomalies]);

  const visibleAlerts = showAllAlerts ? alerts : alerts.slice(0, 5);

  // Callbacks (defined BEFORE JSX const variables)
  const handleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleCloseExpand = useCallback(() => {
    setExpandedId(null);
  }, []);

  const handleAcknowledge = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  }, []);

  const toggleShowAllAlerts = useCallback(() => {
    setShowAllAlerts((prev) => !prev);
  }, []);

  // Simulation tick every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;

      // Update subsystems
      setSubsystems((prev) =>
        prev.map((s) => {
          let newStatus = s.status;
          let newTemp = s.temperature;
          let newAge = s.telemetryAge + 5;

          // Occasionally trigger a warning on a random subsystem
          if (tick % 3 === 0 && Math.random() < 0.15) {
            newStatus = "WARN";
          } else if (newStatus === "WARN" && Math.random() < 0.4) {
            newStatus = "NOM";
          }

          // Rarely trigger critical
          if (Math.random() < 0.03) {
            newStatus = "CRIT";
          } else if (newStatus === "CRIT" && Math.random() < 0.3) {
            newStatus = "WARN";
          }

          newTemp = clamp(jitter(s.temperature, 2), 5, 50);

          // Reset telemetry age periodically (simulating fresh data)
          if (newAge > 300 || Math.random() < 0.6) {
            newAge = Math.round(Math.random() * 20);
          }

          return { ...s, status: newStatus, temperature: Math.round(newTemp), telemetryAge: newAge };
        })
      );

      // Update trends
      setTrends((prev) => {
        const next: Record<string, TrendPoint[]> = {};
        for (const key of Object.keys(prev)) {
          const arr = [...prev[key]];
          const last = arr[arr.length - 1].value;
          const ranges: Record<string, number> = { voltage: 0.8, soc: 2, obcTemp: 1.5, rxSignal: 3 };
          arr.push({ value: Number(jitter(last, ranges[key] ?? 1).toFixed(2)) });
          if (arr.length > 20) arr.shift();
          next[key] = arr;
        }
        return next;
      });

      // Update anomalies
      setAnomalies((prev) => {
        const updatedSubs = generateInitialSubsystems();
        return prev.map((a, i) => {
          const sub = updatedSubs[i];
          const newScore = sub
            ? sub.status === "WARN"
              ? clamp(jitter(30, 15), 10, 50)
              : sub.status === "CRIT"
                ? clamp(jitter(15, 12), 0, 30)
                : clamp(jitter(82, 15), 55, 99)
            : a.score;
          return { ...a, score: Math.round(newScore) };
        });
      });

      // Occasionally add a new alert
      if (Math.random() < 0.4) {
        const subsystems = ["Power", "Thermal", "ADCS", "Comms", "Payload", "C&DH", "Propulsion", "GN&C", "Mechanisms", "Structure", "Thermal Ctrl", "AOCS"];
        const randomSub = subsystems[Math.floor(Math.random() * subsystems.length)];
        const severities: AlertSeverity[] = ["critical", "warning", "informational"];
        const messages: Record<AlertSeverity, string[]> = {
          critical: [
            `${randomSub} fault detected — autonomous safemode triggered`,
            `${randomSub} parameter exceedance — red limit violation`,
            `${randomSub} watchdog timeout — processor reset required`,
          ],
          warning: [
            `${randomSub} trending toward yellow limit — monitor closely`,
            `${randomSub} telemetry variance exceeds nominal envelope`,
            `${randomSub} performance degradation observed in last orbit`,
          ],
          informational: [
            `${randomSub} mode transition completed successfully`,
            `${randomSub} housekeeping data processed — no anomalies`,
            `${randomSub} calibration update applied`,
          ],
        };
        const sev = severities[Math.floor(Math.random() * severities.length)];
        const msgList = messages[sev];
        const msg = msgList[Math.floor(Math.random() * msgList.length)];

        setAlerts((prev) => [
          { id: `a-${Date.now()}`, severity: sev, timestamp: Date.now(), subsystem: randomSub, message: msg, acknowledged: false },
          ...prev.slice(0, 19),
        ]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Unacknowledged count
  const unackedCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <section id="health-monitor" className="relative py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Satellite Health Monitor"
          subtitle="Real-time subsystem health, anomaly detection, and telemetry freshness for the full spacecraft bus"
          icon={<Activity className="h-6 w-6 text-cyan-400" />}
          sectionNumber="§40"
        />

        {/* ─── Top Row: Health Gauge + Trend Sparklines ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Health Gauge Card */}
          <div className="rounded-xl border border-gray-800/60 dark:border-slate-800/60 bg-gray-900/40 dark:bg-slate-900/40 backdrop-blur-sm p-6 flex flex-col items-center justify-center">
            <HealthGauge percentage={overallHealth} />
            <div className="mt-2 text-center">
              <span className={`text-2xl font-bold font-mono ${getHealthColorClass(overallHealth)}`}>
                {overallHealth}%
              </span>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">
                {nominalCount}/{subsystems.length} subsystems nominal
              </div>
            </div>
          </div>

          {/* Trend Sparklines Card */}
          <div className="lg:col-span-2 rounded-xl border border-gray-800/60 dark:border-slate-800/60 bg-gray-900/40 dark:bg-slate-900/40 backdrop-blur-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Parameter Trends</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Sparkline data={trends.voltage} color="#06b6d4" unit="V" label="Bus Voltage" />
              <Sparkline data={trends.soc} color="#3b82f6" unit="%" label="Battery SOC" />
              <Sparkline data={trends.obcTemp} color="#f59e0b" unit="°C" label="OBC Temp" />
              <Sparkline data={trends.rxSignal} color="#8b5cf6" unit="dBm" label="RX Signal" />
            </div>
          </div>
        </div>

        {/* ─── Subsystem Status Grid ─── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Subsystem Status Grid</span>
            <span className="text-[10px] text-gray-600 ml-auto">Click any card for details</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {subsystems.map((sub) => (
              <SubsystemCard key={sub.id} sub={sub} onExpand={handleExpand} />
            ))}
          </div>

          {/* Expanded Detail Panel */}
          {expandedId && (() => {
            const expanded = subsystems.find((s) => s.id === expandedId);
            if (!expanded) return null;
            return <ExpandedPanel sub={expanded} onClose={handleCloseExpand} />;
          })()}
        </div>

        {/* ─── Bottom Row: Alert Log + Anomaly Detection ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alert Log */}
          <div className="rounded-xl border border-gray-800/60 dark:border-slate-800/60 bg-gray-900/40 dark:bg-slate-900/40 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Alert Log</span>
                {unackedCount > 0 && (
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 border border-rose-500/30 rounded-full px-2 py-0.5 animate-pulse">
                    {unackedCount} unacked
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <button
                  onClick={toggleShowAllAlerts}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showAllAlerts ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showAllAlerts ? "Show Less" : "Show All"}
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {visibleAlerts.length === 0 ? (
                <div className="text-xs text-gray-600 text-center py-6">No alerts</div>
              ) : (
                visibleAlerts.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} onAck={handleAcknowledge} />
                ))
              )}
            </div>
          </div>

          {/* Anomaly Detection */}
          <div className="rounded-xl border border-gray-800/60 dark:border-slate-800/60 bg-gray-900/40 dark:bg-slate-900/40 backdrop-blur-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Anomaly Detection (ML)</span>
            </div>
            {/* Overall Score */}
            <div className="flex items-center gap-4 mb-5 p-3 rounded-lg bg-gray-800/40 dark:bg-slate-800/40 border border-gray-700/30 dark:border-slate-700/30">
              <div className="text-center">
                <div className={`text-2xl font-bold font-mono ${overallAnomaly < 30 ? "text-rose-400" : overallAnomaly < 60 ? "text-amber-400" : "text-cyan-400"}`}>
                  {overallAnomaly}
                </div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Overall Score</div>
              </div>
              <div className="flex-1">
                <div className="h-3 rounded-full bg-gray-800/60 dark:bg-slate-800/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${overallAnomaly < 30 ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]" : overallAnomaly < 60 ? "bg-amber-500" : "bg-cyan-500"}`}
                    style={{ width: `${overallAnomaly}%` }}
                  />
                </div>
                <div className="text-[10px] text-gray-500 mt-1.5">
                  {overallAnomaly < 30 ? "Multiple anomalies detected — investigation required" : overallAnomaly < 60 ? "Minor deviations from expected behavior" : "All subsystems within nominal behavior envelope"}
                </div>
              </div>
            </div>
            {/* Per-subsystem bars */}
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {anomalies.map((a) => (
                <AnomalyBar key={a.subsystem} score={a.score} name={a.subsystem} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}