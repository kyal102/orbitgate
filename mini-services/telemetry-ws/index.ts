import { createServer } from "http";
import { Server } from "socket.io";

// ── ISS Orbital Constants ──────────────────────────────────────────────────

const INCLINATION_DEG = 51.6;
const ALTITUDE_KM = 408;
const ORBIT_PERIOD_S = 92 * 60; // 92 minutes in seconds
const ORBITAL_VELOCITY_KM_S = 7.66; // ISS average orbital velocity
const LON_SHIFT_PER_ORBIT = 22.5; // degrees west per orbit (Earth rotation)

// Simulation starts at a fixed epoch so all clients see the same track
const SIM_START = new Date("2025-06-15T00:00:00.000Z").getTime();

// ── Telemetry Interfaces ───────────────────────────────────────────────────

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

interface TelemetryPayload {
  norad_id: number;
  satellite: string;
  position: TelemetryPosition;
  velocity: TelemetryVelocity;
  subsystems: TelemetrySubsystems;
  orbit_number: number;
  in_eclipse: boolean;
  timestamp: string;
}

// ── ISS Position Simulator ─────────────────────────────────────────────────

/**
 * Compute ISS lat/lon at a given moment.
 *
 * The ISS ground track is a sinusoidal curve:
 *   lat(t) = inclination * sin(2π * t / period)
 *   lon(t) = startLon - (360 * t / period + LON_SHIFT_PER_ORBIT * orbitCount)
 *
 * Longitude decreases continuously (westward motion) with the
 * characteristic ~22.5° westward shift per orbit from Earth rotation.
 */
function computePosition(now: number): TelemetryPosition & { orbitNumber: number } {
  const elapsedS = (now - SIM_START) / 1000;
  const totalOrbits = elapsedS / ORBIT_PERIOD_S;
  const currentOrbitFraction = totalOrbits % 1;
  const orbitNumber = Math.floor(totalOrbits);

  // Latitude: sinusoidal oscillation ±51.6°
  const lat = INCLINATION_DEG * Math.sin(2 * Math.PI * currentOrbitFraction);

  // Longitude: continuous westward drift
  // Each orbit, the track shifts ~22.5° west
  // Within an orbit, the satellite covers 360° of longitude
  const lonWithinOrbit = -360 * currentOrbitFraction;
  const orbitShift = -LON_SHIFT_PER_ORBIT * orbitNumber;
  let lon = (lonWithinOrbit + orbitShift) % 360;

  // Normalize to [-180, 180]
  lon = ((lon + 540) % 360) - 180;

  // Small altitude variation (±2 km around 408)
  const altKm = ALTITUDE_KM + Math.sin(elapsedS * 0.001) * 2;

  return { lat, lon, alt_km: altKm, orbitNumber };
}

/**
 * Compute velocity direction based on ground track derivative.
 */
function computeVelocity(
  elapsedS: number,
  currentOrbitFraction: number
): TelemetryVelocity {
  // Speed varies slightly with altitude
  const speedKmS = ORBITAL_VELOCITY_KM_S + Math.sin(elapsedS * 0.0005) * 0.02;

  // Direction: tangent to ground track
  // d(lat)/dt ∝ cos(2π * fraction) → heading direction
  const latDeriv = Math.cos(2 * Math.PI * currentOrbitFraction);
  // Convert to compass heading (simplified)
  let directionDeg = Math.atan2(-latDeriv, -1) * (180 / Math.PI);
  if (directionDeg < 0) directionDeg += 360;

  return { speed_km_s: speedKmS, direction_deg: directionDeg };
}

/**
 * Compute subsystem telemetry with small random variations.
 */
function computeSubsystems(
  inEclipse: boolean,
  seed: number
): TelemetrySubsystems {
  const rand = (base: number, range: number) =>
    base + (Math.sin(seed) * range * 0.5) + (Math.cos(seed * 1.7) * range * 0.5);

  return {
    // Solar power: ~84 kW in sunlight, ~0 from batteries in eclipse
    power_w: inEclipse
      ? rand(50000, 3000)
      : rand(84000, 4000),
    // Internal temperature: 18-24°C nominal
    temp_c: rand(21, 2),
    // Signal strength: -65 to -55 dBm
    signal_db: rand(-60, 3),
    // Data rate: ~150 Mbps downlink
    data_rate_kbps: rand(150000, 5000),
  };
}

/**
 * Simple eclipse predictor: ISS is in eclipse when sun angle
 * relative to orbital plane puts the satellite in Earth's shadow.
 * We simplify: ~35 min per orbit in eclipse (roughly 38%).
 */
function isInEclipse(currentOrbitFraction: number): boolean {
  // Eclipse roughly when orbit fraction is in [0.55, 0.82]
  return currentOrbitFraction >= 0.55 && currentOrbitFraction <= 0.82;
}

/**
 * Time to next sunrise/sunset in seconds.
 */
