"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  Loader2,
  AlertCircle,
  Activity,
  Orbit,
  MapPin,
  BarChart3,
  Hash,
  CheckCircle,
  XCircle as XCircleIcon,
  Clock,
  Gauge,
  ArrowUpDown,
  Satellite,
  RotateCcw,
  GitCompareArrows,
  X,
  Layers,
  Plus,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  useOrbitGateStore,
  type PropagationResult,
  type ComparisonResult,
} from "@/lib/orbitgate-store";
import { SectionHeader } from "./SectionHeader";
import { toast } from "sonner";

// 8-color palette for comparison
const COMPARISON_COLORS = [
  { name: "emerald", hex: "#06b6d4", stroke: "#06b6d4", fill: "rgba(6,182,212,0.15)" },
  { name: "sky", hex: "#0ea5e9", stroke: "#0ea5e9", fill: "rgba(14,165,233,0.15)" },
  { name: "amber", hex: "#f59e0b", stroke: "#f59e0b", fill: "rgba(245,158,11,0.15)" },
  { name: "rose", hex: "#f43f5e", stroke: "#f43f5e", fill: "rgba(244,63,94,0.15)" },
  { name: "violet", hex: "#8b5cf6", stroke: "#8b5cf6", fill: "rgba(139,92,246,0.15)" },
  { name: "teal", hex: "#14b8a6", stroke: "#14b8a6", fill: "rgba(20,184,166,0.15)" },
  { name: "orange", hex: "#f97316", stroke: "#f97316", fill: "rgba(249,115,22,0.15)" },
  { name: "lime", hex: "#84cc16", stroke: "#84cc16", fill: "rgba(132,204,22,0.15)" },
];

const REGIME_BADGE_COLORS: Record<string, string> = {
  LEO: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
  MEO: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  GEO: "text-sky-400 bg-sky-500/15 border-sky-500/30",
  HEO: "text-purple-400 bg-purple-500/15 border-purple-500/30",
};

// Simplified world map outline (continent coastlines) for the ground track SVG
const WORLD_OUTLINE_PATH = `
  M 150 65 L 155 60 L 160 55 L 170 50 L 180 48 L 190 50 L 200 48 L 210 50 L 215 55 L 220 50 L 230 48 L 240 52 L 248 55 L 255 58 L 260 62 L 265 68 L 270 72 L 275 68 L 280 65 L 290 62 L 295 58 L 300 55 L 305 60 L 308 65 L 310 70 L 315 75 L 310 80 L 305 85 L 300 88 L 295 92 L 288 95 L 280 98 L 275 100 L 270 105 L 268 110 L 265 118 L 268 125 L 272 130 L 278 132 L 285 130 L 290 128 L 298 130 L 305 135 L 310 140 L 315 145 L 320 150 L 318 155 L 312 160 L 305 165 L 298 168 L 290 170 L 285 175 L 280 180 L 278 188 L 282 195 L 288 200 L 295 205 L 300 210 L 305 215 L 300 220 L 292 222 L 285 220 L 278 218 L 270 220 L 265 225 L 260 230 L 258 235 L 255 240 L 250 242 L 245 238 L 242 232 L 240 225 L 238 218 L 235 210 L 232 200 L 228 195 L 225 190 L 220 185 L 218 180 L 215 175 L 210 172 L 205 168 L 200 165 L 195 160 L 192 155 L 188 148 L 185 140 L 182 132 L 180 125 L 178 118 L 175 112 L 172 105 L 168 100 L 165 95 L 160 90 L 158 85 L 155 78 L 152 72 L 150 65 Z
  M 340 55 L 345 50 L 355 48 L 365 50 L 375 55 L 380 60 L 378 68 L 372 75 L 365 78 L 358 80 L 350 78 L 345 72 L 342 65 L 340 55 Z
  M 370 110 L 380 105 L 395 100 L 410 98 L 420 100 L 430 105 L 440 110 L 448 115 L 452 120 L 455 128 L 458 135 L 460 142 L 458 148 L 455 155 L 450 160 L 445 168 L 440 175 L 438 182 L 435 188 L 430 195 L 425 200 L 420 208 L 415 215 L 412 220 L 415 225 L 420 228 L 428 230 L 435 228 L 440 225 L 445 228 L 448 232 L 445 238 L 440 242 L 435 245 L 428 248 L 420 250 L 412 248 L 405 245 L 398 242 L 392 238 L 388 232 L 385 225 L 382 218 L 378 210 L 375 200 L 372 190 L 370 180 L 368 170 L 365 160 L 362 152 L 358 145 L 355 138 L 352 130 L 350 122 L 355 115 L 362 112 L 370 110 Z
  M 480 65 L 485 60 L 492 58 L 500 60 L 508 65 L 515 68 L 520 72 L 518 78 L 512 82 L 505 85 L 498 82 L 492 78 L 488 72 L 480 65 Z
  M 520 90 L 530 85 L 545 82 L 558 85 L 570 90 L 580 95 L 588 100 L 592 108 L 595 115 L 598 122 L 595 130 L 590 138 L 585 145 L 580 150 L 575 158 L 570 165 L 568 172 L 572 178 L 578 182 L 585 185 L 590 190 L 588 198 L 582 205 L 575 210 L 568 215 L 560 220 L 555 225 L 552 230 L 548 228 L 545 222 L 542 215 L 540 208 L 535 200 L 530 195 L 525 188 L 520 180 L 518 172 L 515 165 L 512 158 L 510 150 L 508 142 L 505 135 L 500 128 L 498 120 L 495 112 L 498 105 L 505 98 L 512 92 L 520 90 Z
  M 440 60 L 448 55 L 455 52 L 462 55 L 468 60 L 465 68 L 458 72 L 450 70 L 445 65 L 440 60 Z
  M 565 55 L 572 50 L 580 48 L 590 50 L 598 55 L 602 60 L 600 68 L 595 72 L 588 75 L 580 72 L 572 68 L 568 62 L 565 55 Z
  M 600 120 L 610 115 L 620 118 L 628 122 L 632 128 L 628 135 L 622 140 L 615 138 L 608 132 L 605 126 L 600 120 Z
  M 175 230 L 180 225 L 190 222 L 200 225 L 208 230 L 210 238 L 205 245 L 198 248 L 190 248 L 182 245 L 178 238 L 175 230 Z
  M 700 190 L 710 185 L 718 190 L 720 198 L 715 205 L 708 208 L 702 205 L 698 198 L 700 190 Z
  M 660 135 L 668 130 L 678 132 L 685 138 L 682 145 L 675 148 L 668 145 L 662 140 L 660 135 Z
`;

