import { NextRequest, NextResponse } from "next/server";

// Gravitational parameter (Earth) in km³/s²
const MU = 398600.4418;
// Earth radius in km
const R_EARTH = 6371;

// Regime definitions: satellite name → base altitude km
const REGIME_MAP: Record<string, number> = {
  ISS: 408,
  "ISS (25544)": 408,
  "25544": 408,
  HUBBLE: 540,
  "HUBBLE (20580)": 540,
  "20580": 540,
  STARLINK: 550,
  GPS: 20200,
  "GPS (PRN)": 20200,
  GLONASS: 19100,
  GALILEO: 23222,
  INMARSAT: 35786,
  "INMARSAT (3F)": 35786,
  GOES: 35786,
  "GOES-16": 35786,
};

function getBaseAltitude(satellite: string): number {
  const upper = satellite.toUpperCase();
  // Check exact matches first
  if (REGIME_MAP[upper] !== undefined) return REGIME_MAP[upper];
  // Check keyword matches
  if (upper.includes("ISS") || upper.includes("25544")) return 408;
  if (upper.includes("STARLINK") || upper.includes("FALCON")) return 550;
  if (upper.includes("HUBBLE") || upper.includes("20580")) return 540;
  if (upper.includes("GPS") || upper.includes("NAVSTAR")) return 20200;
  if (upper.includes("GLONASS")) return 19100;
  if (upper.includes("GALILEO")) return 23222;
  if (upper.includes("INMARSAT") || upper.includes("GOES") || upper.includes("GEO")) return 35786;
  // Default LEO
  return 408;
}

// Seeded pseudo-random for consistent data within a request
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const satellite = searchParams.get("satellite") ?? "ISS (25544)";
  const points = Math.min(Math.max(parseInt(searchParams.get("points") ?? "60", 10), 1), 360);

  const baseAlt = getBaseAltitude(satellite);
  const now = Date.now();
  const seed = Math.floor(now / 3000); // Changes every 3 seconds for streaming effect
  const rand = seededRandom(seed + satellite.length * 7);

  // Determine regime for power model
  const isLEO = baseAlt < 2000;
  const isMEO = baseAlt >= 2000 && baseAlt < 30000;
  const isGEO = baseAlt >= 30000;

  // Solar power base (W) depends on regime
  const solarBase = isLEO ? 120 : isMEO ? 85 : 100;
  const batteryBase = isLEO ? 95 : isMEO ? 88 : 92;

  // Eclipse period in minutes (LEO ~45min orbit)
  const eclipsePeriodMin = isLEO ? 45 : isMEO ? 720 : 1440;
  const eclipseFraction = isLEO ? 0.35 : isMEO ? 0.4 : isGEO ? 0.02 : 0;

  const data = [];
  let temp = 20;
  let signal = -80;
  let battery = batteryBase;

  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now - (points - 1 - i) * 60000).toISOString();

    // Altitude: base + small random variation (±2km for LEO, ±5 for MEO, ±10 for GEO)
    const altVariation = isLEO ? 2 : isMEO ? 5 : 10;
    const altitude = baseAlt + (rand() - 0.5) * 2 * altVariation;

    // Velocity from vis-viva: v = sqrt(mu / (R + h))
    const velocity = Math.sqrt(MU / (R_EARTH + altitude));

    // Temperature: random walk around 20°C ± 15
    temp += (rand() - 0.5) * 3;
    temp = Math.max(5, Math.min(45, 20 + (temp - 20) * 0.95));
    const temperature = parseFloat(temp.toFixed(1));

    // Power: solar with eclipse dips
    const orbitPhase = ((i * 1) % eclipsePeriodMin) / eclipsePeriodMin;
    const inEclipse = orbitPhase > (1 - eclipseFraction / 2) && orbitPhase < (1 + eclipseFraction / 2);
    const power = inEclipse
      ? parseFloat((solarBase * 0.15 + rand() * 5).toFixed(1)) // Battery power
      : parseFloat((solarBase + (rand() - 0.5) * 10).toFixed(1));

    // Signal strength: random walk around -80 ± 10
    signal += (rand() - 0.5) * 4;
    signal = Math.max(-100, Math.min(-60, -80 + (signal - -80) * 0.9));
    const sigVal = parseFloat(signal.toFixed(1));

    // Battery: slow discharge/charge cycle
    if (inEclipse) {
      battery -= 0.3 + rand() * 0.2;
    } else {
      battery += 0.2 + rand() * 0.15;
    }
    battery = Math.max(10, Math.min(100, battery));
    const batteryPct = parseFloat(battery.toFixed(1));

    data.push({
      timestamp,
      altitude: parseFloat(altitude.toFixed(2)),
      velocity: parseFloat(velocity.toFixed(3)),
      temperature,
      power,
      signal: sigVal,
      battery: batteryPct,
    });
  }

  return NextResponse.json({
    satellite,
    regime: isLEO ? "LEO" : isMEO ? "MEO" : "GEO",
    base_altitude_km: baseAlt,
    num_points: data.length,
    generated_at: new Date().toISOString(),
    data,
  });
}