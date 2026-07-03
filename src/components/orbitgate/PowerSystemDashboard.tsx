"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Zap, Sun, Battery, ArrowUp, ArrowDown, Thermometer, RotateCcw } from "lucide-react";
// Card components available via GlassCard wrapper
import { SectionHeader } from "./SectionHeader";

// ─── Types ───────────────────────────────────────────────────────────
interface SolarData {
  generation: number;
  efficiency: number;
  sunAngle: number;
  isSunlit: boolean;
}

interface BatteryData {
  chargeLevel: number;
  chargeRate: number;
  temperature: number;
  cycleCount: number;
}

interface SubsystemRow {
  name: string;
  allocated: number;
  current: number;
  status: "nominal" | "warning" | "critical" | "off";
  trend: "up" | "down" | "stable";
}

interface HistoryPoint {
  hour: number;
  generation: number;
  consumption: number;
  isEclipse: boolean;
}

interface PowerState {
  solar: SolarData;
  battery: BatteryData;
  subsystems: SubsystemRow[];
  history: HistoryPoint[];
  tick: number;
}

// ─── Mock Data Generators ────────────────────────────────────────────
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function jitter(base: number, range: number) {
  return clamp(base + (Math.random() - 0.5) * range, 0, Infinity);
}

function generateSolar(prev?: SolarData): SolarData {
 const isSunlit = prev ? prev.isSunlit : Math.random() > 0.3;
 const baseAngle = prev ? prev.sunAngle : 45 + Math.random() * 90;
 const sunAngle = clamp(baseAngle + (Math.random() - 0.5) * 15, 0, 180);
 const baseEff = prev ? prev.efficiency : 24 + Math.random() * 4;
 const efficiency = clamp(baseEff + (Math.random() - 0.5) * 2, 18, 30);
 const baseGen = prev ? prev.generation : isSunlit ? 280 : 0;
 const generation = isSunlit
   ? clamp(baseGen + (Math.random() - 0.5) * 60, 180, 350)
   : 0;
 return { generation: Math.round(generation), efficiency: Number(efficiency.toFixed(1)), sunAngle: Math.round(sunAngle), isSunlit };
}

function generateBattery(prev?: BatteryData, solar?: SolarData): BatteryData {
 const totalLoad = 195 + Math.random() * 30;
 const netPower = (solar?.generation ?? 0) - totalLoad;
 const chargeRate = Math.round(netPower);
 const baseCharge = prev ? prev.chargeLevel : 60 + Math.random() * 30;
 const chargeLevel = clamp(baseCharge + chargeRate * 0.02, 5, 100);
 const baseTemp = prev ? prev.temperature : 18 + Math.random() * 8;
 const temperature = clamp(baseTemp + (Math.random() - 0.5) * 1.5, 10, 35);
 const cycleCount = prev ? prev.cycleCount : 847 + Math.floor(Math.random() * 10);
 return { chargeLevel: Number(chargeLevel.toFixed(1)), chargeRate, temperature: Number(temperature.toFixed(1)), cycleCount };
}

function generateSubsystems(): SubsystemRow[] {
 const rows: SubsystemRow[] = [
   { name: "Comms", allocated: 85, current: jitter(72, 16), status: "nominal", trend: "stable" },
   { name: "ADCS", allocated: 45, current: jitter(38, 10), status: "nominal", trend: "stable" },
   { name: "Thermal", allocated: 60, current: jitter(55, 8), status: "nominal", trend: "up" },
   { name: "Payload", allocated: 120, current: jitter(98, 20), status: "nominal", trend: "stable" },
   { name: "C&DH", allocated: 30, current: jitter(22, 6), status: "nominal", trend: "down" },
 ];
 return rows.map((r) => {
   const current = Math.round(r.current);
   const util = current / r.allocated;
   const status: SubsystemRow["status"] =
     current < 1 ? "off" : util > 0.95 ? "critical" : util > 0.8 ? "warning" : "nominal";
   const trend = Math.random() > 0.7 ? (Math.random() > 0.5 ? "up" : "down") : "stable";
   return { ...r, current, status, trend };
 });
}

