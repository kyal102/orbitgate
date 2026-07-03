"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "./SectionHeader";
import { Compass, RotateCw, Pause, Play, RefreshCw, AlertTriangle } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
type ControlMode = "sun" | "nadir" | "idle" | "manual";

interface AttitudeState {
  roll: number;    // degrees
  pitch: number;   // degrees
  yaw: number;     // degrees
  rollRate: number; // deg/s
  pitchRate: number;
  yawRate: number;
  targetRoll: number;
  targetPitch: number;
  targetYaw: number;
}

interface ReactionWheel {
  speed: number;     // RPM
  maxSpeed: number;  // RPM
  temperature: number; // C
  momentum: number;  // 0-100%
}

interface MagneticTorquer {
  active: boolean;
  dipole: number; // A·m²
}

interface StarPosition {
  baseX: number;
  baseY: number;
  magnitude: number;
  id: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function degToRad(d: number) {
  return (d * Math.PI) / 180;
}

function radToDeg(r: number) {
  return (r * 180) / Math.PI;
}

function eulerToQuaternion(roll: number, pitch: number, yaw: number) {
  const cr = Math.cos(degToRad(roll / 2));
  const sr = Math.sin(degToRad(roll / 2));
  const cp = Math.cos(degToRad(pitch / 2));
  const sp = Math.sin(degToRad(pitch / 2));
  const cy = Math.cos(degToRad(yaw / 2));
  const sy = Math.sin(degToRad(yaw / 2));
  const q0 = cr * cp * cy + sr * sp * sy;
  const q1 = sr * cp * cy - cr * sp * sy;
  const q2 = cr * sp * cy + sr * cp * sy;
  const q3 = cr * cp * sy - sr * sp * cy;
  return { q0, q1, q2, q3 };
}

function wrapAngle(a: number) {
  while (a > 180) a -= 360;
  while (a < -180) a += 360;
  return a;
}

// ─── Constants ───────────────────────────────────────────────────────
const SIM_DT = 50; // ms per tick
const KP = 0.08;   // proportional gain
const KD = 0.15;   // derivative (damping) gain
const WHEEL_MAX_RPM = 6000;
const TORQUER_MAX_DIPOLE = 40; // A·m²
const MOMENTUM_THRESHOLD = 80; // % for saturation warning

const BASE_STARS: StarPosition[] = [
  { baseX: 80, baseY: 60, magnitude: 2.1, id: 0 },
  { baseX: 140, baseY: 30, magnitude: 3.5, id: 1 },
  { baseX: 200, baseY: 90, magnitude: 1.8, id: 2 },
  { baseX: 50, baseY: 110, magnitude: 4.0, id: 3 },
  { baseX: 170, baseY: 140, magnitude: 2.7, id: 4 },
];

// ─── Sub-components ──────────────────────────────────────────────────

/** Circular arc gauge showing -180 to +180 degrees */
function AttitudeGauge({
  value,
  rate,
  label,
  color,
}: {
  value: number;
  rate: number;
  label: string;
  color: string;
}) {
  const cx = 70;
  const cy = 70;
  const r = 55;
  const startAngle = -225;
  const endAngle = 45;
  const totalSweep = endAngle - startAngle; // 270°
  const needleFrac = (value + 180) / 360;
  const needleAngle = startAngle + needleFrac * totalSweep;

  const polarToCart = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(degToRad(angle)),
    y: cy + radius * Math.sin(degToRad(angle)),
  });

  const arcStart = polarToCart(startAngle, r);
  const arcEnd = polarToCart(endAngle, r);
  const needleEnd = polarToCart(needleAngle, r - 8);

  // Build arc path
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`;
  // Tick marks at -180, -90, 0, 90, 180
  const tickAngles = [-180, -90, 0, 90, 180];

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={140} height={140} viewBox="0 0 140 140">
        {/* Background arc */}
        <path d={arcPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} strokeLinecap="round" />
        {/* Value arc (filled portion) */}
        {Math.abs(value) > 0.5 && (
          <path
            d={arcPath}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${(Math.abs(value) / 180) * totalSweep * (r * Math.PI / 180)} ${9999}`}
          />
        )}
        {/* Tick marks */}
        {tickAngles.map((tick) => {
          const frac = (tick + 180) / 360;
          const angle = startAngle + frac * totalSweep;
          const inner = polarToCart(angle, r - 10);
          const outer = polarToCart(angle, r + 2);
          const labelPos = polarToCart(angle, r + 14);
          return (
            <g key={tick}>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
              <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="central" className="fill-gray-500" fontSize={7} fontFamily="monospace">
                {tick > 0 ? `+${tick}` : tick}
              </text>
            </g>
          );
        })}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill={color} opacity={0.9} />
        <circle cx={cx} cy={cy} r={2} fill="white" />
      </svg>
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wider text-cyan-500/70 mb-0.5">{label}</div>
        <div className="font-mono text-lg font-bold text-white" style={{ color }}>
          {value >= 0 ? "+" : ""}{value.toFixed(1)}°
        </div>
        <div className="font-mono text-[10px] text-gray-500">
          {rate >= 0 ? "+" : ""}{rate.toFixed(2)}°/s
        </div>
      </div>
    </div>
  );
}

