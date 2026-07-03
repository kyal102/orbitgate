"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SectionHeader } from "./SectionHeader";
import { Clock, Globe, Satellite, Timer } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Compute Julian Date from a JS Date (UT). */
function toJulianDate(d: Date): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate() + d.getUTCHours() / 24 + d.getUTCMinutes() / 1440 + d.getUTCSeconds() / 86400;
  let A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m > 2 ? m : m + 12)) + day + B - 1524.5;
}

/** Mock ISS ground-station pass windows (minutes from now). */
const MOCK_PASS_WINDOWS = [
  { start: 14, end: 18, station: "Houston (JSC)" },
  { start: 42, end: 46, station: "Moscow (MCC)" },
  { start: 78, end: 82, station: "Beijing (BACC)" },
  { start: 110, end: 115, station: "Tokyo (JAXA)" },
];

const TIMEZONE_ROWS = [
  { label: "Houston (JSC)", offset: -5, flag: "🇺🇸" },
  { label: "Moscow (MCC)", offset: 3, flag: "🇷🇺" },
  { label: "Beijing (BACC)", offset: 8, flag: "🇨🇳" },
  { label: "Tokyo (JAXA)", offset: 9, flag: "🇯🇵" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MissionClock() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  const [colonVisible, setColonVisible] = useState(true);
  const loadTimeRef = useRef(Date.now());

  /* Tick every second */
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => {
      setNow(new Date());
      setColonVisible((v) => !v);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* --- Derived values ------------------------------------------------ */

  const utcDateStr = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
  const utcH = pad2(now.getUTCHours());
  const utcM = pad2(now.getUTCMinutes());
  const utcS = pad2(now.getUTCSeconds());
  const colon = colonVisible ? ":" : " ";

  /* MET (Mission Elapsed Time since page load) */
  const elapsedMs = Date.now() - loadTimeRef.current;
  const totalSec = Math.floor(elapsedMs / 1000);
  const metDays = Math.floor(totalSec / 86400);
  const metHrs = Math.floor((totalSec % 86400) / 3600);
  const metMin = Math.floor((totalSec % 3600) / 60);
  const metSec = totalSec % 60;
  const metStr = `T+${pad2(metDays)}:${pad2(metHrs)}:${pad2(metMin)}:${pad2(metSec)}`;

  /* Next pass countdown */
  const elapsedMin = elapsedMs / 60000;
  const nextPass = MOCK_PASS_WINDOWS.find((w) => w.start > elapsedMin) ?? null;
  const passCountdown = nextPass
    ? Math.max(0, Math.ceil((nextPass.start - elapsedMin) * 60))
    : null;
  const passMinutes = passCountdown !== null ? Math.floor(passCountdown / 60) : 0;
  const passSeconds = passCountdown !== null ? passCountdown % 60 : 0;

  /* Julian Date */
  const jd = toJulianDate(now);

  /* Pass window progress (0-100% for 120 min window) */
  const windowTotal = 130; // minutes shown
  const windowProgress = Math.min((elapsedMin / windowTotal) * 100, 100);

  /* Timezone conversions */
  const tzRows = TIMEZONE_ROWS.map((tz) => {
    const local = new Date(now.getTime() + tz.offset * 3600000);
    return {
      ...tz,
      time: `${pad2(local.getUTCHours())}:${pad2(local.getUTCMinutes())}:${pad2(local.getUTCSeconds())}`,
      offsetStr: tz.offset >= 0 ? `UTC+${tz.offset}` : `UTC${tz.offset}`,
    };
  });

  /* --- Render -------------------------------------------------------- */

  if (!mounted) {
    // SSR skeleton — avoids hydration mismatch
    return (
      <section id="mission-clock" className="py-16 px-4">
        <SectionHeader
          title="Mission Clock & UTC Display"
          subtitle="Real-time mission timing, timezone conversion, and Julian date reference"
          icon={<Clock className="h-5 w-5 text-cyan-400" />}
          sectionNumber="§24"
        />
        <div className="max-w-5xl mx-auto">
          <div className="h-64 rounded-xl bg-white/5 animate-pulse" />
        </div>
      </section>
    );
  }

  return (
    <section id="mission-clock" className="py-16 px-4">
      <SectionHeader
        title="Mission Clock & UTC Display"
        subtitle="Real-time mission timing, timezone conversion, and Julian date reference"
        icon={<Clock className="h-5 w-5 text-cyan-400" />}
        sectionNumber="§24"
      />

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ---- LEFT COLUMN: UTC Clock + MET --------------------------- */}
        <div className="space-y-6">
          {/* UTC Clock card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400/70 text-xs font-mono uppercase tracking-widest">
              <Globe className="h-3.5 w-3.5" />
              Coordinated Universal Time
            </div>

            {/* Date */}
            <p className="text-lg font-mono text-gray-300 tracking-wide">
              {utcDateStr}
            </p>

            {/* Big time */}
            <div
              className="text-4xl md:text-5xl font-mono text-cyan-400 tracking-wider leading-none"
              style={{ textShadow: "0 0 20px rgba(16,185,129,0.35)" }}
            >
              {utcH}
              <span className="opacity-30">{colon}</span>
              {utcM}
              <span className="opacity-30">{colon}</span>
              {utcS}
              <span className="ml-3 text-lg text-cyan-400/60 font-mono">UTC</span>
            </div>

            {/* MET */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <Timer className="h-4 w-4 text-amber-400/70 shrink-0" />
              <span className="text-xs text-amber-400/60 uppercase tracking-widest font-mono">
                Mission Elapsed Time
              </span>
            </div>
            <div
              className="text-2xl font-mono text-amber-400 tracking-wider"
              style={{ textShadow: "0 0 12px rgba(245,158,11,0.3)" }}
            >
              {metStr}
            </div>
          </div>

          {/* Julian Date card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400/70 text-xs font-mono uppercase tracking-widest">
              <Satellite className="h-3.5 w-3.5" />
              Julian Date
            </div>
            <p
              className="text-xl font-mono text-cyan-300 tracking-wide"
              style={{ textShadow: "0 0 10px rgba(6,182,212,0.25)" }}
            >
              JD {jd.toFixed(6)}
            </p>
            <p className="text-[11px] text-gray-500 font-mono">
              Astronomical reference epoch (UT1 ≈ UTC for this display)
            </p>
          </div>
        </div>

        {/* ---- RIGHT COLUMN: Pass Timer + Timezones ------------------- */}
        <div className="space-y-6">
          {/* Pass Timer card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400/70 text-xs font-mono uppercase tracking-widest">
              <Satellite className="h-3.5 w-3.5" />
              ISS Ground Station Pass
            </div>

            {nextPass ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-gray-400">Next pass in</span>
                  <span
                    className="text-3xl font-mono text-cyan-300 font-bold"
                    style={{ textShadow: "0 0 14px rgba(16,185,129,0.3)" }}
                  >
                    {passMinutes}m {pad2(passSeconds)}s
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-mono">
                  Station: {nextPass.station} &middot; Window {nextPass.end - nextPass.start}min
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">No upcoming passes in current cycle</p>
            )}

            {/* Progress bar with pass windows */}
            <div className="relative pt-2">
              <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden relative">
                {/* Background track segments for pass windows */}
                {MOCK_PASS_WINDOWS.map((w, i) => {
                  const left = (w.start / windowTotal) * 100;
                  const width = ((w.end - w.start) / windowTotal) * 100;
                  const isActive = elapsedMin >= w.start && elapsedMin <= w.end;
                  return (
                    <div
                      key={i}
                      className={`absolute top-0 h-full rounded-sm transition-colors duration-500 ${
                        isActive
                          ? "bg-cyan-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          : "bg-cyan-500/20"
                      }`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${w.station}: ${w.start}–${w.end} min`}
                    />
                  );
                })}
                {/* Progress indicator (thin line) */}
                <div
                  className="absolute top-0 h-full w-[2px] bg-amber-400 rounded-full shadow-[0_0_6px_rgba(245,158,11,0.6)] transition-[left] duration-1000 ease-linear"
                  style={{ left: `${windowProgress}%` }}
                />
              </div>
              {/* Labels */}
              <div className="flex justify-between mt-1.5 text-[10px] text-gray-500 font-mono">
                <span>Now</span>
                <span>+{Math.round(windowTotal)} min</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded-sm bg-cyan-500/80" />
                Visible
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded-sm bg-cyan-500/20" />
                Scheduled
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-amber-400 rounded-full" />
                Current
              </span>
            </div>
          </div>

          {/* Timezone Converter card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400/70 text-xs font-mono uppercase tracking-widest">
              <Globe className="h-3.5 w-3.5" />
              Timezone Converter
            </div>

            <div className="space-y-2">
              {tzRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{row.flag}</span>
                    <span className="text-xs text-gray-400 font-medium">{row.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm font-mono text-gray-200 tracking-wider"
                    >
                      {row.time}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono bg-white/5 rounded px-1.5 py-0.5">
                      {row.offsetStr}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}