function generateHistory(): HistoryPoint[] {
 const points: HistoryPoint[] = [];
 for (let h = 0; h < 24; h++) {
   const isEclipse = h >= 1 && h <= 3;
   const generation = isEclipse ? 0 : clamp(260 + Math.sin((h - 6) * 0.3) * 80 + Math.random() * 40, 0, 350);
   const consumption = 185 + Math.random() * 35;
   points.push({ hour: h, generation: Math.round(generation), consumption: Math.round(consumption), isEclipse });
 }
 return points;
}

// ─── Sub-components ──────────────────────────────────────────────────

function AnimatedDot({ cx, cy, delay, color, r = 2.5 }: { cx: number; cy: number; delay: number; color: string; r?: number }) {
  return (
    <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.9}>
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin={`${delay}s`} repeatCount="indefinite" />
    </circle>
  );
}

function FlowingDots({ points, color, count = 5 }: { points: [number, number][]; color: string; count?: number }) {
  const totalLen = useMemo(() => {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i][0] - points[i - 1][0];
      const dy = points[i][1] - points[i - 1][1];
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }, [points]);

  const getPointAt = useCallback(
    (t: number): [number, number] => {
      const target = t * totalLen;
      let acc = 0;
      for (let i = 1; i < points.length; i++) {
        const dx = points[i][0] - points[i - 1][0];
        const dy = points[i][1] - points[i - 1][1];
        const seg = Math.sqrt(dx * dx + dy * dy);
        if (acc + seg >= target) {
          const frac = seg > 0 ? (target - acc) / seg : 0;
          return [points[i - 1][0] + dx * frac, points[i - 1][1] + dy * frac];
        }
        acc += seg;
      }
      return points[points.length - 1];
    },
    [points, totalLen]
  );

  const dots = useMemo(() => {
    const arr: { x: number; y: number; delay: number; key: number }[] = [];
    for (let i = 0; i < count; i++) {
      const t = ((i / count) + 0.01) % 1;
      const [x, y] = getPointAt(t);
      arr.push({ x, y, delay: (i * 1.5) / count, key: i });
    }
    return arr;
  }, [getPointAt, count]);

  return (
    <g>
      {dots.map((d) => (
        <circle
          key={d.key}
          cx={d.x}
          cy={d.y}
          r={2.5}
          fill={color}
          opacity={0.9}
        >
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin={`${d.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

function PowerFlowDiagram({ solar, battery, tick }: { solar: SolarData; battery: BatteryData; tick: number }) {
  const isCharging = battery.chargeRate > 0;
  const batteryColor = isCharging ? "#06b6d4" : "#f43f5e";

  const solarPath: [number, number][] = [[110, 60], [180, 60]];
  const busToBatteryPath: [number, number][] = [[310, 60], [400, 60]];
  const busToLoadsPath: [number, number][] = [[245, 85], [245, 140], [170, 140], [170, 170]];
  const batteryToBusPath: [number, number][] = [[400, 60], [310, 60]];

  const solarFlowWidth = solar.generation > 0 ? Math.max(1.5, solar.generation / 100) : 0.5;
  const loadFlowWidth = 2.5;
  const batteryFlowWidth = Math.max(0.5, Math.abs(battery.chargeRate) / 60);

  const dotKey = tick % 100;

  return (
    <svg viewBox="0 0 500 210" className="w-full h-auto">
      {/* Solar Arrays Box */}
      <rect x={20} y={30} width={90} height={60} rx={8} fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.4)" strokeWidth={1} />
      <text x={65} y={52} textAnchor="middle" className="text-[10px]" fill="#f59e0b" fontWeight={600}>Solar</text>
      <text x={65} y={65} textAnchor="middle" className="text-[9px]" fill="#fbbf24">Arrays</text>
      <text x={65} y={80} textAnchor="middle" className="text-[8px]" fill={solar.isSunlit ? "#22d3ee" : "#64748b"}>
        {solar.isSunlit ? "☀ SUNLIT" : "● ECLIPSE"}
      </text>

      {/* Solar → Bus arrow path */}
      <line x1={110} y1={60} x2={175} y2={60} stroke="#f59e0b" strokeWidth={solarFlowWidth} opacity={0.6} />
      <polygon points="175,55 185,60 175,65" fill="#f59e0b" opacity={0.8} />
      {solar.generation > 0 && <FlowingDots key={`solar-${dotKey}`} points={solarPath} color="#fbbf24" count={4} />}

      {/* Power Bus Box */}
      <rect x={185} y={30} width={120} height={60} rx={8} fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.35)" strokeWidth={1} />
      <text x={245} y={55} textAnchor="middle" className="text-[11px]" fill="#22d3ee" fontWeight={700}>Power Bus</text>
      <text x={245} y={70} textAnchor="middle" className="text-[8px]" fill="#6ee7b7">28V Unregulated</text>
      <text x={245} y={82} textAnchor="middle" className="text-[8px]" fill="#94a3b8">
        {Math.max(0, solar.generation + (isCharging ? 0 : battery.chargeRate))}W
      </text>

      {/* Bus → Battery path */}
      <line x1={305} y1={55} x2={390} y2={55} stroke={batteryColor} strokeWidth={batteryFlowWidth} opacity={0.5} />
      {/* Battery → Bus path (slightly offset) */}
      <line x1={390} y1={65} x2={305} y2={65} stroke={batteryColor} strokeWidth={batteryFlowWidth} opacity={0.5} />
      {/* Arrows */}
      {isCharging ? (
        <polygon points="385,51 395,55 385,59" fill={batteryColor} opacity={0.8} />
      ) : (
        <polygon points="310,61 300,65 310,69" fill={batteryColor} opacity={0.8} />
      )}
      <FlowingDots
        key={`bat-${dotKey}`}
        points={isCharging ? busToBatteryPath : batteryToBusPath}
        color={batteryColor}
        count={3}
      />

      {/* Battery Box */}
      <rect x={395} y={30} width={90} height={60} rx={8}
        fill={isCharging ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)"}
        stroke={isCharging ? "rgba(16,185,129,0.4)" : "rgba(244,63,94,0.4)"} strokeWidth={1}
      />
      <text x={440} y={52} textAnchor="middle" className="text-[10px]" fill={batteryColor} fontWeight={600}>Battery</text>
      <text x={440} y={65} textAnchor="middle" className="text-[9px]" fill={isCharging ? "#6ee7b7" : "#fda4af"}>
        {isCharging ? "CHARGING" : "DISCHARGING"}
      </text>
      <text x={440} y={80} textAnchor="middle" className="text-[8px]" fill="#94a3b8">
        {battery.chargeLevel.toFixed(1)}%
      </text>

      {/* Bus → Loads path */}
      <polyline points="245,90 245,130 170,130 170,160" fill="none" stroke="#22d3ee" strokeWidth={loadFlowWidth} opacity={0.5} />
      <polygon points="165,157 170,167 175,157" fill="#22d3ee" opacity={0.8} />
      <FlowingDots key={`load-${dotKey}`} points={busToLoadsPath} color="#22d3ee" count={3} />

      {/* Loads Box */}
      <rect x={110} y={170} width={120} height={30} rx={6} fill="rgba(34,211,238,0.08)" stroke="rgba(34,211,238,0.35)" strokeWidth={1} />
      <text x={170} y={190} textAnchor="middle" className="text-[10px]" fill="#22d3ee" fontWeight={600}>
        Loads ({Math.round(solar.generation - battery.chargeRate)}W)
      </text>
    </svg>
  );
}

function ArcGauge({ value, max, color, size = 80 }: { value: number; max: number; color: string; size?: number }) {
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = 135;
  const endAngle = 405;
  const totalArc = endAngle - startAngle;
  const pct = clamp(value / max, 0, 1);
  const valueAngle = startAngle + totalArc * pct;

  const polarToCart = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos((angle * Math.PI) / 180),
    y: cy + radius * Math.sin((angle * Math.PI) / 180),
  });

  const arcPath = (start: number, end: number, radius: number) => {
    const s = polarToCart(start, radius);
    const e = polarToCart(end, radius);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  return (
    <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`}>
      <path d={arcPath(startAngle, endAngle, r)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} strokeLinecap="round" />
      <path d={arcPath(startAngle, valueAngle, r)} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" opacity={0.85} />
      <text x={cx} y={cy + 2} textAnchor="middle" className="text-sm" fill="white" fontWeight={700}>{value}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="text-[8px]" fill="#94a3b8">of {max}W</text>
    </svg>
  );
}

function SunAngleIndicator({ angle }: { angle: number }) {
  const r = 32;
  const cx = 40;
  const cy = 40;
  const rad = ((angle - 90) * Math.PI) / 180;
  const ex = cx + r * Math.cos(rad);
  const ey = cy + r * Math.sin(rad);

  return (
    <svg width={80} height={80} viewBox="0 0 80 80">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth={8} strokeDasharray={`${(angle / 180) * Math.PI * r} ${Math.PI * r * 2}`} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
      <circle cx={ex} cy={ey} r={3} fill="#fbbf24" />
      <circle cx={cx} cy={cy} r={3} fill="rgba(255,255,255,0.3)" />
      <text x={cx} y={cy + r + 14} textAnchor="middle" className="text-[9px]" fill="#94a3b8">{angle}°</text>
    </svg>
  );
}

function BatteryCircularGauge({ level, chargeRate }: { level: number; chargeRate: number }) {
  const r = 60;
  const cx = 80;
  const cy = 80;
  const strokeW = 10;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - level / 100);
  const color = level > 50 ? "#06b6d4" : level > 20 ? "#f59e0b" : "#f43f5e";
  const glowColor = level > 50 ? "rgba(16,185,129,0.4)" : level > 20 ? "rgba(245,158,11,0.4)" : "rgba(244,63,94,0.4)";

  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      <defs>
        <filter id="battery-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={strokeW}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        filter="url(#battery-glow)"
        style={{ transition: "stroke-dashoffset 1.5s ease, stroke 1.5s ease" }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" className="text-2xl" fill="white" fontWeight={800}>{level.toFixed(1)}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="text-[10px]" fill={color} fontWeight={600}>%</text>
      <text x={cx} y={cy + 26} textAnchor="middle" className="text-[9px]" fill="#94a3b8">
        {chargeRate >= 0 ? "+" : ""}{chargeRate}W
      </text>
      <text x={cx} y={cy + 38} textAnchor="middle" className="text-[8px]" fill={chargeRate >= 0 ? "#22d3ee" : "#fda4af"}>
        {chargeRate >= 0 ? "▲ Charging" : "▼ Discharging"}
      </text>
    </svg>
  );
}

function PowerHistoryChart({ history }: { history: HistoryPoint[] }) {
  const w = 600;
  const h = 180;
  const pad = { t: 20, r: 10, b: 30, l: 40 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const maxVal = 400;

  const scaleX = (i: number) => pad.l + (i / 23) * plotW;
  const scaleY = (v: number) => { const val = isNaN(v) ? 0 : v; return pad.t + plotH - (val / maxVal) * plotH; };

  const genPoints = history.map((p, i) => `${scaleX(i)},${scaleY(p.generation)}`).join(" ");
  const conPoints = history.map((p, i) => `${scaleX(i)},${scaleY(p.consumption)}`).join(" ");

  // Shaded area between generation and consumption
  const areaPath = history
    .map((p, i) => {
      const x = scaleX(i);
      const yGen = scaleY(p.generation);
      const yCon = scaleY(p.consumption);
      return { x, yGen, yCon };
    })
    .reduce((acc, pt, i, arr) => {
      if (i === 0) {
        return `M ${pt.x} ${pt.yGen}`;
      }
      const prev = arr[i - 1];
      return `${acc} L ${pt.x} ${pt.yGen}`;
    }, "");

  // Build closed area: generation line forward, then consumption line backward
  let closedArea = history.map((p, i) => `${scaleX(i)},${scaleY(p.generation)}`).join(" L ");
  closedArea = "M " + closedArea;
  for (let i = history.length - 1; i >= 0; i--) {
    closedArea += ` L ${scaleX(i)},${scaleY(history[i].consumption)}`;
  }
  closedArea += " Z";

  // Eclipse shading
  const eclipseRects = history
    .reduce<{ start: number; end: number }[]>((acc, p, i) => {
      if (p.isEclipse) {
        if (acc.length === 0 || acc[acc.length - 1].end !== i - 1) {
          acc.push({ start: i, end: i });
        } else {
          acc[acc.length - 1].end = i;
        }
      }
      return acc;
    }, [])
    .map((e) => (
      <rect
        key={`eclipse-${e.start}`}
        x={scaleX(e.start) - plotW / 46}
        y={pad.t}
        width={((e.end - e.start + 1) / 24) * plotW + plotW / 23}
        height={plotH}
        fill="rgba(30,58,138,0.3)"
        rx={2}
      />
    ));

  const gridLines = [0, 100, 200, 300, 400].map((v) => (
    <g key={`grid-${v}`}>
      <line x1={pad.l} y1={scaleY(v)} x2={w - pad.r} y2={scaleY(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      <text x={pad.l - 6} y={scaleY(v) + 3} textAnchor="end" className="text-[8px]" fill="#64748b">{v}</text>
    </g>
  ));

  const hourLabels = [0, 4, 8, 12, 16, 20, 23].map((h) => (
    <text key={`hour-${h}`} x={scaleX(h)} y={h - pad.t + plotH + 18} textAnchor="middle" className="text-[8px]" fill="#64748b">
      {h.toString().padStart(2, "0")}:00
    </text>
  ));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {gridLines}
      {hourLabels}
      {eclipseRects}
      {/* Shaded area */}
      <path d={closedArea} fill="rgba(16,185,129,0.08)" />
      {/* Generation line */}
      <polyline points={genPoints} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* Consumption line */}
      <polyline points={conPoints} fill="none" stroke="#22d3ee" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* Labels */}
      <line x1={w - pad.r - 70} y1={pad.t + 8} x2={w - pad.r - 50} y2={pad.t + 8} stroke="#f59e0b" strokeWidth={2} />
      <text x={w - pad.r - 46} y={pad.t + 11} className="text-[8px]" fill="#fbbf24">Generation</text>
      <line x1={w - pad.r - 70} y1={pad.t + 22} x2={w - pad.r - 50} y2={pad.t + 22} stroke="#22d3ee" strokeWidth={2} />
      <text x={w - pad.r - 46} y={pad.t + 25} className="text-[8px]" fill="#67e8f9">Consumption</text>
      {/* Eclipse label */}
      <rect x={w - pad.r - 78} y={pad.t + 34} width={8} height={8} fill="rgba(30,58,138,0.5)" rx={1} />
      <text x={w - pad.r - 66} y={pad.t + 41} className="text-[8px]" fill="#94a3b8">Eclipse</text>
    </svg>
  );
}

function StatusBadge({ status }: { status: SubsystemRow["status"] }) {
  const config = {
    nominal: { label: "NOM", color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30" },
    warning: { label: "WARN", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
    critical: { label: "CRIT", color: "text-rose-400 bg-rose-500/15 border-rose-500/30" },
    off: { label: "OFF", color: "text-gray-500 bg-gray-500/15 border-gray-500/30" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold rounded border ${c.color}`}>
      {c.label}
    </span>
  );
}

function TrendArrow({ trend }: { trend: SubsystemRow["trend"] }) {
  if (trend === "up") return <ArrowUp className="h-3 w-3 text-rose-400" />;
  if (trend === "down") return <ArrowDown className="h-3 w-3 text-cyan-400" />;
  return <span className="text-[9px] text-gray-500">—</span>;
}

// ─── Glass Card Wrapper ──────────────────────────────────────────────
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export function PowerSystemDashboard() {
  const [state, setState] = useState<PowerState>(() => {
    const solar = generateSolar();
    const battery = generateBattery(undefined, solar);
    return { solar, battery, subsystems: generateSubsystems(), history: generateHistory(), tick: 0 };
  });

  const simulate = useCallback(() => {
    setState((prev) => {
      const solar = generateSolar(prev.solar);
      const battery = generateBattery(prev.battery, solar);
      const subsystems = generateSubsystems();
      return { solar, battery, subsystems, history: prev.history, tick: prev.tick + 1 };
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(simulate, 3000);
    return () => clearInterval(interval);
  }, [simulate]);

  const totalAllocated = state.subsystems.reduce((s, r) => s + r.allocated, 0);
  const totalCurrent = state.subsystems.reduce((s, r) => s + r.current, 0);
  const utilization = totalAllocated > 0 ? (totalCurrent / totalAllocated) * 100 : 0;
  const isCharging = state.battery.chargeRate > 0;

  const solarStatusColor = state.solar.isSunlit ? "#22d3ee" : "#64748b";

  return (
    <section id="power-system" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Power System Dashboard"
          subtitle="Real-time satellite EPS monitoring — generation, storage, and distribution"
          icon={<Zap className="h-5 w-5 text-cyan-400" />}
          sectionNumber="34"
        />

        <div className="space-y-6">
          {/* ── Power Flow Diagram ── */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Power Flow Topology</h3>
            </div>
            <PowerFlowDiagram solar={state.solar} battery={state.battery} tick={state.tick} />
          </GlassCard>

          {/* ── Solar Array + Battery Row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Solar Array Status */}
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Sun className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Solar Array Status</h3>
                <span className={`ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full border ${state.solar.isSunlit ? "text-cyan-400 bg-cyan-500/15 border-cyan-500/30" : "text-gray-500 bg-gray-500/10 border-gray-500/30"}`}>
                  {state.solar.isSunlit ? "SUNLIT" : "ECLIPSE"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ArcGauge value={state.solar.generation} max={350} color="#f59e0b" size={120} />
                <SunAngleIndicator angle={state.solar.sunAngle} />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider">Generation</p>
                  <p className="text-lg font-bold text-amber-400">{state.solar.generation}<span className="text-xs text-gray-500 ml-1">W</span></p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider">Efficiency</p>
                  <p className="text-lg font-bold text-amber-300">{state.solar.efficiency}<span className="text-xs text-gray-500 ml-1">%</span></p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider">Sun Angle</p>
                  <p className="text-lg font-bold text-amber-200">{state.solar.sunAngle}<span className="text-xs text-gray-500 ml-1">°</span></p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider">Status</p>
                  <p className="text-lg font-bold" style={{ color: solarStatusColor }}>
                    {state.solar.isSunlit ? "Active" : "Idle"}
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Battery Status */}
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Battery className="h-4 w-4" style={{ color: state.battery.chargeLevel > 50 ? "#06b6d4" : state.battery.chargeLevel > 20 ? "#f59e0b" : "#f43f5e" }} />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Battery Status</h3>
                <span className={`ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full border ${isCharging ? "text-cyan-400 bg-cyan-500/15 border-cyan-500/30" : "text-rose-400 bg-rose-500/15 border-rose-500/30"}`}>
                  {isCharging ? "CHARGING" : "DISCHARGING"}
                </span>
              </div>

              <div className="flex justify-center">
                <BatteryCircularGauge level={state.battery.chargeLevel} chargeRate={state.battery.chargeRate} />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-1">
                    <Thermometer className="h-3 w-3 text-gray-500" />
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider">Temperature</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{state.battery.temperature}<span className="text-xs text-gray-500 ml-1">°C</span></p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-1">
                    <RotateCcw className="h-3 w-3 text-gray-500" />
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider">Cycles</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{state.battery.cycleCount}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5 col-span-2">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider">Charge / Discharge Rate</p>
                  <p className={`text-lg font-bold ${isCharging ? "text-cyan-400" : "text-rose-400"}`}>
                    {isCharging ? "+" : ""}{state.battery.chargeRate}<span className="text-xs text-gray-500 ml-1">W</span>
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* ── Power Budget Table ── */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Power Budget</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium uppercase tracking-wider text-[9px]">Subsystem</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium uppercase tracking-wider text-[9px]">Allocated (W)</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium uppercase tracking-wider text-[9px]">Current (W)</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium uppercase tracking-wider text-[9px]">Status</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium uppercase tracking-wider text-[9px]">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {state.subsystems.map((row) => {
                    const util = row.allocated > 0 ? row.current / row.allocated : 0;
                    return (
                      <tr key={row.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{row.name}</td>
                        <td className="py-2 px-3 text-right text-gray-400">{row.allocated}</td>
                        <td className="py-2 px-3 text-right text-cyan-400 font-mono">{row.current}</td>
                        <td className="py-2 px-3 text-center"><StatusBadge status={row.status} /></td>
                        <td className="py-2 px-3 text-center flex justify-center"><TrendArrow trend={row.trend} /></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/15">
                    <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white">Total</td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-300">{totalAllocated}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-cyan-400 font-mono">{totalCurrent}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] font-bold ${utilization > 90 ? "text-rose-400" : utilization > 75 ? "text-amber-400" : "text-cyan-400"}`}>
                        {utilization.toFixed(1)}% util
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </GlassCard>

          {/* ── Power History Chart ── */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Power History — 24h</h3>
              <span className="ml-auto text-[9px] text-gray-500">Generation vs Consumption</span>
            </div>
            <PowerHistoryChart history={state.history} />
            <p className="text-[8px] text-gray-600 mt-2 text-center">Shaded area between lines indicates net battery charge (green) or discharge (red)</p>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
