"use client";

import { useState, useMemo, useCallback } from "react";
import { SectionHeader } from "./SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Thermometer, Sun, Moon, ArrowRight, Zap, Wind } from "lucide-react";
import { motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Constants & Helpers                                                 */
/* ------------------------------------------------------------------ */

const CHART_W = 600;
const CHART_H = 280;
const CHART_PAD_L = 50;
const CHART_PAD_R = 16;
const CHART_PAD_T = 16;
const CHART_PAD_B = 36;
const PLOT_W = CHART_W - CHART_PAD_L - CHART_PAD_R;
const PLOT_H = CHART_H - CHART_PAD_T - CHART_PAD_B;

const TEMP_MIN = -150;
const TEMP_MAX = 150;
const TIME_MIN = 0;
const TIME_MAX = 90;

/** Mock eclipse windows (minutes from orbit start) */
const ECLIPSE_WINDOWS = [
  { entry: 35, exit: 60, duration: 25 },
];

/** Generate next 5 eclipse predictions (mock) */
const NEXT_ECLIPSES = [
  { orbit: 1, entry: "T+0:35:00", exit: "T+1:00:00", duration: 25 },
  { orbit: 2, entry: "T+1:25:00", exit: "T+1:50:00", duration: 25 },
  { orbit: 3, entry: "T+2:15:00", exit: "T+2:40:00", duration: 25 },
  { orbit: 4, entry: "T+3:05:00", exit: "T+3:30:00", duration: 25 },
  { orbit: 5, entry: "T+3:55:00", exit: "T+4:20:00", duration: 25 },
];

/** Color palette for the 4 temperature lines */
const LINE_COLORS = {
  solarPanel: "#f97316",
  body: "#eab308",
  battery: "#a855f7",
  radiator: "#06b6d4",
};

const LINE_LABELS: { key: keyof typeof LINE_COLORS; label: string }[] = [
  { key: "solarPanel", label: "Solar Panel" },
  { key: "body", label: "Body" },
  { key: "battery", label: "Battery" },
  { key: "radiator", label: "Radiator" },
];

/** Map time (0-90) to X coordinate */
function timeToX(t: number): number {
  return CHART_PAD_L + ((t - TIME_MIN) / (TIME_MAX - TIME_MIN)) * PLOT_W;
}

/** Map temperature (-150..150) to Y coordinate (inverted) */
function tempToY(temp: number): number {
  return CHART_PAD_T + ((TEMP_MAX - temp) / (TEMP_MAX - TEMP_MIN)) * PLOT_H;
}

/* ------------------------------------------------------------------ */
/*  Temperature computation model                                       */
/* ------------------------------------------------------------------ */

interface ThermalParams {
  heaterPower: number;
  radiatorArea: number;
  insulationThickness: number;
}

/** Compute temperature data for all 4 subsystems across one orbit */
function computeTemperatures(params: ThermalParams) {
  const { heaterPower, radiatorArea, insulationThickness } = params;
  const points = 91; // 0..90 inclusive
  const data: Record<keyof typeof LINE_COLORS, number[]> = {
    solarPanel: [],
    body: [],
    battery: [],
    radiator: [],
  };

  for (let t = 0; t <= 90; t++) {
    const inEclipse = t >= 35 && t <= 60;
    const eclipseFactor = inEclipse ? 0.1 : 1.0;

    // Solar Panel: ranges from ~120°C in sunlight to ~-80°C in eclipse
    const solarBase = 120 * eclipseFactor - 80 * (1 - eclipseFactor);
    data.solarPanel.push(solarBase);

    // Body: moderated by insulation, heater, radiator
    const radiatorCooling = radiatorArea * 8; // °C effect
    const heaterWarming = heaterPower * 0.4;
    const insulationBenefit = insulationThickness * 0.3;
    const bodyBase = 40 * eclipseFactor - 60 * (1 - eclipseFactor);
    const bodyTemp =
      bodyBase +
      heaterWarming -
      radiatorCooling * (bodyBase / 40) +
      insulationBenefit;
    data.body.push(bodyTemp);

    // Battery: sensitive, needs to stay warm
    const batteryBase = 20 * eclipseFactor - 40 * (1 - eclipseFactor);
    const batteryTemp = batteryBase + heaterWarming * 0.6 + insulationBenefit * 0.5;
    data.battery.push(batteryTemp);

    // Radiator: always cooler, more so with larger area
    const radBase = -10 * eclipseFactor - 90 * (1 - eclipseFactor);
    const radTemp = radBase - radiatorArea * 3 + heaterWarming * 0.1;
    data.radiator.push(radTemp);
  }

  return data;
}

/** Compute heat flow values for Sankey diagram */
function computeHeatFlow(params: ThermalParams) {
  const { heaterPower, radiatorArea } = params;
  const solarInput = 1400; // W/m² * 1 m² panel ≈ 1400W absorbed
  const panelToBody = solarInput * 0.65;
  const heaterInput = heaterPower;
  const totalIntoBody = panelToBody + heaterInput;
  const radiatedOut = radiatorArea * 120 + 200; // Stefan-Boltzmann simplified
  const storedInBody = Math.max(0, totalIntoBody - radiatedOut);
  const toSpace = radiatedOut + 50; // minimum radiation

  return {
    solarInput,
    panelToBody,
    heaterInput,
    totalIntoBody,
    radiatedOut,
    storedInBody,
    toSpace,
  };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

/** Glassmorphism card wrapper */
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden relative">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      <CardContent className="p-4 sm:p-6">{children}</CardContent>
    </Card>
  );
}

