"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SectionHeader } from "./SectionHeader";
import {
  Clock,
  CheckCircle2,
  ListTodo,
  Hourglass,
  ZoomIn,
  Plus,
  X,
  Users,
  Link2,
  CalendarDays,
  Diamond,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MissionPhase {
  id: string;
  name: string;
  startDay: number;
  endDay: number;
  color: string;
  description: string;
  team: string;
  completion: number;
  dependencies: string[];
  isCriticalPath: boolean;
}

interface Milestone {
  day: number;
  label: string;
  phaseId: string;
}

/* ------------------------------------------------------------------ */
/*  Default Data                                                       */
/* ------------------------------------------------------------------ */

const DEFAULT_PHASES: MissionPhase[] = [
  {
    id: "launch",
    name: "Launch",
    startDay: 1,
    endDay: 2,
    color: "#ef4444",
    description: "Vehicle integration, countdown, liftoff, and orbit insertion.",
    team: "Launch Operations",
    completion: 100,
    dependencies: [],
    isCriticalPath: true,
  },
  {
    id: "leop",
    name: "LEOP",
    startDay: 2,
    endDay: 5,
    color: "#f97316",
    description: "Launch and Early Orbit Phase — solar array deploy, detumble, initial checkout.",
    team: "Flight Dynamics",
    completion: 100,
    dependencies: ["launch"],
    isCriticalPath: true,
  },
  {
    id: "commissioning",
    name: "Commissioning",
    startDay: 5,
    endDay: 10,
    color: "#eab308",
    description: "Payload activation, calibration, on-orbit verification of all subsystems.",
    team: "Systems Engineering",
    completion: 85,
    dependencies: ["leop"],
    isCriticalPath: true,
  },
  {
    id: "normal-ops",
    name: "Normal Ops",
    startDay: 10,
    endDay: 20,
    color: "#22c55e",
    description: "Primary mission operations: routine housekeeping, payload data collection.",
    team: "Mission Operations",
    completion: 45,
    dependencies: ["commissioning"],
    isCriticalPath: true,
  },
  {
    id: "maintenance",
    name: "Maintenance",
    startDay: 15,
    endDay: 18,
    color: "#06b6d4",
    description: "Scheduled subsystem maintenance, software patch upload, thruster calibration.",
    team: "Ground Systems",
    completion: 30,
    dependencies: ["normal-ops"],
    isCriticalPath: false,
  },
  {
    id: "orbit-adjust",
    name: "Orbit Adjust",
    startDay: 12,
    endDay: 14,
    color: "#8b5cf6",
    description: "Station-keeping maneuver to correct drift from planned orbit.",
    team: "Flight Dynamics",
    completion: 70,
    dependencies: ["commissioning"],
    isCriticalPath: false,
  },
  {
    id: "experiment",
    name: "Experiment",
    startDay: 14,
    endDay: 22,
    color: "#ec4899",
    description: "Primary science experiment execution, data acquisition sequence.",
    team: "Science Team",
    completion: 25,
    dependencies: ["orbit-adjust", "normal-ops"],
    isCriticalPath: false,
  },
  {
    id: "data-downlink",
    name: "Data Downlink",
    startDay: 18,
    endDay: 26,
    color: "#14b8a6",
    description: "Bulk science data downlink to ground stations, data validation.",
    team: "Ground Systems",
    completion: 10,
    dependencies: ["experiment", "normal-ops"],
    isCriticalPath: false,
  },
  {
    id: "deorbit-prep",
    name: "Deorbit Prep",
    startDay: 26,
    endDay: 28,
    color: "#f59e0b",
    description: "Passivation, battery depletion, deorbit burn preparation.",
    team: "Mission Operations",
    completion: 0,
    dependencies: ["normal-ops"],
    isCriticalPath: true,
  },
  {
    id: "re-entry",
    name: "Re-entry",
    startDay: 28,
    endDay: 30,
    color: "#dc2626",
    description: "Controlled re-entry over South Pacific, mission termination.",
    team: "Flight Dynamics",
    completion: 0,
    dependencies: ["deorbit-prep"],
    isCriticalPath: true,
  },
];

const DEFAULT_MILESTONES: Milestone[] = [
  { day: 1, label: "Launch", phaseId: "launch" },
  { day: 5, label: "First Light", phaseId: "leop" },
  { day: 30, label: "End of Mission", phaseId: "re-entry" },
];

const PHASE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#dc2626",
  "#6366f1", "#a855f7", "#d946ef", "#0ea5e9", "#06b6d4",
];

