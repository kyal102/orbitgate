"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe2, Eye, Hand } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SatelliteTrack {
  id: string;
  name: string;
  inclination: number;
  raan: number;
  altitude: number; // relative size factor
  color: string;
  glowColor: string;
  speed: number; // seconds per orbit (CSS animation duration)
  initialAngle: number; // degrees offset
  type: "ISS" | "HUBBLE" | "GPS" | "SENTINEL" | "STARLINK";
}

type TrackMode = "all" | "ISS" | "HUBBLE";

// ─── Constants ───────────────────────────────────────────────────────────────

const SATELLITES: SatelliteTrack[] = [
  {
    id: "iss",
    name: "ISS",
    inclination: 51.6,
    raan: 0,
    altitude: 1.0,
    color: "bg-cyan-400",
    glowColor: "rgba(52,211,153,0.7)",
    speed: 12,
    initialAngle: 0,
    type: "ISS",
  },
  {
    id: "hubble",
    name: "Hubble",
    inclination: 28.5,
    raan: 60,
    altitude: 0.96,
    color: "bg-amber-400",
    glowColor: "rgba(251,191,36,0.7)",
    speed: 15,
    initialAngle: 90,
    type: "HUBBLE",
  },
  {
    id: "gps-bii-2",
    name: "GPS IIR",
    inclination: 55,
    raan: 120,
    altitude: 1.35,
    color: "bg-amber-400",
    glowColor: "rgba(251,191,36,0.6)",
    speed: 22,
    initialAngle: 45,
    type: "GPS",
  },
  {
    id: "sentinel-2a",
    name: "Sentinel-2A",
    inclination: 98,
    raan: 200,
    altitude: 1.02,
    color: "bg-amber-400",
    glowColor: "rgba(251,191,36,0.6)",
    speed: 14,
    initialAngle: 180,
    type: "SENTINEL",
  },
  {
    id: "starlink-1007",
    name: "Starlink-1007",
    inclination: 53,
    raan: 280,
    altitude: 0.92,
    color: "bg-amber-400",
    glowColor: "rgba(251,191,36,0.5)",
    speed: 10,
    initialAngle: 270,
    type: "STARLINK",
  },
];

const LATITUDES = [-60, -40, -20, 0, 20, 40, 60];
const LONGITUDES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

