"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Activity,
  ArrowUpDown,
  AlertTriangle,
  Zap,
  Thermometer,
  Radio,
  ArrowDownToLine,
  Terminal,
  Search,
  CheckCircle,
  XCircle,
  HelpCircle,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionHeader } from "./SectionHeader";

// ── Types ──────────────────────────────────────────────────────────────────

type Decision = "ALLOW" | "BLOCK" | "NEEDS_REVIEW";

interface ExampleClaim {
  claim: string;
  expected: Decision;
}

interface GateRule {
  id: string;
  name: string;
  icon: LucideIcon;
  oneLiner: string;
  inputs: { name: string; type: string; validRange: string; description: string }[];
  decisionRules: {
    allow: string;
    block: string;
    needsReview: string;
  };
  physicsModel: string;
  limitations: string[];
  examples: ExampleClaim[];
  stats: { allow: number; block: number; review: number };
}

// ── Gate Data ──────────────────────────────────────────────────────────────

const GATE_RULES: GateRule[] = [
  {
    id: "tle",
    name: "TLE Gate",
    icon: FileText,
    oneLiner:
      "Validates Two-Line Element sets against NORAD format specifications and physical bounds.",
    inputs: [
      {
        name: "line1",
        type: "string",
        validRange: "69 chars, NORAD format",
        description: "First line of the TLE set (classification, epoch, B* drag)",
      },
      {
        name: "line2",
        type: "string",
        validRange: "69 chars, NORAD format",
        description:
          "Second line of the TLE set (inclination, RAAN, eccentricity, argument of perigee, mean anomaly, mean motion)",
      },
    ],
    decisionRules: {
      allow:
        "NORAD checksum valid, line length = 69, eccentricity ∈ [0, 1), inclination ∈ [0°, 180°], mean motion ∈ [0.5, 17] rev/day, drag coefficient ∈ [-1, 1], valid epoch format",
      block:
        "Checksum mismatch, invalid line length, eccentricity ≥ 1 or < 0, inclination out of [0, 180], mean motion out of [0.5, 17], drag coefficient out of [-1, 1]",
      needsReview:
        "All format checks pass but epoch is stale (> 30 days old) or near-boundary values",
    },
    physicsModel:
      "Keplerian element validation against NORAD TLE format specification. Checks that the six classical orbital elements define a physically possible bound orbit. Epoch parsing follows the YYDDD.DDDDDDDD format. Checksum uses weighted sum of characters 1-68 modulo 10.",
    limitations: [
      "Does not validate whether the TLE describes the correct satellite (only format + bounds)",
      "Cannot detect subtly corrupted TLEs that pass checksum but have wrong values",
      "Stale TLE epoch check uses a fixed 30-day threshold regardless of orbit regime",
      "Does not validate classified TLEs or special element set formats (e.g., 3-line)",
      "No cross-referencing with external satellite catalogs",
    ],
    examples: [
      {
        claim:
          "ISS (ZARYA) with valid TLE: 1 25544U 98067A 24001.50000000 .00016717 00000-0 10270-3 0 9003",
        expected: "ALLOW",
      },
      {
        claim:
          "TLE with eccentricity 1.5 — claims a stable circular orbit at 400 km",
        expected: "BLOCK",
      },
      {
        claim:
          "TLE with epoch from 6 months ago, all format checks pass otherwise",
        expected: "NEEDS_REVIEW",
      },
    ],
    stats: { allow: 12, block: 6, review: 2 },
  },
  {
    id: "sgp4",
    name: "SGP4 Gate",
    icon: Activity,
    oneLiner:
      "Runs SGP4 propagation and checks for numerical stability, convergence, and physical plausibility.",
    inputs: [
      {
        name: "tle",
        type: "TLE set",
        validRange: "Valid TLE (validated by TLE Gate)",
        description: "Two-Line Element set for the satellite to propagate",
      },
      {
        name: "duration",
        type: "number",
        validRange: "0.1 – 1440 min",
        description: "Total propagation time span in minutes",
      },
      {
        name: "step_size",
        type: "number",
        validRange: "10 – 600 sec",
        description: "Time step between propagated positions",
      },
    ],
    decisionRules: {
      allow:
        "All positions finite (no NaN/Inf), propagated period matches TLE mean motion within 5%, altitude within expected regime bounds (LEO: 100–2000 km, MEO: 2000–35786 km, GEO: 35786±200 km), speed 6–11 km/s for LEO, error rate < 1%",
      block:
        "NaN or Inf in any propagated position, altitude drops below 80 km (reentry), perigee below 100 km, speed outside physical bounds",
      needsReview:
        "Slight orbital drift detected (> 1% period error but < 5%), or altitude at regime boundary",
    },
    physicsModel:
      "Simplified General Perturbations 4 (SGP4) propagator implementing the analytic two-body + J2 zonal harmonic model. Computes ECI position/velocity as a function of time from TLE mean elements. Includes atmospheric drag corrections via the B* drag term and accounts for deep-space effects for orbits with period > 225 min.",
    limitations: [
      "SGP4 is a simplified perturbation model — not suitable for high-precision propagation",
      "Accuracy degrades for high-eccentricity orbits (e > 0.1) and very low altitudes (< 200 km)",
      "Does not model third-body perturbations (Moon, Sun) or solar radiation pressure explicitly",
      "Convergence check is basic (period match) — doesn't validate ground track accuracy",
      "Cannot detect long-term secular drift beyond the propagation window",
    ],
    examples: [
      {
        claim:
          "ISS position propagated 24h via SGP4 — stable trajectory, period 92.9 min, altitude 414–434 km",
        expected: "ALLOW",
      },
      {
        claim:
          "LEO satellite with perigee below 100 km after propagation — reentry imminent",
        expected: "BLOCK",
      },
      {
        claim:
          "MEO satellite propagation shows 2% period drift from TLE mean motion",
        expected: "NEEDS_REVIEW",
      },
    ],
    stats: { allow: 10, block: 8, review: 2 },
  },
  {
    id: "delta-v",
    name: "Delta-V Gate",
    icon: ArrowUpDown,
    oneLiner:
      "Verifies orbital maneuver delta-v budgets against Tsiolkovsky equation with realistic Isp and mass fraction constraints.",
    inputs: [
      {
        name: "initial_alt",
        type: "number",
        validRange: "100 – 200,000 km",
        description: "Initial orbit altitude in km above Earth surface",
      },
      {
        name: "final_alt",
        type: "number",
        validRange: "100 – 200,000 km",
        description: "Target orbit altitude in km above Earth surface",
      },
      {
        name: "Isp",
        type: "number",
        validRange: "150 – 500 s",
        description: "Specific impulse of the propulsion system in seconds",
      },
      {
        name: "mass_fraction",
        type: "number",
        validRange: "0.05 – 0.90",
        description:
          "Propellant mass fraction (propellant mass / total mass)",
      },
      {
        name: "claimed_dv",
        type: "number",
        validRange: "0.01 – 20 km/s",
        description: "The delta-v value claimed in the orbital maneuver",
      },
    ],
    decisionRules: {
      allow:
        "Claimed Δv is within 20% of the theoretical minimum (Hohmann transfer Δv). Rocket equation Δv = Isp × g₀ × ln(1/(1-mf)) must be physically achievable with given Isp and mass fraction.",
      block:
        "Claimed Δv exceeds theoretical minimum by > 50% (wasteful but possibly wrong), or exceeds rocket equation maximum, or physically impossible (e.g., LEO-to-GEO in 0.5 km/s)",
      needsReview:
        "Claimed Δv is 20–50% above Hohmann minimum (could be multi-burn, plane change, or just inefficient)",
    },
    physicsModel:
      "Tsiolkovsky rocket equation: Δv = Isp × g₀ × ln(1/(1-mf)), where g₀ = 9.80665 m/s². Hohmann transfer Δv: Δv_H = √(μ/r₁) × (√(2r₂/(r₁+r₂)) - 1) + √(μ/r₂) × (1 - √(2r₁/(r₁+r₂))), where μ = 398600.4418 km³/s² is Earth's gravitational parameter. Compares claimed Δv against both the Hohmann minimum and the rocket equation maximum.",
    limitations: [
      "Only computes impulsive Hohmann transfers — does not model low-thrust spirals, bi-elliptic transfers, or plane changes",
      "Does not account for gravity losses during finite burns",
      "Assumes circular initial and final orbits — eccentric orbits need different analysis",
      "Multi-burn maneuvers are reduced to a single Δv comparison",
      "Isp and mass fraction are assumed but not validated against real hardware specs",
    ],
    examples: [
      {
        claim:
          "Hohmann transfer from 400 km to 800 km: Δv ≈ 0.33 km/s with Isp 320s, mass fraction 0.15",
        expected: "ALLOW",
      },
      {
        claim:
          "Direct GEO insertion from LEO with 0.5 km/s total Δv",
        expected: "BLOCK",
      },
      {
        claim:
          "Plane change + altitude raise from 400 km to 1200 km: Δv = 1.8 km/s (theoretical Hohmann only = 1.2 km/s)",
        expected: "NEEDS_REVIEW",
      },
    ],
    stats: { allow: 8, block: 5, review: 3 },
  },
  {
    id: "collision",
    name: "Collision Gate",
    icon: AlertTriangle,
    oneLiner:
      "Evaluates close approach probabilities using simplified conjunction geometry and minimum safe distance thresholds.",
    inputs: [
      {
        name: "obj1_pos",
        type: "vec3 [km]",
        validRange: "Any ECI position",
        description: "Position vector of the first object in ECI coordinates",
      },
      {
        name: "obj2_pos",
        type: "vec3 [km]",
        validRange: "Any ECI position",
        description: "Position vector of the second object in ECI coordinates",
      },
      {
        name: "separation_km",
        type: "number",
        validRange: "0 – 100,000 km",
        description: "Minimum separation distance between the two objects at TCA",
      },
      {
        name: "relative_velocity",
        type: "number",
        validRange: "0.01 – 16 km/s",
        description: "Relative velocity at time of closest approach in km/s",
      },
    ],
    decisionRules: {
      allow:
        "Separation > safe_distance, where safe_distance = max(5 km, 10 × √(TCA_uncertainty)). Combined collision probability is negligible (< 10⁻⁶).",
      block:
        "Separation < 1 km — imminent collision risk regardless of covariance. Relative velocity and geometry indicate high probability of impact.",
      needsReview:
        "Separation in the 1–5 km range — below typical safe distance but above hard block threshold. Requires covariance data for proper probability assessment.",
    },
    physicsModel:
      "Safe distance model: d_safe = max(5 km, 10 × σ_TCA), where σ_TCA is the position uncertainty at time of closest approach. Collision probability: P_c ∝ f(separation, combined RCS, relative_velocity) using a simplified 2D Gaussian collision probability model. The gate does not compute full Monte Carlo covariance propagation.",
    limitations: [
      "Uses a simplified collision probability model — not a full covariance-based conjunction analysis",
      "Does not perform Monte Carlo uncertainty propagation",
      "Assumes circular covariance (real covariances are often elongated)",
      "No account for object size / physical cross-section beyond a nominal RCS assumption",
      "Cannot detect secondary conjunctions or chain reactions",
      "TCA uncertainty must be provided — gate does not compute it from ephemeris covariances",
    ],
    examples: [
      {
        claim:
          "Two LEO objects at 500 km separation — no conjunction risk",
        expected: "ALLOW",
      },
      {
        claim:
          "Objects separated by 0.5 km with relative velocity 12 km/s — claims no collision risk",
        expected: "BLOCK",
      },
      {
        claim:
          "Close approach at 3 km separation with unknown covariance data",
        expected: "NEEDS_REVIEW",
      },
    ],
    stats: { allow: 9, block: 6, review: 2 },
  },
  {
    id: "power",
    name: "Power Gate",
    icon: Zap,
    oneLiner:
      "Checks solar array power generation against eclipse duration, panel degradation, and bus power budget.",
    inputs: [
      {
        name: "solar_power_W",
        type: "number",
        validRange: "0.1 – 100,000 W",
        description: "Solar array power output in Watts (at BOL, 1 AU)",
      },
      {
        name: "eclipse_duration_min",
        type: "number",
        validRange: "0 – 70 min",
        description: "Maximum eclipse duration per orbit in minutes",
      },
      {
        name: "bus_power_W",
        type: "number",
        validRange: "0.1 – 50,000 W",
        description: "Spacecraft bus power consumption in Watts",
      },
      {
        name: "panel_degradation_pct",
        type: "number",
        validRange: "0 – 50%",
        description: "Solar panel degradation percentage (aging, radiation damage)",
      },
    ],
    decisionRules: {
      allow:
        "Energy margin > 10%. Energy available = solar_power × (1 - degradation) × (orbit_period - eclipse) × efficiency must exceed bus_power × eclipse_duration by > 10%.",
      block:
        "Negative energy margin — cannot sustain bus power through eclipse. Battery would deplete each orbit.",
      needsReview:
        "Energy margin between 0–10% — technically sufficient but no buffer for degradation, off-nominal attitudes, or seasonal variation.",
    },
    physicsModel:
      "Energy balance per orbit: E_sun = P_solar × (1 - deg) × η × T_sun, where η is power system efficiency (~0.85), T_sun = orbit_period - eclipse. E_eclipse = P_bus × T_eclipse. Margin = (E_sun - E_eclipse) / E_eclipse. Orbit period from Kepler's third law: T = 2π√(a³/μ). Eclipse fraction estimated from orbit altitude and Sun geometry.",
    limitations: [
      "Assumes constant bus power — does not model power modes (safe mode, payload on/off)",
      "Eclipse duration is an input, not computed from actual Sun-satellite geometry",
      "Does not model battery charge/discharge efficiency (assumed 100% round-trip)",
      "Single-axis or fixed panel orientation assumed — does not account for tracking losses",
      "No seasonal or beta angle variation in eclipse duration",
      "Does not validate solar cell type or temperature coefficients",
    ],
    examples: [
      {
        claim:
          "3U CubeSat: 10W solar array, 35min eclipse, 5W bus power, 5% degradation — sufficient power",
        expected: "ALLOW",
      },
      {
        claim:
          "Satellite with 5W panels, 60min eclipse, 50W bus power — sufficient power budget",
        expected: "BLOCK",
      },
      {
        claim:
          "6U CubeSat: 20W panels, 35min eclipse, 18W bus, 10% degradation — marginal at 3% margin",
        expected: "NEEDS_REVIEW",
      },
    ],
    stats: { allow: 10, block: 4, review: 2 },
  },
  {
    id: "thermal",
    name: "Thermal Gate",
    icon: Thermometer,
    oneLiner:
      "Validates thermal equilibrium models, heater power, and radiator sizing for orbital thermal environments.",
    inputs: [
      {
        name: "heater_power_W",
        type: "number",
        validRange: "0 – 10,000 W",
        description: "Spacecraft heater power capacity in Watts",
      },
      {
        name: "radiator_area_m2",
        type: "number",
        validRange: "0.001 – 100 m²",
        description: "Radiator surface area for heat rejection in m²",
      },
      {
        name: "min_temp_K",
        type: "number",
        validRange: "150 – 350 K",
        description: "Minimum allowable spacecraft temperature in Kelvin",
      },
      {
        name: "max_temp_K",
        type: "number",
        validRange: "250 – 500 K",
        description: "Maximum allowable spacecraft temperature in Kelvin",
      },
      {
        name: "environment_temp_K",
        type: "number",
        validRange: "150 – 400 K",
        description: "Expected orbital environment temperature in Kelvin",
      },
    ],
    decisionRules: {
      allow:
        "Thermal equilibrium temperature falls within [min_temp, max_temp] range with stable margin. Radiator can reject all heat loads. Heater can maintain temperature during eclipse.",
      block:
        "Equilibrium temperature is outside the allowable range — either too hot (insufficient radiator) or too cold (insufficient heater).",
      needsReview:
        "Equilibrium temperature is within ±5K of the boundary — marginal thermal stability. Sensitive to parameter variations.",
    },
    physicsModel:
      "Steady-state thermal balance: Q_heater + Q_solar - Q_radiator = 0 at equilibrium. Radiator heat rejection: Q_rad = ε × σ × A_rad × (T_eq⁴ - T_env⁴), where ε is emissivity (~0.85), σ = 5.67×10⁻⁸ W/(m²·K⁴) is the Stefan-Boltzmann constant. Solves for T_eq and checks bounds.",
    limitations: [
      "Steady-state analysis only — does not model transient thermal response",
      "Assumes uniform spacecraft temperature — no nodal thermal network",
      "Does not model internal heat generation from electronics",
      "Solar heating input is simplified (constant flux, no albedo/Earth IR)",
      "Does not account for thermal mass or time constants during eclipse transitions",
      "Single radiator node — cannot model multi-zone thermal architectures",
    ],
    examples: [
      {
        claim:
          "SSO satellite: heater 50W, radiator 0.5 m², temp range -40°C to +80°C, env -150°C — stable equilibrium at +15°C",
        expected: "ALLOW",
      },
      {
        claim:
          "Satellite with no heater, radiator 0.01 m², env -150°C — claims stable 20°C",
        expected: "BLOCK",
      },
      {
        claim:
          "CubeSat: heater 5W, radiator 0.05 m², temp range -20°C to +50°C — equilibrium at -18°C (2K above min)",
        expected: "NEEDS_REVIEW",
      },
    ],
    stats: { allow: 9, block: 5, review: 2 },
  },
  {
    id: "comms",
    name: "Comms Gate",
    icon: Radio,
    oneLiner:
      "Verifies link budget calculations including path loss, antenna gain, data rate, and ground station availability.",
    inputs: [
      {
        name: "frequency_Hz",
        type: "number",
        validRange: "1 MHz – 40 GHz",
        description: "Carrier frequency in Hertz",
      },
      {
        name: "tx_power_W",
        type: "number",
        validRange: "0.001 – 10,000 W",
        description: "Transmitter output power in Watts",
      },
      {
        name: "antenna_gain_dBi",
        type: "number",
        validRange: "-10 – 60 dBi",
        description: "Combined transmit + receive antenna gain in dBi",
      },
      {
        name: "range_km",
        type: "number",
        validRange: "100 – 500,000 km",
        description: "Slant range to ground station in km",
      },
      {
        name: "data_rate_bps",
        type: "number",
        validRange: "100 – 1,000,000,000 bps",
        description: "Required data throughput in bits per second",
      },
      {
        name: "elevation_deg",
        type: "number",
        validRange: "0 – 90°",
        description: "Minimum elevation angle for ground station visibility",
      },
    ],
    decisionRules: {
      allow:
        "Link margin > 6 dB. Received power = TX_power (dBW) + antenna_gain (dBi) - FSPL (dB) exceeds receiver sensitivity by > 6 dB. Data rate achievable at the Eb/N0.",
      block:
        "Negative link margin — received signal is below receiver sensitivity. Communication impossible at claimed parameters.",
      needsReview:
        "Link margin between 0–6 dB — theoretically possible but unreliable. Susceptible to weather, interference, and pointing losses.",
    },
    physicsModel:
      "Free-Space Path Loss: FSPL = 20 × log₁₀(4π × d / λ) dB, where λ = c / f. Received power: P_rx = P_tx + G_tx + G_rx - FSPL (all in dB/dBW/dBi). Link margin: M = P_rx - S_min, where S_min is receiver sensitivity. Checks if sufficient Eb/N0 is available for the claimed data rate: Eb/N0 = P_rx - 10×log₁₀(R) - kT (dB).",
    limitations: [
      "Free-space path loss only — does not model atmospheric attenuation, rain fade, or ionospheric scintillation",
      "Assumes perfect antenna pointing — no pointing loss margin included",
      "Does not model Doppler shift or frequency stability requirements",
      "Ground station availability is not computed from pass geometry",
      "No interference modeling (adjacent channel, co-channel)",
      "Polarization mismatch losses not included",
    ],
    examples: [
      {
        claim:
          "S-band (2.2 GHz): 10W TX, 3dBi antenna, 600km range — link margin 12 dB",
        expected: "ALLOW",
      },
      {
        claim:
          "UHF link budget: 0.1W TX, -5dBi antenna, 2000km range — claims 15dB margin",
        expected: "BLOCK",
      },
      {
        claim:
          "X-band (8 GHz): 5W TX, 20dBi antenna, 1500km range — margin 3 dB",
        expected: "NEEDS_REVIEW",
      },
    ],
    stats: { allow: 10, block: 5, review: 2 },
  },
  {
    id: "deorbit",
    name: "Deorbit Gate",
    icon: ArrowDownToLine,
    oneLiner:
      "Checks deorbit/reentry compliance with 25-year post-mission disposal guideline and casualty risk.",
    inputs: [
      {
        name: "altitude_km",
        type: "number",
        validRange: "100 – 200,000 km",
        description: "Current or planned orbit altitude in km",
      },
      {
        name: "ballistic_coefficient",
        type: "number",
        validRange: "10 – 500 kg/m²",
        description:
          "Ballistic coefficient (mass / drag_area) — higher means slower decay",
      },
      {
        name: "years_remaining",
        type: "number",
        validRange: "0 – 200 years",
        description: "Estimated years until natural reentry",
      },
      {
        name: "casualty_risk",
        type: "number",
        validRange: "0 – 1",
        description:
          "Probability of human casualty from reentry debris (must be < 0.0001 per NASA/USG guidelines)",
      },
    ],
    decisionRules: {
      allow:
        "Compliant with 25-year disposal rule (natural decay ≤ 25 years OR active disposal plan exists). Casualty risk < 1×10⁻⁴. Low-altitude orbits (< 600 km) with reasonable ballistic coefficient typically pass.",
      block:
        "Non-compliant: natural decay > 25 years with no active disposal plan. Casualty risk ≥ 1×10⁻⁴. GEO satellites without end-of-life graveyard maneuver plan.",
      needsReview:
        "Borderline compliance: natural decay estimated at 20–30 years. Uncertain ballistic coefficient. Disposal plan exists but lacks verified capability.",
    },
    physicsModel:
      "Natural decay estimation from atmospheric drag: decay rate ∝ 1/B.C. × ρ(h), where ρ(h) is atmospheric density at altitude h (exponential model). 25-year rule compliance: check if estimated reentry time ≤ 25 years for post-mission orbit. Casualty risk model: P_casualty = Σ (P_survive,i × A_impact,i × ρ_pop) for each debris fragment.",
    limitations: [
      "Atmospheric density model is simplified (exponential) — does not use NRLMSISE-00 or JB2008",
      "Solar activity (which heavily affects drag) is assumed at moderate levels",
      "Does not verify disposal plan feasibility — only checks existence",
      "Casualty risk estimation is simplified (no full DAS/DRAMA reentry analysis)",
      "Does not model controlled reentry trajectories",
      "GEO graveyard orbit insertion Δv is not computed or verified",
    ],
    examples: [
      {
        claim:
          "LEO satellite at 400 km, B.C. 100 kg/m² — natural decay < 25 years, compliant",
        expected: "ALLOW",
      },
      {
        claim:
          "GEO satellite at 35786 km with no deorbit plan — claims compliant",
        expected: "BLOCK",
      },
      {
        claim:
          "Satellite at 650 km, B.C. 80 kg/m² — estimated decay 22 years",
        expected: "NEEDS_REVIEW",
      },
    ],
    stats: { allow: 8, block: 6, review: 2 },
  },
  {
    id: "command",
    name: "Command Gate",
    icon: Terminal,
    oneLiner:
      "Blocks any claims that suggest sending real commands to spacecraft — OrbitGate is read-only verification only.",
    inputs: [
      {
        name: "command_sequence",
        type: "string",
        validRange: "N/A",
        description: "The text of the claim being verified",
      },
      {
        name: "target_spacecraft",
        type: "string",
        validRange: "N/A",
        description:
          "Named spacecraft in the claim (if any) — used for pattern matching",
      },
    ],
    decisionRules: {
      allow: "Never — this gate always returns BLOCK or NEEDS_REVIEW for command-like claims. Pure informational or verification claims about commands (not issuing them) may pass.",
      block:
        "Any claim containing imperative verbs targeting spacecraft: 'fire thruster', 'rotate', 'deploy', 'shutdown', 'switch', 'activate', 'send command', 'execute maneuver', etc.",
      needsReview:
        "Ambiguous claims that could be interpreted as command suggestions or purely descriptive statements about commands.",
    },
    physicsModel:
      "No physics model — this is a policy/safety gate. Uses pattern matching and keyword detection to identify command-like language. OrbitGate's design principle: verification system is always read-only and never exerts control over real spacecraft.",
    limitations: [
      "Relies on keyword/pattern matching — may miss obfuscated or novel command phrasing",
      "Cannot distinguish between 'describing a command' vs 'issuing a command' in all cases",
      "Does not validate command syntax or format for any specific satellite bus",
      "No integration with real command-and-control systems",
      "May produce false positives for educational or hypothetical discussion of commands",
    ],
    examples: [
      {
        claim: "Fire thruster A for 10 seconds to raise the orbit by 50 km",
        expected: "BLOCK",
      },
      {
        claim: "Rotate the spacecraft antenna 45° to acquire the tracking signal",
        expected: "BLOCK",
      },
      {
        claim:
          "The spacecraft's command handler accepts thruster fire sequences in format CMD:A:FIRE:10",
        expected: "NEEDS_REVIEW",
      },
    ],
    stats: { allow: 6, block: 3, review: 1 },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function DecisionBadge({ decision }: { decision: Decision }) {
  const config = {
    ALLOW: {
      className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      icon: CheckCircle,
    },
    BLOCK: {
      className: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      icon: XCircle,
    },
    NEEDS_REVIEW: {
      className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: HelpCircle,
    },
  }[decision];

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="h-3 w-3" />
      {decision}
    </Badge>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function GateRulesReference() {
  const [search, setSearch] = useState("");

  const filteredGates = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return GATE_RULES;
    return GATE_RULES.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.oneLiner.toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <section id="gate-rules" className="py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <SectionHeader
          title="Gate Rules Reference"
          subtitle="Detailed documentation for each of the 9 verification gates — input parameters, decision rules, physics models, limitations, and example claims."
          icon={<BookOpen className="h-6 w-6 text-cyan-400" />}
        />

        {/* Search */}
        <motion.div
          className="max-w-md mx-auto mb-8"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search gates by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900/80 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-cyan-500/20"
            />
          </div>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Accordion type="multiple" className="space-y-2">
            {filteredGates.map((gate, idx) => (
              <AccordionItem
                key={gate.id}
                value={gate.id}
                className="border-gray-200 dark:border-slate-800 bg-slate-900/60 rounded-lg px-4 data-[state=open]:bg-slate-900/90 transition-colors border-l-2 border-l-cyan-500/50 dark:border-l-cyan-500/50"
              >
                {/* Trigger (collapsed view) */}
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800/80 shrink-0 [filter:drop-shadow(0_0_6px_rgba(16,185,129,0.3))]">
                      <gate.icon className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-900 dark:text-white font-semibold text-sm">
                          {gate.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 dark:bg-slate-800 text-gray-400 border-gray-300 dark:border-slate-700 text-[10px]"
                        >
                          {gate.inputs.length} inputs
                        </Badge>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5 truncate">
                        {gate.oneLiner}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-cyan-400 text-xs font-mono">
                        {gate.stats.allow}A
                      </span>
                      <span className="text-gray-700 text-xs">/</span>
                      <span className="text-rose-400 text-xs font-mono">
                        {gate.stats.block}B
                      </span>
                      <span className="text-gray-700 text-xs">/</span>
                      <span className="text-amber-400 text-xs font-mono">
                        {gate.stats.review}R
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>

                {/* Expanded Content */}
                <AccordionContent>
                  <div className="space-y-6 pt-2 pb-2">
                    {/* ── Input Parameters ── */}
                    <Card className="bg-slate-950/60 border-gray-200 dark:border-slate-800">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="text-cyan-400 font-mono text-xs">
                            INPUT
                          </span>
                          Input Parameters
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-gray-200 dark:border-slate-800 hover:bg-transparent">
                                <TableHead className="text-gray-400 text-xs">
                                  Parameter
                                </TableHead>
                                <TableHead className="text-gray-400 text-xs">
                                  Type
                                </TableHead>
                                <TableHead className="text-gray-400 text-xs">
                                  Valid Range
                                </TableHead>
                                <TableHead className="text-gray-400 text-xs">
                                  Description
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {gate.inputs.map((inp) => (
                                <TableRow
                                  key={inp.name}
                                  className="border-slate-800/50"
                                >
                                  <TableCell className="text-cyan-400 font-mono text-xs">
                                    {inp.name}
                                  </TableCell>
                                  <TableCell className="text-gray-400 text-xs">
                                    {inp.type}
                                  </TableCell>
                                  <TableCell className="text-gray-500 text-xs">
                                    {inp.validRange}
                                  </TableCell>
                                  <TableCell className="text-gray-400 text-xs whitespace-normal max-w-xs">
                                    {inp.description}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* ── Decision Rules ── */}
                    <Card className="bg-slate-950/60 border-gray-200 dark:border-slate-800">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="text-cyan-400 font-mono text-xs">
                            RULES
                          </span>
                          Decision Rules
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-3">
                        <div className="space-y-2">
                          {(
                            [
                              {
                                key: "allow" as const,
                                label: "ALLOW",
                                color: "border-l-2 border-l-cyan-400 border-cyan-500/30 bg-cyan-500/5",
                              },
                              {
                                key: "block" as const,
                                label: "BLOCK",
                                color: "border-l-2 border-l-rose-400 border-rose-500/30 bg-rose-500/5",
                              },
                              {
                                key: "needsReview" as const,
                                label: "NEEDS_REVIEW",
                                color: "border-l-2 border-l-amber-400 border-amber-500/30 bg-amber-500/5",
                              },
                            ] as const
                          ).map((rule) => (
                            <div
                              key={rule.key}
                              className={`rounded-md border p-3 ${rule.color}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <DecisionBadge decision={rule.label} />
                              </div>
                              <p className="text-gray-400 text-xs leading-relaxed">
                                {gate.decisionRules[rule.key]}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* ── Physics Model ── */}
                    <Card className="bg-slate-950/60 border-gray-200 dark:border-slate-800">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="text-cyan-400 font-mono text-xs">
                            PHYSICS
                          </span>
                          Physics Model
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <p className="text-gray-400 text-xs leading-relaxed">
                          {gate.physicsModel}
                        </p>
                      </CardContent>
                    </Card>

                    {/* ── Known Limitations ── */}
                    <Card className="bg-slate-950/60 border-gray-200 dark:border-slate-800">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="text-amber-400 font-mono text-xs">
                            LIMITS
                          </span>
                          Known Limitations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ul className="space-y-1.5">
                          {gate.limitations.map((lim, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-xs text-gray-500"
                            >
                              <span className="text-amber-500/60 mt-0.5 shrink-0">
                                •
                              </span>
                              {lim}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* ── Example Claims ── */}
                    <Card className="bg-slate-950/60 border-gray-200 dark:border-slate-800">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="text-cyan-400 font-mono text-xs">
                            EXAMPLES
                          </span>
                          Example Claims
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-2">
                        {gate.examples.map((ex, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 rounded-md border border-slate-800/80 bg-slate-900/40 p-3"
                          >
                            <span className="text-gray-700 font-mono text-[10px] mt-0.5 shrink-0">
                              #{i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed mb-1.5">
                                &ldquo;{ex.claim}&rdquo;
                              </p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-600 text-[10px]">
                                  Expected:
                                </span>
                                <DecisionBadge decision={ex.expected} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {filteredGates.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-sm">
              No gates match &ldquo;{search}&rdquo;
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}