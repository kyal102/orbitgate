"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeader } from "./SectionHeader";
import { toast } from "sonner";
import {
  Rocket,
  Copy,
  Zap,
  Weight,
  Radio,
  DollarSign,
  Save,
  RotateCcw,
  Satellite,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type MissionType = "comms" | "earth-obs" | "nav" | "science" | "cargo";
type BusSize = "small" | "medium" | "large";
type Propulsion = "none" | "cold-gas" | "hydrazine" | "ion" | "bipropellant";

interface SpacecraftConfig {
  missionType: MissionType;
  busSize: BusSize;
  solarPanelArea: number;
  antennaDiameter: number;
  batteryCapacity: number;
  propulsion: Propulsion;
  payloadMass: number;
}

interface MassBudget {
  structure: number;
  propulsion: number;
  power: number;
  thermal: number;
  comms: number;
  payload: number;
  margin: number;
  total: number;
}

interface PowerBudget {
  solarGen: number;
  battery: number;
  payloadConsumption: number;
  busConsumption: number;
  marginW: number;
  marginPct: number;
}

interface LinkBudget {
  eirp: number;
  gt: number;
  dataRate: number;
  eirpStatus: "green" | "amber" | "red";
  gtStatus: "green" | "amber" | "red";
  dataRateStatus: "green" | "amber" | "red";
}

interface CostBreakdown {
  bus: number;
  payload: number;
  launch: number;
  insurance: number;
  operations: number;
  total: number;
}

/* ------------------------------------------------------------------ */
/*  Presets                                                            */
/* ------------------------------------------------------------------ */
interface Preset {
  name: string;
  config: SpacecraftConfig;
}

const PRESETS: Preset[] = [
  {
    name: "Iridium Next",
    config: {
      missionType: "comms",
      busSize: "small",
      solarPanelArea: 9,
      antennaDiameter: 1.2,
      batteryCapacity: 12,
      propulsion: "bipropellant",
      payloadMass: 400,
    },
  },
  {
    name: "Starlink",
    config: {
      missionType: "comms",
      busSize: "small",
      solarPanelArea: 12,
      antennaDiameter: 0.6,
      batteryCapacity: 8,
      propulsion: "ion",
      payloadMass: 260,
    },
  },
  {
    name: "GOES-R",
    config: {
      missionType: "earth-obs",
      busSize: "large",
      solarPanelArea: 45,
      antennaDiameter: 5,
      batteryCapacity: 85,
      propulsion: "bipropellant",
      payloadMass: 3500,
    },
  },
  {
    name: "Hubble",
    config: {
      missionType: "science",
      busSize: "large",
      solarPanelArea: 36,
      antennaDiameter: 1.3,
      batteryCapacity: 60,
      propulsion: "none",
      payloadMass: 5000,
    },
  },
  {
    name: "James Webb",
    config: {
      missionType: "science",
      busSize: "large",
      solarPanelArea: 22,
      antennaDiameter: 0.6,
      batteryCapacity: 40,
      propulsion: "none",
      payloadMass: 3500,
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Default config                                                     */
/* ------------------------------------------------------------------ */
const DEFAULT_CONFIG: SpacecraftConfig = {
  missionType: "comms",
  busSize: "medium",
  solarPanelArea: 15,
  antennaDiameter: 2.0,
  batteryCapacity: 30,
  propulsion: "bipropellant",
  payloadMass: 1000,
};

/* ------------------------------------------------------------------ */
/*  Computation helpers                                                */
/* ------------------------------------------------------------------ */
const BUS_MASS: Record<BusSize, number> = { small: 200, medium: 800, large: 2500 };
const BUS_POWER: Record<BusSize, number> = { small: 100, medium: 400, large: 1200 };

const PROPULSION_MASS_FACTOR: Record<Propulsion, number> = {
  none: 0,
  "cold-gas": 0.05,
  hydrazine: 0.12,
  ion: 0.03,
  bipropellant: 0.18,
};

const PROPULSION_POWER: Record<Propulsion, number> = {
  none: 0,
  "cold-gas": 5,
  hydrazine: 10,
  ion: 150,
  bipropellant: 20,
};

const MISSION_PAYLOAD_POWER_FACTOR: Record<MissionType, number> = {
  comms: 0.35,
  "earth-obs": 0.5,
  nav: 0.25,
  science: 0.55,
  cargo: 0.05,
};

const SOLAR_EFFICIENCY = 0.29; // 29% GaAs
const SOLAR_FLUX = 1361; // W/m² at 1 AU

function computeMassBudget(cfg: SpacecraftConfig): MassBudget {
  const busMass = BUS_MASS[cfg.busSize];
  const propMass = busMass * PROPULSION_MASS_FACTOR[cfg.propulsion];
  const panelMassKg = cfg.solarPanelArea * 8; // ~8 kg/m²
  const batteryMassKg = cfg.batteryCapacity * 5; // ~5 kg/kWh
  const powerMass = panelMassKg + batteryMassKg;
  const thermalMass = busMass * 0.08;
  const antennaMassKg = cfg.antennaDiameter * cfg.antennaDiameter * 15;
  const commsMass = antennaMassKg + busMass * 0.05;
  const payload = cfg.payloadMass;
  const subTotal = busMass + propMass + powerMass + thermalMass + commsMass + payload;
  const margin = subTotal * 0.15;
  const total = subTotal + margin;
  return { structure: busMass, propulsion: propMass, power: powerMass, thermal: thermalMass, comms: commsMass, payload, margin, total };
}

function computePowerBudget(cfg: SpacecraftConfig): PowerBudget {
  const solarGen = cfg.solarPanelArea * SOLAR_EFFICIENCY * SOLAR_FLUX;
  const batteryW = (cfg.batteryCapacity * 1000) / 2; // usable for ~2h eclipse
  const busBase = BUS_POWER[cfg.busSize];
  const propPower = PROPULSION_POWER[cfg.propulsion];
  const busConsumption = busBase + propPower;
  const maxPayloadPower = solarGen * 0.6;
  const payloadConsumption = maxPayloadPower * MISSION_PAYLOAD_POWER_FACTOR[cfg.missionType];
  const totalConsumption = busConsumption + payloadConsumption;
  const marginW = solarGen - totalConsumption;
  const marginPct = solarGen > 0 ? (marginW / solarGen) * 100 : 0;
  return { solarGen, battery: batteryW, payloadConsumption, busConsumption, marginW, marginPct };
}

function computeLinkBudget(cfg: SpacecraftConfig): LinkBudget {
  const power = computePowerBudget(cfg);
  const txPower = power.solarGen * 0.15; // 15% of total power for comms
  const antennaGain = 10 * Math.log10(10 + 40 * cfg.antennaDiameter * cfg.antennaDiameter);
  const eirp = txPower + antennaGain; // dBW
  const gt = antennaGain - 8 + 10 * Math.log10(290 / (290 + 50)); // G/T dBi/K
  const dataRateMbps = (txPower * 10 * cfg.antennaDiameter) / (cfg.antennaDiameter > 3 ? 5 : 20);

  const eirpThresh = cfg.missionType === "comms" ? 30 : cfg.missionType === "nav" ? 20 : 25;
  const gtThresh = cfg.missionType === "comms" ? 10 : 5;
  const dataThresh = cfg.missionType === "comms" ? 100 : cfg.missionType === "earth-obs" ? 50 : 10;

  const status = (val: number, thresh: number): "green" | "amber" | "red" => {
    if (val >= thresh * 1.2) return "green";
    if (val >= thresh) return "amber";
    return "red";
  };

  return {
    eirp,
    gt,
    dataRate: dataRateMbps,
    eirpStatus: status(eirp, eirpThresh),
    gtStatus: status(gt, gtThresh),
    dataRateStatus: status(dataRateMbps, dataThresh),
  };
}

function computeCost(cfg: SpacecraftConfig, mass: MassBudget): CostBreakdown {
  const busCost = mass.structure * (cfg.busSize === "small" ? 0.3 : cfg.busSize === "medium" ? 0.5 : 0.8);
  const payloadCost = cfg.payloadMass * (cfg.missionType === "science" ? 0.5 : cfg.missionType === "earth-obs" ? 0.4 : 0.15);
  const launchCost = mass.total * 0.02 + 15; // $15M base + per-kg
  const insurance = (busCost + payloadCost + launchCost) * 0.12;
  const ops = mass.total * 0.008 * 5; // 5 year ops at 0.8% per year
  const total = busCost + payloadCost + launchCost + insurance + ops;
  return { bus: busCost, payload: payloadCost, launch: launchCost, insurance, operations: ops, total };
}

/* ------------------------------------------------------------------ */
/*  Color helpers                                                      */
/* ------------------------------------------------------------------ */
const STATUS_COLOR: Record<string, string> = { green: "#06b6d4", amber: "#f59e0b", red: "#ef4444" };

const MASS_COLORS = ["#6b7280", "#f59e0b", "#3b82f6", "#06b6d4", "#eab308", "#a78bfa", "#64748b"];
const POWER_COLORS = ["#06b6d4", "#3b82f6", "#f59e0b", "#6b7280"];

/* ------------------------------------------------------------------ */
/*  SVG Spacecraft Diagram                                             */
/* ------------------------------------------------------------------ */
function SpacecraftSVG(cfg: SpacecraftConfig) {
  const busScale = cfg.busSize === "small" ? 0.6 : cfg.busSize === "medium" ? 1 : 1.4;
  const bw = 60 * busScale;
  const bh = 80 * busScale;
  const cx = 150;
  const cy = 100;

  const panelW = 10 + (cfg.solarPanelArea / 50) * 50 * busScale;
  const panelH = bh * 0.85;
  const panelGap = bw / 2 + 6;

  const dishR = 8 + (cfg.antennaDiameter / 5) * 30 * busScale;

  const radiatorW = (bw * 0.7) / 2;
  const radiatorH = 12 + busScale * 8;
  const radiatorY = cy + bh / 2 + 4;

  return (
    <svg viewBox="0 0 300 240" className="w-full max-w-xs mx-auto" aria-label="Spacecraft diagram">
      <defs>
        <linearGradient id="busGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#4b5563" />
        </linearGradient>
        <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="dishGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="radiatorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Solar panel struts */}
      <line x1={cx - panelGap} y1={cy} x2={cx - bw / 2} y2={cy} stroke="#374151" strokeWidth="2" />
      <line x1={cx + bw / 2} y1={cy} x2={cx + panelGap} y2={cy} stroke="#374151" strokeWidth="2" />

      {/* Left solar panel */}
      <rect
        x={cx - panelGap - panelW}
        y={cy - panelH / 2}
        width={panelW}
        height={panelH}
        rx="2"
        fill="url(#panelGrad)"
        stroke="#93c5fd"
        strokeWidth="0.5"
        opacity="0.9"
      />
      {/* Panel grid lines */}
      {Array.from({ length: Math.min(6, Math.ceil(panelW / 10)) }).map((_, i) => (
        <line
          key={`lg${i}`}
          x1={cx - panelGap - panelW + ((i + 1) * panelW) / (Math.min(6, Math.ceil(panelW / 10)) + 1)}
          y1={cy - panelH / 2}
          x2={cx - panelGap - panelW + ((i + 1) * panelW) / (Math.min(6, Math.ceil(panelW / 10)) + 1)}
          y2={cy + panelH / 2}
          stroke="#93c5fd"
          strokeWidth="0.3"
          opacity="0.5"
        />
      ))}

      {/* Right solar panel */}
      <rect
        x={cx + panelGap}
        y={cy - panelH / 2}
        width={panelW}
        height={panelH}
        rx="2"
        fill="url(#panelGrad)"
        stroke="#93c5fd"
        strokeWidth="0.5"
        opacity="0.9"
      />
      {Array.from({ length: Math.min(6, Math.ceil(panelW / 10)) }).map((_, i) => (
        <line
          key={`rg${i}`}
          x1={cx + panelGap + ((i + 1) * panelW) / (Math.min(6, Math.ceil(panelW / 10)) + 1)}
          y1={cy - panelH / 2}
          x2={cx + panelGap + ((i + 1) * panelW) / (Math.min(6, Math.ceil(panelW / 10)) + 1)}
          y2={cy + panelH / 2}
          stroke="#93c5fd"
          strokeWidth="0.3"
          opacity="0.5"
        />
      ))}

      {/* Central bus */}
      <rect
        x={cx - bw / 2}
        y={cy - bh / 2}
        width={bw}
        height={bh}
        rx="4"
        fill="url(#busGrad)"
        stroke="#9ca3af"
        strokeWidth="1"
        filter="url(#glow)"
      />
      {/* Bus detail lines */}
      <line x1={cx - bw / 2 + 4} y1={cy - bh / 4} x2={cx + bw / 2 - 4} y2={cy - bh / 4} stroke="#6b7280" strokeWidth="0.5" />
      <line x1={cx - bw / 2 + 4} y1={cy} x2={cx + bw / 2 - 4} y2={cy} stroke="#6b7280" strokeWidth="0.5" />
      <line x1={cx - bw / 2 + 4} y1={cy + bh / 4} x2={cx + bw / 2 - 4} y2={cy + bh / 4} stroke="#6b7280" strokeWidth="0.5" />

      {/* Antenna mast */}
      <line x1={cx} y1={cy - bh / 2} x2={cx} y2={cy - bh / 2 - dishR * 0.8} stroke="#9ca3af" strokeWidth="2" />

      {/* Antenna dish */}
      <ellipse
        cx={cx}
        cy={cy - bh / 2 - dishR * 0.8 - dishR * 0.3}
        rx={dishR}
        ry={dishR * 0.35}
        fill="url(#dishGrad)"
        stroke="#fcd34d"
        strokeWidth="0.8"
        filter="url(#glow)"
      />
      {/* Dish feed horn */}
      <line x1={cx} y1={cy - bh / 2 - dishR * 0.8} x2={cx} y2={cy - bh / 2 - dishR * 1.3} stroke="#fbbf24" strokeWidth="1.5" />
      <circle cx={cx} cy={cy - bh / 2 - dishR * 1.3} r="2" fill="#fbbf24" />

      {/* Thermal radiators (fins) */}
      <rect
        x={cx - bw / 2 - radiatorW}
        y={radiatorY}
        width={radiatorW}
        height={radiatorH}
        rx="1"
        fill="url(#radiatorGrad)"
        stroke="#67e8f9"
        strokeWidth="0.5"
        opacity="0.85"
      />
      <rect
        x={cx + bw / 2}
        y={radiatorY}
        width={radiatorW}
        height={radiatorH}
        rx="1"
        fill="url(#radiatorGrad)"
        stroke="#67e8f9"
        strokeWidth="0.5"
        opacity="0.85"
      />
      {/* Radiator detail lines */}
      <line x1={cx - bw / 2 - radiatorW + 3} y1={radiatorY + radiatorH / 2} x2={cx - bw / 2 - 3} y2={radiatorY + radiatorH / 2} stroke="#67e8f9" strokeWidth="0.3" opacity="0.6" />
      <line x1={cx + bw / 2 + 3} y1={radiatorY + radiatorH / 2} x2={cx + bw / 2 + radiatorW - 3} y2={radiatorY + radiatorH / 2} stroke="#67e8f9" strokeWidth="0.3" opacity="0.6" />

      {/* Thruster nozzle (if propulsion) */}
      {cfg.propulsion !== "none" && (
        <g>
          <polygon
            points={`${cx - 6},${cy + bh / 2} ${cx + 6},${cy + bh / 2} ${cx + 10},${cy + bh / 2 + 10} ${cx - 10},${cy + bh / 2 + 10}`}
            fill="#4b5563"
            stroke="#9ca3af"
            strokeWidth="0.5"
          />
          {cfg.propulsion === "ion" && (
            <line x1={cx} y1={cy + bh / 2 + 10} x2={cx} y2={cy + bh / 2 + 20} stroke="#60a5fa" strokeWidth="1" opacity="0.6" />
          )}
        </g>
      )}

      {/* Labels */}
      <text x={cx - panelGap - panelW / 2} y={cy + panelH / 2 + 14} textAnchor="middle" fill="#60a5fa" fontSize="8" fontFamily="monospace">PANELS</text>
      <text x={cx} y={cy + bh / 2 + 28 + (cfg.propulsion !== "none" ? 10 : 0)} textAnchor="middle" fill="#9ca3af" fontSize="8" fontFamily="monospace">BUS</text>
      <text x={cx} y={cy - bh / 2 - dishR * 1.7} textAnchor="middle" fill="#fbbf24" fontSize="8" fontFamily="monospace">ANT</text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Stacked Bar Component                                               */
/* ------------------------------------------------------------------ */
function StackedBar({
  segments,
  colors,
  total,
  unit,
  height = 24,
}: {
  segments: { label: string; value: number }[];
  colors: string[];
  total: number;
  unit: string;
  height?: number;
}) {
  const barWidth = 100; // percent
  return (
    <div className="w-full">
      <div
        className="w-full rounded-md overflow-hidden flex"
        style={{ height }}
      >
        {segments.map((seg, i) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          if (pct < 0.5) return null;
          return (
            <motion.div
              key={seg.label}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="relative group cursor-default"
              style={{ backgroundColor: colors[i % colors.length], minWidth: pct > 0 ? 2 : 0 }}
              title={`${seg.label}: ${seg.value.toFixed(1)} ${unit} (${pct.toFixed(1)}%)`}
            >
              {pct > 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-white/90 whitespace-nowrap overflow-hidden px-1">
                  {seg.label}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {segments.map((seg, i) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-[10px] text-gray-400 font-mono">
              {seg.label}: {seg.value.toFixed(1)} {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Link Budget Item                                                    */
/* ------------------------------------------------------------------ */
function LinkItem({ label, value, unit, status }: { label: string; value: number; unit: string; status: "green" | "amber" | "red" }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-xs text-gray-400 font-mono">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-gray-200">
          {value.toFixed(1)} {unit}
        </span>
        <span
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: STATUS_COLOR[status],
            boxShadow: `0 0 6px ${STATUS_COLOR[status]}60`,
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */
export function SpacecraftDesigner() {
  const [config, setConfig] = useState<SpacecraftConfig>(DEFAULT_CONFIG);

  /* ---- Callbacks ---- */
  const updateField = useCallback(<K extends keyof SpacecraftConfig>(key: K, value: SpacecraftConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const loadPreset = useCallback((preset: Preset) => {
    setConfig(preset.config);
    toast.success(`Loaded "${preset.name}" preset`);
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    toast.info("Configuration reset to defaults");
  }, []);

  const exportConfig = useCallback(() => {
    const json = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      toast.success("Configuration copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  }, [config]);

  /* ---- Computed values ---- */
  const massBudget = useMemo(() => computeMassBudget(config), [config]);
  const powerBudget = useMemo(() => computePowerBudget(config), [config]);
  const linkBudget = useMemo(() => computeLinkBudget(config), [config]);
  const costBreakdown = useMemo(() => computeCost(config, massBudget), [config, massBudget]);

  const massSegments = useMemo(
    () => [
      { label: "Structure", value: massBudget.structure },
      { label: "Propulsion", value: massBudget.propulsion },
      { label: "Power", value: massBudget.power },
      { label: "Thermal", value: massBudget.thermal },
      { label: "Comms", value: massBudget.comms },
      { label: "Payload", value: massBudget.payload },
      { label: "Margin", value: massBudget.margin },
    ],
    [massBudget]
  );

  const powerSegments = useMemo(
    () => [
      { label: "Solar Gen", value: powerBudget.solarGen },
      { label: "Battery", value: powerBudget.battery },
      { label: "Payload Use", value: powerBudget.payloadConsumption },
      { label: "Bus Use", value: powerBudget.busConsumption },
    ],
    [powerBudget]
  );

  const costSegments = useMemo(
    () => [
      { label: "Bus", value: costBreakdown.bus },
      { label: "Payload", value: costBreakdown.payload },
      { label: "Launch", value: costBreakdown.launch },
      { label: "Insurance", value: costBreakdown.insurance },
      { label: "Ops", value: costBreakdown.operations },
    ],
    [costBreakdown]
  );

  return (
    <section id="spacecraft-designer" className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          sectionNumber="§45"
          title="Spacecraft Designer"
          subtitle="Interactive spacecraft configuration tool — design, budget, and estimate mission costs"
          icon={<Rocket className="h-5 w-5 text-cyan-400" />}
        />

        {/* Preset Buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {PRESETS.map((p) => (
            <Button
              key={p.name}
              variant="outline"
              size="sm"
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 text-xs font-mono"
              onClick={() => loadPreset(p)}
            >
              <Satellite className="h-3 w-3 mr-1.5" />
              {p.name}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-300 text-xs"
            onClick={resetConfig}
          >
            <RotateCcw className="h-3 w-3 mr-1.5" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 text-xs font-mono"
            onClick={exportConfig}
          >
            <Copy className="h-3 w-3 mr-1.5" />
            Export JSON
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* === Left Column: SVG Diagram + Config === */}
          <div className="lg:col-span-5 space-y-6">
            {/* Spacecraft SVG */}
            <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-cyan-400 flex items-center gap-2">
                  <Satellite className="h-4 w-4" />
                  Spacecraft View
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SpacecraftSVG cfg={config} />
                <div className="flex justify-center gap-4 mt-2">
                  {[
                    { color: "#4b5563", label: "Bus" },
                    { color: "#3b82f6", label: "Panels" },
                    { color: "#fbbf24", label: "Antenna" },
                    { color: "#06b6d4", label: "Radiator" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-gray-500 font-mono">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Configuration Panel */}
            <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-cyan-400 flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mission Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400 font-mono">Mission Type</Label>
                  <Select
                    value={config.missionType}
                    onValueChange={(v) => updateField("missionType", v as MissionType)}
                  >
                    <SelectTrigger className="w-full border-slate-700/60 bg-slate-800/50 text-xs font-mono text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-900">
                      <SelectItem value="comms" className="text-xs font-mono text-gray-200">Communications</SelectItem>
                      <SelectItem value="earth-obs" className="text-xs font-mono text-gray-200">Earth Observation</SelectItem>
                      <SelectItem value="nav" className="text-xs font-mono text-gray-200">Navigation</SelectItem>
                      <SelectItem value="science" className="text-xs font-mono text-gray-200">Science</SelectItem>
                      <SelectItem value="cargo" className="text-xs font-mono text-gray-200">Cargo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bus Size */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400 font-mono">Bus Size</Label>
                  <Select
                    value={config.busSize}
                    onValueChange={(v) => updateField("busSize", v as BusSize)}
                  >
                    <SelectTrigger className="w-full border-slate-700/60 bg-slate-800/50 text-xs font-mono text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-900">
                      <SelectItem value="small" className="text-xs font-mono text-gray-200">Small (~200 kg)</SelectItem>
                      <SelectItem value="medium" className="text-xs font-mono text-gray-200">Medium (~800 kg)</SelectItem>
                      <SelectItem value="large" className="text-xs font-mono text-gray-200">Large (~2500 kg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Solar Panel Area */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-400 font-mono">Solar Panel Area</Label>
                    <span className="text-xs font-mono text-cyan-400">{config.solarPanelArea} m²</span>
                  </div>
                  <Slider
                    value={[config.solarPanelArea]}
                    onValueChange={([v]) => updateField("solarPanelArea", v)}
                    min={1}
                    max={50}
                    step={1}
                    className="py-1"
                  />
                </div>

                {/* Antenna Diameter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-400 font-mono">Antenna Diameter</Label>
                    <span className="text-xs font-mono text-cyan-400">{config.antennaDiameter.toFixed(1)} m</span>
                  </div>
                  <Slider
                    value={[config.antennaDiameter]}
                    onValueChange={([v]) => updateField("antennaDiameter", v)}
                    min={0.5}
                    max={5}
                    step={0.1}
                    className="py-1"
                  />
                </div>

                {/* Battery Capacity */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-400 font-mono">Battery Capacity</Label>
                    <span className="text-xs font-mono text-cyan-400">{config.batteryCapacity} kWh</span>
                  </div>
                  <Slider
                    value={[config.batteryCapacity]}
                    onValueChange={([v]) => updateField("batteryCapacity", v)}
                    min={1}
                    max={100}
                    step={1}
                    className="py-1"
                  />
                </div>

                {/* Propulsion */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400 font-mono">Propulsion</Label>
                  <Select
                    value={config.propulsion}
                    onValueChange={(v) => updateField("propulsion", v as Propulsion)}
                  >
                    <SelectTrigger className="w-full border-slate-700/60 bg-slate-800/50 text-xs font-mono text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-900">
                      <SelectItem value="none" className="text-xs font-mono text-gray-200">None</SelectItem>
                      <SelectItem value="cold-gas" className="text-xs font-mono text-gray-200">Cold Gas</SelectItem>
                      <SelectItem value="hydrazine" className="text-xs font-mono text-gray-200">Hydrazine</SelectItem>
                      <SelectItem value="ion" className="text-xs font-mono text-gray-200">Ion</SelectItem>
                      <SelectItem value="bipropellant" className="text-xs font-mono text-gray-200">Bipropellant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payload Mass */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-400 font-mono">Payload Mass</Label>
                    <span className="text-xs font-mono text-cyan-400">{config.payloadMass} kg</span>
                  </div>
                  <Slider
                    value={[config.payloadMass]}
                    onValueChange={([v]) => updateField("payloadMass", v)}
                    min={50}
                    max={5000}
                    step={10}
                    className="py-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* === Right Column: Budgets, Link, Cost === */}
          <div className="lg:col-span-7 space-y-6">
            {/* Mass Budget */}
            <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-cyan-400 flex items-center gap-2">
                  <Weight className="h-4 w-4" />
                  Mass Budget
                  <span className="ml-auto text-xs text-gray-500 font-mono">
                    Total: {massBudget.total.toFixed(0)} kg
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StackedBar
                  segments={massSegments}
                  colors={MASS_COLORS}
                  total={massBudget.total}
                  unit="kg"
                />
              </CardContent>
            </Card>

            {/* Power Budget */}
            <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-cyan-400 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Power Budget
                  <span
                    className={`ml-auto text-xs font-mono ${
                      powerBudget.marginPct > 20 ? "text-cyan-400" : powerBudget.marginPct > 0 ? "text-amber-400" : "text-red-400"
                    }`}
                  >
                    Margin: {powerBudget.marginPct.toFixed(1)}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StackedBar
                  segments={powerSegments}
                  colors={POWER_COLORS}
                  total={powerBudget.solarGen + powerBudget.battery}
                  unit="W"
                />
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Solar Gen</p>
                    <p className="text-sm font-mono text-gray-200">{powerBudget.solarGen.toFixed(0)} W</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Battery</p>
                    <p className="text-sm font-mono text-gray-200">{powerBudget.battery.toFixed(0)} Wh</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Payload Use</p>
                    <p className="text-sm font-mono text-gray-200">{powerBudget.payloadConsumption.toFixed(0)} W</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Bus Use</p>
                    <p className="text-sm font-mono text-gray-200">{powerBudget.busConsumption.toFixed(0)} W</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Link Budget */}
            <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-cyan-400 flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  Link Budget Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-slate-700/40">
                <LinkItem label="EIRP" value={linkBudget.eirp} unit="dBW" status={linkBudget.eirpStatus} />
                <LinkItem label="G/T" value={linkBudget.gt} unit="dBi/K" status={linkBudget.gtStatus} />
                <LinkItem label="Data Rate" value={linkBudget.dataRate} unit="Mbps" status={linkBudget.dataRateStatus} />
              </CardContent>
              <div className="px-6 pb-4 flex items-center gap-4 text-[10px] text-gray-500 font-mono">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Sufficient</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Marginal</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Insufficient</span>
              </div>
            </Card>

            {/* Cost Estimator */}
            <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-cyan-400 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cost Estimator
                  <span className="ml-auto text-base font-mono text-gray-200 font-bold">
                    ${costBreakdown.total.toFixed(1)}M
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StackedBar
                  segments={costSegments}
                  colors={["#6b7280", "#a78bfa", "#f59e0b", "#ef4444", "#06b6d4"]}
                  total={costBreakdown.total}
                  unit="$M"
                />
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  {[
                    { label: "Bus", value: costBreakdown.bus },
                    { label: "Payload", value: costBreakdown.payload },
                    { label: "Launch", value: costBreakdown.launch },
                    { label: "Insurance", value: costBreakdown.insurance },
                    { label: "Ops (5yr)", value: costBreakdown.operations },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-mono text-gray-200">${item.value.toFixed(1)}M</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}