function timeToEclipseEvent(
  currentOrbitFraction: number
): { event: "sunrise" | "sunset"; seconds: number } {
  const eclipseStart = 0.55;
  const eclipseEnd = 0.82;

  if (currentOrbitFraction >= eclipseStart && currentOrbitFraction <= eclipseEnd) {
    // Currently in eclipse — next event is sunrise
    const fractionToSunrise = eclipseEnd - currentOrbitFraction;
    return {
      event: "sunrise",
      seconds: fractionToSunrise * ORBIT_PERIOD_S,
    };
  }

  // Currently in sunlight — next event is sunset
  const fractionToSunset = eclipseStart - currentOrbitFraction;
  return {
    event: "sunset",
    seconds: (fractionToSunset > 0 ? fractionToSunset : 1 - currentOrbitFraction + eclipseStart) * ORBIT_PERIOD_S,
  };
}

// ── Ground Station Visibility ──────────────────────────────────────────────

const GROUND_STATIONS = [
  { id: "houston", name: "Houston", lat: 29.76, lon: -95.37 },
  { id: "canberra", name: "Canberra", lat: -35.28, lon: 149.13 },
  { id: "kourou", name: "Kourou", lat: 5.16, lon: -52.65 },
  { id: "svalbard", name: "Svalbard", lat: 78.23, lon: 15.39 },
];

/**
 * Simplified visibility check: station can see ISS if
 * the great-circle distance is < ~2000 km (approximate horizon).
 */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeStationVisibility(
  issLat: number,
  issLon: number
): { station: string; distance_km: number; visible: boolean }[] {
  return GROUND_STATIONS.map((gs) => {
    const dist = haversineKm(issLat, issLon, gs.lat, gs.lon);
    return {
      station: gs.name,
      distance_km: Math.round(dist),
      visible: dist < 2000,
    };
  });
}

// ── HTTP + Socket.IO Server ────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "telemetry-ws" }));
    return;
  }
  // Let Socket.IO handle everything else
  if (!req.url?.startsWith("/socket.io")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

const io = new Server(httpServer, {
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── Socket.IO Handlers ─────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(
    `[telemetry-ws] Client connected: ${socket.id} (total: ${io.engine.clientsCount})`
  );

  // Send initial telemetry immediately
  const now = Date.now();
  const pos = computePosition(now);
  const elapsedS = (now - SIM_START) / 1000;
  const fraction = ((elapsedS / ORBIT_PERIOD_S) % 1 + 1) % 1;
  const eclipse = isInEclipse(fraction);
  const vel = computeVelocity(elapsedS, fraction);
  const subs = computeSubsystems(eclipse, elapsedS * 0.01);
  const vis = computeStationVisibility(pos.lat, pos.lon);

  const telemetry: TelemetryPayload = {
    norad_id: 25544,
    satellite: "ISS (ZARYA)",
    position: { lat: pos.lat, lon: pos.lon, alt_km: pos.alt_km },
    velocity: vel,
    subsystems: subs,
    orbit_number: pos.orbitNumber,
    in_eclipse: eclipse,
    timestamp: new Date(now).toISOString(),
  };

  socket.emit("telemetry", telemetry);
  socket.emit("station-visibility", vis);

  socket.on("disconnect", (reason) => {
    console.log(
      `[telemetry-ws] Client disconnected: ${socket.id} (${reason})`
    );
  });

  socket.on("error", (err) => {
    console.error(`[telemetry-ws] Socket error (${socket.id}):`, err);
  });
});

// ── Telemetry Broadcast Loop (every 2 seconds) ─────────────────────────────

const TELEMETRY_INTERVAL_MS = 2000;

function broadcastTelemetry() {
  const now = Date.now();
  const pos = computePosition(now);
  const elapsedS = (now - SIM_START) / 1000;
  const fraction = ((elapsedS / ORBIT_PERIOD_S) % 1 + 1) % 1;
  const eclipse = isInEclipse(fraction);
  const vel = computeVelocity(elapsedS, fraction);
  const subs = computeSubsystems(eclipse, elapsedS * 0.01);
  const vis = computeStationVisibility(pos.lat, pos.lon);
  const eclipseEvent = timeToEclipseEvent(fraction);

  const telemetry: TelemetryPayload = {
    norad_id: 25544,
    satellite: "ISS (ZARYA)",
    position: { lat: pos.lat, lon: pos.lon, alt_km: pos.alt_km },
    velocity: vel,
    subsystems: subs,
    orbit_number: pos.orbitNumber,
    in_eclipse: eclipse,
    timestamp: new Date(now).toISOString(),
  };

  io.emit("telemetry", telemetry);
  io.emit("station-visibility", vis);
  io.emit("eclipse-event", {
    in_eclipse: eclipse,
    next_event: eclipseEvent.event,
    seconds_to_event: Math.round(eclipseEvent.seconds),
  });
}

setInterval(broadcastTelemetry, TELEMETRY_INTERVAL_MS);

// ── Start Server ───────────────────────────────────────────────────────────

const PORT = 3010;
httpServer.listen(PORT, () => {
  console.log(`[telemetry-ws] ISS Telemetry service running on port ${PORT}`);
  console.log(`[telemetry-ws] Broadcasting every ${TELEMETRY_INTERVAL_MS}ms`);
  console.log(`[telemetry-ws] NORAD 25544 — ISS (ZARYA) — ${INCLINATION_DEG}° inclination`);
});

// ── Graceful Shutdown ──────────────────────────────────────────────────────

function shutdown(signal: string) {
  console.log(`[telemetry-ws] Received ${signal}, shutting down...`);
  io.disconnectSockets(true);
  httpServer.close(() => {
    console.log("[telemetry-ws] Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));