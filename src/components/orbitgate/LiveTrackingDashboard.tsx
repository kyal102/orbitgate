"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { SectionHeader } from "./SectionHeader";
import { Rocket, Zap, Thermometer, Radio, Gauge, Orbit, Sun, Eye } from "lucide-react";
import { io, Socket } from "socket.io-client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TelemetryPosition {
  lat: number;
  lon: number;
  alt_km: number;
}

interface TelemetryVelocity {
  speed_km_s: number;
  direction_deg: number;
}

interface TelemetrySubsystems {
  power_w: number;
  temp_c: number;
  signal_db: number;
  data_rate_kbps: number;
}

interface TelemetryData {
  norad_id: number;
  satellite: string;
  position: TelemetryPosition;
  velocity: TelemetryVelocity;
  subsystems: TelemetrySubsystems;
  orbit_number: number;
  in_eclipse: boolean;
  timestamp: string;
}

interface StationVisibility {
  station: string;
  distance_km: number;
  visible: boolean;
}

interface EclipseEventData {
  in_eclipse: boolean;
  next_event: "sunrise" | "sunset";
  seconds_to_event: number;
}

/* ------------------------------------------------------------------ */
/*  Map Constants                                                      */
/* ------------------------------------------------------------------ */

const MAP_W = 1000;
const MAP_H = 500;