/** 1. Satellite Thermal Diagram */
function SatelliteDiagram({ params }: { params: ThermalParams }) {
  const temps = useMemo(() => {
    const d = computeTemperatures(params);
    return {
      panel: d.solarPanel[20],  // sunlit midpoint
      body: d.body[20],
      battery: d.battery[20],
      shadow: d.solarPanel[47], // eclipse midpoint
      radiator: d.radiator[20],
    };
  }, [params]);

  const fmt = (v: number) => `${Math.round(v)}°C`;

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Thermometer className="h-4 w-4 text-orange-400" />
        Satellite Thermal Diagram
      </h3>
      <svg
        viewBox="0 0 400 260"
        className="w-full max-w-md mx-auto"
        aria-label="Satellite thermal diagram showing temperature zones"
      >
        <defs>
          {/* Solar panel hot gradient */}
          <linearGradient id="hotZone" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          {/* Body moderate gradient */}
          <linearGradient id="modZone" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          {/* Cold zone gradient */}
          <linearGradient id="coldZone" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          {/* Radiator gradient */}
          <linearGradient id="radZone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          {/* Glow filters */}
          <filter id="glowHot">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#f97316" floodOpacity="0.3" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowCold">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#06b6d4" floodOpacity="0.3" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Solar Panel (left side — sunlit) */}
        <rect
          x="20" y="60" width="90" height="140" rx="4"
          fill="url(#hotZone)" filter="url(#glowHot)" opacity="0.9"
        />
        {/* Panel grid lines */}
        {[0, 1, 2, 3].map((row) => (
          <line
            key={`ph-${row}`}
            x1="20" y1={95 + row * 35} x2="110" y2={95 + row * 35}
            stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"
          />
        ))}
        {[0, 1, 2].map((col) => (
          <line
            key={`pv-${col}`}
            x1={42.5 + col * 27.5} y1="60" x2={42.5 + col * 27.5} y2="200"
            stroke="rgba(255,255,255,0.15)" strokeWidth="0.5"
          />
        ))}
        {/* Panel temp label */}
        <text x="65" y="45" textAnchor="middle" fill="#f97316" fontSize="12" fontWeight="bold">
          {fmt(temps.panel)}
        </text>
        <text x="65" y="32" textAnchor="middle" fill="#f97316" fontSize="9" opacity="0.7">
          Solar Panel
        </text>

        {/* Connection arm */}
        <rect x="110" y="120" width="30" height="20" rx="2" fill="#374151" stroke="#4b5563" strokeWidth="0.5" />

        {/* Satellite Body (center) */}
        <rect
          x="140" y="70" width="120" height="120" rx="6"
          fill="url(#modZone)" opacity="0.85"
        />
        <rect x="140" y="70" width="120" height="120" rx="6"
          fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"
        />
        {/* Body internal detail */}
        <rect x="155" y="85" width="40" height="30" rx="2" fill="rgba(0,0,0,0.2)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <rect x="205" y="85" width="40" height="30" rx="2" fill="rgba(0,0,0,0.2)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <circle cx="200" cy="145" r="15" fill="rgba(0,0,0,0.15)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        {/* Battery indicator inside body */}
        <rect x="160" y="130" width="24" height="12" rx="2" fill="rgba(168,85,247,0.3)" stroke="rgba(168,85,247,0.5)" strokeWidth="0.5" />
        <text x="172" y="150" textAnchor="middle" fill="#a855f7" fontSize="8">
          Batt
        </text>
        {/* Body temp */}
        <text x="200" y="58" textAnchor="middle" fill="#eab308" fontSize="12" fontWeight="bold">
          {fmt(temps.body)}
        </text>
        <text x="200" y="45" textAnchor="middle" fill="#eab308" fontSize="9" opacity="0.7">
          Body
        </text>
        {/* Battery temp */}
        <text x="200" y="200" textAnchor="middle" fill="#a855f7" fontSize="11" fontWeight="bold">
          Batt: {fmt(temps.battery)}
        </text>

        {/* Connection arm right */}
        <rect x="260" y="120" width="30" height="20" rx="2" fill="#374151" stroke="#4b5563" strokeWidth="0.5" />

        {/* Radiator Fins (right side) */}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={`fin-${i}`}
            x="290" y={60 + i * 30} width="80" height="22" rx="3"
            fill="url(#radZone)" filter="url(#glowCold)" opacity="0.8"
          />
        ))}
        <text x="330" y="45" textAnchor="middle" fill="#06b6d4" fontSize="12" fontWeight="bold">
          {fmt(temps.radiator)}
        </text>
        <text x="330" y="32" textAnchor="middle" fill="#06b6d4" fontSize="9" opacity="0.7">
          Radiator
        </text>

        {/* Shadow side indicator (bottom bar) */}
        <rect x="140" y="210" width="120" height="30" rx="4" fill="url(#coldZone)" filter="url(#glowCold)" opacity="0.7" />
        <text x="200" y="230" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
          Shadow: {fmt(temps.shadow)}
        </text>

        {/* Sun icon (top-left) */}
        <g transform="translate(30, 15)">
          <circle cx="0" cy="0" r="6" fill="#fbbf24" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <line
                key={`ray-${angle}`}
                x1={Math.cos(rad) * 8}
                y1={Math.sin(rad) * 8}
                x2={Math.cos(rad) * 12}
                y2={Math.sin(rad) * 12}
                stroke="#fbbf24" strokeWidth="1" strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* Arrow showing heat flow direction */}
        <g opacity="0.4">
          <path d="M 115 130 L 135 130" stroke="#f97316" strokeWidth="1.5" fill="none" markerEnd="url(#arrowAmber)" />
          <path d="M 265 130 L 285 130" stroke="#06b6d4" strokeWidth="1.5" fill="none" markerEnd="url(#arrowCyan)" />
        </g>
        <defs>
          <marker id="arrowAmber" viewBox="0 0 6 6" refX="6" refY="3" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#f97316" />
          </marker>
          <marker id="arrowCyan" viewBox="0 0 6 6" refX="6" refY="3" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#06b6d4" />
          </marker>
        </defs>
      </svg>
    </GlassCard>
  );
}

