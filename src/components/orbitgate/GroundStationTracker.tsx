"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "./SectionHeader";
import { Radio, MapPin, Satellite, Eye, Clock, Signal } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GroundStation {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  elevation: number;
  frequencyBand: string;
  maxDataRate: string;
  passes: PassPrediction[];
}

interface PassPrediction {
  aos: string;
  los: string;
  maxEl: string;
  duration: string;
}

/* ------------------------------------------------------------------ */
/*  Constants & Data                                                   */
/* ------------------------------------------------------------------ */

const MAP_W = 1000;
const MAP_H = 500;

const STATIONS: GroundStation[] = [
  {
    id: "houston",
    name: "Houston (JSC)",
    country: "United States",
    lat: 29.76,
    lon: -95.37,
    elevation: 12,
    frequencyBand: "S-Band / Ku-Band",
    maxDataRate: "150 Mbps",
    passes: [
      { aos: "14:23 UTC", los: "14:29 UTC", maxEl: "42°", duration: "6m 12s" },
      { aos: "16:01 UTC", los: "16:04 UTC", maxEl: "18°", duration: "3m 45s" },
      { aos: "18:38 UTC", los: "18:43 UTC", maxEl: "67°", duration: "5m 03s" },
    ],
  },
  {
    id: "moscow",
    name: "Moscow (MCC)",
    country: "Russia",
    lat: 55.75,
    lon: 37.62,
    elevation: 156,
    frequencyBand: "VHF / S-Band",
    maxDataRate: "50 Mbps",
    passes: [
      { aos: "13:45 UTC", los: "13:52 UTC", maxEl: "55°", duration: "7m 20s" },
      { aos: "15:22 UTC", los: "15:27 UTC", maxEl: "38°", duration: "5m 10s" },
      { aos: "17:58 UTC", los: "18:05 UTC", maxEl: "72°", duration: "6m 55s" },
    ],
  },
  {
    id: "beijing",
    name: "Beijing (BACC)",
    country: "China",
    lat: 39.92,
    lon: 116.39,
    elevation: 50,
    frequencyBand: "S-Band",
    maxDataRate: "120 Mbps",
    passes: [
      { aos: "14:10 UTC", los: "14:16 UTC", maxEl: "48°", duration: "5m 40s" },
      { aos: "15:48 UTC", los: "15:52 UTC", maxEl: "22°", duration: "4m 15s" },
      { aos: "18:25 UTC", los: "18:31 UTC", maxEl: "61°", duration: "6m 02s" },
    ],
  },
  {
    id: "tokyo",
    name: "Tokyo (JAXA)",
    country: "Japan",
    lat: 35.68,
    lon: 139.69,
    elevation: 40,
    frequencyBand: "S-Band / Ka-Band",
    maxDataRate: "200 Mbps",
    passes: [
      { aos: "14:35 UTC", los: "14:40 UTC", maxEl: "52°", duration: "5m 22s" },
      { aos: "16:12 UTC", los: "16:16 UTC", maxEl: "29°", duration: "4m 08s" },
      { aos: "18:50 UTC", los: "18:56 UTC", maxEl: "70°", duration: "6m 30s" },
    ],
  },
  {
    id: "canberra",
    name: "Canberra (CDSCC)",
    country: "Australia",
    lat: -35.28,
    lon: 149.13,
    elevation: 691,
    frequencyBand: "X-Band / Ka-Band",
    maxDataRate: "600 Mbps",
    passes: [
      { aos: "14:55 UTC", los: "15:01 UTC", maxEl: "35°", duration: "6m 18s" },
      { aos: "16:32 UTC", los: "16:37 UTC", maxEl: "58°", duration: "5m 42s" },
      { aos: "19:10 UTC", los: "19:14 UTC", maxEl: "25°", duration: "4m 05s" },
    ],
  },
  {
    id: "kourou",
    name: "Kourou (CSG)",
    country: "French Guiana",
    lat: 5.16,
    lon: -52.65,
    elevation: 10,
    frequencyBand: "S-Band / X-Band",
    maxDataRate: "100 Mbps",
    passes: [
      { aos: "14:02 UTC", los: "14:08 UTC", maxEl: "44°", duration: "6m 30s" },
      { aos: "15:40 UTC", los: "15:45 UTC", maxEl: "20°", duration: "4m 50s" },
      { aos: "18:15 UTC", los: "18:22 UTC", maxEl: "65°", duration: "6m 40s" },
    ],
  },
  {
    id: "svalbard",
    name: "Svalbard (SVALSAT)",
    country: "Norway",
    lat: 78.23,
    lon: 15.39,
    elevation: 30,
    frequencyBand: "S-Band / X-Band",
    maxDataRate: "300 Mbps",
    passes: [
      { aos: "13:30 UTC", los: "13:38 UTC", maxEl: "78°", duration: "8m 10s" },
      { aos: "15:10 UTC", los: "15:15 UTC", maxEl: "62°", duration: "5m 20s" },
      { aos: "16:48 UTC", los: "16:55 UTC", maxEl: "85°", duration: "7m 05s" },
    ],
  },
  {
    id: "ascension",
    name: "Ascension (ASI)",
    country: "British Territory",
    lat: -7.95,
    lon: -14.37,
    elevation: 80,
    frequencyBand: "S-Band",
    maxDataRate: "75 Mbps",
    passes: [
      { aos: "14:18 UTC", los: "14:24 UTC", maxEl: "40°", duration: "5m 55s" },
      { aos: "15:55 UTC", los: "16:00 UTC", maxEl: "15°", duration: "4m 30s" },
      { aos: "18:32 UTC", los: "18:38 UTC", maxEl: "58°", duration: "6m 12s" },
    ],
  },
];