/** 3D spacecraft body with CSS 3D transforms */
function AttitudeDisplay({ roll, pitch, yaw }: { roll: number; pitch: number; yaw: number }) {
  const transform = `rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg)`;

  return (
    <div className="relative w-full aspect-square max-w-[280px] mx-auto">
      <svg width="100%" height="100%" viewBox="0 0 280 280" className="absolute inset-0">
        {/* Grid background */}
        <defs>
          <pattern id="adcs-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
          </pattern>
          <radialGradient id="adcs-radial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16,185,129,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <rect width="280" height="280" fill="url(#adcs-grid)" />
        <circle cx="140" cy="140" r="138" fill="url(#adcs-radial)" />
        {/* Reference circle */}
        <circle cx="140" cy="140" r="90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} strokeDasharray="4 4" />
        <circle cx="140" cy="140" r="60" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} strokeDasharray="3 3" />
      </svg>
      {/* 3D spacecraft body */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: "600px" }}
      >
        <div
          style={{
            transform,
            transformStyle: "preserve-3d",
            transition: "transform 0.08s linear",
          }}
        >
          <svg width="120" height="120" viewBox="-60 -60 120 120">
            {/* Spacecraft body (octagonal shape) */}
            <polygon
              points="-30,-20 30,-20 40,-10 40,10 30,20 -30,20 -40,10 -40,-10"
              fill="rgba(16,185,129,0.12)"
              stroke="#06b6d4"
              strokeWidth={1.5}
            />
            {/* Solar panel left */}
            <rect x="-58" y="-10" width="18" height="20" rx={1} fill="rgba(56,189,248,0.1)" stroke="#38bdf8" strokeWidth={0.8} />
            {/* Solar panel right */}
            <rect x="40" y="-10" width="18" height="20" rx={1} fill="rgba(56,189,248,0.1)" stroke="#38bdf8" strokeWidth={0.8} />
            {/* Solar panel lines */}
            <line x1="-58" y1="-3" x2="-40" y2="-3" stroke="rgba(56,189,248,0.2)" strokeWidth={0.3} />
            <line x1="-58" y1="3" x2="-40" y2="3" stroke="rgba(56,189,248,0.2)" strokeWidth={0.3} />
            <line x1="40" y1="-3" x2="58" y2="-3" stroke="rgba(56,189,248,0.2)" strokeWidth={0.3} />
            <line x1="40" y1="3" x2="58" y2="3" stroke="rgba(56,189,248,0.2)" strokeWidth={0.3} />
            {/* Center dot */}
            <circle cx="0" cy="0" r={3} fill="#06b6d4" opacity={0.8} />
            {/* X axis (red) */}
            <line x1="0" y1="0" x2="55" y2="0" stroke="#ef4444" strokeWidth={2} markerEnd="url(#arrowR)" />
            {/* Y axis (green) */}
            <line x1="0" y1="0" x2="0" y2="-55" stroke="#22c55e" strokeWidth={2} markerEnd="url(#arrowG)" />
            {/* Z axis (blue) */}
            <line x1="0" y1="0" x2="-38" y2="38" stroke="#3b82f6" strokeWidth={2} markerEnd="url(#arrowB)" />
            {/* Axis labels */}
            <text x="55" y="-5" className="fill-red-400" fontSize={10} fontWeight="bold">X</text>
            <text x="5" y="-52" className="fill-green-400" fontSize={10} fontWeight="bold">Y</text>
            <text x="-52" y="46" className="fill-blue-400" fontSize={10} fontWeight="bold">Z</text>
            {/* Arrow markers */}
            <defs>
              <marker id="arrowR" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <polygon points="0 0, 6 3, 0 6" fill="#ef4444" />
              </marker>
              <marker id="arrowG" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <polygon points="0 0, 6 3, 0 6" fill="#22c55e" />
              </marker>
              <marker id="arrowB" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <polygon points="0 0, 6 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}

/** Star tracker view — 5 stars shift opposite to attitude */
function StarTrackerView({ roll, pitch, yaw }: { roll: number; pitch: number; yaw: number }) {
  const stars = useMemo(() => {
    const fov = 120; // pixels of movement per 180°
    return BASE_STARS.map((s) => ({
      x: clamp(s.baseX - (yaw / 180) * fov + (roll / 180) * fov * 0.3, 10, 190),
      y: clamp(s.baseY + (pitch / 180) * fov + (roll / 180) * fov * 0.3, 10, 190),
      mag: s.magnitude,
      id: s.id,
    }));
  }, [roll, pitch, yaw]);

  const starRadius = (mag: number) => clamp(4.5 - mag * 0.8, 1, 3.5);

  return (
    <div className="relative">
      <svg width="200" height="200" viewBox="0 0 200 200" className="rounded-lg">
        {/* Dark background */}
        <rect width="200" height="200" fill="rgba(0,0,0,0.5)" rx={8} />
        {/* Crosshair */}
        <line x1="100" y1="0" x2="100" y2="200" stroke="rgba(16,185,129,0.15)" strokeWidth={0.5} strokeDasharray="3 3" />
        <line x1="0" y1="100" x2="200" y2="100" stroke="rgba(16,185,129,0.15)" strokeWidth={0.5} strokeDasharray="3 3" />
        <circle cx="100" cy="100" r="30" fill="none" stroke="rgba(16,185,129,0.08)" strokeWidth={0.5} />
        {/* FOV circle */}
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth={0.5} strokeDasharray="6 3" />
        {/* Stars */}
        {stars.map((s) => (
          <g key={s.id}>
            {/* Glow */}
            <circle cx={s.x} cy={s.y} r={starRadius(s.mag) * 3} fill="rgba(255,255,255,0.04)" />
            {/* Star */}
            <circle cx={s.x} cy={s.y} r={starRadius(s.mag)} fill="white" opacity={clamp(1.2 - s.mag * 0.2, 0.4, 1)} />
            {/* Diffraction spikes */}
            <line x1={s.x - starRadius(s.mag) * 2} y1={s.y} x2={s.x + starRadius(s.mag) * 2} y2={s.y} stroke="rgba(255,255,255,0.3)" strokeWidth={0.3} />
            <line x1={s.x} y1={s.y - starRadius(s.mag) * 2} x2={s.x} y2={s.y + starRadius(s.mag) * 2} stroke="rgba(255,255,255,0.3)" strokeWidth={0.3} />
          </g>
        ))}
        {/* Label */}
        <text x="10" y="195" className="fill-gray-600" fontSize={7} fontFamily="monospace">STAR TRACKER FOV 8.8°</text>
      </svg>
    </div>
  );
}

/** Reaction wheel indicator */
function WheelIndicator({
  label,
  axisColor,
  wheel,
}: {
  label: string;
  axisColor: string;
  wheel: ReactionWheel;
}) {
  const speedFrac = Math.abs(wheel.speed) / wheel.maxSpeed;
  const momentumPct = wheel.momentum;
  const isSaturated = momentumPct > MOMENTUM_THRESHOLD;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-mono" style={{ color: axisColor }}>
          {label} Axis
        </span>
        <span className="font-mono text-xs text-white">
          {Math.round(wheel.speed)} RPM
        </span>
      </div>
      {/* Speed bar */}
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            width: `${speedFrac * 100}%`,
            backgroundColor: isSaturated ? "#f43f5e" : axisColor,
            boxShadow: isSaturated ? "0 0 8px rgba(244,63,94,0.5)" : `0 0 6px ${axisColor}40`,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-gray-500">Mom: {momentumPct.toFixed(1)}%</span>
        <span className={isSaturated ? "text-rose-400" : "text-gray-500"}>
          {wheel.temperature.toFixed(1)}°C
        </span>
      </div>
      {isSaturated && (
        <div className="flex items-center gap-1 text-rose-400 text-[9px]">
          <AlertTriangle className="h-3 w-3" />
          <span className="uppercase tracking-wider">Momentum saturation</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export function AttitudeControlSim() {
  // ── State ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<ControlMode>("sun");
  const [running, setRunning] = useState(true);
  const [attitude, setAttitude] = useState<AttitudeState>({
    roll: 15.3,
    pitch: -8.7,
    yaw: 22.1,
    rollRate: 0.3,
    pitchRate: -0.2,
    yawRate: 0.15,
    targetRoll: 0,
    targetPitch: 0,
    targetYaw: 0,
  });
  const [wheels, setWheels] = useState<ReactionWheel[]>([
    { speed: 1200, maxSpeed: WHEEL_MAX_RPM, temperature: 22.3, momentum: 20 },
    { speed: -800, maxSpeed: WHEEL_MAX_RPM, temperature: 21.8, momentum: 13.3 },
    { speed: 1500, maxSpeed: WHEEL_MAX_RPM, temperature: 23.1, momentum: 25 },
  ]);
  const [torquers, setTorquers] = useState<MagneticTorquer[]>([
    { active: true, dipole: 12.5 },
    { active: false, dipole: 0 },
    { active: true, dipole: 8.3 },
  ]);
  const [manualTargets, setManualTargets] = useState({ roll: 45, pitch: -30, yaw: 60 });
  const mountedRef = useRef(false);

  // ── Callbacks (before JSX const variables — TDZ rule) ──────────────
  const handleModeChange = useCallback((newMode: ControlMode) => {
    setMode(newMode);
  }, []);

  const handleToggleRunning = useCallback(() => {
    setRunning((p) => !p);
  }, []);

  const handleReset = useCallback(() => {
    setAttitude({
      roll: 15.3,
      pitch: -8.7,
      yaw: 22.1,
      rollRate: 0.3,
      pitchRate: -0.2,
      yawRate: 0.15,
      targetRoll: 0,
      targetPitch: 0,
      targetYaw: 0,
    });
    setWheels([
      { speed: 1200, maxSpeed: WHEEL_MAX_RPM, temperature: 22.3, momentum: 20 },
      { speed: -800, maxSpeed: WHEEL_MAX_RPM, temperature: 21.8, momentum: 13.3 },
      { speed: 1500, maxSpeed: WHEEL_MAX_RPM, temperature: 23.1, momentum: 25 },
    ]);
    setTorquers([
      { active: true, dipole: 12.5 },
      { active: false, dipole: 0 },
      { active: true, dipole: 8.3 },
    ]);
  }, []);

  const handleManualTarget = useCallback((axis: "roll" | "pitch" | "yaw", value: number) => {
    setManualTargets((prev) => ({ ...prev, [axis]: value }));
  }, []);

  // ── Simulation tick ────────────────────────────────────────────────
  const simTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    if (!running) {
      if (simTickRef.current) clearInterval(simTickRef.current);
      return;
    }

    simTickRef.current = setInterval(() => {
      setAttitude((prev) => {
        let targetRoll = prev.targetRoll;
        let targetPitch = prev.targetPitch;
        let targetYaw = prev.targetYaw;

        // Set targets based on mode
        switch (mode) {
          case "sun":
            targetRoll = 0;
            targetPitch = 0;
            targetYaw = 0;
            break;
          case "nadir":
            targetRoll = 0;
            targetPitch = 90;
            targetYaw = 0;
            break;
          case "idle":
            // Slow drift: small random walk on targets
            targetRoll = prev.targetRoll + (Math.random() - 0.5) * 2;
            targetPitch = prev.targetPitch + (Math.random() - 0.5) * 2;
            targetYaw = prev.targetYaw + (Math.random() - 0.5) * 2;
            targetRoll = clamp(targetRoll, -60, 60);
            targetPitch = clamp(targetPitch, -60, 60);
            targetYaw = clamp(targetYaw, -60, 60);
            break;
          case "manual":
            targetRoll = manualTargets.roll;
            targetPitch = manualTargets.pitch;
            targetYaw = manualTargets.yaw;
            break;
        }

        // PD controller
        const errRoll = wrapAngle(targetRoll - prev.roll);
        const errPitch = wrapAngle(targetPitch - prev.pitch);
        const errYaw = wrapAngle(targetYaw - prev.yaw);

        const cmdRoll = KP * errRoll - KD * prev.rollRate;
        const cmdPitch = KP * errPitch - KD * prev.pitchRate;
        const cmdYaw = KP * errYaw - KD * prev.yawRate;

        // Add small disturbance torque (gravity gradient + aerodynamic)
        const distRoll = (Math.random() - 0.5) * 0.02;
        const distPitch = (Math.random() - 0.5) * 0.015;
        const distYaw = (Math.random() - 0.5) * 0.01;

        const dt = SIM_DT / 1000;

        let newRollRate = prev.rollRate + (cmdRoll + distRoll) * dt * 10;
        let newPitchRate = prev.pitchRate + (cmdPitch + distPitch) * dt * 10;
        let newYawRate = prev.yawRate + (cmdYaw + distYaw) * dt * 10;

        // Rate limiting
        newRollRate = clamp(newRollRate, -5, 5);
        newPitchRate = clamp(newPitchRate, -5, 5);
        newYawRate = clamp(newYawRate, -5, 5);

        let newRoll = wrapAngle(prev.roll + newRollRate * dt);
        let newPitch = wrapAngle(prev.pitch + newPitchRate * dt);
        let newYaw = wrapAngle(prev.yaw + newYawRate * dt);

        return {
          roll: newRoll,
          pitch: newPitch,
          yaw: newYaw,
          rollRate: newRollRate,
          pitchRate: newPitchRate,
          yawRate: newYawRate,
          targetRoll,
          targetPitch,
          targetYaw,
        };
      });

      // Update reaction wheels
      setWheels((prev) => {
        return prev.map((w, i) => {
          const rateChange = i === 0 ? attitude.rollRate : i === 1 ? attitude.pitchRate : attitude.yawRate;
          const newSpeed = clamp(w.speed + rateChange * 8 + (Math.random() - 0.5) * 20, -WHEEL_MAX_RPM, WHEEL_MAX_RPM);
          const newMomentum = clamp((Math.abs(newSpeed) / WHEEL_MAX_RPM) * 100 + (Math.random() - 0.5) * 0.5, 0, 100);
          const newTemp = clamp(w.temperature + (Math.abs(newSpeed) / WHEEL_MAX_RPM) * 0.05 + (Math.random() - 0.5) * 0.3, 15, 45);
          return { ...w, speed: newSpeed, momentum: newMomentum, temperature: newTemp };
        });
      });

      // Update torquers (active when errors are small enough for desaturation)
      setTorquers((prev) => {
        return prev.map((t, i) => {
          const wheelSat = wheels[i]?.momentum ?? 0;
          const shouldActivate = wheelSat > 50 && Math.random() > 0.3;
          const newDipole = shouldActivate
            ? clamp(t.dipole + (Math.random() - 0.5) * 5, 0, TORQUER_MAX_DIPOLE)
            : clamp(t.dipole - 2, 0, TORQUER_MAX_DIPOLE);
          return { active: newDipole > 1, dipole: Math.max(0, newDipole) };
        });
      });
    }, SIM_DT);

    return () => {
      if (simTickRef.current) clearInterval(simTickRef.current);
    };
  }, [running, mode, manualTargets, attitude.rollRate, attitude.pitchRate, attitude.yawRate, wheels]);

  // ── Computed values ────────────────────────────────────────────────
  const quaternion = useMemo(
    () => eulerToQuaternion(attitude.roll, attitude.pitch, attitude.yaw),
    [attitude.roll, attitude.pitch, attitude.yaw]
  );

  const controlErrors = useMemo(() => {
    const errR = Math.abs(wrapAngle(attitude.targetRoll - attitude.roll));
    const errP = Math.abs(wrapAngle(attitude.targetPitch - attitude.pitch));
    const errY = Math.abs(wrapAngle(attitude.targetYaw - attitude.yaw));
    return { roll: errR, pitch: errP, yaw: errY, total: errR + errP + errY };
  }, [attitude]);

  const anySaturation = wheels.some((w) => w.momentum > MOMENTUM_THRESHOLD);

  // ── Mode config display ────────────────────────────────────────────
  const modeConfig = useMemo(() => {
    switch (mode) {
      case "sun": return { label: "Sun Pointing", target: "0°, 0°, 0°", color: "#f59e0b" };
      case "nadir": return { label: "Nadir Pointing", target: "0°, 90°, 0°", color: "#06b6d4" };
      case "idle": return { label: "Idle (Drift)", target: "Drifting", color: "#6b7280" };
      case "manual": return { label: "Manual", target: `${manualTargets.roll}°, ${manualTargets.pitch}°, ${manualTargets.yaw}°`, color: "#a78bfa" };
    }
  }, [mode, manualTargets]);

  // ── JSX const variables (after callbacks) ──────────────────────────
  const modeButtons: { key: ControlMode; label: string; desc: string }[] = [
    { key: "sun", label: "☀ Sun", desc: "Pitch=0 Yaw=0" },
    { key: "nadir", label: "⊕ Nadir", desc: "Pitch=90 Yaw=0" },
    { key: "idle", label: "◎ Idle", desc: "Random Walk" },
    { key: "manual", label: "✋ Manual", desc: "User Sliders" },
  ];

  const wheelAxisColors = ["#ef4444", "#22c55e", "#3b82f6"];
  const wheelLabels = ["X", "Y", "Z"];

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <section id="attitude-control" className="relative">
      <SectionHeader
        title="Attitude Determination & Control"
        subtitle="ADCS simulator with PD controller, reaction wheels, magnetic torquers, and star tracker"
        icon={<Compass className="h-5 w-5 text-cyan-400" />}
        sectionNumber="§35"
      />

      <div className="max-w-6xl mx-auto px-4 space-y-4">
        {/* Row 1: 3D Display + Gauges + Control Mode */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 3D Attitude Display */}
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase tracking-wider text-cyan-500/70 font-mono">3D Attitude</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleRunning}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title={running ? "Pause" : "Resume"}
                  >
                    {running ? <Pause className="h-3.5 w-3.5 text-cyan-400" /> : <Play className="h-3.5 w-3.5 text-gray-400" />}
                  </button>
                  <button
                    onClick={handleReset}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    title="Reset"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                </div>
              </div>
              <AttitudeDisplay roll={attitude.roll} pitch={attitude.pitch} yaw={attitude.yaw} />
              <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-mono text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-red-500 inline-block rounded" /> X (Roll)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-green-500 inline-block rounded" /> Y (Pitch)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-blue-500 inline-block rounded" /> Z (Yaw)</span>
              </div>
            </CardContent>
          </Card>

          {/* Attitude Gauges */}
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-xs uppercase tracking-wider text-cyan-500/70 font-mono mb-4">Attitude Gauges</h3>
              <div className="flex flex-wrap justify-center gap-4">
                <AttitudeGauge value={attitude.roll} rate={attitude.rollRate} label="Roll" color="#ef4444" />
                <AttitudeGauge value={attitude.pitch} rate={attitude.pitchRate} label="Pitch" color="#22c55e" />
                <AttitudeGauge value={attitude.yaw} rate={attitude.yawRate} label="Yaw" color="#3b82f6" />
              </div>
            </CardContent>
          </Card>

          {/* Control Mode Panel */}
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-xs uppercase tracking-wider text-cyan-500/70 font-mono mb-4">Control Mode</h3>
              <div className="space-y-2">
                {modeButtons.map((mb) => (
                  <label
                    key={mb.key}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200 border ${
                      mode === mb.key
                        ? "bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                    }`}
                  >
                    <input
                      type="radio"
                      name="adcs-mode"
                      checked={mode === mb.key}
                      onChange={() => handleModeChange(mb.key)}
                      className="sr-only"
                    />
                    <div
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        mode === mb.key ? "border-cyan-400" : "border-gray-600"
                      }`}
                    >
                      {mode === mb.key && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium ${mode === mb.key ? "text-cyan-300" : "text-gray-400"}`}>
                        {mb.label}
                      </div>
                      <div className="text-[10px] font-mono text-gray-600">{mb.desc}</div>
                    </div>
                    {mode === mb.key && (
                      <span className="text-[9px] font-mono text-cyan-500/60 uppercase tracking-wider">Active</span>
                    )}
                  </label>
                ))}
              </div>

              {/* Current mode info */}
              <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Mode</span>
                  <span className="text-xs font-medium" style={{ color: modeConfig.color }}>{modeConfig.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Target</span>
                  <span className="text-[10px] font-mono text-gray-400">{modeConfig.target}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Error</span>
                  <span className={`text-[10px] font-mono ${controlErrors.total < 5 ? "text-cyan-400" : controlErrors.total < 30 ? "text-amber-400" : "text-rose-400"}`}>
                    {controlErrors.total.toFixed(1)}° total
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Manual Sliders (when manual mode) */}
        {mode === "manual" && (
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-xs uppercase tracking-wider text-cyan-500/70 font-mono mb-4">Manual Target Angles</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(["roll", "pitch", "yaw"] as const).map((axis) => {
                  const colors = { roll: "#ef4444", pitch: "#22c55e", yaw: "#3b82f6" };
                  return (
                    <div key={axis} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-gray-500 uppercase">{axis}</span>
                        <span style={{ color: colors[axis] }}>{manualTargets[axis]}°</span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        value={manualTargets[axis]}
                        onChange={(e) => handleManualTarget(axis, Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${colors[axis]}33, ${colors[axis]}66)`,
                          accentColor: colors[axis],
                        }}
                      />
                      <div className="flex justify-between text-[9px] font-mono text-gray-600">
                        <span>-180°</span>
                        <span>0°</span>
                        <span>+180°</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Row 3: Reaction Wheels + Magnetic Torquers + Star Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Reaction Wheel Status */}
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase tracking-wider text-cyan-500/70 font-mono">Reaction Wheels</h3>
                {anySaturation && (
                  <span className="flex items-center gap-1 text-[9px] text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-3 w-3" />
                    SAT
                  </span>
                )}
              </div>
              <div className="space-y-4">
                {wheels.map((w, i) => (
                  <WheelIndicator
                    key={i}
                    label={wheelLabels[i]}
                    axisColor={wheelAxisColors[i]}
                    wheel={w}
                  />
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-500">
                <span>Max: {WHEEL_MAX_RPM} RPM</span>
                <span>Sat threshold: {MOMENTUM_THRESHOLD}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Magnetic Torquer Status */}
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-xs uppercase tracking-wider text-cyan-500/70 font-mono mb-4">Magnetic Torquers</h3>
              <div className="space-y-3">
                {torquers.map((t, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono" style={{ color: wheelAxisColors[i] }}>
                        {wheelLabels[i]} Torquer
                      </span>
                      <span className={`text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full ${
                        t.active ? "bg-cyan-500/15 text-cyan-400" : "bg-white/5 text-gray-600"
                      }`}>
                        {t.active ? "ON" : "OFF"}
                      </span>
                    </div>
                    {/* Dipole bar */}
                    <div className="relative h-3 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{
                          width: `${(t.dipole / TORQUER_MAX_DIPOLE) * 100}%`,
                          backgroundColor: t.active ? wheelAxisColors[i] : "rgba(255,255,255,0.1)",
                          opacity: t.active ? 1 : 0.4,
                          boxShadow: t.active ? `0 0 8px ${wheelAxisColors[i]}40` : "none",
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-gray-500">
                      <span>{t.dipole.toFixed(1)} A·m²</span>
                      <span>Max {TORQUER_MAX_DIPOLE} A·m²</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-gray-600">
                Used for momentum desaturation when wheel momentum &gt;50%
              </div>
            </CardContent>
          </Card>

          {/* Star Tracker View */}
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-xs uppercase tracking-wider text-cyan-500/70 font-mono mb-4">Star Tracker</h3>
              <div className="flex justify-center">
                <StarTrackerView roll={attitude.roll} pitch={attitude.pitch} yaw={attitude.yaw} />
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-500">Tracked Stars</span>
                  <span className="text-cyan-400">5 / 5 locked</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-500">Solution Quality</span>
                  <span className={controlErrors.total < 10 ? "text-cyan-400" : "text-amber-400"}>
                    {controlErrors.total < 5 ? "Excellent" : controlErrors.total < 15 ? "Good" : "Degraded"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-500">Update Rate</span>
                  <span className="text-gray-400">10 Hz</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Telemetry */}
        <Card className="glass-card">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-xs uppercase tracking-wider text-cyan-500/70 font-mono mb-4">Telemetry</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Quaternion */}
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-2">Quaternion</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["q0", "q1", "q2", "q3"] as const).map((q) => (
                    <div key={q} className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-500">{q}</span>
                      <span className="text-[11px] font-mono text-cyan-300">
                        {quaternion[q] >= 0 ? "+" : ""}{quaternion[q].toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[9px] font-mono text-gray-600">
                  |q|² = {((quaternion.q0 ** 2 + quaternion.q1 ** 2 + quaternion.q2 ** 2 + quaternion.q3 ** 2)).toFixed(4)}
                </div>
              </div>

              {/* Angular Rates */}
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-2">Angular Rates</h4>
                <div className="space-y-1.5">
                  {[
                    { label: "ωx (Roll)", value: attitude.rollRate, color: "#ef4444" },
                    { label: "ωy (Pitch)", value: attitude.pitchRate, color: "#22c55e" },
                    { label: "ωz (Yaw)", value: attitude.yawRate, color: "#3b82f6" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-500">{r.label}</span>
                      <span className="text-[11px] font-mono" style={{ color: r.color }}>
                        {r.value >= 0 ? "+" : ""}{r.value.toFixed(3)} °/s
                      </span>
                    </div>
                  ))}
                  <div className="pt-1 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-500">|ω| total</span>
                    <span className="text-[11px] font-mono text-gray-300">
                      {Math.sqrt(attitude.rollRate ** 2 + attitude.pitchRate ** 2 + attitude.yawRate ** 2).toFixed(3)} °/s
                    </span>
                  </div>
                </div>
              </div>

              {/* Control Errors */}
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-2">Control Errors</h4>
                <div className="space-y-1.5">
                  {[
                    { label: "Roll err", value: controlErrors.roll, color: "#ef4444" },
                    { label: "Pitch err", value: controlErrors.pitch, color: "#22c55e" },
                    { label: "Yaw err", value: controlErrors.yaw, color: "#3b82f6" },
                  ].map((e) => (
                    <div key={e.label} className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-500">{e.label}</span>
                      <span className="text-[11px] font-mono" style={{ color: e.color }}>
                        {e.value.toFixed(2)}°
                      </span>
                    </div>
                  ))}
                  <div className="pt-1 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-500">Total err</span>
                    <span className={`text-[11px] font-mono ${
                      controlErrors.total < 5 ? "text-cyan-400" : controlErrors.total < 30 ? "text-amber-400" : "text-rose-400"
                    }`}>
                      {controlErrors.total.toFixed(2)}°
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Summary */}
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-2">System Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-500">Controller</span>
                    <span className={`text-[10px] font-mono ${running ? "text-cyan-400" : "text-gray-600"}`}>
                      {running ? "● ACTIVE" : "○ PAUSED"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-500">Pointing</span>
                    <span className={`text-[10px] font-mono ${controlErrors.total < 5 ? "text-cyan-400" : controlErrors.total < 30 ? "text-amber-400" : "text-rose-400"}`}>
                      {controlErrors.total < 5 ? "LOCKED" : controlErrors.total < 30 ? "ACQUIRING" : "SLEWING"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-500">Wheels</span>
                    <span className={`text-[10px] font-mono ${anySaturation ? "text-rose-400" : "text-cyan-400"}`}>
                      {anySaturation ? "⚠ SATURATED" : "● NOMINAL"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-500">Torquers</span>
                    <span className="text-[10px] font-mono text-cyan-400">
                      {torquers.filter((t) => t.active).length}/{torquers.length} ACTIVE
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-500">Star Trkr</span>
                    <span className="text-[10px] font-mono text-cyan-400">● LOCKED</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-500">PD Gains</span>
                    <span className="text-[10px] font-mono text-gray-400">Kp={KP} Kd={KD}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Simulation status bar */}
        <div className="flex items-center justify-between px-2 text-[10px] font-mono text-gray-600">
          <span>ADCS SIM • PD Controller • 50ms tick • Euler angles</span>
          <span className="flex items-center gap-1">
            <RotateCw className={`h-3 w-3 ${running ? "text-cyan-500 animate-spin" : "text-gray-700"}`} style={{ animationDuration: "3s" }} />
            {running ? "Running" : "Paused"}
          </span>
        </div>
      </div>
    </section>
  );
}