/* Simplified continent outlines as [lat, lon] polygons */
const CONTINENT_POLYS: [number, number][][] = [
  [[50,-125],[55,-132],[60,-147],[64,-166],[70,-162],[72,-138],[70,-100],[62,-78],[52,-56],[47,-53],[44,-66],[41,-72],[35,-75],[30,-81],[25,-80],[25,-97],[20,-105],[15,-92],[15,-84],[20,-87],[30,-88],[30,-90],[30,-115],[35,-120],[40,-124],[48,-124],[50,-125]],
  [[84,-30],[82,-18],[78,-18],[73,-22],[68,-44],[70,-55],[76,-68],[80,-65],[83,-40],[84,-30]],
  [[12,-72],[10,-62],[7,-55],[2,-50],[-3,-42],[-8,-35],[-15,-39],[-22,-41],[-28,-49],[-35,-56],[-40,-62],[-46,-65],[-52,-70],[-55,-67],[-54,-72],[-48,-76],[-40,-73],[-18,-70],[-5,-81],[0,-78],[5,-77],[10,-75],[12,-72]],
  [[36,-9],[38,-9],[43,-9],[46,-2],[48,-5],[51,-5],[52,0],[54,0],[56,-3],[58,-5],[57,-2],[55,1],[54,2],[52,1],[50,-1],[48,-3],[47,-2],[44,-1],[43,3],[40,0],[37,-2],[36,-6],[36,-9]],
  [[58,8],[60,5],[63,5],[65,12],[68,15],[70,20],[71,28],[70,32],[68,28],[65,24],[63,18],[60,12],[58,11],[56,10],[58,8]],
  [[42,18],[45,14],[48,17],[50,14],[52,14],[54,14],[56,18],[58,22],[60,30],[58,28],[55,22],[52,22],[50,20],[48,22],[46,18],[44,20],[42,24],[40,24],[38,24],[36,22],[38,20],[40,18],[42,18]],
  [[60,30],[62,34],[65,40],[68,45],[70,60],[72,80],[73,100],[72,110],[70,130],[65,140],[60,145],[55,135],[52,140],[50,130],[48,135],[45,135],[43,132],[42,132],[50,130],[53,120],[55,110],[55,100],[52,85],[52,75],[52,65],[55,55],[55,45],[55,38],[58,35],[60,30]],
  [[72,110],[73,130],[72,150],[70,170],[66,178],[62,170],[58,163],[55,155],[52,155],[50,155],[48,150],[45,142],[48,135],[50,130],[52,140],[55,145],[60,160],[65,170],[68,175],[70,170],[72,150],[72,130],[72,110]],
  [[42,50],[45,52],[50,55],[52,65],[52,75],[50,80],[48,85],[42,80],[38,68],[36,62],[38,58],[40,53],[42,50]],
  [[32,35],[35,36],[38,42],[42,44],[42,50],[38,55],[32,48],[28,50],[25,57],[22,60],[18,54],[15,42],[13,45],[12,44],[14,42],[22,36],[28,34],[30,33],[32,35]],
  [[32,68],[35,75],[34,78],[30,78],[28,84],[26,88],[22,88],[20,86],[18,83],[15,80],[10,78],[8,77],[10,76],[14,74],[20,73],[24,72],[28,68],[30,68],[32,68]],
  [[42,80],[45,85],[48,88],[50,100],[53,120],[50,130],[45,135],[40,130],[35,128],[32,122],[28,120],[22,108],[20,110],[18,108],[16,108],[20,106],[22,100],[24,98],[28,97],[32,92],[35,88],[38,85],[40,80],[42,80]],
  [[45,142],[44,145],[42,145],[40,140],[36,137],[34,133],[33,131],[34,130],[35,133],[37,137],[39,140],[41,140],[43,143],[45,142]],
  [[22,100],[24,98],[22,98],[20,100],[18,103],[16,108],[14,109],[12,110],[10,108],[8,105],[6,102],[4,101],[2,104],[4,100],[8,98],[10,99],[14,99],[16,98],[18,96],[20,96],[22,100]],
  [[7,116],[7,118],[5,119],[2,118],[0,117],[-1,116],[-2,115],[-1,110],[1,109],[3,110],[5,115],[7,116]],
  [[5,95],[4,98],[2,101],[0,104],[-2,106],[-4,106],[-6,106],[-7,106],[-8,110],[-8,114],[-7,115],[-6,114],[-6,110],[-4,106],[-2,104],[0,100],[2,96],[4,95],[5,95]],
  [[-12,132],[-14,127],[-17,122],[-22,114],[-28,114],[-32,115],[-35,117],[-35,120],[-38,145],[-37,150],[-33,152],[-28,153],[-23,150],[-20,149],[-15,145],[-12,142],[-11,136],[-12,132]],
  [[-35,173],[-37,175],[-39,177],[-42,174],[-44,170],[-46,167],[-46,169],[-44,172],[-42,175],[-39,178],[-37,176],[-35,174],[-35,173]],
  [[35,-5],[37,10],[35,12],[32,13],[30,10],[25,15],[22,17],[20,20],[22,25],[25,32],[30,32],[32,35],[35,36],[37,10],[37,0],[35,-5]],
  [[15,-17],[12,-16],[8,-14],[5,-8],[4,2],[6,2],[4,8],[2,10],[0,10],[-2,12],[-5,12],[-8,14],[-12,14],[-12,25],[-15,30],[-15,35],[-10,40],[-5,42],[0,42],[2,42],[4,40],[6,40],[8,38],[10,38],[12,35],[14,32],[15,25],[15,17],[15,-17]],
  [[-15,30],[-18,35],[-22,35],[-26,33],[-30,30],[-34,26],[-35,20],[-34,18],[-30,17],[-25,15],[-20,12],[-15,15],[-12,14],[-12,25],[-15,30]],
];

/* Ground stations for visibility */
const GROUND_STATIONS = [
  { id: "houston", name: "Houston", lat: 29.76, lon: -95.37 },
  { id: "canberra", name: "Canberra", lat: -35.28, lon: 149.13 },
  { id: "kourou", name: "Kourou", lat: 5.16, lon: -52.65 },
  { id: "svalbard", name: "Svalbard", lat: 78.23, lon: 15.39 },
];

/* ------------------------------------------------------------------ */
/*  Map Helpers                                                        */
/* ------------------------------------------------------------------ */

function latLonToSvg(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * MAP_W;
  const y = ((90 - lat) / 180) * MAP_H;
  return [x, y];
}