/* Simplified continent outlines as [lat, lon] polygons (~20 segments) */
const CONTINENT_POLYS: [number, number][][] = [
  // 1. North America mainland
  [
    [50, -125], [55, -132], [60, -147], [64, -166], [70, -162], [72, -138],
    [70, -100], [62, -78], [52, -56], [47, -53], [44, -66], [41, -72],
    [35, -75], [30, -81], [25, -80], [25, -97], [20, -105], [15, -92],
    [15, -84], [20, -87], [30, -88], [30, -90], [30, -115], [35, -120],
    [40, -124], [48, -124], [50, -125],
  ],
  // 2. Greenland
  [
    [84, -30], [82, -18], [78, -18], [73, -22], [68, -44], [70, -55],
    [76, -68], [80, -65], [83, -40], [84, -30],
  ],
  // 3. South America
  [
    [12, -72], [10, -62], [7, -55], [2, -50], [-3, -42], [-8, -35],
    [-15, -39], [-22, -41], [-28, -49], [-35, -56], [-40, -62],
    [-46, -65], [-52, -70], [-55, -67], [-54, -72], [-48, -76],
    [-40, -73], [-18, -70], [-5, -81], [0, -78], [5, -77], [10, -75],
    [12, -72],
  ],
  // 4. Western Europe (Iberia, France, UK, Ireland)
  [
    [36, -9], [38, -9], [43, -9], [46, -2], [48, -5], [51, -5],
    [52, 0], [54, 0], [56, -3], [58, -5], [57, -2], [55, 1],
    [54, 2], [52, 1], [50, -1], [48, -3], [47, -2], [44, -1],
    [43, 3], [40, 0], [37, -2], [36, -6], [36, -9],
  ],
  // 5. Scandinavia
  [
    [58, 8], [60, 5], [63, 5], [65, 12], [68, 15], [70, 20],
    [71, 28], [70, 32], [68, 28], [65, 24], [63, 18], [60, 12],
    [58, 11], [56, 10], [58, 8],
  ],
  // 6. Central/Eastern Europe
  [
    [42, 18], [45, 14], [48, 17], [50, 14], [52, 14], [54, 14],
    [56, 18], [58, 22], [60, 30], [58, 28], [55, 22], [52, 22],
    [50, 20], [48, 22], [46, 18], [44, 20], [42, 24], [40, 24],
    [38, 24], [36, 22], [38, 20], [40, 18], [42, 18],
  ],
  // 7. Russia (European + Western Siberia)
  [
    [60, 30], [62, 34], [65, 40], [68, 45], [70, 60], [72, 80],
    [73, 100], [72, 110], [70, 130], [65, 140], [60, 145], [55, 135],
    [52, 140], [50, 130], [48, 135], [45, 135], [43, 132], [42, 132],
    [50, 130], [53, 120], [55, 110], [55, 100], [52, 85], [52, 75],
    [52, 65], [55, 55], [55, 45], [55, 38], [58, 35], [60, 30],
  ],
  // 8. Russia (Eastern Siberia / Far East)
  [
    [72, 110], [73, 130], [72, 150], [70, 170], [66, 178],
    [62, 170], [58, 163], [55, 155], [52, 155], [50, 155],
    [48, 150], [45, 142], [48, 135], [50, 130], [52, 140],
    [55, 145], [60, 160], [65, 170], [68, 175], [70, 170],
    [72, 150], [72, 130], [72, 110],
  ],
  // 9. Central Asia
  [
    [42, 50], [45, 52], [50, 55], [52, 65], [52, 75], [50, 80],
    [48, 85], [42, 80], [38, 68], [36, 62], [38, 58], [40, 53],
    [42, 50],
  ],
  // 10. Middle East
  [
    [32, 35], [35, 36], [38, 42], [42, 44], [42, 50], [38, 55],
    [32, 48], [28, 50], [25, 57], [22, 60], [18, 54], [15, 42],
    [13, 45], [12, 44], [14, 42], [22, 36], [28, 34], [30, 33],
    [32, 35],
  ],
  // 11. India / Sri Lanka
  [
    [32, 68], [35, 75], [34, 78], [30, 78], [28, 84], [26, 88],
    [22, 88], [20, 86], [18, 83], [15, 80], [10, 78], [8, 77],
    [10, 76], [14, 74], [20, 73], [24, 72], [28, 68], [30, 68],
    [32, 68],
  ],
  // 12. China / East Asia mainland
  [
    [42, 80], [45, 85], [48, 88], [50, 100], [53, 120], [50, 130],
    [45, 135], [40, 130], [35, 128], [32, 122], [28, 120], [22, 108],
    [20, 110], [18, 108], [16, 108], [20, 106], [22, 100], [24, 98],
    [28, 97], [32, 92], [35, 88], [38, 85], [40, 80], [42, 80],
  ],
  // 13. Japan
  [
    [45, 142], [44, 145], [42, 145], [40, 140], [36, 137],
    [34, 133], [33, 131], [34, 130], [35, 133], [37, 137],
    [39, 140], [41, 140], [43, 143], [45, 142],
  ],
  // 14. Southeast Asia (mainland)
  [
    [22, 100], [24, 98], [22, 98], [20, 100], [18, 103],
    [16, 108], [14, 109], [12, 110], [10, 108], [8, 105],
    [6, 102], [4, 101], [2, 104], [4, 100], [8, 98],
    [10, 99], [14, 99], [16, 98], [18, 96], [20, 96], [22, 100],
  ],
  // 15. Borneo
  [
    [7, 116], [7, 118], [5, 119], [2, 118], [0, 117],
    [-1, 116], [-2, 115], [-1, 110], [1, 109], [3, 110],
    [5, 115], [7, 116],
  ],
  // 16. Sumatra & Java
  [
    [5, 95], [4, 98], [2, 101], [0, 104], [-2, 106],
    [-4, 106], [-6, 106], [-7, 106], [-8, 110], [-8, 114],
    [-7, 115], [-6, 114], [-6, 110], [-4, 106], [-2, 104],
    [0, 100], [2, 96], [4, 95], [5, 95],
  ],
  // 17. Australia
  [
    [-12, 132], [-14, 127], [-17, 122], [-22, 114], [-28, 114],
    [-32, 115], [-35, 117], [-35, 120], [-38, 145], [-37, 150],
    [-33, 152], [-28, 153], [-23, 150], [-20, 149], [-15, 145],
    [-12, 142], [-11, 136], [-12, 132],
  ],
  // 18. New Zealand
  [
    [-35, 173], [-37, 175], [-39, 177], [-42, 174], [-44, 170],
    [-46, 167], [-46, 169], [-44, 172], [-42, 175], [-39, 178],
    [-37, 176], [-35, 174], [-35, 173],
  ],
  // 19. North Africa
  [
    [35, -5], [37, 10], [35, 12], [32, 13], [30, 10], [25, 15],
    [22, 17], [20, 20], [22, 25], [25, 32], [30, 32], [32, 35],
    [35, 36], [37, 10], [37, 0], [35, -5],
  ],
  // 20. Sub-Saharan Africa (West & Central)
  [
    [15, -17], [12, -16], [8, -14], [5, -8], [4, 2], [6, 2],
    [4, 8], [2, 10], [0, 10], [-2, 12], [-5, 12], [-8, 14],
    [-12, 14], [-12, 25], [-15, 30], [-15, 35], [-10, 40],
    [-5, 42], [0, 42], [2, 42], [4, 40], [6, 40], [8, 38],
    [10, 38], [12, 35], [14, 32], [15, 25], [15, 17], [15, -17],
  ],
  // 21. Sub-Saharan Africa (East & South)
  [
    [-15, 30], [-18, 35], [-22, 35], [-26, 33], [-30, 30],
    [-34, 26], [-35, 20], [-34, 18], [-30, 17], [-25, 15],
    [-20, 12], [-15, 15], [-12, 14], [-12, 25], [-15, 30],
  ],
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Convert lat/lon to SVG coordinates in the 1000x500 viewBox. */
function latLonToSvg(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * MAP_W;
  const y = ((90 - lat) / 180) * MAP_H;
  return [x, y];
}

/** Build a polygon `points` string from lat/lon pairs. */
function polyPoints(coords: [number, number][]): string {
  return coords.map(([lat, lon]) => {
    const [x, y] = latLonToSvg(lat, lon);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

/** Radius in SVG units for a given km radius (approximate at equator). */
function kmToSvgRadius(km: number): number {
  // Earth circumference ≈ 40075 km; at equator 1° lon ≈ 111.32 km
  // 1° on map = MAP_W / 360 ≈ 2.778 SVG units
  const degRadius = km / 111.32;
  return degRadius * (MAP_W / 360);
}

/* ------------------------------------------------------------------ */
/*  CSS Keyframes (injected once)                                      */
/* ------------------------------------------------------------------ */

const PULSE_RING_STYLE = `
@keyframes gs-pulse-ring {
  0% { r: 5; opacity: 0.7; }
  100% { r: 18; opacity: 0; }
}
.gs-pulse-ring { animation: gs-pulse-ring 2s ease-out infinite; }
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GroundStationTracker() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trackOffset, setTrackOffset] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const selectedStation = useMemo(
    () => STATIONS.find((s) => s.id === selectedId) ?? null,
    [selectedId]
  );

  /* Animate ground track: shift west ~22.5°/92min ≈ 0.244°/min.
     For visual effect we speed this up: ~0.5° per second. */
  const handleTrackTick = useCallback(() => {
    setTrackOffset((prev) => (prev + 0.8) % 360);
  }, []);

  useEffect(() => {
    const interval = setInterval(handleTrackTick, 1000);
    return () => clearInterval(interval);
  }, [handleTrackTick]);

  /* Keep a clock ticking so pass times feel "live" */
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  /* Callbacks — defined before any JSX const */
  const handleStationClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleStationHover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  const handleCloseInfo = useCallback(() => {
    setSelectedId(null);
  }, []);

  /* ── Derived: ISS ground track dots ──────────────────────────── */
  const trackDots = useMemo(() => {
    const inclination = 51.6;
    const dots: [number, number][] = [];
    // Generate ~2.5 orbits of dots across the map
    for (let i = 0; i < 800; i++) {
      const lon = -180 + (i * 0.9 - trackOffset) % 360;
      // ISS ground track: lat = inclination * sin(lon + phase)
      // Each orbit shifts ~22.5° west (Earth rotation), creating the
      // characteristic sinusoidal ground track pattern
      const orbitPhase = (i * 0.9 - trackOffset) * Math.PI / 180;
      const lat = inclination * Math.sin(orbitPhase * 1); // Simple sine wave
      const normalizedLon = ((lon % 360) + 540) % 360 - 180;
      dots.push(latLonToSvg(lat, normalizedLon));
    }
    return dots;
  }, [trackOffset]);

  /* ── Derived: station SVG positions ──────────────────────────── */
  const stationPositions = useMemo(() => {
    return STATIONS.map((s) => ({
      ...s,
      svgX: latLonToSvg(s.lat, s.lon)[0],
      svgY: latLonToSvg(s.lat, s.lon)[1],
    }));
  }, []);

  /* ── Visibility circle radius for selected station ───────────── */
  const visibilityRadius = kmToSvgRadius(2000);

  /* ── Continent paths (memoized) ──────────────────────────────── */
  const continentPaths = useMemo(
    () => CONTINENT_POLYS.map((poly) => polyPoints(poly)),
    []
  );

  /* ── Card data for 4-column grid ─────────────────────────────── */
  const stationCards = useMemo(() => {
    return stationPositions.map((s) => ({
      ...s,
      nextPass: s.passes[0] ?? null,
    }));
  }, [stationPositions]);

  /* ── JSX variables ───────────────────────────────────────────── */

  const mapSection = (
    <div className="relative w-full rounded-xl overflow-hidden border border-white/5 bg-slate-950/80">
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="w-full"
        style={{ aspectRatio: "2 / 1" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>{PULSE_RING_STYLE}</style>

        {/* Background grid */}
        <defs>
          <pattern id="gs-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="vis-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16,185,129,0.15)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </radialGradient>
        </defs>
        <rect width={MAP_W} height={MAP_H} fill="url(#gs-grid)" />

        {/* Equator line */}
        <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="8 4" />
        {/* Prime meridian */}
        <line x1="500" y1="0" x2="500" y2="500" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="8 4" />

        {/* Continent polygons */}
        {continentPaths.map((pts, i) => (
          <polygon
            key={`continent-${i}`}
            points={pts}
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        ))}

        {/* Visibility circle for selected station */}
        {selectedStation && (() => {
          const [cx, cy] = latLonToSvg(selectedStation.lat, selectedStation.lon);
          return (
            <circle
              cx={cx}
              cy={cy}
              r={visibilityRadius}
              fill="url(#vis-grad)"
              stroke="rgba(16,185,129,0.2)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          );
        })()}

        {/* ISS ground track dots */}
        {trackDots.map(([x, y], i) => {
          // Skip dots outside the viewBox
          if (x < 0 || x > MAP_W || y < 0 || y > MAP_H) return null;
          // Fade out edges
          const edgeFade = Math.min(x, MAP_W - x, y, MAP_H - y) / 40;
          const opacity = Math.min(1, Math.max(0, edgeFade)) * 0.5;
          return (
            <circle
              key={`track-${i}`}
              cx={x}
              cy={y}
              r={1.2}
              fill={`rgba(16,185,129,${opacity.toFixed(2)})`}
            />
          );
        })}

        {/* Ground station markers */}
        {stationPositions.map((station) => {
          const isSelected = selectedId === station.id;
          const isHovered = hoveredId === station.id;
          return (
            <g
              key={station.id}
              className="cursor-pointer"
              onClick={() => handleStationClick(station.id)}
              onMouseEnter={() => handleStationHover(station.id)}
              onMouseLeave={() => handleStationHover(null)}
            >
              {/* Pulsing ring */}
              {isSelected && (
                <circle
                  cx={station.svgX}
                  cy={station.svgY}
                  r={5}
                  fill="none"
                  stroke="rgba(16,185,129,0.7)"
                  strokeWidth="1.5"
                  className="gs-pulse-ring"
                />
              )}
              {/* Outer glow for selected */}
              {isSelected && (
                <circle
                  cx={station.svgX}
                  cy={station.svgY}
                  r={8}
                  fill="rgba(16,185,129,0.15)"
                />
              )}
              {/* Hover glow */}
              {isHovered && !isSelected && (
                <circle
                  cx={station.svgX}
                  cy={station.svgY}
                  r={7}
                  fill="rgba(16,185,129,0.1)"
                />
              )}
              {/* Dot */}
              <circle
                cx={station.svgX}
                cy={station.svgY}
                r={isSelected ? 4.5 : isHovered ? 4 : 3}
                fill={isSelected ? "#06b6d4" : isHovered ? "#22d3ee" : "#6ee7b7"}
                className="transition-all duration-200"
              />
              {/* Label on hover or selected */}
              {(isHovered || isSelected) && (
                <g>
                  <rect
                    x={station.svgX + 10}
                    y={station.svgY - 10}
                    width={station.name.length * 6.5 + 16}
                    height={20}
                    rx={4}
                    fill="rgba(15,23,42,0.85)"
                    stroke="rgba(16,185,129,0.3)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={station.svgX + 18}
                    y={station.svgY + 4}
                    fill="rgba(255,255,255,0.9)"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {station.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Map legend */}
        <g transform="translate(12, 12)">
          <rect width="120" height="50" rx="6" fill="rgba(15,23,42,0.7)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <circle cx="14" cy="16" r="3" fill="#6ee7b7" />
          <text x="24" y="20" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="monospace">Ground Station</text>
          <circle cx="14" cy="36" r="1.5" fill="rgba(16,185,129,0.6)" />
          <text x="24" y="40" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="monospace">ISS Ground Track</text>
        </g>
      </svg>
    </div>
  );

  const infoCard = (
    <AnimatePresence>
      {selectedStation && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          className="mb-6"
        >
          <Card className="bg-white/[0.03] backdrop-blur-xl border-white/[0.08] rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Radio className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {selectedStation.name}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono">
                      {selectedStation.country}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseInfo}
                  className="text-gray-500 hover:text-gray-300 transition-colors text-xs font-mono border border-white/[0.08] rounded-md px-2 py-1"
                >
                  ESC
                </button>
              </div>

              {/* Station details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                <InfoItem
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  label="Coordinates"
                  value={`${selectedStation.lat.toFixed(2)}°, ${selectedStation.lon.toFixed(2)}°`}
                />
                <InfoItem
                  icon={<Eye className="h-3.5 w-3.5" />}
                  label="Elevation"
                  value={`${selectedStation.elevation}m`}
                />
                <InfoItem
                  icon={<Signal className="h-3.5 w-3.5" />}
                  label="Freq Band"
                  value={selectedStation.frequencyBand}
                />
                <InfoItem
                  icon={<Satellite className="h-3.5 w-3.5" />}
                  label="Max Data Rate"
                  value={selectedStation.maxDataRate}
                />
                <InfoItem
                  icon={<Radio className="h-3.5 w-3.5" />}
                  label="Status"
                  value="Online"
                  valueClass="text-cyan-400"
                />
              </div>

              {/* Pass predictions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-cyan-400/70" />
                  <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Next 3 ISS Passes
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedStation.passes.map((pass, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-wider">
                          Pass {i + 1}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">
                          {pass.duration}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">AOS</span>
                          <span className="text-gray-300 font-mono">{pass.aos}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">LOS</span>
                          <span className="text-gray-300 font-mono">{pass.los}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Max El</span>
                          <span className="text-white font-mono font-medium">{pass.maxEl}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const stationGrid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stationCards.map((station) => {
        const isSelected = selectedId === station.id;
        return (
          <motion.div
            key={station.id}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
          >
            <Card
              className={`cursor-pointer transition-all duration-200 rounded-xl overflow-hidden
                ${isSelected
                  ? "bg-cyan-500/[0.06] border-cyan-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                  : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]"
                }`}
              onClick={() => handleStationClick(station.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${isSelected ? "bg-cyan-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-cyan-500/50"}`} />
                  <h4 className="text-sm font-medium text-white truncate">{station.name}</h4>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Country</span>
                    <span className="text-gray-300">{station.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lat / Lon</span>
                    <span className="text-gray-300">
                      {station.lat.toFixed(1)}° / {station.lon.toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Band</span>
                    <span className="text-gray-400 text-[11px]">{station.frequencyBand}</span>
                  </div>
                  {station.nextPass && (
                    <div className="pt-1.5 mt-1.5 border-t border-white/[0.06] flex justify-between">
                      <span className="text-gray-500">Next Pass</span>
                      <span className="text-cyan-400/80">{station.nextPass.aos}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <section id="ground-stations" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          title="Ground Station Tracker"
          subtitle="Real-time monitoring of worldwide ground station network — ISS visibility, pass predictions, and telemetry downlink status."
          icon={<Radio className="h-6 w-6 text-cyan-400" />}
          sectionNumber="28"
        />

        {/* World Map */}
        {mapSection}

        {/* Selected station info card */}
        {infoCard}

        {/* Station cards grid */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Satellite className="h-4 w-4 text-cyan-400/60" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Network Stations
            </span>
            <span className="text-[10px] font-mono text-gray-600 ml-1">
              ({STATIONS.length} active)
            </span>
          </div>
          {stationGrid}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-component: Info item in station detail card                    */
/* ------------------------------------------------------------------ */

function InfoItem({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-gray-500">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <span className={`text-sm font-mono ${valueClass ?? "text-white"}`}>{value}</span>
    </div>
  );
}