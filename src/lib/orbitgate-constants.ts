// OrbitGate v0 - Mock Data Constants
// This data matches the exact JSON structure the Python CLI will produce.

export type Decision = "ALLOW" | "BLOCK" | "NEEDS_REVIEW" | "EVIDENCE_REQUIRED";
export type RiskLabel =
  | "TLE_VALIDATED"
  | "PHYSICS_COMPLIANT"
  | "RISK_TOO_HIGH"
  | "INSUFFICIENT_DATA"
  | "MATH_ERROR"
  | "UNVERIFIABLE";

export interface GateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface BenchmarkCase {
  case_id: string;
  claim_type: string;
  input: string;
  expected_decision: Decision;
  gate: string;
  risk_label: RiskLabel;
}

export interface ClaimResult {
  claim: string;
  decision: Decision;
  gate: string;
  risk_label: RiskLabel;
  reason: string;
  evidence: string[];
  missing_evidence: string[];
  timestamp: string;
}

export interface Certificate {
  hash: string;
  timestamp: string;
  version: string;
  benchmark_cases: number;
  gates: string[];
  decisions: Record<string, number>;
  note: string;
}

export const GATES: GateInfo[] = [
  {
    id: "TLEGate",
    name: "TLE Gate",
    description:
      "Validates Two-Line Element sets against NORAD format specifications and physical bounds (eccentricity, inclination, altitude).",
    icon: "Satellite",
  },
  {
    id: "SGP4Gate",
    name: "SGP4 Gate",
    description:
      "Runs SGP4 propagation and checks for numerical stability, convergence, and physically plausible orbital trajectories.",
    icon: "Orbit",
  },
  {
    id: "DeltaVGate",
    name: "Delta-V Gate",
    description:
      "Verifies orbital maneuver delta-v budgets against Tsiolkovsky rocket equation with realistic Isp and mass fraction constraints.",
    icon: "Zap",
  },
  {
    id: "CollisionGate",
    name: "Collision Gate",
    description:
      "Evaluates close approach probabilities using simplified conjunction geometry and minimum safe distance thresholds.",
    icon: "ShieldAlert",
  },
  {
    id: "PowerGate",
    name: "Power Gate",
    description:
      "Checks solar array power generation against eclipse duration, panel degradation, and bus power budget requirements.",
    icon: "Battery",
  },
  {
    id: "ThermalGate",
    name: "Thermal Gate",
    description:
      "Validates thermal equilibrium models, heater power requirements, and radiator sizing for orbital thermal environments.",
    icon: "Thermometer",
  },
  {
    id: "CommsGate",
    name: "Comms Gate",
    description:
      "Verifies link budget calculations including path loss, antenna gain, data rate, and availability for ground station passes.",
    icon: "Radio",
  },
  {
    id: "DeorbitGate",
    name: "Deorbit Gate",
    description:
      "Checks deorbit/reentry compliance with 25-year post-mission disposal guideline and casualty risk thresholds.",
    icon: "ArrowDownToLine",
  },
  {
    id: "CommandGate",
    name: "Command Gate",
    description:
      "Blocks any claims that suggest sending real commands to spacecraft — OrbitGate is read-only verification only.",
    icon: "Terminal",
  },
];

export const MOCK_STATUS = {
  status: "ready",
  version: "v0",
  gates: [
    "TLEGate",
    "SGP4Gate",
    "DeltaVGate",
    "CollisionGate",
    "PowerGate",
    "ThermalGate",
    "CommsGate",
    "DeorbitGate",
    "CommandGate",
  ],
  benchmark_cases: 160,
  flight_certified: false,
  real_spacecraft_control: false,
};

export const MOCK_BENCHMARK_SUMMARY = {
  total_cases: 160,
  passed: 82,
  blocked: 48,
  needs_review: 18,
  evidence_required: 12,
};

export const MOCK_BENCHMARK_PER_GATE = [
  { gate: "TLE", passed: 12, blocked: 6, needsReview: 2, evidenceRequired: 0 },
  { gate: "SGP4", passed: 10, blocked: 8, needsReview: 2, evidenceRequired: 0 },
  { gate: "DeltaV", passed: 8, blocked: 5, needsReview: 3, evidenceRequired: 4 },
  { gate: "Collision", passed: 9, blocked: 6, needsReview: 2, evidenceRequired: 3 },
  { gate: "Power", passed: 10, blocked: 4, needsReview: 2, evidenceRequired: 2 },
  { gate: "Thermal", passed: 9, blocked: 5, needsReview: 2, evidenceRequired: 1 },
  { gate: "Comms", passed: 10, blocked: 5, needsReview: 2, evidenceRequired: 1 },
  { gate: "Deorbit", passed: 8, blocked: 6, needsReview: 2, evidenceRequired: 1 },
  { gate: "Command", passed: 6, blocked: 3, needsReview: 1, evidenceRequired: 0 },
];