/** 2. Temperature Timeline Chart */
function TemperatureTimeline({ params }: { params: ThermalParams }) {
  const tempData = useMemo(() => computeTemperatures(params), [params]);

  /** Build SVG path from array of values */
  const buildPath = useCallback(
    (values: number[]) => {
      return values
        .map((v, i) => {
          const x = timeToX(i);
          const y = tempToY(v);
          return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ");
    },
    []
  );

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Zap className="h-4 w-4 text-yellow-400" />
        Temperature Timeline (One Orbit — 90 min)
      </h3>
      <div className="overflow-x-auto custom-scrollbar">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full min-w-[480px]"
          aria-label="Temperature timeline chart for one orbital period"
        >
          <defs>
            <clipPath id="plotClip">
              <rect
                x={CHART_PAD_L} y={CHART_PAD_T}
                width={PLOT_W} height={PLOT_H}
              />
            </clipPath>
          </defs>

          {/* Eclipse / Sunlit shading */}
          <rect
            x={timeToX(0)} y={CHART_PAD_T}
            width={timeToX(35) - timeToX(0)} height={PLOT_H}
            fill="rgba(234,179,8,0.06)"
          />
          <rect
            x={timeToX(35)} y={CHART_PAD_T}
            width={timeToX(60) - timeToX(35)} height={PLOT_H}
            fill="rgba(59,130,246,0.1)"
          />
          <rect
            x={timeToX(60)} y={CHART_PAD_T}
            width={timeToX(90) - timeToX(60)} height={PLOT_H}
            fill="rgba(234,179,8,0.06)"
          />

          {/* Phase labels */}
          <text x={timeToX(17.5)} y={CHART_PAD_T + 12} textAnchor="middle" fill="rgba(234,179,8,0.5)" fontSize="8">
            ☀ Sunlit
          </text>
          <text x={timeToX(47.5)} y={CHART_PAD_T + 12} textAnchor="middle" fill="rgba(59,130,246,0.5)" fontSize="8">
            🌑 Eclipse
          </text>
          <text x={timeToX(75)} y={CHART_PAD_T + 12} textAnchor="middle" fill="rgba(234,179,8,0.5)" fontSize="8">
            ☀ Sunlit
          </text>

          {/* Grid lines (horizontal) */}
          {[-100, -50, 0, 50, 100].map((temp) => (
            <g key={`grid-${temp}`}>
              <line
                x1={CHART_PAD_L} y1={tempToY(temp)}
                x2={CHART_PAD_L + PLOT_W} y2={tempToY(temp)}
                stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"
              />
              <text
                x={CHART_PAD_L - 6} y={tempToY(temp) + 3}
                textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="9"
              >
                {temp}°
              </text>
            </g>
          ))}

          {/* Grid lines (vertical) */}
          {[0, 15, 30, 45, 60, 75, 90].map((t) => (
            <g key={`vgrid-${t}`}>
              <line
                x1={timeToX(t)} y1={CHART_PAD_T}
                x2={timeToX(t)} y2={CHART_PAD_T + PLOT_H}
                stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"
              />
              <text
                x={timeToX(t)} y={CHART_H - 8}
                textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9"
              >
                {t}
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text x={CHART_W / 2} y={CHART_H - 0} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">
            Time (min)
          </text>
          <text
            x={10} y={CHART_PAD_T + PLOT_H / 2}
            textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9"
            transform={`rotate(-90, 10, ${CHART_PAD_T + PLOT_H / 2})`}
          >
            Temperature (°C)
          </text>

          {/* Zero line */}
          <line
            x1={CHART_PAD_L} y1={tempToY(0)}
            x2={CHART_PAD_L + PLOT_W} y2={tempToY(0)}
            stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4"
          />

          {/* Temperature lines */}
          <g clipPath="url(#plotClip)">
            {LINE_LABELS.map(({ key, label }) => (
              <path
                key={key}
                d={buildPath(tempData[key])}
                fill="none"
                stroke={LINE_COLORS[key]}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
            ))}
          </g>

          {/* Border */}
          <rect
            x={CHART_PAD_L} y={CHART_PAD_T}
            width={PLOT_W} height={PLOT_H}
            fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"
          />

          {/* Legend */}
          {LINE_LABELS.map(({ key, label }, idx) => (
            <g key={`legend-${key}`} transform={`translate(${CHART_PAD_L + 8 + idx * 120}, ${CHART_PAD_T + PLOT_H + 18})`}>
              <line x1="0" y1="0" x2="14" y2="0" stroke={LINE_COLORS[key]} strokeWidth="2" />
              <text x="18" y="3" fill="rgba(255,255,255,0.5)" fontSize="8">{label}</text>
            </g>
          ))}
        </svg>
      </div>
    </GlassCard>
  );
}

/** 3. Thermal Controls Panel */
function ThermalControls({
  params,
  onChange,
}: {
  params: ThermalParams;
  onChange: (p: ThermalParams) => void;
}) {
  const onHeater = useCallback(
    (v: number[]) => onChange({ ...params, heaterPower: v[0] }),
    [params, onChange]
  );
  const onRadiator = useCallback(
    (v: number[]) => onChange({ ...params, radiatorArea: v[0] }),
    [params, onChange]
  );
  const onInsulation = useCallback(
    (v: number[]) => onChange({ ...params, insulationThickness: v[0] }),
    [params, onChange]
  );

  const controls = [
    {
      label: "Heater Power",
      value: params.heaterPower,
      unit: "W",
      min: 0,
      max: 100,
      step: 1,
      onChange: onHeater,
      color: "text-orange-400",
      barColor: "bg-orange-500",
    },
    {
      label: "Radiator Area",
      value: params.radiatorArea,
      unit: "m²",
      min: 0,
      max: 10,
      step: 0.5,
      onChange: onRadiator,
      color: "text-cyan-400",
      barColor: "bg-cyan-500",
    },
    {
      label: "Insulation Thickness",
      value: params.insulationThickness,
      unit: "mm",
      min: 1,
      max: 50,
      step: 1,
      onChange: onInsulation,
      color: "text-yellow-400",
      barColor: "bg-yellow-500",
    },
  ] as const;

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Wind className="h-4 w-4 text-cyan-400" />
        Thermal Controls
      </h3>
      <div className="space-y-5">
        {controls.map((ctrl) => (
          <div key={ctrl.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{ctrl.label}</span>
              <span className={`text-xs font-mono font-semibold ${ctrl.color}`}>
                {ctrl.step >= 1 ? Math.round(ctrl.value) : ctrl.value.toFixed(1)} {ctrl.unit}
              </span>
            </div>
            <Slider
              min={ctrl.min}
              max={ctrl.max}
              step={ctrl.step}
              value={[ctrl.value]}
              onValueChange={ctrl.onChange}
              className="py-1"
            />
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-white/5">
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Adjust controls to simulate real-time thermal response. Changes are reflected in the
          satellite diagram, temperature timeline, and heat flow visualization.
        </p>
      </div>
    </GlassCard>
  );
}

/** 4. Heat Flow Sankey-style Diagram */
function HeatFlowSankey({ params }: { params: ThermalParams }) {
  const flow = useMemo(() => computeHeatFlow(params), [params]);

  /** Arrow width proportional to flow (W) */
  const w = (watts: number) => Math.max(4, Math.min(50, (watts / 2000) * 50));

  const nodes = [
    { label: "Solar\nInput", x: 30, y: 100, color: "#f59e0b", flow: flow.solarInput },
    { label: "Solar\nPanel", x: 140, y: 100, color: "#f97316", flow: flow.panelToBody },
    { label: "Heater", x: 140, y: 180, color: "#ef4444", flow: flow.heaterInput },
    { label: "Body", x: 250, y: 130, color: "#eab308", flow: flow.totalIntoBody },
    { label: "Radiator", x: 360, y: 80, color: "#06b6d4", flow: flow.radiatedOut },
    { label: "Space", x: 440, y: 80, color: "#38bdf8", flow: flow.toSpace },
  ];

  const links = [
    { from: 0, to: 1, flow: flow.solarInput, color: "#f59e0b" },
    { from: 1, to: 3, flow: flow.panelToBody, color: "#eab308" },
    { from: 2, to: 3, flow: flow.heaterInput, color: "#ef4444" },
    { from: 3, to: 4, flow: flow.radiatedOut, color: "#06b6d4" },
    { from: 4, to: 5, flow: flow.toSpace, color: "#38bdf8" },
  ];

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <ArrowRight className="h-4 w-4 text-amber-400" />
        Heat Flow Diagram
      </h3>
      <svg viewBox="0 0 500 250" className="w-full" aria-label="Heat flow Sankey diagram">
        <defs>
          {links.map((link, i) => (
            <linearGradient key={`linkGrad-${i}`} id={`lg-${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={link.color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={link.color} stopOpacity="0.2" />
            </linearGradient>
          ))}
        </defs>

        {/* Links (flow arrows) */}
        {links.map((link, i) => {
          const from = nodes[link.from];
          const to = nodes[link.to];
          const aw = w(link.flow);
          return (
            <g key={`link-${i}`}>
              <path
                d={`M ${from.x + 20} ${from.y - aw / 2} 
                    C ${(from.x + to.x) / 2} ${from.y - aw / 2}, 
                      ${(from.x + to.x) / 2} ${to.y - aw / 2}, 
                      ${to.x - 20} ${to.y - aw / 2}
                    L ${to.x - 20} ${to.y + aw / 2}
                    C ${(from.x + to.x) / 2} ${to.y + aw / 2}, 
                      ${(from.x + to.x) / 2} ${from.y + aw / 2}, 
                      ${from.x + 20} ${from.y + aw / 2} Z`}
                fill={`url(#lg-${i})`}
              />
              {/* Flow label */}
              <text
                x={(from.x + to.x) / 2}
                y={Math.min(from.y, to.y) - aw / 2 - 5}
                textAnchor="middle"
                fill="rgba(255,255,255,0.45)"
                fontSize="8"
                fontWeight="bold"
              >
                {Math.round(link.flow)} W
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const nw = Math.max(30, w(node.flow) + 10);
          const nh = 36;
          return (
            <g key={`node-${i}`}>
              <rect
                x={node.x - nw / 2} y={node.y - nh / 2}
                width={nw} height={nh} rx="4"
                fill={node.color} opacity="0.2"
                stroke={node.color} strokeWidth="1" strokeOpacity="0.5"
              />
              {node.label.split("\n").map((line, li) => (
                <text
                  key={`nl-${i}-${li}`}
                  x={node.x}
                  y={node.y - 3 + li * 11}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.8)"
                  fontSize="9"
                  fontWeight="600"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </GlassCard>
  );
}

/** 5. Eclipse Predictor */
function EclipsePredictor() {
  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Moon className="h-4 w-4 text-blue-400" />
        Eclipse Predictor — Next 5 Orbits
      </h3>
      <div className="space-y-3">
        {NEXT_ECLIPSES.map((ecl, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-500/10 shrink-0">
              <Moon className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white">
                  Orbit {ecl.orbit}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {ecl.duration} min
                </span>
              </div>
              {/* Duration bar */}
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(ecl.duration / 35) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.08 + 0.2 }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 gap-2">
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Sun className="h-2.5 w-2.5 text-amber-500" />
                  Entry: {ecl.entry}
                </span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Sun className="h-2.5 w-2.5 text-amber-400" />
                  Exit: {ecl.exit}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

export function ThermalModel() {
  const [params, setParams] = useState<ThermalParams>({
    heaterPower: 50,
    radiatorArea: 5,
    insulationThickness: 20,
  });

  const handleParamsChange = useCallback((newParams: ThermalParams) => {
    setParams(newParams);
  }, []);

  return (
    <section id="thermal-model" className="py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Thermal Model"
          subtitle="Real-time satellite thermal analysis — temperature zones, orbital cycling, and heat flow management"
          icon={<Thermometer className="h-6 w-6 text-orange-400" />}
          sectionNumber="§30"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Row 1: Diagram + Controls */}
          <SatelliteDiagram params={params} />
          <ThermalControls params={params} onChange={handleParamsChange} />

          {/* Row 2: Timeline (full width) */}
          <div className="lg:col-span-2">
            <TemperatureTimeline params={params} />
          </div>

          {/* Row 3: Heat Flow + Eclipse Predictor */}
          <HeatFlowSankey params={params} />
          <EclipsePredictor />
        </div>
      </div>
    </section>
  );
}