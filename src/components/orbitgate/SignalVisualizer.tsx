"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { SectionHeader } from "./SectionHeader";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Radio, Activity } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SATELLITE_PRESETS = [
  { id: "iss", label: "ISS (LEO 408 km)", distance: 408 },
  { id: "starlink", label: "Starlink (LEO 550 km)", distance: 550 },
  { id: "iridium", label: "Iridium (LEO 780 km)", distance: 780 },
  { id: "gps", label: "GPS (MEO 20,200 km)", distance: 20200 },
  { id: "geo-comms", label: "GEO Comms (35,786 km)", distance: 35786 },
  { id: "moon", label: "Lunar Probe (~384,400 km)", distance: 384400 },
];

const FREQ_BANDS = [
  { name: "UHF", range: "300 MHz – 3 GHz", freq: 0.4 },
  { name: "S", range: "2 – 4 GHz", freq: 2.2 },
  { name: "X", range: "8 – 12 GHz", freq: 8.4 },
  { name: "Ku", range: "12 – 18 GHz", freq: 14.5 },
  { name: "Ka", range: "26 – 40 GHz", freq: 32.0 },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function computeMetrics(distance: number) {
  // Free-space path loss approximation (dB) at X-band ~8.4 GHz
  const fspl =
    20 * Math.log10(Math.max(distance, 1) * 1000) +
    20 * Math.log10(8.4e9) +
    20 * Math.log10(4 * Math.PI / 3e8);

  const noiseFigure = 2 + Math.random() * 0.5;
  const txPower = 45; // dBm EIRP
  const rxGain = 40;
  const signalPower = txPower + rxGain - fspl + (Math.random() - 0.5) * 2;
  const noisePower = -174 + 10 * Math.log10(36e6) + noiseFigure;
  const snr = signalPower - noisePower + (Math.random() - 0.5) * 1.5;
  const ber = Math.pow(10, -Math.max(1, (snr - 5) / 3) + (Math.random() - 0.5) * 0.3);
  const doppler = distance < 2000
    ? (7.5 + Math.random() * 2) * Math.sin(Date.now() / 3000)
    : (0.5 + Math.random() * 1.5) * Math.sin(Date.now() / 5000);
  const linkMargin = snr - 10 + (Math.random() - 0.5) * 2;
  const dataRate = distance < 1000 ? 150 + Math.random() * 100 : distance < 40000 ? 20 + Math.random() * 30 : 0.5 + Math.random() * 2;

  // Active band based on distance
  let activeBand = 0;
  if (distance > 30000) activeBand = 4; // Ka
  else if (distance > 10000) activeBand = 3; // Ku
  else if (distance > 3000) activeBand = 2; // X
  else if (distance > 800) activeBand = 1; // S
  else activeBand = 0; // UHF

  return {
    snr: Math.round(snr * 10) / 10,
    ber,
    signalPower: Math.round(signalPower * 10) / 10,
    doppler: Math.round(doppler * 100) / 100,
    linkMargin: Math.round(linkMargin * 10) / 10,
    dataRate: Math.round(dataRate * 100) / 100,
    activeBand,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SignalVisualizer() {
  /* ---- State ---- */
  const [distance, setDistance] = useState(408);
  const [presetId, setPresetId] = useState("iss");
  const [metrics, setMetrics] = useState(() => computeMetrics(408));

  /* ---- Canvas refs ---- */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  /* ---- Callbacks (before JSX) ---- */
  const handleDistanceChange = useCallback((val: number[]) => {
    setDistance(val[0]);
  }, []);

  const handlePresetChange = useCallback((val: string) => {
    setPresetId(val);
    const preset = SATELLITE_PRESETS.find((p) => p.id === val);
    if (preset) setDistance(preset.distance);
  }, []);

  /* ---- Oscilloscope animation ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      const mid = h / 2;
      const t = Date.now() / 1000;
      const noiseLevel = (distance / 50000) * 0.9;

      // Background
      ctx.fillStyle = "#0a0f0d";
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "rgba(16,185,129,0.07)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Center line
      ctx.strokeStyle = "rgba(16,185,129,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

      // Waveform
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const phase = (x / w) * Math.PI * 6 + t * 3;
        const noise = (Math.random() - 0.5) * noiseLevel * h * 0.8;
        const y = mid + Math.sin(phase) * (mid * 0.65) * (1 - noiseLevel * 0.5) + noise;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Scan line
      const scanX = (t * 60) % w;
      ctx.strokeStyle = "rgba(16,185,129,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(scanX, 0); ctx.lineTo(scanX, h); ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [distance]);

  /* ---- Metrics simulation (every 2 s) ---- */
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(computeMetrics(distance));
    }, 2000);
    return () => clearInterval(interval);
  }, [distance]);

  /* ---- Polar plot animation ---- */
  const [polarTime, setPolarTime] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setPolarTime((p) => p + 0.04);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  /* ---- Figure-8 polar coords ---- */
  const polarAngle = Math.sin(polarTime) * Math.PI * 0.8;
  const polarElev = 15 + Math.sin(polarTime * 2) * 75;
  const polarR = ((90 - polarElev) / 90) * 80;
  const dotX = 100 + polarR * Math.cos(polarAngle - Math.PI / 2);
  const dotY = 100 - polarR * Math.sin(polarAngle - Math.PI / 2);
  const dotInGreen = polarElev > 10;

  /* ---- Render ---- */
  return (
    <section id="signal-viz" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Signal Visualizer"
          subtitle="Real-time RF link simulation — waveform, metrics, and ground-station tracking"
          icon={<Radio className="h-5 w-5 text-cyan-400" />}
          sectionNumber="§27"
        />

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <label className="text-xs text-gray-400 mb-2 block font-mono">
              Distance: {distance.toLocaleString()} km
            </label>
            <Slider
              min={100}
              max={50000}
              step={10}
              value={[distance]}
              onValueChange={handleDistanceChange}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
              <span>100 km</span>
              <span>50,000 km</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 sm:w-72">
            <label className="text-xs text-gray-400 mb-2 block font-mono">
              Satellite Preset
            </label>
            <Select value={presetId} onValueChange={handlePresetChange}>
              <SelectTrigger className="bg-slate-900/60 border-white/10 text-sm text-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {SATELLITE_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-gray-300 focus:bg-cyan-500/10 focus:text-cyan-300">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Oscilloscope */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-mono text-gray-400">OSCILLOSCOPE — Live Waveform</span>
            <span className="ml-auto text-[10px] font-mono text-cyan-500/60 animate-pulse">● REC</span>
          </div>
          <canvas
            ref={canvasRef}
            className="w-full rounded-lg"
            style={{ height: 120 }}
          />
        </div>

        {/* Signal Metrics — 3x2 grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {/* SNR */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3">
            <div className="text-[10px] font-mono text-gray-500 mb-1">SNR</div>
            <div className="text-lg font-bold text-white font-mono">{metrics.snr} <span className="text-xs text-gray-400">dB</span></div>
            <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, Math.max(0, ((metrics.snr + 10) / 50) * 100))}%`,
                  background: metrics.snr > 15 ? "#06b6d4" : metrics.snr > 5 ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
          </div>

          {/* BER */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3">
            <div className="text-[10px] font-mono text-gray-500 mb-1">Bit Error Rate</div>
            <div className="text-lg font-bold text-white font-mono">{metrics.ber.toExponential(1)}</div>
            <div className="text-[10px] text-gray-500 mt-1 font-mono">BER (scrambled)</div>
          </div>

          {/* Signal Strength — arc gauge */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3">
            <div className="text-[10px] font-mono text-gray-500 mb-1">Signal Strength</div>
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 64 40" className="w-16 h-10 shrink-0">
                <path
                  d="M 8 36 A 24 24 0 0 1 56 36"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M 8 36 A 24 24 0 0 1 56 36"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(1, Math.max(0, ((metrics.signalPower + 160) / 80))) * 75.4} 75.4`}
                  className="transition-all duration-700"
                />
              </svg>
              <div>
                <span className="text-lg font-bold text-white font-mono">{metrics.signalPower}</span>
                <span className="text-xs text-gray-400 ml-1">dBm</span>
              </div>
            </div>
          </div>

          {/* Doppler Shift */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3">
            <div className="text-[10px] font-mono text-gray-500 mb-1">Doppler Shift</div>
            <div className="text-lg font-bold text-white font-mono">
              {metrics.doppler > 0 ? "+" : ""}{metrics.doppler} <span className="text-xs text-gray-400">Hz</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1 font-mono">
              {metrics.doppler > 1 ? "↑ Approaching" : metrics.doppler < -1 ? "↓ Receding" : "~ Tangent"}
            </div>
          </div>

          {/* Link Margin */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3">
            <div className="text-[10px] font-mono text-gray-500 mb-1">Link Margin</div>
            <div className={`text-lg font-bold font-mono ${metrics.linkMargin >= 0 ? "text-cyan-400" : "text-red-400"}`}>
              {metrics.linkMargin > 0 ? "+" : ""}{metrics.linkMargin} <span className="text-xs text-gray-400">dB</span>
            </div>
            <div className={`text-[10px] mt-1 font-mono ${metrics.linkMargin >= 0 ? "text-cyan-500/60" : "text-red-500/60"}`}>
              {metrics.linkMargin >= 0 ? "✓ Link viable" : "✗ Below threshold"}
            </div>
          </div>

          {/* Data Rate */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3">
            <div className="text-[10px] font-mono text-gray-500 mb-1">Data Rate</div>
            <div className="text-lg font-bold text-white font-mono">{metrics.dataRate} <span className="text-xs text-gray-400">Mbps</span></div>
            <div className="text-[10px] text-gray-500 mt-1 font-mono">
              {metrics.dataRate > 100 ? "High throughput" : metrics.dataRate > 10 ? "Standard" : "Low rate"}
            </div>
          </div>
        </div>

        {/* Bottom row: Polar Plot + Frequency Bands */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ground Station Polar Plot */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="text-xs font-mono text-gray-400 mb-3">Ground Station — Polar Plot</div>
            <svg viewBox="0 0 200 200" className="w-full max-w-[280px] mx-auto">
              {/* Red zone (elevation < 10°) */}
              <circle cx="100" cy="100" r="80" fill="rgba(239,68,68,0.06)" stroke="none" />
              <circle cx="100" cy="100" r={80 * (80 / 90)} fill="rgba(239,68,68,0.04)" stroke="none" />

              {/* Green zone (elevation > 10°) */}
              <circle cx="100" cy="100" r={80 * (10 / 90)} fill="none" stroke="none" />
              <circle cx="100" cy="100" r={80 * (10 / 90)} fill="rgba(16,185,129,0.08)" stroke="none" />

              {/* Outer ring */}
              <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              {/* 60° ring */}
              <circle cx="100" cy="100" r={80 * (30 / 90)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
              {/* 30° ring */}
              <circle cx="100" cy="100" r={80 * (60 / 90)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
              {/* 10° ring */}
              <circle cx="100" cy="100" r={80 * (80 / 90)} fill="none" stroke="rgba(239,68,68,0.25)" strokeWidth="0.8" strokeDasharray="3 3" />
              {/* Center */}
              <circle cx="100" cy="100" r="1.5" fill="rgba(255,255,255,0.3)" />

              {/* Cross-hairs */}
              <line x1="20" y1="100" x2="180" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
              <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

              {/* Elevation labels */}
              <text x="104" y="24" fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="monospace">0°</text>
              <text x="104" y="52" fill="rgba(255,255,255,0.15)" fontSize="7" fontFamily="monospace">30°</text>
              <text x="104" y="76" fill="rgba(255,255,255,0.15)" fontSize="7" fontFamily="monospace">60°</text>
              <text x="104" y="100" fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="monospace">90°</text>

              {/* Satellite dot */}
              <circle
                cx={dotX}
                cy={dotY}
                r="4"
                fill={dotInGreen ? "#06b6d4" : "#ef4444"}
                className="transition-all duration-100"
                style={{
                  filter: `drop-shadow(0 0 6px ${dotInGreen ? "rgba(16,185,129,0.7)" : "rgba(239,68,68,0.7)"})`,
                }}
              />

              {/* Figure-8 trail (faint) */}
              <ellipse cx="100" cy="100" rx="50" ry="30" fill="none" stroke="rgba(16,185,129,0.08)" strokeWidth="0.5" strokeDasharray="2 4" />
            </svg>
            <div className="text-center text-[10px] font-mono text-gray-500 mt-2">
              Elevation: {Math.round(polarElev)}° — {dotInGreen ? "✓ Visible" : "✗ Below 10° mask"}
            </div>
          </div>

          {/* Frequency Bands */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="text-xs font-mono text-gray-400 mb-3">Frequency Bands</div>
            <div className="space-y-3">
              {FREQ_BANDS.map((band, i) => {
                const isActive = i === metrics.activeBand;
                return (
                  <div
                    key={band.name}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-500 ${
                      isActive
                        ? "bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                        : "border border-transparent"
                    }`}
                  >
                    <span
                      className={`text-sm font-mono font-bold w-8 text-center shrink-0 transition-colors duration-500 ${
                        isActive ? "text-cyan-400" : "text-gray-500"
                      }`}
                    >
                      {band.name}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(band.freq / 40) * 100}%`,
                            background: isActive
                              ? "linear-gradient(90deg, #06b6d4, #22d3ee)"
                              : "rgba(255,255,255,0.08)",
                            boxShadow: isActive ? "0 0 8px rgba(16,185,129,0.4)" : "none",
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">{band.range}</div>
                    </div>
                    {isActive && (
                      <span className="text-[10px] font-mono text-cyan-400 animate-pulse shrink-0">ACTIVE</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}