export const MOCK_BENCHMARK_CASES: BenchmarkCase[] = [
  {
    case_id: "TLE-001",
    claim_type: "tle_validation",
    input: "ISS (ZARYA) with valid TLE: 1 25544U 98067A 24...",
    expected_decision: "ALLOW",
    gate: "TLEGate",
    risk_label: "TLE_VALIDATED",
  },
  {
    case_id: "TLE-002",
    claim_type: "tle_validation",
    input: "TLE with eccentricity 1.5 (hyperbolic) rejected",
    expected_decision: "BLOCK",
    gate: "TLEGate",
    risk_label: "MATH_ERROR",
  },
  {
    case_id: "TLE-003",
    claim_type: "tle_validation",
    input: "TLE with inclination 200° — invalid range",
    expected_decision: "BLOCK",
    gate: "TLEGate",
    risk_label: "MATH_ERROR",
  },
  {
    case_id: "SGP4-001",
    claim_type: "sgp4_propagation",
    input: "ISS position propagated 24h via SGP4 — stable trajectory",
    expected_decision: "ALLOW",
    gate: "SGP4Gate",
    risk_label: "PHYSICS_COMPLIANT",
  },
  {
    case_id: "SGP4-002",
    claim_type: "sgp4_propagation",
    input: "LEO satellite with perigee below 100km — reentry imminent",
    expected_decision: "BLOCK",
    gate: "SGP4Gate",
    risk_label: "RISK_TOO_HIGH",
  },
  {
    case_id: "DV-001",
    claim_type: "delta_v_maneuver",
    input: "Hohmann transfer from 400km to 800km: Δv ≈ 0.33 km/s",
    expected_decision: "ALLOW",
    gate: "DeltaVGate",
    risk_label: "PHYSICS_COMPLIANT",
  },
  {
    case_id: "DV-002",
    claim_type: "delta_v_maneuver",
    input: "Direct GEO insertion from LEO with 0.5 km/s total Δv",
    expected_decision: "BLOCK",
    gate: "DeltaVGate",
    risk_label: "MATH_ERROR",
  },
  {
    case_id: "COL-001",
    claim_type: "collision_assessment",
    input: "Close approach at 15km — below threshold of 5km, conjunction likely",
    expected_decision: "BLOCK",
    gate: "CollisionGate",
    risk_label: "RISK_TOO_HIGH",
  },
  {
    case_id: "COL-002",
    claim_type: "collision_assessment",
    input: "Objects separated by 500km — no conjunction risk",
    expected_decision: "ALLOW",
    gate: "CollisionGate",
    risk_label: "PHYSICS_COMPLIANT",
  },
  {
    case_id: "PWR-001",
    claim_type: "power_budget",
    input: "3U CubeSat: 10W solar array, 35min eclipse, 8Wh battery — sufficient",
    expected_decision: "ALLOW",
    gate: "PowerGate",
    risk_label: "PHYSICS_COMPLIANT",
  },
  {
    case_id: "PWR-002",
    claim_type: "power_budget",
    input: "Large satellite with 5W panels and 60min eclipse — insufficient power",
    expected_decision: "BLOCK",
    gate: "PowerGate",
    risk_label: "RISK_TOO_HIGH",
  },
  {
    case_id: "THR-001",
    claim_type: "thermal_analysis",
    input: "SSO thermal: -150°C to +120°C within component limits",
    expected_decision: "ALLOW",
    gate: "ThermalGate",
    risk_label: "PHYSICS_COMPLIANT",
  },
  {
    case_id: "COM-001",
    claim_type: "comms_link",
    input: "S-band link budget: 10W TX, 3dBi antenna, 600km range — 12dB margin",
    expected_decision: "ALLOW",
    gate: "CommsGate",
    risk_label: "PHYSICS_COMPLIANT",
  },
  {
    case_id: "COM-002",
    claim_type: "comms_link",
    input: "Link budget with -20dB margin — insufficient signal",
    expected_decision: "BLOCK",
    gate: "CommsGate",
    risk_label: "RISK_TOO_HIGH",
  },
  {
    case_id: "DEO-001",
    claim_type: "deorbit_compliance",
    input: "LEO satellite 400km: natural decay <25 years — compliant",
    expected_decision: "ALLOW",
    gate: "DeorbitGate",
    risk_label: "PHYSICS_COMPLIANT",
  },
  {
    case_id: "DEO-002",
    claim_type: "deorbit_compliance",
    input: "GEO satellite with no deorbit plan — non-compliant",
    expected_decision: "BLOCK",
    gate: "DeorbitGate",
    risk_label: "RISK_TOO_HIGH",
  },
  {
    case_id: "CMD-001",
    claim_type: "command_verification",
    input: "Claim: 'fire thruster A for 10 seconds to raise orbit'",
    expected_decision: "BLOCK",
    gate: "CommandGate",
    risk_label: "RISK_TOO_HIGH",
  },
  {
    case_id: "CMD-002",
    claim_type: "command_verification",
    input: "Claim: 'rotate solar panels 30° sunward'",
    expected_decision: "BLOCK",
    gate: "CommandGate",
    risk_label: "RISK_TOO_HIGH",
  },
  {
    case_id: "DV-003",
    claim_type: "delta_v_maneuver",
    input: "Lunar transfer Δv estimate without departure mass",
    expected_decision: "EVIDENCE_REQUIRED",
    gate: "DeltaVGate",
    risk_label: "INSUFFICIENT_DATA",
  },
  {
    case_id: "COL-003",
    claim_type: "collision_assessment",
    input: "Conjunction analysis with unknown covariance data",
    expected_decision: "NEEDS_REVIEW",
    gate: "CollisionGate",
    risk_label: "INSUFFICIENT_DATA",
  },
];

