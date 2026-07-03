"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "./SectionHeader";
import { Calculator, Zap, Rocket, Radio } from "lucide-react";

// --- Constants ---
const MU = 398600.4418; // km³/s²
const R_EARTH = 6371; // km
const C = 299792.458; // km/s

// --- Shared helpers ---
function OutputRow({
  label,
  value,
  unit,
  formula,
  colorClass,
}: {
  label: string;
  value: string;
  unit: string;
  formula: string;
  colorClass?: string;
}) {
  return (
    <div className="py-3 border-b border-gray-200 dark:border-slate-800/50 last:border-0">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-mono text-gray-900 dark:text-white transition-shadow duration-300 ${colorClass ?? ""}`} style={{ textShadow: colorClass ? '0 0 8px rgba(16,185,129,0.2)' : undefined }}>
        {value}{" "}
        <span className="text-xs text-gray-400 font-sans">{unit}</span>
      </p>
      <p className="text-[10px] text-gray-400 dark:text-gray-600 font-mono mt-1 bg-gray-50 dark:bg-slate-950/40 rounded px-1.5 py-0.5 inline-block">{formula}</p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-500 uppercase tracking-wider">
        {label}
      </Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="bg-gray-100 dark:bg-slate-800/60 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white font-mono pr-12 h-9 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
          {unit}
        </span>
      </div>
    </div>
  );
}

// --- Tab 1: Orbital Velocity ---
function OrbitalVelocityTab() {
  const [altitude, setAltitude] = useState(408);

  const results = useMemo(() => {
    const r = R_EARTH + altitude;
    const v = Math.sqrt(MU / r);
    const T = 2 * Math.PI * Math.sqrt(Math.pow(r, 3) / MU);
    return { v, T, r };
  }, [altitude]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <InputField
          label="Altitude"
          value={altitude}
          onChange={setAltitude}
          unit="km"
        />
        <div className="text-xs text-gray-600 space-y-1 pt-2">
          <p>
            Earth radius (R) = {R_EARTH} km
          </p>
          <p>
            Orbit radius (r) = {results.r.toFixed(2)} km
          </p>
          <p>
            Gravitational parameter (μ) = {MU} km³/s²
          </p>
        </div>
      </div>
      <div className="space-y-0">
        <OutputRow
          label="Circular Orbital Velocity"
          value={results.v.toFixed(4)}
          unit="km/s"
          formula="v = √(μ / (R + h))"
        />
        <OutputRow
          label="Orbital Period"
          value={results.T.toFixed(4)}
          unit="s"
          formula="T = 2π√((R + h)³ / μ)"
        />
      </div>
    </div>
  );
}

// --- Tab 2: Hohmann Transfer ---
function HohmannTransferTab() {
  const [r1, setR1] = useState(6778);
  const [r2, setR2] = useState(7178);

  const results = useMemo(() => {
    const dv1 =
      Math.sqrt(MU / r1) * (Math.sqrt((2 * r2) / (r1 + r2)) - 1);
    const dv2 =
      Math.sqrt(MU / r2) * (1 - Math.sqrt((2 * r1) / (r1 + r2)));
    const totalDv = dv1 + dv2;
    const transferTime =
      (Math.PI * Math.sqrt(Math.pow(r1 + r2, 3) / (8 * MU))) / 60; // seconds → minutes
    return { dv1, dv2, totalDv, transferTime };
  }, [r1, r2]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <InputField
          label="Initial Orbit Radius (r₁)"
          value={r1}
          onChange={setR1}
          unit="km"
        />
        <InputField
          label="Final Orbit Radius (r₂)"
          value={r2}
          onChange={setR2}
          unit="km"
        />
        <div className="text-xs text-gray-600 space-y-1 pt-2">
          <p>
            Initial altitude ≈ {(r1 - R_EARTH).toFixed(0)} km
          </p>
          <p>
            Final altitude ≈ {(r2 - R_EARTH).toFixed(0)} km
          </p>
        </div>
      </div>
      <div className="space-y-0">
        <OutputRow
          label="Δv₁ (First Burn)"
          value={results.dv1.toFixed(4)}
          unit="km/s"
          formula="Δv₁ = √(μ/r₁) × (√(2r₂/(r₁+r₂)) - 1)"
        />
        <OutputRow
          label="Δv₂ (Second Burn)"
          value={results.dv2.toFixed(4)}
          unit="km/s"
          formula="Δv₂ = √(μ/r₂) × (1 - √(2r₁/(r₁+r₂)))"
        />
        <OutputRow
          label="Total Δv"
          value={results.totalDv.toFixed(4)}
          unit="km/s"
          formula="Δv = Δv₁ + Δv₂"
        />
        <OutputRow
          label="Transfer Time"
          value={results.transferTime.toFixed(4)}
          unit="min"
          formula="t = π × √((r₁+r₂)³ / (8μ))"
        />
      </div>
    </div>
  );
}

// --- Tab 3: Escape Velocity ---
function EscapeVelocityTab() {
  const [altitude, setAltitude] = useState(400);

  const results = useMemo(() => {
    const r = R_EARTH + altitude;
    const vEscape = Math.sqrt((2 * MU) / r);
    const vCircular = Math.sqrt(MU / r);
    const ratio = vCircular / vEscape;
    return { vEscape, vCircular, ratio };
  }, [altitude]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <InputField
          label="Altitude"
          value={altitude}
          onChange={setAltitude}
          unit="km"
        />
        <div className="text-xs text-gray-600 space-y-1 pt-2">
          <p>
            Earth radius (R) = {R_EARTH} km
          </p>
          <p>
            Orbit radius (r) = {(R_EARTH + altitude).toFixed(2)} km
          </p>
        </div>
      </div>
      <div className="space-y-0">
        <OutputRow
          label="Escape Velocity"
          value={results.vEscape.toFixed(4)}
          unit="km/s"
          formula="v_esc = √(2μ / (R + h))"
        />
        <OutputRow
          label="Circular Velocity"
          value={results.vCircular.toFixed(4)}
          unit="km/s"
          formula="v_circ = √(μ / (R + h))"
        />
        <OutputRow
          label="v_circ / v_esc Ratio"
          value={results.ratio.toFixed(4)}
          unit="= 1/√2 ≈ 0.7071"
          formula="v_circ / v_esc = 1/√2"
        />
      </div>
    </div>
  );
}

// --- Tab 4: Communication Link Budget ---
function LinkBudgetTab() {
  const [frequency, setFrequency] = useState(2.2);
  const [txPower, setTxPower] = useState(10);
  const [txGain, setTxGain] = useState(3);
  const [range, setRange] = useState(600);
  const [rxGain, setRxGain] = useState(0);
  const [dataRate, setDataRate] = useState(9.6);

  const results = useMemo(() => {
    const fHz = frequency * 1e9;
    const wavelength = C / (frequency * 1e6); // C in km/s, f in MHz → λ in km
    // FSPL in dB: 20*log10(4*π*d/λ) where d and λ in same units
    const fspl =
      20 * Math.log10((4 * Math.PI * range) / wavelength);
    // Pr in dBW: Pt(dBW) + Gt(dBi) + Gr(dBi) - FSPL(dB)
    const ptDbw = 10 * Math.log10(txPower);
    const pr = ptDbw + txGain + rxGain - fspl;
    // Link margin vs receiver sensitivity
    const receiverSensitivityDbw = -150; // -120 dBm = -150 dBW
    const linkMargin = pr - receiverSensitivityDbw;
    return { wavelength, fspl, pr, linkMargin };
  }, [frequency, txPower, txGain, range, rxGain, dataRate]);

  const marginColor =
    results.linkMargin > 10
      ? "text-cyan-400"
      : results.linkMargin >= 3
        ? "text-amber-400"
        : "text-rose-400";

  const marginBg =
    results.linkMargin > 10
      ? "bg-cyan-500/10"
      : results.linkMargin >= 3
        ? "bg-amber-500/10"
        : "bg-rose-500/10";

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <InputField
          label="Frequency"
          value={frequency}
          onChange={setFrequency}
          unit="GHz"
        />
        <InputField
          label="TX Power"
          value={txPower}
          onChange={setTxPower}
          unit="W"
        />
        <InputField
          label="TX Gain"
          value={txGain}
          onChange={setTxGain}
          unit="dBi"
        />
        <InputField
          label="Range"
          value={range}
          onChange={setRange}
          unit="km"
        />
        <InputField
          label="RX Gain"
          value={rxGain}
          onChange={setRxGain}
          unit="dBi"
        />
        <InputField
          label="Data Rate"
          value={dataRate}
          onChange={setDataRate}
          unit="kbps"
        />
      </div>
      <div className="space-y-0">
        <OutputRow
          label="Wavelength (λ)"
          value={results.wavelength.toFixed(4)}
          unit="km"
          formula={`λ = c / f = ${(C / 1e3).toFixed(6)}×10³ / (${frequency}×10⁶)`}
        />
        <OutputRow
          label="Free-Space Path Loss"
          value={results.fspl.toFixed(4)}
          unit="dB"
          formula="FSPL = 20·log₁₀(4πd / λ)"
        />
        <OutputRow
          label="Received Power"
          value={results.pr.toFixed(4)}
          unit="dBW"
          formula="Pr = Pt + Gt + Gr - FSPL"
        />
        <div className="py-3">
          <p className="text-xs text-gray-500 mb-1">Link Margin</p>
          <div className="flex items-center gap-3">
            <p className={`text-lg font-mono ${marginColor}`}>
              {results.linkMargin.toFixed(4)}{" "}
              <span className="text-xs text-gray-400 font-sans">dB</span>
            </p>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${marginBg} ${marginColor}`}
            >
              {results.linkMargin > 10
                ? "STRONG"
                : results.linkMargin >= 3
                  ? "ADEQUATE"
                  : "WEAK"}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-600 font-mono mt-1">
            Margin = Pr - (-150 dBW) | Sensitivity: -120 dBm
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-600 font-mono mt-0.5 bg-gray-50 dark:bg-slate-950/40 rounded px-1.5 py-0.5 inline-block">
            Margin = Pr - S_rx
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---
export function OrbitalCalculator() {
  return (
    <section id="calculator" className="py-16 sm:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          title="Orbital Mechanics Calculator"
          subtitle="Live computation of orbital velocity, Hohmann transfers, escape velocity, and RF link budgets"
          icon={<Calculator className="h-6 w-6 text-cyan-400" />}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-white border border-gray-200 shadow-sm dark:bg-slate-900/80 dark:backdrop-blur-sm dark:border-slate-800">
            <CardContent className="p-4 sm:p-6">
              <Tabs defaultValue="velocity" className="w-full">
                <TabsList className="bg-gray-100 border border-gray-200 dark:bg-slate-800/80 dark:border-slate-700/50 mb-6 w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
                  <TabsTrigger
                    value="velocity"
                    className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_10px_rgba(16,185,129,0.15)] text-gray-500 gap-1.5 text-xs sm:text-sm transition-all duration-300"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Orbital </span>Velocity
                  </TabsTrigger>
                  <TabsTrigger
                    value="hohmann"
                    className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_10px_rgba(16,185,129,0.15)] text-gray-500 gap-1.5 text-xs sm:text-sm transition-all duration-300"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Hohmann </span>Transfer
                  </TabsTrigger>
                  <TabsTrigger
                    value="escape"
                    className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_10px_rgba(16,185,129,0.15)] text-gray-500 gap-1.5 text-xs sm:text-sm transition-all duration-300"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Escape </span>Velocity
                  </TabsTrigger>
                  <TabsTrigger
                    value="linkbudget"
                    className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_10px_rgba(16,185,129,0.15)] text-gray-500 gap-1.5 text-xs sm:text-sm transition-all duration-300"
                  >
                    <Radio className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Link </span>Budget
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="velocity">
                  <OrbitalVelocityTab />
                </TabsContent>
                <TabsContent value="hohmann">
                  <HohmannTransferTab />
                </TabsContent>
                <TabsContent value="escape">
                  <EscapeVelocityTab />
                </TabsContent>
                <TabsContent value="linkbudget">
                  <LinkBudgetTab />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}