"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Send,
  Circle,
  Signal,
  Clock,
  Wifi,
  WifiOff,
  Antenna,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "./SectionHeader";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PassStatus = "upcoming" | "in_progress" | "completed" | "missed";
type BlockColor = "green" | "gray" | "red";
type MsgDirection = "uplink" | "downlink";

interface CommPass {
  id: string;
  time: string; // "HH:MM"
  station: string;
  satellite: string;
  duration: string;
  elevMax: string;
  status: PassStatus;
}

interface TimelineBlock {
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  station: string;
  color: BlockColor;
}

interface CommMessage {
  id: number;
  time: string;
  station: string;
  text: string;
  direction: MsgDirection;
}

interface FreqBand {
  name: string;
  range: string;
  modulation: string;
  dataRate: string;
  active: boolean;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const TIMELINE_BLOCKS: TimelineBlock[] = [
  { startHour: 0, startMin: 15, endHour: 0, endMin: 32, station: "Goldstone", color: "green" },
  { startHour: 1, startMin: 45, endHour: 1, endMin: 58, station: "Madrid", color: "gray" },
  { startHour: 3, startMin: 10, endHour: 3, endMin: 25, station: "Canberra", color: "red" },
  { startHour: 4, startMin: 40, endHour: 4, endMin: 55, station: "Svalbard", color: "green" },
  { startHour: 6, startMin: 0, endHour: 6, endMin: 18, station: "Goldstone", color: "green" },
  { startHour: 7, startMin: 30, endHour: 7, endMin: 42, station: "Wallops", color: "gray" },
  { startHour: 9, startMin: 5, endHour: 9, endMin: 22, station: "Madrid", color: "green" },
  { startHour: 10, startMin: 40, endHour: 10, endMin: 51, station: "Hawaii", color: "gray" },
  { startHour: 12, startMin: 0, endHour: 12, endMin: 20, station: "Canberra", color: "green" },
  { startHour: 13, startMin: 25, endHour: 13, endMin: 38, station: "Kourou", color: "red" },
  { startHour: 15, startMin: 10, endHour: 15, endMin: 28, station: "Svalbard", color: "green" },
  { startHour: 16, startMin: 45, endHour: 16, endMin: 57, station: "Goldstone", color: "gray" },
  { startHour: 18, startMin: 20, endHour: 18, endMin: 35, station: "Madrid", color: "green" },
  { startHour: 19, startMin: 50, endHour: 20, endMin: 5, station: "Wallops", color: "gray" },
  { startHour: 21, startMin: 15, endHour: 21, endMin: 30, station: "Canberra", color: "green" },
  { startHour: 22, startMin: 40, endHour: 22, endMin: 52, station: "Hawaii", color: "red" },
];

const PASS_SCHEDULE: CommPass[] = [
  { id: "p1", time: "09:05", station: "Madrid DSN", satellite: "OG-7 Alpha", duration: "17m 12s", elevMax: "78.4°", status: "in_progress" },
  { id: "p2", time: "10:40", station: "Hawaii USHF", satellite: "OG-7 Alpha", duration: "11m 04s", elevMax: "42.1°", status: "upcoming" },
  { id: "p3", time: "12:00", station: "Canberra DSN", satellite: "OG-12 Bravo", duration: "20m 33s", elevMax: "85.7°", status: "upcoming" },
  { id: "p4", time: "13:25", station: "Kourou FSS", satellite: "OG-7 Alpha", duration: "13m 45s", elevMax: "31.2°", status: "upcoming" },
  { id: "p5", time: "15:10", station: "Svalbard SGS", satellite: "OG-3 Charlie", duration: "18m 08s", elevMax: "67.9°", status: "upcoming" },
  { id: "p6", time: "16:45", station: "Goldstone DSN", satellite: "OG-12 Bravo", duration: "12m 22s", elevMax: "53.6°", status: "upcoming" },
  { id: "p7", time: "18:20", station: "Madrid DSN", satellite: "OG-7 Alpha", duration: "15m 50s", elevMax: "71.3°", status: "upcoming" },
  { id: "p8", time: "19:50", station: "Wallops WFF", satellite: "OG-3 Charlie", duration: "15m 10s", elevMax: "38.8°", status: "upcoming" },
  { id: "p9", time: "21:15", station: "Canberra DSN", satellite: "OG-7 Alpha", duration: "15m 30s", elevMax: "80.1°", status: "upcoming" },
  { id: "p10", time: "22:40", station: "Hawaii USHF", satellite: "OG-12 Bravo", duration: "12m 15s", elevMax: "44.5°", status: "upcoming" },
];

const INITIAL_MESSAGES: CommMessage[] = [
  { id: 1, time: "08:58:12", station: "Madrid", text: "HANDSHAKE ACK — link established on S-band", direction: "downlink" },
  { id: 2, time: "08:58:14", station: "MCC", text: "REQUEST TM DUMP — all subsystems", direction: "uplink" },
  { id: 3, time: "08:58:16", station: "Madrid", text: "TM FRAME 0x4A2F — ADCS nominal, PWR 98.2%", direction: "downlink" },
  { id: 4, time: "09:00:01", station: "Madrid", text: "TM FRAME 0x4A30 — THERMAL within limits", direction: "downlink" },
  { id: 5, time: "09:01:22", station: "MCC", text: "LOAD NEW TLE SET — epoch 2026-06-27T09:00", direction: "uplink" },
  { id: 6, time: "09:01:24", station: "Madrid", text: "TLE ACCEPTED — propagated ephemeris updated", direction: "downlink" },
  { id: 7, time: "09:03:45", station: "Madrid", text: "SIGNAL QUALITY — BER 1.2e-8, SNR 14.3 dB", direction: "downlink" },
  { id: 8, time: "09:04:10", station: "MCC", text: "ACK — continue TM stream", direction: "uplink" },
  { id: 9, time: "09:04:12", station: "Madrid", text: "TM FRAME 0x4A35 — COMMS subsystem healthy", direction: "downlink" },
  { id: 10, time: "09:05:00", station: "Madrid", text: "PASS MIDPOINT — elevation 62.1°, range 842 km", direction: "downlink" },
];

const FREQUENCY_BANDS: FreqBand[] = [
  { name: "S-Band Uplink", range: "2025–2120 MHz", modulation: "BPSK / QPSK", dataRate: "64 kbps", active: true },
  { name: "S-Band Downlink", range: "2200–2290 MHz", modulation: "QPSK", dataRate: "256 kbps", active: true },
  { name: "X-Band Downlink", range: "8025–8400 MHz", modulation: "8-PSK", dataRate: "2 Mbps", active: true },
  { name: "Ka-Band Downlink", range: "25.5–27.0 GHz", modulation: "QAM-16", dataRate: "20 Mbps", active: false },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function blockColorClass(color: BlockColor) {
  switch (color) {
    case "green":
      return "bg-cyan-500/70 border-cyan-400/80";
    case "gray":
      return "bg-gray-500/50 border-gray-400/60";
    case "red":
      return "bg-rose-500/60 border-rose-400/70";
  }
}

function statusBadge(status: PassStatus) {
  switch (status) {
    case "upcoming":
      return (
        <Badge variant="outline" className="text-gray-400 border-gray-600 bg-gray-800/50 text-xs">
          Upcoming
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 text-xs animate-pulse">
          In Progress
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="text-gray-500 border-gray-700 bg-gray-800/30 text-xs opacity-60">
          Completed
        </Badge>
      );
    case "missed":
      return (
        <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/50 text-xs">
          Missed
        </Badge>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CommsTimeline() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  const [sortCol, setSortCol] = useState<string>("time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [messages, setMessages] = useState<CommMessage[]>(INITIAL_MESSAGES);
  const [cmdInput, setCmdInput] = useState("");
  const [signalBars, setSignalBars] = useState(4);
  const logEndRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(INITIAL_MESSAGES.length + 1);

  /* Tick every second */
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setMounted(true);
      setSignalBars((prev) => {
        const jitter = Math.random();
        if (jitter > 0.85) return Math.max(1, prev - 1);
        if (jitter > 0.5) return Math.min(5, prev + 1);
        return prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* Auto-scroll message log */
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Sort handler — defined before JSX */
  const handleSort = useCallback(
    (col: string) => {
      setSortDir((prev) => (sortCol === col ? (prev === "asc" ? "desc" : "asc") : "asc"));
      setSortCol(col);
    },
    [sortCol]
  );

  /* Sort icon renderer — defined before JSX */
  const SortIcon = useCallback(
    ({ col }: { col: string }) => {
      if (sortCol !== col) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
      return sortDir === "asc" ? (
        <ArrowUp className="ml-1 h-3 w-3 text-cyan-400" />
      ) : (
        <ArrowDown className="ml-1 h-3 w-3 text-cyan-400" />
      );
    },
    [sortCol, sortDir]
  );

  /* Send command handler — defined before JSX */
  const handleSendCommand = useCallback(() => {
    const trimmed = cmdInput.trim();
    if (!trimmed) return;
    const h = pad2(now.getUTCHours());
    const m = pad2(now.getUTCMinutes());
    const s = pad2(now.getUTCSeconds());
    const newMsg: CommMessage = {
      id: msgIdRef.current++,
      time: `${h}:${m}:${s}`,
      station: "MCC",
      text: trimmed,
      direction: "uplink",
    };
    setMessages((prev) => [...prev, newMsg]);
    setCmdInput("");
  }, [cmdInput, now]);

  /* Keydown for command input */
  const handleCmdKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSendCommand();
    },
    [handleSendCommand]
  );

  /* Sorted pass schedule — derived after state */
  const sortedPasses = useMemo(() => {
    const arr = [...PASS_SCHEDULE];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "time":
          cmp = a.time.localeCompare(b.time);
          break;
        case "station":
          cmp = a.station.localeCompare(b.station);
          break;
        case "satellite":
          cmp = a.satellite.localeCompare(b.satellite);
          break;
        case "duration":
          cmp = a.duration.localeCompare(b.duration);
          break;
        case "elevMax":
          cmp = a.elevMax.localeCompare(b.elevMax);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        default:
          cmp = 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [sortCol, sortDir]);

  /* Current time position on timeline — 0..1440 (minutes in day) */
  const currentMinutes = mounted ? now.getUTCHours() * 60 + now.getUTCMinutes() : 720;
  const currentPct = (currentMinutes / 1440) * 100;

  /* Active pass info */
  const activePass = PASS_SCHEDULE.find((p) => p.status === "in_progress");
  const nextPass = PASS_SCHEDULE.find((p) => p.status === "upcoming");

  /* Countdown to next pass (mock: assume nextPass.time is today) */
  const countdownStr = useMemo(() => {
    if (!nextPass) return "--:--";
    const [nh, nm] = nextPass.time.split(":").map(Number);
    const nowMin = mounted ? now.getUTCHours() * 60 + now.getUTCMinutes() : 0;
    const nextMin = nh * 60 + nm;
    const diff = Math.max(0, nextMin - nowMin);
    const ch = Math.floor(diff / 60);
    const cm = diff % 60;
    return `${pad2(ch)}:${pad2(cm)}`;
  }, [nextPass, now, mounted]);

  /* Hours array for timeline axis */
  const hours = Array.from({ length: 25 }, (_, i) => i);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <section id="comms-timeline" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Communication Timeline"
          subtitle="24-hour pass windows, live signal monitoring, and frequency management"
          icon={<Radio className="h-5 w-5 text-cyan-400" />}
          sectionNumber="§31"
        />

        {/* ── Live Comm Status ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Active pass */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              {activePass ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                  </span>
                  <span className="text-xs font-mono text-rose-400 uppercase tracking-wider">
                    Recording
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                    Standby
                  </span>
                </>
              )}
            </div>
            {activePass ? (
              <div className="space-y-1.5">
                <div className="text-sm font-semibold text-white">{activePass.station}</div>
                <div className="text-xs text-gray-400">
                  {activePass.satellite} · {activePass.duration}
                </div>
                <div className="text-xs text-cyan-400 font-mono">
                  Max El: {activePass.elevMax}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No active pass</div>
            )}
          </div>

          {/* Countdown */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                Next Pass
              </span>
            </div>
            {nextPass ? (
              <div className="space-y-1.5">
                <div className="text-2xl font-mono font-bold text-white tracking-wider">
                  {countdownStr}
                </div>
                <div className="text-xs text-gray-400">
                  {nextPass.time} UTC · {nextPass.station}
                </div>
                <div className="text-xs text-gray-500">{nextPass.satellite}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No upcoming passes</div>
            )}
          </div>

          {/* Signal quality */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Signal className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                Signal Quality
              </span>
            </div>
            <div className="flex items-end gap-1.5 h-10 mt-1">
              {[1, 2, 3, 4, 5].map((bar) => (
                <motion.div
                  key={bar}
                  className={`w-3 rounded-sm transition-colors duration-500 ${
                    bar <= signalBars
                      ? "bg-cyan-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                      : "bg-gray-700"
                  }`}
                  animate={{
                    height: bar <= signalBars ? `${bar * 7 + 4}px` : "4px",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
              ))}
              <span className="ml-2 text-xs font-mono text-gray-400 self-center">
                {activePass ? "LOCKED" : "NO SIG"}
              </span>
            </div>
          </div>
        </div>

        {/* ── 24-Hour Timeline ──────────────────────────────────────── */}
        <div className="glass-card rounded-xl p-4 mb-6 overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Antenna className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">24-Hour Pass Timeline</span>
            <span className="text-[10px] font-mono text-gray-500 ml-auto">UTC</span>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <div className="relative" style={{ minWidth: "960px", height: "80px" }}>
              {/* Hour markers */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute top-0 text-[9px] font-mono text-gray-500"
                  style={{ left: `${(h / 24) * 100}%`, transform: "translateX(-50%)" }}
                >
                  {pad2(h)}:00
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-px h-3 bg-gray-700/60"
                    style={{ top: "14px" }}
                  />
                </div>
              ))}

              {/* Pass blocks */}
              {TIMELINE_BLOCKS.map((block, i) => {
                const startPct = ((block.startHour * 60 + block.startMin) / 1440) * 100;
                const endPct = ((block.endHour * 60 + block.endMin) / 1440) * 100;
                const widthPct = Math.max(0.5, endPct - startPct);
                return (
                  <div
                    key={i}
                    className={`absolute top-7 rounded-md border text-[8px] font-mono text-white/90 truncate px-1 leading-4 ${blockColorClass(block.color)}`}
                    style={{
                      left: `${startPct}%`,
                      width: `${widthPct}%`,
                    }}
                    title={`${block.station}: ${pad2(block.startHour)}:${pad2(block.startMin)}–${pad2(block.endHour)}:${pad2(block.endMin)}`}
                  >
                    {widthPct > 2 && block.station}
                  </div>
                );
              })}

              {/* Current time indicator */}
              {mounted && (
                <motion.div
                  className="absolute top-0 z-10"
                  style={{ left: `${currentPct}%` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="w-px h-full bg-cyan-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                </motion.div>
              )}
            </div>
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500/70 border border-cyan-400/80" />
              Active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-500/50 border border-gray-400/60" />
              Scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/60 border border-rose-400/70" />
              Missed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-cyan-400 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
              Now
            </span>
          </div>
        </div>

        {/* ── Pass Schedule Table ───────────────────────────────────── */}
        <div className="glass-card rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Upcoming Pass Schedule</span>
            <span className="text-[10px] font-mono text-gray-500 ml-auto">Next 10 passes · click headers to sort</span>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700/60">
                  {[
                    { key: "time", label: "Time (UTC)" },
                    { key: "station", label: "Station" },
                    { key: "satellite", label: "Satellite" },
                    { key: "duration", label: "Duration" },
                    { key: "elevMax", label: "Elev Max" },
                    { key: "status", label: "Status" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className="text-left py-2 px-3 text-gray-400 font-mono uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="inline-flex items-center">
                        {col.label}
                        <SortIcon col={col.key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPasses.map((pass) => (
                  <tr
                    key={pass.id}
                    className="border-b border-gray-800/40 hover:bg-cyan-500/5 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono text-white">{pass.time}</td>
                    <td className="py-2.5 px-3 text-gray-300">{pass.station}</td>
                    <td className="py-2.5 px-3 text-gray-300">{pass.satellite}</td>
                    <td className="py-2.5 px-3 font-mono text-gray-400">{pass.duration}</td>
                    <td className="py-2.5 px-3 font-mono text-gray-400">{pass.elevMax}</td>
                    <td className="py-2.5 px-3">{statusBadge(pass.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Message Log + Frequency Plan ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Message Log */}
          <div className="lg:col-span-3 glass-card rounded-xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Comm Message Log</span>
              <span className="text-[10px] font-mono text-gray-500 ml-auto">
                {messages.length} messages
              </span>
            </div>
            <div className="flex-1 rounded-lg bg-black/30 border border-gray-800/60 p-3 max-h-72 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-1">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: msg.direction === "uplink" ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`leading-relaxed ${
                      msg.direction === "uplink"
                        ? "text-amber-300/90"
                        : "text-cyan-300/80"
                    }`}
                  >
                    <span className="text-gray-500">[{msg.time}]</span>{" "}
                    <span className="text-cyan-400/70">[{msg.station}]</span>{" "}
                    <span className={msg.direction === "uplink" ? "text-amber-400/50" : "text-cyan-400/40"}>
                      {msg.direction === "uplink" ? "▲" : "▼"}
                    </span>{" "}
                    {msg.text}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={logEndRef} />
            </div>
            {/* Command input */}
            <div className="flex gap-2 mt-3">
              <Input
                value={cmdInput}
                onChange={(e) => setCmdInput(e.target.value)}
                onKeyDown={handleCmdKeyDown}
                placeholder="Send command (e.g. REQUEST TM DUMP)..."
                className="bg-black/30 border-gray-700/60 text-xs font-mono text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-cyan-500/20 h-8"
              />
              <Button
                size="sm"
                onClick={handleSendCommand}
                className="h-8 px-3 bg-cyan-600/80 hover:bg-cyan-500/80 text-white shrink-0"
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Frequency Plan */}
          <div className="lg:col-span-2 glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Frequency Plan</span>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {FREQUENCY_BANDS.map((band) => (
                <motion.div
                  key={band.name}
                  className="rounded-lg border p-3 transition-colors"
                  style={{
                    backgroundColor: band.active ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)",
                    borderColor: band.active ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.06)",
                  }}
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white">{band.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${
                        band.active
                          ? "text-cyan-400 border-cyan-500/50 bg-cyan-500/10"
                          : "text-gray-500 border-gray-600/50 bg-gray-800/50"
                      }`}
                    >
                      {band.active ? "Active" : "Standby"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                    <div className="text-gray-500">Freq</div>
                    <div className="text-gray-300 font-mono">{band.range}</div>
                    <div className="text-gray-500">Mod</div>
                    <div className="text-gray-300 font-mono">{band.modulation}</div>
                    <div className="text-gray-500">Rate</div>
                    <div className="text-gray-300 font-mono">{band.dataRate}</div>
                  </div>
                  {band.active && (
                    <div className="mt-2 h-1 rounded-full bg-cyan-500/20 overflow-hidden">
                      <motion.div
                        className="h-full bg-cyan-400/60 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: "75%" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}