export const MOCK_ALLOWED_CLAIMS = [
  {
    claim: "The ISS orbits at approximately 408 km altitude with 51.6° inclination.",
    gate: "TLEGate",
    reason: "TLE-validated orbital parameters within NORAD bounds.",
  },
  {
    claim: "A Hohmann transfer from 400 km LEO to 800 km requires approximately 0.33 km/s total Δv.",
    gate: "DeltaVGate",
    reason: "Tsiolkovsky equation validated with realistic Isp (320s) and mass ratios.",
  },
  {
    claim: "Solar panels at 1 AU receive approximately 1361 W/m² solar irradiance.",
    gate: "PowerGate",
    reason: "Solar constant verified against standard solar flux model.",
  },
  {
    claim: "A 3U CubeSat in 400 km LEO experiences ~35 minute eclipse per 96 minute orbit.",
    gate: "PowerGate",
    reason: "Eclipse fraction calculated from orbital geometry — physically correct.",
  },
  {
    claim: "Geostationary orbit altitude is approximately 35,786 km above Earth's equator.",
    gate: "TLEGate",
    reason: "GEO altitude derived from Kepler's third law — validated.",
  },
  {
    claim: "S-band (2.2 GHz) free-space path loss at 600 km range is approximately 148 dB.",
    gate: "CommsGate",
    reason: "FSPL calculation: 20log₁₀(4πdf/c) — mathematically verified.",
  },
  {
    claim: "A spacecraft at 400 km LEO with ballistic coefficient 100 kg/m² will deorbit naturally within 25 years.",
    gate: "DeorbitGate",
    reason: "Atmospheric drag decay model shows compliance with 25-year disposal guideline.",
  },
];

export const MOCK_BLOCKED_CLAIMS = [
  {
    claim: "Fire thruster A for 10 seconds to raise the orbit by 50 km.",
    gate: "CommandGate",
    reason: "OrbitGate is read-only verification — never sends commands to spacecraft.",
  },
  {
    claim: "The satellite's TLE shows eccentricity of 1.5, confirming a stable orbit.",
    gate: "TLEGate",
    reason: "Eccentricity ≥ 1.0 indicates hyperbolic (escape) trajectory — not a bound orbit.",
  },
  {
    claim: "Direct insertion from LEO to GEO requires only 0.5 km/s total Δv.",
    gate: "DeltaVGate",
    reason: "Minimum GEO transfer Δv ≈ 3.9 km/s (Hohmann). 0.5 km/s is physically impossible.",
  },
  {
    claim: "The two objects at 2 km separation pose no collision risk.",
    gate: "CollisionGate",
    reason: "2 km is well below typical conjunction threshold (5-10 km) — high collision risk.",
  },
  {
    claim: "A 5W solar array can power a 50W satellite through 60-minute eclipses.",
    gate: "PowerGate",
    reason: "5W × 0.62 sun fraction = 3.1Wh/orbit vs 50Wh needed — 16× deficit.",
  },
  {
    claim: "Rotate the spacecraft antenna 45° to acquire the tracking signal.",
    gate: "CommandGate",
    reason: "OrbitGate is read-only verification — never sends commands to spacecraft.",
  },
  {
    claim: "GEO satellite with no end-of-life disposal plan is compliant.",
    gate: "DeorbitGate",
    reason: "GEO satellites must meet 25-year post-mission disposal guideline — no plan = non-compliant.",
  },
];

export const MOCK_CERTIFICATE: Certificate = {
  hash: "sha256:a3f7e2b1c9d4f8e6a0b5c3d7e1f4a8b2c6d9e3f7a1b4c8d2e5f9a3b6c1d4e7",
  timestamp: "2025-01-15T12:00:00Z",
  version: "v0",
  benchmark_cases: 160,
  gates: [
    "TLEGate",
    "SGP4Gate",
    "DeltaVGate",
    "CollisionGate",
    "PowerGate",
    "ThermalGate",
    "CommsGate",
    "DeorbitGate",
    "CommandGate",
  ],
  decisions: {
    ALLOW: 82,
    BLOCK: 48,
    NEEDS_REVIEW: 18,
    EVIDENCE_REQUIRED: 12,
  },
  note: "RESEARCH PROTOTYPE — Not flight certified. Not for mission-critical decisions.",
};

export const MOCK_CLAIM_RESULT: ClaimResult = {
  claim: "",
  decision: "ALLOW",
  gate: "TLEGate",
  risk_label: "TLE_VALIDATED",
  reason: "Orbital parameters validated against NORAD TLE format specifications.",
  evidence: ["TLE checksum verified", "Eccentricity 0.0001234 within [0, 1)", "Inclination 51.6° within [0, 180]"],
  missing_evidence: [],
  timestamp: new Date().toISOString(),
};