const TOTAL_DAYS = 30;

/* ------------------------------------------------------------------ */
/*  Animated Counter Hook                                              */
/* ------------------------------------------------------------------ */

function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MissionTimeline() {
  const [phases, setPhases] = useState<MissionPhase[]>(DEFAULT_PHASES);
  const [selectedPhase, setSelectedPhase] = useState<MissionPhase | null>(null);
  const [zoom, setZoom] = useState<1 | 2 | 4>(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formColor, setFormColor] = useState(PHASE_COLORS[0]);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  /* Current day mock (day of month, capped 1-30) */
  const currentDay = useMemo(() => {
    const d = new Date().getDate();
    return Math.min(Math.max(d, 1), 30);
  }, []);

  /* --- Callbacks BEFORE JSX const variables --- */
  const handleBarClick = useCallback((phase: MissionPhase) => {
    setSelectedPhase((prev) => (prev?.id === phase.id ? null : phase));
  }, []);

  const handleZoomChange = useCallback((z: 1 | 2 | 4) => {
    setZoom(z);
  }, []);

  const handleAddPhase = useCallback(() => {
    const start = parseInt(formStart, 10);
    const end = parseInt(formEnd, 10);
    if (!formName.trim() || isNaN(start) || isNaN(end) || start < 1 || end > 30 || start >= end) {
      return;
    }
    const newPhase: MissionPhase = {
      id: `custom-${Date.now()}`,
      name: formName.trim(),
      startDay: start,
      endDay: end,
      color: formColor,
      description: "Custom mission phase added by operator.",
      team: "Operations",
      completion: 0,
      dependencies: [],
      isCriticalPath: false,
    };
    setPhases((prev) => [...prev, newPhase]);
    setFormName("");
    setFormStart("");
    setFormEnd("");
    setShowAddForm(false);
  }, [formName, formStart, formEnd, formColor]);

  const handleCloseDetail = useCallback(() => {
    setSelectedPhase(null);
  }, []);

  /* --- Derived stats --- */
  const completedPhases = phases.filter((p) => p.completion === 100).length;
  const activeTasks = phases.filter((p) => p.completion > 0 && p.completion < 100).length;
  const daysRemaining = Math.max(TOTAL_DAYS - currentDay, 0);

  const totalDuration = useAnimatedCounter(TOTAL_DAYS, 1000);
  const animCompleted = useAnimatedCounter(completedPhases, 1000);
  const animActive = useAnimatedCounter(activeTasks, 1000);
  const animRemaining = useAnimatedCounter(daysRemaining, 1000);

  /* --- Gantt layout constants --- */
  const labelWidth = 120;
  const svgPadding = { top: 30, right: 24, bottom: 40, left: 10 };
  const rowHeight = 36;
  const barHeight = 24;
  const headerHeight = 24;

  const totalRows = phases.length;
  const chartWidth = 700 * zoom;
  const chartHeight = headerHeight + totalRows * rowHeight + svgPadding.bottom;
  const svgWidth = labelWidth + chartWidth + svgPadding.left + svgPadding.right;
  const svgHeight = chartHeight + svgPadding.top;

  const dayToX = useCallback(
    (day: number) => {
      return svgPadding.left + labelWidth + ((day - 1) / TOTAL_DAYS) * chartWidth;
    },
    [chartWidth]
  );

  const rowToY = useCallback(
    (index: number) => {
      return svgPadding.top + headerHeight + index * rowHeight;
    },
    []
  );

  /* Critical path chain for dashed connecting lines */
  const criticalPathPhases = phases.filter((p) => p.isCriticalPath);

  /* --- Milestone Y position (find which row) --- */
  const getMilestoneY = useCallback(
    (phaseId: string) => {
      const idx = phases.findIndex((p) => p.id === phaseId);
      if (idx < 0) return svgPadding.top + headerHeight;
      return rowToY(idx) + rowHeight / 2;
    },
    [phases, rowToY]
  );

  return (
    <section id="mission-timeline" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          sectionNumber="33"
          title="Mission Timeline"
          subtitle="30-day satellite mission Gantt chart with critical path analysis and phase tracking"
          icon={<CalendarDays className="h-5 w-5 text-cyan-400" />}
        />

        {/* ── Mission Statistics ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Clock className="h-4 w-4 text-cyan-400" />}
            label="Total Duration"
            value={totalDuration}
            suffix=" days"
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4 text-cyan-400" />}
            label="Completed Phases"
            value={animCompleted}
            suffix={` / ${phases.length}`}
          />
          <StatCard
            icon={<ListTodo className="h-4 w-4 text-amber-400" />}
            label="Active Tasks"
            value={animActive}
            suffix=" phases"
          />
          <StatCard
            icon={<Hourglass className="h-4 w-4 text-rose-400" />}
            label="Days Remaining"
            value={animRemaining}
            suffix=" days"
          />
        </div>

        {/* ── Gantt Chart + Details Layout ── */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Gantt Chart Card */}
          <div className="flex-1 min-w-0">
            <Card className="border-gray-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-cyan-500/5 overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                {/* Zoom Controls + Legend */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  {/* Zoom */}
                  <div className="flex items-center gap-2">
                    <ZoomIn className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Zoom:</span>
                    {([1, 2, 4] as const).map((z) => (
                      <Button
                        key={z}
                        size="sm"
                        variant={zoom === z ? "default" : "outline"}
                        onClick={() => handleZoomChange(z)}
                        className={`h-7 text-xs px-3 ${
                          zoom === z
                            ? "bg-cyan-600 hover:bg-cyan-700 text-white dark:bg-cyan-600 dark:hover:bg-cyan-700"
                            : "border-gray-300 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {z}x
                      </Button>
                    ))}
                  </div>

                  {/* Add Phase Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddForm((p) => !p)}
                    className="h-7 text-xs border-cyan-600/40 text-cyan-400 hover:bg-cyan-500/10 dark:border-cyan-500/30"
                  >
                    {showAddForm ? (
                      <>
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-1" /> Add Phase
                      </>
                    )}
                  </Button>
                </div>

                {/* Add Phase Form */}
                <AnimatePresence>
                  {showAddForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="border border-cyan-500/20 rounded-lg p-4 bg-cyan-500/5 dark:bg-cyan-500/5">
                        <h4 className="text-xs font-semibold text-cyan-400 mb-3 uppercase tracking-wider">
                          Add Custom Phase
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-gray-400">Phase Name</Label>
                            <Input
                              value={formName}
                              onChange={(e) => setFormName(e.target.value)}
                              placeholder="e.g. Thermal Test"
                              className="h-8 text-xs bg-white/40 dark:bg-slate-800/40 border-gray-300 dark:border-slate-700"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-gray-400">Start Day (1-30)</Label>
                            <Input
                              type="number"
                              min={1}
                              max={30}
                              value={formStart}
                              onChange={(e) => setFormStart(e.target.value)}
                              placeholder="10"
                              className="h-8 text-xs bg-white/40 dark:bg-slate-800/40 border-gray-300 dark:border-slate-700"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-gray-400">End Day (1-30)</Label>
                            <Input
                              type="number"
                              min={1}
                              max={30}
                              value={formEnd}
                              onChange={(e) => setFormEnd(e.target.value)}
                              placeholder="15"
                              className="h-8 text-xs bg-white/40 dark:bg-slate-800/40 border-gray-300 dark:border-slate-700"
                            />
                          </div>
                          <div className="space-y-1 flex flex-col">
                            <Label className="text-[11px] text-gray-400">Color</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={formColor}
                                onChange={(e) => setFormColor(e.target.value)}
                                className="h-8 w-10 rounded border border-gray-300 dark:border-slate-700 cursor-pointer bg-transparent"
                              />
                              <Button
                                size="sm"
                                onClick={handleAddPhase}
                                className="h-8 text-xs bg-cyan-600 hover:bg-cyan-700 text-white dark:bg-cyan-600 dark:hover:bg-cyan-700"
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* SVG Gantt Chart — scrollable on small screens */}
                <div className="overflow-x-auto custom-scrollbar rounded-lg border border-gray-200/60 dark:border-slate-800/60 bg-gray-50/50 dark:bg-slate-950/40">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full min-w-[600px]"
                    style={{ minWidth: `${Math.min(svgWidth, 600)}px` }}
                    role="img"
                    aria-label="Mission Timeline Gantt Chart"
                  >
                    {/* ── X-Axis Grid Lines (every 5 days) ── */}
                    {[5, 10, 15, 20, 25, 30].map((d) => {
                      const x = dayToX(d);
                      return (
                        <line
                          key={`grid-${d}`}
                          x1={x}
                          y1={svgPadding.top + headerHeight}
                          x2={x}
                          y2={svgPadding.top + headerHeight + totalRows * rowHeight}
                          stroke="currentColor"
                          className="text-gray-200 dark:text-slate-800"
                          strokeWidth={1}
                          strokeDasharray="4 4"
                        />
                      );
                    })}

                    {/* ── X-Axis Labels ── */}
                    {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((d) => {
                      const x = dayToX(d);
                      const showLabel = d % 5 === 0 || d === 1;
                      return (
                        <g key={`x-${d}`}>
                          {showLabel && (
                            <text
                              x={x}
                              y={svgPadding.top + headerHeight + totalRows * rowHeight + 20}
                              textAnchor="middle"
                              className="fill-gray-500 dark:fill-gray-400"
                              fontSize={10}
                              fontFamily="monospace"
                            >
                              D{d}
                            </text>
                          )}
                          {/* Small tick */}
                          <line
                            x1={x}
                            y1={svgPadding.top + headerHeight + totalRows * rowHeight}
                            x2={x}
                            y2={svgPadding.top + headerHeight + totalRows * rowHeight + 4}
                            stroke="currentColor"
                            className="text-gray-300 dark:text-slate-700"
                            strokeWidth={1}
                          />
                        </g>
                      );
                    })}

                    {/* ── Row Alternating Background ── */}
                    {phases.map((_, i) => {
                      const y = rowToY(i);
                      return (
                        <rect
                          key={`row-bg-${i}`}
                          x={svgPadding.left + labelWidth}
                          y={y}
                          width={chartWidth}
                          height={rowHeight}
                          className={i % 2 === 0 ? "fill-white/40 dark:fill-slate-900/20" : "fill-transparent"}
                        />
                      );
                    })}

                    {/* ── Critical Path Dashed Connecting Line ── */}
                    {criticalPathPhases.length > 1 && (
                      <polyline
                        points={criticalPathPhases
                          .map((p) => {
                            const idx = phases.indexOf(p);
                            const x = dayToX(p.endDay);
                            const y = rowToY(idx) + rowHeight / 2;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        opacity={0.7}
                      />
                    )}

                    {/* ── Phase Bars ── */}
                    {phases.map((phase, i) => {
                      const x = dayToX(phase.startDay);
                      const y = rowToY(i) + (rowHeight - barHeight) / 2;
                      const width = ((phase.endDay - phase.startDay + 1) / TOTAL_DAYS) * chartWidth;
                      const isSelected = selectedPhase?.id === phase.id;

                      return (
                        <g
                          key={phase.id}
                          onClick={() => handleBarClick(phase)}
                          className="cursor-pointer"
                          role="button"
                          aria-label={`${phase.name}: Day ${phase.startDay}-${phase.endDay}, ${phase.completion}% complete`}
                        >
                          {/* Bar background (track) */}
                          <rect
                            x={x}
                            y={y}
                            width={width}
                            height={barHeight}
                            rx={4}
                            className="fill-gray-200/60 dark:fill-slate-700/40"
                          />
                          {/* Bar fill (completion) */}
                          <rect
                            x={x}
                            y={y}
                            width={width * (phase.completion / 100)}
                            height={barHeight}
                            rx={4}
                            fill={phase.color}
                            opacity={phase.completion === 100 ? 0.7 : 0.85}
                          />
                          {/* Critical path highlight border */}
                          {phase.isCriticalPath && (
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={barHeight}
                              rx={4}
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth={isSelected ? 2.5 : 1.5}
                              strokeDasharray={phase.completion === 100 ? "none" : "4 2"}
                            />
                          )}
                          {/* Selected highlight */}
                          {isSelected && (
                            <rect
                              x={x - 1}
                              y={y - 1}
                              width={width + 2}
                              height={barHeight + 2}
                              rx={5}
                              fill="none"
                              stroke="#06b6d4"
                              strokeWidth={2}
                              opacity={0.8}
                            />
                          )}
                          {/* Bar label (if wide enough) */}
                          {width > 50 && (
                            <text
                              x={x + 6}
                              y={y + barHeight / 2 + 4}
                              className="fill-white dark:fill-white"
                              fontSize={10}
                              fontWeight={600}
                              fontFamily="system-ui, sans-serif"
                            >
                              {phase.name}
                            </text>
                          )}
                          {/* Completion text at end */}
                          {width > 70 && (
                            <text
                              x={x + width - 6}
                              y={y + barHeight / 2 + 4}
                              textAnchor="end"
                              className="fill-white/80"
                              fontSize={9}
                              fontFamily="monospace"
                            >
                              {phase.completion}%
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* ── Y-Axis Labels ── */}
                    {phases.map((phase, i) => {
                      const y = rowToY(i) + rowHeight / 2 + 4;
                      return (
                        <text
                          key={`label-${phase.id}`}
                          x={svgPadding.left + labelWidth - 8}
                          y={y}
                          textAnchor="end"
                          className={`fill-gray-700 dark:fill-gray-300 ${
                            phase.isCriticalPath ? "font-bold" : ""
                          }`}
                          fontSize={11}
                          fontFamily="system-ui, sans-serif"
                        >
                          {phase.name}
                          {phase.isCriticalPath && (
                            <tspan className="fill-amber-400" fontSize={8}> ★</tspan>
                          )}
                        </text>
                      );
                    })}

                    {/* ── Milestones (diamonds) ── */}
                    {DEFAULT_MILESTONES.map((ms) => {
                      const x = dayToX(ms.day);
                      const y = getMilestoneY(ms.phaseId);
                      return (
                        <g key={`ms-${ms.label}`} aria-label={ms.label}>
                          <polygon
                            points={`${x},${y - 8} ${x + 6},${y} ${x},${y + 8} ${x - 6},${y}`}
                            fill="#fbbf24"
                            stroke="#f59e0b"
                            strokeWidth={1.5}
                            opacity={0.9}
                          />
                          <text
                            x={x}
                            y={y - 12}
                            textAnchor="middle"
                            className="fill-amber-300 dark:fill-amber-400"
                            fontSize={9}
                            fontWeight={600}
                            fontFamily="system-ui, sans-serif"
                          >
                            {ms.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* ── Current Day Indicator ── */}
                    <line
                      x1={dayToX(currentDay)}
                      y1={svgPadding.top}
                      x2={dayToX(currentDay)}
                      y2={svgPadding.top + headerHeight + totalRows * rowHeight}
                      stroke="#06b6d4"
                      strokeWidth={2}
                      opacity={0.8}
                    />
                    <rect
                      x={dayToX(currentDay) - 18}
                      y={svgPadding.top - 2}
                      width={36}
                      height={16}
                      rx={3}
                      fill="#06b6d4"
                    />
                    <text
                      x={dayToX(currentDay)}
                      y={svgPadding.top + 11}
                      textAnchor="middle"
                      className="fill-white"
                      fontSize={9}
                      fontWeight={700}
                      fontFamily="monospace"
                    >
                      D{currentDay}
                    </text>

                    {/* ── Header row: "Days" label ── */}
                    <text
                      x={svgPadding.left + labelWidth + chartWidth / 2}
                      y={svgPadding.top + 14}
                      textAnchor="middle"
                      className="fill-gray-400 dark:fill-gray-500"
                      fontSize={11}
                      fontWeight={600}
                      fontFamily="system-ui, sans-serif"
                      letterSpacing="0.05em"
                    >
                      MISSION DAYS
                    </text>
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Diamond className="h-3 w-3 text-amber-400" />
                    <span>Milestone</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 bg-cyan-500 rounded" />
                    <span>Current Day</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-400" />
                    <span>Critical Path</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Phase Details Panel ── */}
          <div className="xl:w-80 shrink-0">
            <AnimatePresence mode="wait">
              {selectedPhase ? (
                <motion.div
                  key={selectedPhase.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card className="border-cyan-500/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-cyan-500/5">
                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-sm shrink-0"
                            style={{ backgroundColor: selectedPhase.color }}
                          />
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            {selectedPhase.name}
                          </h3>
                        </div>
                        <button
                          onClick={handleCloseDetail}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                          aria-label="Close details"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Duration & Status */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="rounded-lg bg-gray-100/80 dark:bg-slate-800/60 p-2.5">
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            Duration
                          </p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 font-mono">
                            {selectedPhase.endDay - selectedPhase.startDay + 1} days
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-100/80 dark:bg-slate-800/60 p-2.5">
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            Period
                          </p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 font-mono">
                            D{selectedPhase.startDay}–D{selectedPhase.endDay}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                        {selectedPhase.description}
                      </p>

                      {/* Team */}
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {selectedPhase.team}
                        </span>
                      </div>

                      {/* Completion Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            Completion
                          </span>
                          <span
                            className="text-xs font-bold font-mono"
                            style={{ color: selectedPhase.color }}
                          >
                            {selectedPhase.completion}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: selectedPhase.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedPhase.completion}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="mb-4">
                        <Badge
                          variant="outline"
                          className={
                            selectedPhase.completion === 100
                              ? "border-cyan-500/40 text-cyan-400 bg-cyan-500/10"
                              : selectedPhase.completion > 0
                              ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                              : "border-gray-400/40 text-gray-400 bg-gray-400/10"
                          }
                        >
                          {selectedPhase.completion === 100
                            ? "Complete"
                            : selectedPhase.completion > 0
                            ? "In Progress"
                            : "Pending"}
                        </Badge>
                        {selectedPhase.isCriticalPath && (
                          <Badge
                            variant="outline"
                            className="ml-2 border-amber-500/40 text-amber-400 bg-amber-500/10"
                          >
                            ★ Critical Path
                          </Badge>
                        )}
                      </div>

                      {/* Dependencies */}
                      {selectedPhase.dependencies.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Link2 className="h-3 w-3 text-gray-400" />
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                              Dependencies
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedPhase.dependencies.map((depId) => {
                              const dep = phases.find((p) => p.id === depId);
                              return (
                                <span
                                  key={depId}
                                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700"
                                >
                                  {dep ? (
                                    <>
                                      <span
                                        className="h-1.5 w-1.5 rounded-full"
                                        style={{ backgroundColor: dep.color }}
                                      />
                                      {dep.name}
                                    </>
                                  ) : (
                                    depId
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="border-gray-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
                    <CardContent className="p-5 flex flex-col items-center justify-center text-center min-h-[200px]">
                      <CalendarDays className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[200px]">
                        Click a Gantt bar to view phase details, progress, and dependencies.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card Sub-component                                             */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <Card className="border-gray-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-cyan-500/5 hover:shadow-cyan-500/10 transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900 dark:text-white font-mono tabular-nums">
            {value}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{suffix}</span>
        </div>
      </CardContent>
    </Card>
  );
}