function AltitudeChart({ points, isDark }: { points: PropagationResult["points"]; isDark: boolean }) {
  const chartData = useMemo(() => {
    return points.map((p) => ({
      t: Math.round(p.t_min * 10) / 10,
      alt: Math.round(p.altitude_km * 10) / 10,
    }));
  }, [points]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
            <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e5e7eb"} />
        <XAxis
          dataKey="t"
          stroke={isDark ? "#475569" : "#d1d5db"}
          tick={chartAxisTick(isDark)}
          label={{
            value: "Time (min)",
            position: "insideBottom",
            offset: -2,
            fill: isDark ? "#64748b" : "#6b7280",
            fontSize: 11,
          }}
        />
        <YAxis
          stroke={isDark ? "#475569" : "#d1d5db"}
          tick={chartAxisTick(isDark)}
          label={{
            value: "Altitude (km)",
            angle: -90,
            position: "insideLeft",
            fill: isDark ? "#64748b" : "#6b7280",
            fontSize: 11,
          }}
          width={70}
        />
        <Tooltip
          contentStyle={chartTooltipStyle(isDark)}
          labelStyle={{ color: isDark ? "#94a3b8" : "#6b7280" }}
          formatter={(value: number) => [`${value} km`, "Altitude"]}
          labelFormatter={(label: number) => `T+${label} min`}
        />
        <Area
          type="monotone"
          dataKey="alt"
          stroke="#06b6d4"
          strokeWidth={2}
          fill="url(#altGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#06b6d4", stroke: isDark ? "#0f172a" : "#ffffff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ComparisonAltitudeChart({ results, isDark }: { results: ComparisonResult[]; isDark: boolean }) {
  const chartData = useMemo(() => {
    // Find max length among all results
    const maxLen = Math.max(...results.map((r) => r.data.points.length));
    const data: Record<string, number | string>[] = [];
    for (let i = 0; i < maxLen; i++) {
      const point: Record<string, number | string> = { t: 0 };
      for (const result of results) {
        const p = result.data.points[i];
        if (p) {
          point.t = Math.round(p.t_min * 10) / 10;
          point[result.name] = Math.round(p.altitude_km * 10) / 10;
        }
      }
      data.push(point);
    }
    return data;
  }, [results]);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {results.map((r, i) => (
            <linearGradient
              key={r.norad_id}
              id={`compGrad${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={COMPARISON_COLORS[i].stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COMPARISON_COLORS[i].stroke} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e5e7eb"} />
        <XAxis
          dataKey="t"
          stroke={isDark ? "#475569" : "#d1d5db"}
          tick={chartAxisTick(isDark)}
          label={{
            value: "Time (min)",
            position: "insideBottom",
            offset: -2,
            fill: isDark ? "#64748b" : "#6b7280",
            fontSize: 11,
          }}
        />
        <YAxis
          stroke={isDark ? "#475569" : "#d1d5db"}
          tick={chartAxisTick(isDark)}
          label={{
            value: "Altitude (km)",
            angle: -90,
            position: "insideLeft",
            fill: isDark ? "#64748b" : "#6b7280",
            fontSize: 11,
          }}
          width={70}
        />
        <Tooltip
          contentStyle={chartTooltipStyle(isDark)}
          labelStyle={{ color: isDark ? "#94a3b8" : "#6b7280" }}
          labelFormatter={(label: number) => `T+${label} min`}
          formatter={(value: number, name: string) => [`${value} km`, name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: isDark ? "#94a3b8" : "#6b7280" }}
          iconType="circle"
        />
        {results.map((r, i) => (
          <Area
            key={r.norad_id}
            type="monotone"
            dataKey={r.name}
            stroke={COMPARISON_COLORS[i].stroke}
            strokeWidth={2}
            fill={`url(#compGrad${i})`}
            dot={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function OrbitalElementsCard({
  elements,
  regime,
  period,
}: {
  elements: PropagationResult["summary"]["orbital_elements"];
  regime: string;
  period: number;
}) {
  const items = [
    { label: "Inclination", value: `${elements.inclination_deg?.toFixed(4)}°`, icon: "↗" },
    { label: "Eccentricity", value: elements.eccentricity?.toFixed(7), icon: "◎" },
    { label: "RAAN", value: `${elements.raan_deg?.toFixed(4)}°`, icon: "⟳" },
    { label: "Arg. Perigee", value: `${elements.arg_perigee_deg?.toFixed(4)}°`, icon: "⊙" },
    { label: "Mean Anomaly", value: `${elements.mean_anomaly_deg?.toFixed(4)}°`, icon: "⊘" },
    { label: "Mean Motion", value: `${elements.mean_motion_rev_per_day?.toFixed(6)} rev/day`, icon: "↻" },
    { label: "B*", value: elements.b_star?.toExponential(4), icon: "★" },
    { label: "Period", value: `${period.toFixed(2)} min`, icon: "⏱" },
    { label: "Regime", value: regime, icon: "🛰" },
  ];

  const regimeColor: Record<string, string> = {
    LEO: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
    MEO: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    GEO: "text-sky-400 bg-sky-500/15 border-sky-500/30",
    HEO: "text-purple-400 bg-purple-500/15 border-purple-500/30",
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 rounded-lg p-2.5"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs">{item.icon}</span>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
              {item.label}
            </p>
          </div>
          <p
            className={`text-sm font-mono font-medium truncate ${
              item.label === "Regime"
                ? regimeColor[regime] || "text-gray-700 dark:text-gray-300"
                : "text-gray-700 dark:text-gray-200"
            } ${item.label === "Regime" ? "border rounded px-1.5 py-0.5 text-xs inline-block" : ""}`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function GroundTrackMap({
  points,
  name,
  isDark,
}: {
  points: PropagationResult["points"];
  name: string;
  isDark: boolean;
}) {
  // Subsample points for performance (max ~500 dots)
  const sampleRate = Math.max(1, Math.floor(points.length / 500));
  const sampledPoints = points.filter((_, i) => i % sampleRate === 0);

  // Mercator projection: lat [-90,90] -> y, lon [-180,180] -> x
  // SVG viewBox: 0 0 800 400
  const mapW = 800;
  const mapH = 400;

  const toSVG = (lat: number, lon: number) => {
    const x = ((lon + 180) / 360) * mapW;
    const latRad = (lat * Math.PI) / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = mapH / 2 - (mercN / Math.PI) * (mapH / 2);
    return { x, y: Math.max(0, Math.min(mapH, y)) };
  };

  return (
    <div className="relative bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <svg
        viewBox={`0 0 ${mapW} ${mapH}`}
        className="w-full h-auto"
        style={{ minHeight: 200 }}
      >
        {/* Background grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={isDark ? "#1e293b" : "#e5e7eb"}
              strokeWidth="0.5"
            />
          </pattern>
          <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width={mapW} height={mapH} fill="url(#grid)" />

        {/* Equator line */}
        <line
          x1="0"
          y1={mapH / 2}
          x2={mapW}
          y2={mapH / 2}
          stroke={isDark ? "#334155" : "#d1d5db"}
          strokeWidth="0.5"
          strokeDasharray="4 4"
        />

        {/* Prime meridian */}
        <line
          x1={mapW / 2}
          y1="0"
          x2={mapW / 2}
          y2={mapH}
          stroke={isDark ? "#334155" : "#d1d5db"}
          strokeWidth="0.5"
          strokeDasharray="4 4"
        />

        {/* World map outline */}
        <path
          d={WORLD_OUTLINE_PATH}
          fill={isDark ? "#1e293b" : "#e5e7eb"}
          stroke={isDark ? "#334155" : "#d1d5db"}
          strokeWidth="1"
          opacity={0.6}
        />

        {/* Ground track path */}
        <polyline
          points={sampledPoints
            .map((p) => {
              const { x, y } = toSVG(p.latitude_deg, p.longitude_deg);
              return `${x},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="1"
          opacity={0.3}
        />

        {/* Ground track dots */}
        {sampledPoints.map((p, i) => {
          const { x, y } = toSVG(p.latitude_deg, p.longitude_deg);
          const isStart = i === 0;
          const isEnd = i === sampledPoints.length - 1;
          const dotSize = isStart || isEnd ? 4 : 2;

          if (isStart || isEnd) {
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={8} fill="url(#dotGlow)" />
                <circle
                  cx={x}
                  cy={y}
                  r={dotSize}
                  fill={isStart ? "#06b6d4" : "#f59e0b"}
                  stroke={isDark ? "#0f172a" : "#ffffff"}
                  strokeWidth="1"
                />
              </g>
            );
          }

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={dotSize}
              fill="#14b8a6"
              opacity={0.6}
            />
          );
        })}

        {/* Labels */}
        <text x="10" y="18" fill="#64748b" fontSize="10" fontFamily="monospace">
          {name}
        </text>
        <text
          x={mapW - 10}
          y="18"
          fill="#64748b"
          fontSize="10"
          fontFamily="monospace"
          textAnchor="end"
        >
          {sampledPoints.length} points
        </text>
        {sampledPoints.length > 0 && (
          <>
            <circle cx="12" cy={mapH - 14} r={3} fill="#06b6d4" />
            <text
              x="20"
              y={mapH - 10}
              fill="#64748b"
              fontSize="9"
              fontFamily="monospace"
            >
              Start
            </text>
            <circle cx="62" cy={mapH - 14} r={3} fill="#f59e0b" />
            <text
              x="70"
              y={mapH - 10}
              fill="#64748b"
              fontSize="9"
              fontFamily="monospace"
            >
              End
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

function ComparisonGroundTrackMap({ results }: { results: ComparisonResult[] }) {
  const mapW = 800;
  const mapH = 400;

  const toSVG = (lat: number, lon: number) => {
    const x = ((lon + 180) / 360) * mapW;
    const latRad = (lat * Math.PI) / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = mapH / 2 - (mercN / Math.PI) * (mapH / 2);
    return { x, y: Math.max(0, Math.min(mapH, y)) };
  };

  // Different dot sizes per satellite (3-4px)
  const dotSizes = [3, 3.5, 4, 3];

  return (
    <div className="relative bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <svg
        viewBox={`0 0 ${mapW} ${mapH}`}
        className="w-full h-auto"
        style={{ minHeight: 200 }}
      >
        <defs>
          <pattern id="compGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          </pattern>
          {results.map((r, i) => (
            <radialGradient
              key={`glow-${r.norad_id}`}
              id={`compGlow${i}`}
              cx="50%"
              cy="50%"
              r="50%"
            >
              <stop offset="0%" stopColor={COMPARISON_COLORS[i].stroke} stopOpacity={0.7} />
              <stop offset="100%" stopColor={COMPARISON_COLORS[i].stroke} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>
        <rect width={mapW} height={mapH} fill="url(#compGrid)" />

        {/* Equator line */}
        <line x1="0" y1={mapH / 2} x2={mapW} y2={mapH / 2} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
        {/* Prime meridian */}
        <line x1={mapW / 2} y1="0" x2={mapW / 2} y2={mapH} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />

        {/* World map outline */}
        <path d={WORLD_OUTLINE_PATH} fill="#1e293b" stroke="#334155" strokeWidth="1" opacity={0.6} />

        {/* Ground tracks for each satellite */}
        {results.map((result, idx) => {
          const sampleRate = Math.max(1, Math.floor(result.data.points.length / 400));
          const sampledPoints = result.data.points.filter((_, i) => i % sampleRate === 0);
          const color = COMPARISON_COLORS[idx];
          const dotR = dotSizes[idx] || 3;

          return (
            <g key={result.norad_id}>
              {/* Track line */}
              <polyline
                points={sampledPoints
                  .map((p) => {
                    const { x, y } = toSVG(p.latitude_deg, p.longitude_deg);
                    return `${x},${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke={color.stroke}
                strokeWidth="0.8"
                opacity={0.3}
              />
              {/* Track dots */}
              {sampledPoints.map((p, j) => {
                const { x, y } = toSVG(p.latitude_deg, p.longitude_deg);
                return (
                  <circle
                    key={j}
                    cx={x}
                    cy={y}
                    r={dotR}
                    fill={color.stroke}
                    opacity={0.7}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Legend in corner */}
        <rect x="10" y="8" width={Math.max(...results.map((r) => r.name.length)) * 7 + 50} height={results.length * 16 + 10} rx="4" fill="rgba(15,23,42,0.85)" stroke="#1e293b" />
        {results.map((r, i) => (
          <g key={r.norad_id}>
            <circle cx="22" cy={22 + i * 16} r={4} fill={COMPARISON_COLORS[i].stroke} />
            <text x="32" y={25 + i * 16} fill="#94a3b8" fontSize="10" fontFamily="monospace">
              {r.name.length > 20 ? r.name.slice(0, 20) + "…" : r.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function ComparisonTable({ results }: { results: ComparisonResult[] }) {
  // Compute best/worst values for highlighting
  const periods = results.map((r) => r.data.summary?.period_estimated_min ?? 0);
  const perigees = results.map((r) => r.data.summary?.altitude_min_km ?? 0);
  const apogees = results.map((r) => r.data.summary?.altitude_max_km ?? 0);
  const inclinations = results.map((r) => r.data.summary?.orbital_elements?.inclination_deg ?? 0);
  const eccentricities = results.map((r) => r.data.summary?.orbital_elements?.eccentricity ?? 0);

  const bestPeriod = Math.min(...periods);
  const bestPerigee = Math.max(...perigees);
  const bestApogee = Math.max(...apogees);

  return (
    <div className="bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-300 dark:border-slate-700 hover:bg-transparent">
            <TableHead className="text-gray-400 text-xs">Satellite</TableHead>
            <TableHead className="text-gray-400 text-xs">Regime</TableHead>
            <TableHead className="text-gray-400 text-xs text-right">Period (min)</TableHead>
            <TableHead className="text-gray-400 text-xs text-right">Perigee (km)</TableHead>
            <TableHead className="text-gray-400 text-xs text-right">Apogee (km)</TableHead>
            <TableHead className="text-gray-400 text-xs text-right">Inclination (°)</TableHead>
            <TableHead className="text-gray-400 text-xs text-right">Eccentricity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r, i) => {
            const summary = r.data.summary;
            const elements = summary?.orbital_elements;
            const period = summary?.period_estimated_min ?? 0;
            const perigee = summary?.altitude_min_km ?? 0;
            const apogee = summary?.altitude_max_km ?? 0;
            const inc = elements?.inclination_deg ?? 0;
            const ecc = elements?.eccentricity ?? 0;
            const regime = summary?.regime || "UNKNOWN";

            const color = COMPARISON_COLORS[i];

            return (
              <TableRow
                key={r.norad_id}
                className="border-gray-200 dark:border-slate-800"
                style={{ borderLeftColor: color.stroke, borderLeftWidth: 3 }}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color.stroke }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200 font-medium truncate max-w-[160px]">
                      {r.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] border ${REGIME_BADGE_COLORS[regime] || "text-gray-400 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700"}`}
                  >
                    {regime}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right font-mono text-sm ${period === bestPeriod ? "text-cyan-400 font-semibold" : "text-gray-700 dark:text-gray-300"}`}>
                  {period.toFixed(2)}
                  {period === bestPeriod && <span className="text-[9px] ml-1 text-cyan-500">▼ lowest</span>}
                </TableCell>
                <TableCell className={`text-right font-mono text-sm ${perigee === bestPerigee ? "text-cyan-400 font-semibold" : "text-gray-700 dark:text-gray-300"}`}>
                  {perigee.toFixed(1)}
                  {perigee === bestPerigee && <span className="text-[9px] ml-1 text-cyan-500">▲ highest</span>}
                </TableCell>
                <TableCell className={`text-right font-mono text-sm ${apogee === bestApogee ? "text-cyan-400 font-semibold" : "text-gray-700 dark:text-gray-300"}`}>
                  {apogee.toFixed(1)}
                  {apogee === bestApogee && <span className="text-[9px] ml-1 text-cyan-500">▲ highest</span>}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-gray-700 dark:text-gray-300">
                  {inc.toFixed(4)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-gray-700 dark:text-gray-300">
                  {ecc.toFixed(7)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function PropagationSummaryCard({
  summary,
  numPoints,
  errors,
  sgp4Available,
  propagationHash,
}: {
  summary: PropagationResult["summary"];
  numPoints: number;
  errors: string[];
  sgp4Available: boolean;
  propagationHash: string;
}) {
  const stats = [
    {
      label: "Alt Min",
      value: `${summary.altitude_min_km.toFixed(2)} km`,
      icon: ArrowUpDown,
      color: "text-sky-400",
    },
    {
      label: "Alt Max",
      value: `${summary.altitude_max_km.toFixed(2)} km`,
      icon: ArrowUpDown,
      color: "text-amber-400",
    },
    {
      label: "Alt Mean",
      value: `${summary.altitude_mean_km.toFixed(2)} km`,
      icon: Activity,
      color: "text-cyan-400",
    },
    {
      label: "Alt Range",
      value: `${summary.altitude_range_km.toFixed(2)} km`,
      icon: ArrowUpDown,
      color: "text-purple-400",
    },
    {
      label: "Speed Min",
      value: `${summary.speed_min_kms.toFixed(3)} km/s`,
      icon: Gauge,
      color: "text-sky-400",
    },
    {
      label: "Speed Max",
      value: `${summary.speed_max_kms.toFixed(3)} km/s`,
      icon: Gauge,
      color: "text-amber-400",
    },
    {
      label: "Speed Mean",
      value: `${summary.speed_mean_kms.toFixed(3)} km/s`,
      icon: Gauge,
      color: "text-cyan-400",
    },
    {
      label: "Data Points",
      value: `${numPoints}`,
      icon: BarChart3,
      color: "text-gray-700 dark:text-gray-300",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 rounded-lg p-3"
          >
            <stat.icon className={`h-3.5 w-3.5 ${stat.color} mb-1.5`} />
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">
              {stat.label}
            </p>
            <p className={`text-sm font-mono font-medium ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Status Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          {sgp4Available ? (
            <CheckCircle className="h-4 w-4 text-cyan-400" />
          ) : (
            <XCircleIcon className="h-4 w-4 text-rose-400" />
          )}
          <span className="text-xs text-gray-400">
            SGP4 {sgp4Available ? "Available" : "Unavailable"}
          </span>
        </div>
        {errors.length > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-amber-400">
              {errors.length} error(s)
            </span>
          </div>
        )}
      </div>

      {/* Propagation Hash */}
      <div className="bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Hash className="h-3.5 w-3.5 text-gray-500" />
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
            Propagation Hash (SHA-256)
          </p>
        </div>
        <p className="text-xs font-mono text-gray-400 break-all">
          {propagationHash}
        </p>
      </div>
    </div>
  );
}

const chartTooltipStyle = (isDark: boolean) => ({
  backgroundColor: isDark ? "#0f172a" : "#ffffff",
  border: isDark ? "1px solid #1e293b" : "1px solid rgba(209,213,219,0.8)",
  borderRadius: "8px",
  color: isDark ? "#e2e8f0" : "#374151",
  fontSize: 12,
});

const chartAxisTick = (isDark: boolean) => ({
  fill: isDark ? "#64748b" : "#6b7280",
  fontSize: 11,
});

const chartAxisLine = (isDark: boolean) => ({
  stroke: isDark ? "rgba(148,163,184,0.2)" : "rgba(209,213,219,0.6)",
});

export function PropagationVisualizer() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const {
    selectedTLE,
    setSelectedTLE,
    propagationResult,
    setPropagationResult,
    propagationSettings,
    setPropagationSettings,
    isPropagating,
    setIsPropagating,
    comparisonMode,
    setComparisonMode,
    comparisonSatellites,
    comparisonResults,
    setComparisonResults,
    removeFromComparison,
    clearComparison,
  } = useOrbitGateStore();

  const [localLine1, setLocalLine1] = useState("");
  const [localLine2, setLocalLine2] = useState("");
  const [localName, setLocalName] = useState("");
  const [localSource, setLocalSource] = useState("manual");
  const [error, setError] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Sync from store when selectedTLE changes, and auto-propagate (only in non-comparison mode)
  useEffect(() => {
    if (selectedTLE && !comparisonMode) {
      setLocalLine1(selectedTLE.line1);
      setLocalLine2(selectedTLE.line2);
      setLocalName(selectedTLE.name);
      setLocalSource(selectedTLE.source || "celestrak");
      // Auto-propagate after a short delay for smooth UX
      const timer = setTimeout(() => {
        doPropagate(selectedTLE.line1, selectedTLE.line2, selectedTLE.name, selectedTLE.source || "celestrak");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedTLE, comparisonMode]);

  // Extracted propagation logic for reuse
  const doPropagate = async (
    line1: string,
    line2: string,
    name?: string,
    source?: string
  ) => {
    if (!line1.trim() || !line2.trim()) return;
    setError(null);
    setPropagationResult(null);
    setIsPropagating(true);
    try {
      const res = await fetch("/api/orbitgate/propagate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line1: line1.trim(),
          line2: line2.trim(),
          duration_min: propagationSettings.duration_min,
          step_min: propagationSettings.step_min,
          name: name || undefined,
          source,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPropagationResult(data.data);
        toast.success("Propagation Complete", {
          description: `${data.data.num_points} data points generated for ${name || "satellite"}`,
        });
      } else {
        setError(data.error || "Propagation failed.");
        toast.error("Propagation failed.");
      }
    } catch {
      setError("Network error — unable to reach the propagation API.");
      toast.error("Network error during propagation.");
    } finally {
      setIsPropagating(false);
    }
  };

  const handlePropagate = async () => {
    const line1 = localLine1.trim();
    const line2 = localLine2.trim();

    if (!line1 || !line2) {
      toast.error("Please provide both TLE line 1 and line 2.");
      return;
    }

    await doPropagate(line1, line2, localName || undefined, localSource);
  };

  const handleCompareAll = async () => {
    if (comparisonSatellites.length < 2) {
      toast.error("Select at least 2 satellites to compare.");
      return;
    }

    setIsComparing(true);
    setError(null);
    setComparisonResults([]);

    try {
      // Propagate all satellites in parallel
      const promises = comparisonSatellites.map(async (sat, idx) => {
        const res = await fetch("/api/orbitgate/propagate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            line1: sat.line1.trim(),
            line2: sat.line2.trim(),
            duration_min: propagationSettings.duration_min,
            step_min: propagationSettings.step_min,
            name: sat.name,
            source: sat.source,
          }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          return {
            name: sat.name,
            norad_id: sat.norad_id,
            data: data.data,
            color: COMPARISON_COLORS[idx].stroke,
          };
        }
        return null;
      });

      const settled = await Promise.all(promises);
      const successful = settled.filter((r): r is ComparisonResult => r !== null);

      if (successful.length < 2) {
        toast.error("Not enough satellites propagated successfully for comparison.");
        return;
      }

      setComparisonResults(successful);
      toast.success(`Comparison complete: ${successful.length} satellites propagated`);

      // Scroll to comparison results
      const el = document.getElementById("comparison-results");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch {
      setError("Network error during comparison propagation.");
      toast.error("Network error during comparison.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleClear = () => {
    setLocalLine1("");
    setLocalLine2("");
    setLocalName("");
    setLocalSource("manual");
    setSelectedTLE(null);
    setPropagationResult(null);
    setError(null);
  };

  const handleToggleCompare = (checked: boolean) => {
    setComparisonMode(checked);
    if (checked) {
      // Clear single-propagation result when entering compare mode
      setPropagationResult(null);
      setSelectedTLE(null);
    } else {
      // Clear comparison data when leaving compare mode
      clearComparison();
    }
  };

  return (
    <section id="propagator" className="py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="SGP4 Propagation Visualizer"
          subtitle="Propagate satellite orbits using real SGP4 models. Visualize altitude profiles, orbital elements, and ground tracks."
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Compare Mode Toggle */}
          <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <GitCompareArrows className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Compare Mode</p>
                    <p className="text-xs text-gray-500">Select multiple satellites and compare their orbits side-by-side</p>
                  </div>
                </div>
                <Switch
                  checked={comparisonMode}
                  onCheckedChange={handleToggleCompare}
                />
              </div>

              {/* Selected satellites for comparison */}
              <AnimatePresence>
                {comparisonMode && comparisonSatellites.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium">
                        {comparisonSatellites.length}/4 satellites selected
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={clearComparison}
                          variant="ghost"
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-300 text-xs h-7"
                        >
                          Clear All
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleCompareAll}
                          disabled={comparisonSatellites.length < 2 || isComparing}
                          className="bg-amber-600 hover:bg-amber-500 text-gray-900 dark:text-white h-7 px-3 text-xs"
                        >
                          {isComparing ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Propagating…
                            </>
                          ) : (
                            <>
                              <Layers className="h-3 w-3 mr-1" />
                              Compare All ({comparisonSatellites.length})
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {comparisonSatellites.map((sat, i) => (
                        <motion.div
                          key={sat.norad_id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center gap-2 bg-gray-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-1.5"
                        >
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COMPARISON_COLORS[i].stroke }}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 max-w-[140px] truncate">
                            {sat.name}
                          </span>
                          <button
                            onClick={() => removeFromComparison(sat.norad_id)}
                            className="text-gray-500 hover:text-rose-400 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </motion.div>
                      ))}
                      {comparisonSatellites.length < 4 && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-600 px-2 py-1.5">
                          <Plus className="h-3 w-3" />
                          Add more from TLE Browser above
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Input Card — hidden in comparison mode */}
          {!comparisonMode && (
            <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-base">
                  <Satellite className="h-4 w-4 text-cyan-400" />
                  TLE Input
                  {selectedTLE && (
                    <Badge className="text-[10px] bg-cyan-500/15 text-cyan-400 border-cyan-500/30 ml-2">
                      From Browser: {selectedTLE.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">Line 1</Label>
                    <Input
                      placeholder="1 25544U 98067A   24..."
                      value={localLine1}
                      onChange={(e) => setLocalLine1(e.target.value)}
                      className="font-mono text-xs bg-gray-50 dark:bg-slate-950/50 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus-visible:ring-cyan-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">Line 2</Label>
                    <Input
                      placeholder="2 25544  51.6416..."
                      value={localLine2}
                      onChange={(e) => setLocalLine2(e.target.value)}
                      className="font-mono text-xs bg-gray-50 dark:bg-slate-950/50 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus-visible:ring-cyan-500/50"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">
                      Duration: {propagationSettings.duration_min} min
                    </Label>
                    <Slider
                      value={[propagationSettings.duration_min]}
                      onValueChange={([v]) =>
                        setPropagationSettings({
                          ...propagationSettings,
                          duration_min: v,
                        })
                      }
                      min={10}
                      max={720}
                      step={10}
                      className="py-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">
                      Step: {propagationSettings.step_min} min
                    </Label>
                    <Slider
                      value={[propagationSettings.step_min]}
                      onValueChange={([v]) =>
                        setPropagationSettings({
                          ...propagationSettings,
                          step_min: v,
                        })
                      }
                      min={0.1}
                      max={10}
                      step={0.1}
                      className="py-2"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      onClick={handlePropagate}
                      disabled={isPropagating || (!localLine1.trim() || !localLine2.trim())}
                      className="bg-cyan-600 hover:bg-cyan-500 text-gray-900 dark:text-white flex-1"
                    >
                      {isPropagating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Propagating...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Propagate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleClear}
                      className="border-gray-300 dark:border-slate-700 text-gray-400 hover:text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-slate-600 shrink-0"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Error State */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3"
                    >
                      <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          )}

          {/* Comparison Mode: Duration/Step settings (compact) */}
          {comparisonMode && (
            <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-amber-400" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Propagation Settings</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">
                      Duration: {propagationSettings.duration_min} min
                    </Label>
                    <Slider
                      value={[propagationSettings.duration_min]}
                      onValueChange={([v]) =>
                        setPropagationSettings({ ...propagationSettings, duration_min: v })
                      }
                      min={10}
                      max={720}
                      step={10}
                      className="py-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">
                      Step: {propagationSettings.step_min} min
                    </Label>
                    <Slider
                      value={[propagationSettings.step_min]}
                      onValueChange={([v]) =>
                        setPropagationSettings({ ...propagationSettings, step_min: v })
                      }
                      min={0.1}
                      max={10}
                      step={0.1}
                      className="py-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State (single mode) */}
          {isPropagating && !comparisonMode && (
            <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Running SGP4 Propagation...
                    </p>
                    <p className="text-xs text-gray-500">
                      {propagationSettings.duration_min} min duration,{" "}
                      {propagationSettings.step_min} min step
                    </p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Skeleton className="h-[280px] bg-gray-100 dark:bg-slate-800 rounded-lg" />
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 bg-gray-100 dark:bg-slate-800 rounded-lg" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State (comparison mode) */}
          {isComparing && comparisonMode && (
            <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Propagating {comparisonSatellites.length} satellites for comparison...
                    </p>
                    <p className="text-xs text-gray-500">
                      {propagationSettings.duration_min} min duration,{" "}
                      {propagationSettings.step_min} min step
                    </p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Skeleton className="h-[320px] bg-gray-100 dark:bg-slate-800 rounded-lg" />
                  <Skeleton className="h-[320px] bg-gray-100 dark:bg-slate-800 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ========== SINGLE-MODE RESULTS ========== */}
          <AnimatePresence>
            {propagationResult && !isPropagating && !comparisonMode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Satellite Info Header */}
                <Card className="bg-white dark:bg-slate-900/80 border-cyan-500/20">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                          <Orbit className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            {propagationResult.satellite_name || localName || "Unknown Satellite"}
                          </h3>
                          <p className="text-xs text-gray-500 font-mono">
                            NORAD {propagationResult.norad_id} · Epoch{" "}
                            {propagationResult.tle_epoch} · Source:{" "}
                            {propagationResult.tle_source}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-[10px] border ${
                            propagationResult.summary?.regime === "LEO"
                              ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                              : propagationResult.summary?.regime === "GEO"
                                ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                                : propagationResult.summary?.regime === "MEO"
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                  : "bg-purple-500/15 text-purple-400 border-purple-500/30"
                          }`}
                        >
                          {propagationResult.summary?.regime || "UNKNOWN"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-400 border-gray-300 dark:border-slate-700"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {propagationResult.summary?.period_estimated_min?.toFixed(1)} min period
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Altitude Chart */}
                <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-base">
                      <Activity className="h-4 w-4 text-cyan-400" />
                      Altitude Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AltitudeChart points={propagationResult.points} isDark={isDark} />
                  </CardContent>
                </Card>

                {/* Orbital Elements + Ground Track */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-base">
                        <Orbit className="h-4 w-4 text-cyan-400" />
                        Orbital Elements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {propagationResult.summary?.orbital_elements ? (
                        <OrbitalElementsCard
                          elements={propagationResult.summary.orbital_elements}
                          regime={propagationResult.summary?.regime || "UNKNOWN"}
                          period={propagationResult.summary?.period_estimated_min || 0}
                        />
                      ) : (
                        <p className="text-sm text-gray-500">No orbital element data available.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800 relative overflow-hidden">
                    {/* Subtle Earth background at 3% opacity */}
                    <div className="absolute inset-0 bg-cover bg-center opacity-[0.03] pointer-events-none dark:opacity-[0.05]" style={{ backgroundImage: "url('https://sfile.chatglm.cn/images-ppt/23f9e9e1dc58.jpg')" }} />
                    <CardHeader className="pb-2 relative">
                      <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-base">
                        <MapPin className="h-4 w-4 text-cyan-400" />
                        Ground Track
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="relative">
                      {propagationResult.points.length > 0 ? (
                        <GroundTrackMap
                          points={propagationResult.points}
                          name={propagationResult.satellite_name || localName || "Satellite"}
                          isDark={isDark}
                        />
                      ) : (
                        <p className="text-sm text-gray-500">No ground track data available.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Propagation Summary */}
                <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-base">
                      <BarChart3 className="h-4 w-4 text-cyan-400" />
                      Propagation Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PropagationSummaryCard
                      summary={propagationResult.summary}
                      numPoints={propagationResult.num_points}
                      errors={propagationResult.errors || []}
                      sgp4Available={propagationResult.sgp4_available}
                      propagationHash={propagationResult.propagation_hash}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========== COMPARISON MODE RESULTS ========== */}
          <AnimatePresence>
            {comparisonMode && comparisonResults.length >= 2 && !isComparing && (
              <motion.div
                id="comparison-results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Header */}
                <Card className="bg-white dark:bg-slate-900/80 border-amber-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                        <GitCompareArrows className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Multi-Satellite Comparison
                        </h3>
                        <p className="text-xs text-gray-500">
                          {comparisonResults.length} satellites · {propagationSettings.duration_min} min propagation
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Overlay Ground Track Map */}
                <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-base">
                      <MapPin className="h-4 w-4 text-amber-400" />
                      Ground Track Overlay
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ComparisonGroundTrackMap results={comparisonResults} />
                  </CardContent>
                </Card>

                {/* Overlay Altitude Chart */}
                <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-base">
                      <Activity className="h-4 w-4 text-amber-400" />
                      Altitude Profile Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ComparisonAltitudeChart results={comparisonResults} isDark={isDark} />
                  </CardContent>
                </Card>

                {/* Comparison Table */}
                <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-base">
                      <BarChart3 className="h-4 w-4 text-amber-400" />
                      Orbital Parameters Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ComparisonTable results={comparisonResults} />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state for comparison mode when nothing selected */}
          {comparisonMode && comparisonSatellites.length === 0 && !isComparing && (
            <Card className="bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
              <CardContent className="p-8 text-center">
                <Layers className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  No satellites selected for comparison
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Go to the TLE Browser above and click &quot;Add to Compare&quot; on up to 4 satellites
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </section>
  );
}