const TRACK_MODES: { value: TrackMode; label: string }[] = [
  { value: "all", label: "Track All" },
  { value: "ISS", label: "Track ISS" },
  { value: "HUBBLE", label: "Track Hubble" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function latRadius(latDeg: number, globeR: number): number {
  return Math.cos((latDeg * Math.PI) / 180) * globeR;
}

function latY(latDeg: number, globeR: number): number {
  return Math.sin((latDeg * Math.PI) / 180) * globeR;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OrbitVisualization3D() {
  const [rotX, setRotX] = useState(-20);
  const [rotY, setRotY] = useState(30);
  const [isDragging, setIsDragging] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [trackMode, setTrackMode] = useState<TrackMode>("all");
  const dragRef = useRef({ startX: 0, startY: 0, startRotX: 0, startRotY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const autoRotateRef = useRef(autoRotate);
  const rotYRef = useRef(rotY);

  // Keep refs in sync (used in handlers/effects to avoid stale closure)
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);
  useEffect(() => {
    rotYRef.current = rotY;
  }, [rotY]);

  // Auto-rotation
  useEffect(() => {
    if (!autoRotate) return;
    let frame: number;
    let last = performance.now();

    function tick(now: number) {
      const dt = now - last;
      last = now;
      if (!autoRotateRef.current) return;
      setRotY((prev) => {
        const next = prev + dt * 0.008;
        rotYRef.current = next;
        return next;
      });
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoRotate]);

  // Mouse handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setAutoRotate(false);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRotX: rotX,
      startRotY: rotYRef.current,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [rotX]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const newRotY = dragRef.current.startRotY + dx * 0.4;
    const newRotX = Math.max(-89, Math.min(89, dragRef.current.startRotX - dy * 0.4));
    setRotY(newRotY);
    rotYRef.current = newRotY;
    setRotX(newRotX);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const filteredSats = useMemo(() => {
    if (trackMode === "all") return SATELLITES;
    return SATELLITES.filter((s) => s.type === trackMode);
  }, [trackMode]);

  const activeCount = filteredSats.length;

  return (
    <section id="orbit-3d" className="py-16 sm:py-20 relative">
      {/* Dark radial gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(6,78,59,0.08) 0%, rgba(0,0,0,0) 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 relative">
        <SectionHeader
          title="3D Orbit Visualization"
          subtitle="Interactive CSS 3D holographic display of satellite orbital paths. Drag to rotate."
          icon={<Globe2 className="h-5 w-5 text-cyan-400" />}
          sectionNumber="§23"
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
          {/* ─── 3D Scene ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
              <CardContent className="p-0">
                {/* Scene container with perspective */}
                <div
                  ref={containerRef}
                  className="relative w-full aspect-square max-w-[600px] mx-auto cursor-grab active:cursor-grabbing select-none overflow-hidden"
                  style={{ perspective: "900px" }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  {/* Deep space background */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 50%, #0a1628 0%, #020810 70%, #000000 100%)",
                    }}
                  />

                  {/* Subtle star dots (decorative) */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div
                        key={`star-${i}`}
                        className="absolute rounded-full bg-white"
                        style={{
                          width: `${1 + (i % 3) * 0.5}px`,
                          height: `${1 + (i % 3) * 0.5}px`,
                          top: `${((i * 37) % 100)}%`,
                          left: `${((i * 53 + 11) % 100)}%`,
                          opacity: 0.15 + (i % 5) * 0.08,
                        }}
                      />
                    ))}
                  </div>

                  {/* 3D Rotating Scene */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                    }}
                  >
                    {/* ── Wireframe Globe ──────────────────────────── */}
                    <div
                      className="relative"
                      style={{
                        width: "240px",
                        height: "240px",
                        transformStyle: "preserve-3d",
                      }}
                    >
                      {/* Latitude lines */}
                      {LATITUDES.map((lat) => {
                        const r = latRadius(lat, 120);
                        const y = latY(lat, 120);
                        return (
                          <div
                            key={`lat-${lat}`}
                            className="absolute rounded-full"
                            style={{
                              width: `${r * 2}px`,
                              height: `${r * 2}px`,
                              left: `${120 - r}px`,
                              top: `${120 - r}px`,
                              border: "1px solid rgba(16,185,129,0.1)",
                              transformStyle: "preserve-3d",
                              transform: `translateZ(${y}px)`,
                            }}
                          />
                        );
                      })}

                      {/* Longitude lines */}
                      {LONGITUDES.map((lon) => (
                        <div
                          key={`lon-${lon}`}
                          className="absolute rounded-full"
                          style={{
                            width: "240px",
                            height: "240px",
                            left: "0px",
                            top: "0px",
                            border: "1px solid rgba(255,255,255,0.07)",
                            transformStyle: "preserve-3d",
                            transform: `rotateY(${lon}deg)`,
                          }}
                        />
                      ))}

                      {/* Equator highlight */}
                      <div
                        className="absolute rounded-full"
                        style={{
                          width: "240px",
                          height: "240px",
                          left: "0px",
                          top: "0px",
                          border: "1px solid rgba(16,185,129,0.25)",
                          transformStyle: "preserve-3d",
                        }}
                      />

                      {/* Prime meridian highlight */}
                      <div
                        className="absolute rounded-full"
                        style={{
                          width: "240px",
                          height: "240px",
                          left: "0px",
                          top: "0px",
                          border: "1px solid rgba(16,185,129,0.2)",
                          transformStyle: "preserve-3d",
                          transform: "rotateY(0deg)",
                        }}
                      />
                    </div>

                    {/* ── Orbital Rings + Satellites ───────────────── */}
                    {SATELLITES.map((sat) => {
                      const isVisible = trackMode === "all" || sat.type === trackMode;
                      const ringR = 120 * sat.altitude;
                      const diam = ringR * 2;
                      return (
                        <div
                          key={sat.id}
                          className="absolute"
                          style={{
                            width: `${diam}px`,
                            height: `${diam}px`,
                            left: `calc(50% - ${ringR}px)`,
                            top: `calc(50% - ${ringR}px)`,
                            transformStyle: "preserve-3d",
                            transform: `rotateX(${90 - sat.inclination}deg) rotateY(${sat.raan}deg)`,
                            opacity: isVisible ? 1 : 0.12,
                            transition: "opacity 0.5s ease",
                          }}
                        >
                          {/* Orbit ring */}
                          <div
                            className="absolute inset-0 rounded-full"
                            style={{
                              border: "1.5px dashed rgba(16,185,129,0.2)",
                            }}
                          />

                          {/* Satellite dot - animated via CSS */}
                          <div
                            className="absolute"
                            style={{
                              width: `${diam}px`,
                              height: `${diam}px`,
                              left: "0px",
                              top: "0px",
                              transformStyle: "preserve-3d",
                              animation: `orbit-spin-${sat.id} ${sat.speed}s linear infinite`,
                              animationDelay: `-${(sat.initialAngle / 360) * sat.speed}s`,
                            }}
                          >
                            {/* Dot positioned at top of orbit circle */}
                            <div
                              className={`absolute rounded-full ${sat.color}`}
                              style={{
                                width: sat.type === "ISS" ? "7px" : "6px",
                                height: sat.type === "ISS" ? "7px" : "6px",
                                left: `calc(50% - ${sat.type === "ISS" ? 3.5 : 3}px)`,
                                top: "-3px",
                                boxShadow: `0 0 8px 2px ${sat.glowColor}, 0 0 16px 4px ${sat.glowColor}`,
                                transformStyle: "preserve-3d",
                                transform: "translateZ(0px)",
                              }}
                            />
                            {/* Satellite label */}
                            {isVisible && (
                              <div
                                className="absolute text-[9px] font-mono whitespace-nowrap"
                                style={{
                                  left: "calc(50% + 6px)",
                                  top: "-1px",
                                  color: sat.glowColor,
                                  textShadow: `0 0 4px ${sat.glowColor}`,
                                  transformStyle: "preserve-3d",
                                }}
                              >
                                {sat.name}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Drag hint overlay */}
                  {autoRotate && !isDragging && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-white/30 text-xs pointer-events-none">
                      <Hand className="h-3 w-3" />
                      <span>Drag to rotate</span>
                    </div>
                  )}
                </div>

                {/* Keyframe styles injected via style tag */}
                <style>{`
                  ${SATELLITES.map(
                    (sat) => `
                  @keyframes orbit-spin-${sat.id} {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }`
                  ).join("\n")}
                `}</style>
              </CardContent>
            </Card>
          </motion.div>

          {/* ─── Info Panel ───────────────────────────────────────── */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Rotation Info */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                  <Eye className="h-3.5 w-3.5 text-cyan-400" />
                  <span>VIEW CONTROLS</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Rotation X</span>
                    <span className="text-xs font-mono text-cyan-400">
                      {rotX.toFixed(1)}°
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500/40 rounded-full transition-all duration-100"
                      style={{
                        width: `${((rotX + 89) / 178) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Rotation Y</span>
                    <span className="text-xs font-mono text-cyan-400">
                      {(rotY % 360).toFixed(1)}°
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500/40 rounded-full transition-all duration-100"
                      style={{
                        width: `${(((rotY % 360) + 360) % 360) / 3.6}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Auto-rotate toggle */}
                <button
                  onClick={() => setAutoRotate((p) => !p)}
                  className={
                    autoRotate
                      ? "w-full text-xs py-1.5 rounded-md border transition-colors bg-cyan-500/15 border-cyan-500/30 text-cyan-400"
                      : "w-full text-xs py-1.5 rounded-md border transition-colors bg-white/5 border-white/10 text-gray-400 hover:text-gray-300"
                  }
                >
                  {autoRotate ? "● Auto-Rotate ON" : "○ Auto-Rotate OFF"}
                </button>
              </CardContent>
            </Card>

            {/* Satellite Tracker */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                    <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
                    <span>SATELLITE TRACKER</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
                  >
                    {activeCount} active
                  </Badge>
                </div>

                <div className="flex flex-col gap-1.5">
                  {TRACK_MODES.map((mode) => (
                    <Button
                      key={mode.value}
                      variant="ghost"
                      size="sm"
                      onClick={() => setTrackMode(mode.value)}
                      className={`h-8 text-xs justify-start gap-2 px-2 ${
                        trackMode === mode.value
                          ? "bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-400"
                          : "text-gray-400 hover:text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          trackMode === mode.value ? "bg-cyan-400" : "bg-gray-600"
                        }`}
                      />
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Satellites List */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
              <CardContent className="p-4 space-y-3">
                <span className="text-xs text-gray-400 font-mono">ORBITING OBJECTS</span>

                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {SATELLITES.map((sat) => {
                    const isActive =
                      trackMode === "all" || sat.type === trackMode;
                    return (
                      <div
                        key={sat.id}
                        className="flex items-center gap-2 transition-opacity duration-300"
                        style={{ opacity: isActive ? 1 : 0.25 }}
                      >
                        <div
                          className={`h-2 w-2 rounded-full shrink-0 ${sat.color}`}
                          style={{
                            boxShadow: `0 0 4px ${sat.glowColor}`,
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-300 truncate">
                            {sat.name}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500 shrink-0">
                          {sat.inclination}°
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Legend */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
            ISS (51.6°)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]" />
            Hubble (28.5°)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.4)]" />
            GPS IIR (55°)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.4)]" />
            Sentinel-2A (98°)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.3)]" />
            Starlink (53°)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className="h-0 w-5 border-t border-dashed border-cyan-500/30"
            />
            Orbit path
          </div>
        </motion.div>
      </div>
    </section>
  );
}