function polyPoints(coords: [number, number][]): string {
  return coords
    .map(([lat, lon]) => {
      const [x, y] = latLonToSvg(lat, lon);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function kmToSvgRadius(km: number): number {
  const degRadius = km / 111.32;
  return degRadius * (MAP_W / 360);
}

/* ------------------------------------------------------------------ */
/*  Mock Data Generator (fallback)                                     */
/* ------------------------------------------------------------------ */

const SIM_START = new Date("2025-06-15T00:00:00.000Z").getTime();
const INCLINATION_DEG = 51.6;
const ORBIT_PERIOD_S = 92 * 60;

function generateMockTelemetry(): TelemetryData {
  const now = Date.now();
  const elapsedS = (now - SIM_START) / 1000;
  const totalOrbits = elapsedS / ORBIT_PERIOD_S;
  const fraction = ((totalOrbits % 1) + 1) % 1;
  const orbitNumber = Math.floor(totalOrbits);

  const lat = INCLINATION_DEG * Math.sin(2 * Math.PI * fraction);
  const lonWithinOrbit = -360 * fraction;
  const orbitShift = -22.5 * orbitNumber;
  let lon = ((lonWithinOrbit + orbitShift) % 360);
  lon = ((lon + 540) % 360) - 180;

  const altKm = 408 + Math.sin(elapsedS * 0.001) * 2;
  const speedKmS = 7.66 + Math.sin(elapsedS * 0.0005) * 0.02;
  const latDeriv = Math.cos(2 * Math.PI * fraction);
  let dirDeg = Math.atan2(-latDeriv, -1) * (180 / Math.PI);
  if (dirDeg < 0) dirDeg += 360;

  const inEclipse = fraction >= 0.55 && fraction <= 0.82;
  const seed = elapsedS * 0.01;
  const rand = (base: number, range: number) =>
    base + Math.sin(seed) * range * 0.5 + Math.cos(seed * 1.7) * range * 0.5;

  return {
    norad_id: 25544,
    satellite: "ISS (ZARYA)",
    position: { lat, lon, alt_km: altKm },
    velocity: { speed_km_s: speedKmS, direction_deg: dirDeg },
    subsystems: {
      power_w: inEclipse ? rand(50000, 3000) : rand(84000, 4000),
      temp_c: rand(21, 2),
      signal_db: rand(-60, 3),
      data_rate_kbps: rand(150000, 5000),
    },
    orbit_number: orbitNumber,
    in_eclipse: inEclipse,
    timestamp: new Date(now).toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Circular Gauge Sub-component                                       */
/* ------------------------------------------------------------------ */

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  color: string;
  icon: React.ReactNode;
  decimals?: number;
}

function CircularGauge({
  value,
  min,
  max,
  unit,
  label,
  color,
  icon,
  decimals = 1,
}: GaugeProps) {
  const cx = 60;
  const cy = 60;
  const r = 48;
  const strokeWidth = 6;
  const sweepDeg = 270;
  const startAngle = 135; // degrees (7:30 o'clock position)

  const clampedValue = Math.min(Math.max(value, min), max);
  const fraction = (clampedValue - min) / (max - min);
  const valueAngle = startAngle + fraction * sweepDeg;

  const polarToCartesian = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const startPt = polarToCartesian(startAngle);
  const endPt = polarToCartesian(valueAngle);
  const bgEndPt = polarToCartesian(startAngle + sweepDeg);

  const largeArc = valueAngle - startAngle > 180 ? 1 : 0;

  const arcPath = fraction > 0.001
    ? `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`
    : "";

  const bgArcPath = `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 1 1 ${bgEndPt.x} ${bgEndPt.y}`;

  // Needle endpoint
  const needleLen = r - 12;
  const needleRad = (valueAngle * Math.PI) / 180;
  const needleX = cx + needleLen * Math.cos(needleRad);
  const needleY = cy + needleLen * Math.sin(needleRad);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[140px] h-[140px]">
        <svg viewBox="0 0 120 120" className="w-full h-full">
          {/* Background arc */}
          <path
            d={bgArcPath}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc */}
          {arcPath && (
            <path
              d={arcPath}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 4px ${color}60)`,
                transition: "d 0.5s ease",
              }}
            />
          )}
          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            style={{ transition: "all 0.5s ease" }}
          />
          {/* Center dot */}
          <circle cx={cx} cy={cy} r={3} fill={color} />
          {/* Min/Max labels */}
          <text
            x={startPt.x}
            y={startPt.y + 14}
            textAnchor="middle"
            className="fill-gray-500 dark:fill-gray-600"
            fontSize="7"
            fontFamily="monospace"
          >
            {min}
          </text>
          <text
            x={bgEndPt.x}
            y={bgEndPt.y + 14}
            textAnchor="middle"
            className="fill-gray-500 dark:fill-gray-600"
            fontSize="7"
            fontFamily="monospace"
          >
            {max}
          </text>
        </svg>
        {/* Centered value text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-gray-500 mb-0.5">
            {icon}
          </div>
          <span
            className="text-xl font-bold tabular-nums"
            style={{ color }}
          >
            {value.toFixed(decimals)}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
            {unit}
          </span>
        </div>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ISS Position Simulator (for trail generation)                      */
/* ------------------------------------------------------------------ */

function simulateISSPosition(timestampMs: number): { lat: number; lon: number } {
  const elapsedS = (timestampMs - SIM_START) / 1000;
  const totalOrbits = elapsedS / ORBIT_PERIOD_S;
  const fraction = ((totalOrbits % 1) + 1) % 1;
  const orbitNumber = Math.floor(totalOrbits);

  const lat = INCLINATION_DEG * Math.sin(2 * Math.PI * fraction);
  const lonWithinOrbit = -360 * fraction;
  const orbitShift = -22.5 * orbitNumber;
  let lon = ((lonWithinOrbit + orbitShift) % 360);
  lon = ((lon + 540) % 360) - 180;

  return { lat, lon };
}

/* ------------------------------------------------------------------ */
/*  CSS Keyframes                                                      */
/* ------------------------------------------------------------------ */

const ISS_PULSE_STYLE = `
@keyframes iss-pulse-glow {
  0% { r: 5; opacity: 0.8; }
  100% { r: 20; opacity: 0; }
}
@keyframes iss-dot-pulse {
  0%, 100% { r: 4; }
  50% { r: 6; }
}
.iss-pulse-glow { animation: iss-pulse-glow 2s ease-out infinite; }
.iss-dot-pulse { animation: iss-dot-pulse 1.5s ease-in-out infinite; }
@keyframes connection-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.conn-pulse { animation: connection-pulse 1.5s ease-in-out infinite; }
`;

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function LiveTrackingDashboard() {
  /* ── State ─────────────────────────────────────────────────────── */
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [stationVis, setStationVis] = useState<StationVisibility[]>([]);
  const [eclipseInfo, setEclipseInfo] = useState<EclipseEventData | null>(null);
  const [trail, setTrail] = useState<{ lat: number; lon: number; ts: number }[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Continent paths (memoized) ────────────────────────────────── */
  const continentPaths = useMemo(
    () => CONTINENT_POLYS.map((poly) => polyPoints(poly)),
    []
  );

  /* ── Station SVG positions (memoized) ──────────────────────────── */
  const stationSvgPositions = useMemo(() => {
    return GROUND_STATIONS.map((s) => ({
      ...s,
      svgX: latLonToSvg(s.lat, s.lon)[0],
      svgY: latLonToSvg(s.lat, s.lon)[1],
    }));
  }, []);

  /* ── Callbacks ─────────────────────────────────────────────────── */

  const handleTelemetry = useCallback((data: TelemetryData) => {
    setTelemetry(data);
    setTrail((prev) => {
      const now = Date.now();
      const newTrail = [...prev, { lat: data.position.lat, lon: data.position.lon, ts: now }];
      // Keep only last 90 minutes (5400000ms)
      return newTrail.filter((p) => now - p.ts < 5_400_000);
    });
  }, []);

  const handleStationVis = useCallback((data: StationVisibility[]) => {
    setStationVis(data);
  }, []);

  const handleEclipseEvent = useCallback((data: EclipseEventData) => {
    setEclipseInfo(data);
  }, []);

  const startMockData = useCallback(() => {
    if (mockIntervalRef.current) return;
    const tick = () => {
      const mock = generateMockTelemetry();
      handleTelemetry(mock);
      // Mock station visibility
      const vis = GROUND_STATIONS.map((gs) => {
        const dLat = (mock.position.lat - gs.lat) * Math.PI / 180;
        const dLon = (mock.position.lon - gs.lon) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(gs.lat * Math.PI / 180) * Math.cos(mock.position.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { station: gs.name, distance_km: Math.round(dist), visible: dist < 2000 };
      });
      handleStationVis(vis);

      const frac = ((Date.now() - SIM_START) / 1000 / ORBIT_PERIOD_S % 1 + 1) % 1;
      const inEcl = frac >= 0.55 && frac <= 0.82;
      if (inEcl) {
        const secs = Math.round((0.82 - frac) * ORBIT_PERIOD_S);
        handleEclipseEvent({ in_eclipse: true, next_event: "sunrise", seconds_to_event: secs });
      } else {
        const secs = Math.round(((frac < 0.55 ? 0.55 - frac : 1 - frac + 0.55)) * ORBIT_PERIOD_S);
        handleEclipseEvent({ in_eclipse: false, next_event: "sunset", seconds_to_event: secs });
      }
    };
    tick();
    mockIntervalRef.current = setInterval(tick, 2000);
  }, [handleTelemetry, handleStationVis, handleEclipseEvent]);

  const stopMockData = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
  }, []);

  /* ── WebSocket Connection ──────────────────────────────────────── */

  useEffect(() => {
    const socket = io("/?XTransformPort=3010", {
      path: "/",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      stopMockData();
    });

    socket.on("telemetry", handleTelemetry);
    socket.on("station-visibility", handleStationVis);
    socket.on("eclipse-event", handleEclipseEvent);

    socket.on("disconnect", () => {
      setConnected(false);
      startMockData();
    });

    socket.on("connect_error", () => {
      setConnected(false);
      startMockData();
    });

    return () => {
      socket.disconnect();
      stopMockData();
    };
  }, [handleTelemetry, handleStationVis, handleEclipseEvent, startMockData, stopMockData]);

  /* ── Pre-populate trail with simulated history ─────────────────── */
  useEffect(() => {
    const now = Date.now();
    const historyTrail: { lat: number; lon: number; ts: number }[] = [];
    // Generate points for last 90 minutes (one full orbit)
    const points = 120;
    for (let i = 0; i < points; i++) {
      const ts = now - (5_400_000 * (points - i)) / points;
      const pos = simulateISSPosition(ts);
      historyTrail.push({ lat: pos.lat, lon: pos.lon, ts });
    }
    setTrail(historyTrail);
  }, []);

  /* ── Derived values (JSX consts) ───────────────────────────────── */

  const issSvgPos = useMemo(() => {
    if (!telemetry) return { x: MAP_W / 2, y: MAP_H / 2 };
    return { x: latLonToSvg(telemetry.position.lat, telemetry.position.lon)[0], y: latLonToSvg(telemetry.position.lat, telemetry.position.lon)[1] };
  }, [telemetry]);

  const trailPolyline = useMemo(() => {
    if (trail.length < 2) return "";
    const now = Date.now();
    let segments: string[] = [];
    let currentSegment: string[] = [];

    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      const [x, y] = latLonToSvg(p.lat, p.lon);
      const age = now - p.ts;
      const opacity = Math.max(0.05, 1 - age / 5_400_000);

      // Break the polyline if there's a large longitude jump (map wrap)
      if (currentSegment.length > 0) {
        const prev = trail[i - 1];
        const [px] = latLonToSvg(prev.lat, prev.lon);
        if (Math.abs(x - px) > MAP_W * 0.3) {
          if (currentSegment.length > 1) {
            segments.push(currentSegment.join(" "));
          }
          currentSegment = [];
        }
      }

      if (x >= 0 && x <= MAP_W && y >= 0 && y <= MAP_H) {
        currentSegment.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    }
    if (currentSegment.length > 1) {
      segments.push(currentSegment.join(" "));
    }
    return segments;
  }, [trail]);

  const visRadius = kmToSvgRadius(2000);

  const connectionBadge = (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
          connected
            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? "bg-cyan-400 conn-pulse" : "bg-red-400"
          }`}
          style={
            connected
              ? { boxShadow: "0 0 6px rgba(16,185,129,0.6)" }
              : { boxShadow: "0 0 6px rgba(239,68,68,0.6)" }
          }
        />
        {connected ? "Connected" : "Disconnected (Mock)"}
      </span>
      {telemetry && (
        <span className="text-[10px] text-gray-500 dark:text-gray-600 font-mono">
          NORAD {telemetry.norad_id}
        </span>
      )}
    </div>
  );

  const formatSeconds = (s: number): string => {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  };

  const eclipseCard = eclipseInfo ? (
    <div className="bg-white/5 dark:bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
        <Sun className="h-3.5 w-3.5 text-amber-400" />
        Eclipse Status
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-white">
        {eclipseInfo.in_eclipse ? (
          <span className="text-purple-400">In Eclipse</span>
        ) : (
          <span className="text-amber-400">Sunlit</span>
        )}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
        Next {eclipseInfo.next_event}: {formatSeconds(eclipseInfo.seconds_to_event)}
      </div>
      {/* Eclipse progress bar */}
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            eclipseInfo.in_eclipse
              ? "bg-gradient-to-r from-purple-500 to-purple-400"
              : "bg-gradient-to-r from-amber-500 to-amber-400"
          }`}
          style={{ width: eclipseInfo.in_eclipse ? "70%" : "40%" }}
        />
      </div>
    </div>
  ) : (
    <div className="bg-white/5 dark:bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
      <div className="text-xs text-gray-500">Loading eclipse data...</div>
    </div>
  );

  const orbitCard = telemetry ? (
    <div className="bg-white/5 dark:bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
        <Orbit className="h-3.5 w-3.5 text-cyan-400" />
        Orbit Info
      </div>
      <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
        #{telemetry.orbit_number.toLocaleString()}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 font-mono space-y-0.5">
        <div>Inclination: 51.6°</div>
        <div>Period: 92 min</div>
        <div>Alt: {telemetry.position.alt_km.toFixed(1)} km</div>
      </div>
    </div>
  ) : (
    <div className="bg-white/5 dark:bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
      <div className="text-xs text-gray-500">Loading orbit data...</div>
    </div>
  );

  const visibilityCard = (
    <div className="bg-white/5 dark:bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 space-y-2.5">
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
        <Eye className="h-3.5 w-3.5 text-cyan-400" />
        Ground Station Visibility
      </div>
      <div className="space-y-1.5">
        {GROUND_STATIONS.map((gs) => {
          const vis = stationVis.find((v) => v.station === gs.name);
          const isVisible = vis?.visible ?? false;
          const dist = vis?.distance_km;
          return (
            <div
              key={gs.id}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    isVisible
                      ? "bg-cyan-400 shadow-[0_0_4px_rgba(16,185,129,0.6)]"
                      : "bg-gray-600"
                  }`}
                />
                <span
                  className={`font-mono ${
                    isVisible
                      ? "text-cyan-400"
                      : "text-gray-500 dark:text-gray-600"
                  }`}
                >
                  {gs.name}
                </span>
              </div>
              {dist !== undefined && (
                <span className="text-gray-500 dark:text-gray-600 font-mono text-[10px]">
                  {dist.toLocaleString()} km
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <section id="live-tracking" className="py-16 px-4">
      <SectionHeader
        title="Live Tracking Dashboard"
        subtitle="Real-time ISS telemetry via WebSocket — NORAD 25544 (ZARYA)"
        icon={<Rocket className="h-6 w-6 text-cyan-400" />}
        sectionNumber="§44"
      />

      {/* Connection Status */}
      <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        {connectionBadge}
        {telemetry && (
          <span className="text-[10px] text-gray-500 dark:text-gray-600 font-mono">
            {new Date(telemetry.timestamp).toLocaleTimeString()} UTC
          </span>
        )}
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── Map Section ───────────────────────────────────────── */}
        <div className="relative w-full rounded-xl overflow-hidden border border-white/5 bg-slate-950/80">
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            className="w-full"
            style={{ aspectRatio: "2 / 1" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <style>{ISS_PULSE_STYLE}</style>

            {/* Defs */}
            <defs>
              <pattern
                id="lt-grid"
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="rgba(255,255,255,0.025)"
                  strokeWidth="0.5"
                />
              </pattern>
              <radialGradient id="iss-footprint-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(16,185,129,0.12)" />
                <stop offset="70%" stopColor="rgba(16,185,129,0.04)" />
                <stop offset="100%" stopColor="rgba(16,185,129,0)" />
              </radialGradient>
              <filter id="iss-glow-filter">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="trail-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(16,185,129,0)" />
                <stop offset="40%" stopColor="rgba(16,185,129,0.2)" />
                <stop offset="100%" stopColor="rgba(16,185,129,0.6)" />
              </linearGradient>
            </defs>

            {/* Grid background */}
            <rect width={MAP_W} height={MAP_H} fill="url(#lt-grid)" />

            {/* Equator + prime meridian */}
            <line
              x1="0"
              y1="250"
              x2="1000"
              y2="250"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="0.5"
              strokeDasharray="8 4"
            />
            <line
              x1="500"
              y1="0"
              x2="500"
              y2="500"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="0.5"
              strokeDasharray="8 4"
            />

            {/* Continents */}
            {continentPaths.map((pts, i) => (
              <polygon
                key={`c-${i}`}
                points={pts}
                fill="rgba(255,255,255,0.04)"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="0.6"
                strokeLinejoin="round"
              />
            ))}

            {/* Ground stations */}
            {stationSvgPositions.map((s) => {
              const isVisible = stationVis.some(
                (v) => v.station === s.name && v.visible
              );
              return (
                <g key={s.id}>
                  <circle
                    cx={s.svgX}
                    cy={s.svgY}
                    r={isVisible ? 3 : 2}
                    fill={isVisible ? "#06b6d4" : "rgba(255,255,255,0.2)"}
                    stroke={isVisible ? "#06b6d4" : "rgba(255,255,255,0.1)"}
                    strokeWidth="0.5"
                    style={
                      isVisible
                        ? { filter: "drop-shadow(0 0 3px rgba(16,185,129,0.5))" }
                        : undefined
                    }
                  />
                  <text
                    x={s.svgX + 6}
                    y={s.svgY + 3}
                    className="fill-gray-500 dark:fill-gray-600"
                    fontSize="7"
                    fontFamily="monospace"
                  >
                    {s.name}
                  </text>
                </g>
              );
            })}

            {/* Ground track trail (fading polyline) */}
            {trailPolyline.map((pts, i) => (
              <polyline
                key={`trail-${i}`}
                points={pts}
                fill="none"
                stroke="rgba(16,185,129,0.35)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* ISS visibility footprint */}
            <circle
              cx={issSvgPos.x}
              cy={issSvgPos.y}
              r={visRadius}
              fill="url(#iss-footprint-grad)"
              stroke="rgba(16,185,129,0.15)"
              strokeWidth="0.8"
              strokeDasharray="4 3"
              style={{ transition: "cx 0.5s ease, cy 0.5s ease" }}
            />

            {/* ISS pulsing glow ring */}
            <circle
              cx={issSvgPos.x}
              cy={issSvgPos.y}
              r={5}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1"
              className="iss-pulse-glow"
              style={{ transition: "cx 0.5s ease, cy 0.5s ease" }}
            />

            {/* ISS main dot */}
            <circle
              cx={issSvgPos.x}
              cy={issSvgPos.y}
              r={4}
              fill="#06b6d4"
              className="iss-dot-pulse"
              filter="url(#iss-glow-filter)"
              style={{ transition: "cx 0.5s ease, cy 0.5s ease" }}
            />

            {/* ISS label */}
            <text
              x={issSvgPos.x + 10}
              y={issSvgPos.y - 6}
              className="fill-cyan-400"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="bold"
              style={{ transition: "x 0.5s ease, y 0.5s ease" }}
            >
              ISS
            </text>
            {telemetry && (
              <text
                x={issSvgPos.x + 10}
                y={issSvgPos.y + 4}
                className="fill-cyan-400/60"
                fontSize="6"
                fontFamily="monospace"
                style={{ transition: "x 0.5s ease, y 0.5s ease" }}
              >
                {telemetry.position.lat.toFixed(2)}°, {telemetry.position.lon.toFixed(2)}°
              </text>
            )}
          </svg>
        </div>

        {/* ── Gauges Grid (2x2) ─────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {telemetry && (
            <>
              <div className="bg-white/5 dark:bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center justify-center">
                <CircularGauge
                  value={telemetry.position.alt_km}
                  min={400}
                  max={420}
                  unit="km"
                  label="Altitude"
                  color="#06b6d4"
                  icon={<Gauge className="h-3.5 w-3.5 text-cyan-400" />}
                  decimals={1}
                />
              </div>
              <div className="bg-white/5 dark:bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center justify-center">
                <CircularGauge
                  value={telemetry.velocity.speed_km_s}
                  min={7.5}
                  max={7.8}
                  unit="km/s"
                  label="Velocity"
                  color="#06b6d4"
                  icon={<Zap className="h-3.5 w-3.5 text-cyan-400" />}
                  decimals={2}
                />
              </div>
              <div className="bg-white/5 dark:bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center justify-center">
                <CircularGauge
                  value={telemetry.subsystems.power_w / 1000}
                  min={40}
                  max={100}
                  unit="kW"
                  label="Power"
                  color="#f59e0b"
                  icon={<Radio className="h-3.5 w-3.5 text-amber-400" />}
                  decimals={1}
                />
              </div>
              <div className="bg-white/5 dark:bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center justify-center">
                <CircularGauge
                  value={telemetry.subsystems.temp_c}
                  min={15}
                  max={30}
                  unit="°C"
                  label="Temperature"
                  color="#f43f5e"
                  icon={<Thermometer className="h-3.5 w-3.5 text-rose-400" />}
                  decimals={1}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Info Cards (3 columns) ────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {orbitCard}
          {eclipseCard}
          {visibilityCard}
        </div>

        {/* ── Telemetry Detail Row ──────────────────────────────── */}
        {telemetry && (
          <div className="bg-white/5 dark:bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-gray-500 dark:text-gray-600 block mb-0.5">
                  Signal Strength
                </span>
                <span className="text-gray-300 dark:text-gray-300">
                  {telemetry.subsystems.signal_db.toFixed(1)} dBm
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-600 block mb-0.5">
                  Data Rate
                </span>
                <span className="text-gray-300 dark:text-gray-300">
                  {(telemetry.subsystems.data_rate_kbps / 1000).toFixed(0)} Mbps
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-600 block mb-0.5">
                  Heading
                </span>
                <span className="text-gray-300 dark:text-gray-300">
                  {telemetry.velocity.direction_deg.toFixed(1)}°
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-600 block mb-0.5">
                  Eclipse
                </span>
                <span
                  className={
                    telemetry.in_eclipse
                      ? "text-purple-400"
                      : "text-amber-400"
                  }
                >
                  {telemetry.in_eclipse ? "SHADOW" : "SUNLIT"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}