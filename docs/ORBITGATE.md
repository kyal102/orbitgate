# OrbitGate v0 — Deterministic Verification-Gate System for AI-Generated Orbital Claims

> **"Every claim an AI makes about space gets a gate. Every gate produces evidence. Every evidence is replayable."**

---

## Overview / Mission Statement

OrbitGate is a deterministic, gate-based verification system that intercepts and validates every orbital, satellite, and aerospace claim produced by AI models before it reaches a user, dashboard, or downstream system. It does **not** generate claims — it **verifies** them.

The system enforces a strict **Deterministic Trust Loop (DTL)**: AI proposes, OrbitGate routes, Gates verify, Evidence records, Replay checks drift. No claim exits the system without passing through at least one gate and producing an immutable evidence record.

OrbitGate is **research-only software**. It does not control real spacecraft, does not provide flight-certified decisions, and must never replace qualified aerospace engineers, mission-control systems, or certified orbital-dynamics tools (STK, GMAT, Orekit).

---

## Core DTL Flow

```
  ┌──────────┐      ┌────────────┐      ┌─────────────┐      ┌───────────┐      ┌──────────┐
  │  AI /    │      │ OrbitGate  │      │   Gate      │      │ Evidence  │      │  Replay  │
  │  LLM     │─────▶│  Router    │─────▶│  Module(s)  │─────▶│  Pack      │─────▶│  Check   │
  │  Output  │      │            │      │  (verify)   │      │  (record) │      │  (drift) │
  └──────────┘      └────────────┘      └─────────────┘      └───────────┘      └──────────┘
       │                 │                    │                    │                  │
       │  Raw claim      │  Routed by         │  Deterministic    │  Immutable       │  Compare
       │  text/JSON      │  claim type        │  pass/fail        │  evidence        │  past vs
       │                 │                    │  with reason      │  snapshot        │  present
       ▼                 ▼                    ▼                    ▼                  ▼
   "Δv = 3.2 km/s   ──▶  ClaimGate       ──▶  PhysicsGate     ──▶  evidence_001   ──▶  0% drift
    for GTO"              unit_gate           cross-check          .json              ✓
```

### Flow Steps

1. **AI Proposes** — An AI model outputs an orbital claim (e.g., "Delta-v for LEO to GEO is 4.1 km/s").
2. **OrbitGate Routes** — The Router classifies the claim by type and dispatches it to the appropriate gate chain.
3. **Gates Verify** — One or more deterministic gate modules evaluate the claim against known physics, constants, and heuristics.
4. **Evidence Records** — Every gate produces an `EvidencePack` with inputs, outputs, decision label, risk label, and metadata.
5. **Replay Checks Drift** — Previously recorded evidence can be replayed to detect if the system produces different results under the same inputs (non-determinism detection).

---

## Gate Modules

OrbitGate includes **9 deterministic gate modules**:

| # | Gate | Purpose |
|---|------|---------|
| 1 | **ClaimGate** | Parses, classifies, and validates the structure of incoming claims. Enforces claim-type taxonomy. |
| 2 | **PhysicsGate** | Cross-checks orbital mechanics claims against fundamental physics (Kepler's laws, vis-viva, Δv budgets, Tsiolkovsky). |
| 3 | **ConstantsGate** | Validates numerical constants (gravitational parameters, planetary radii, standard atmospheric models) against reference values. |
| 4 | **ScopeGate** | Determines whether a claim falls within OrbitGate's verifiable domain or should be flagged as out-of-scope. |
| 5 | **RiskGate** | Assigns risk labels (LOW, MEDIUM, HIGH, CRITICAL) based on the claim's domain and potential for real-world harm if wrong. |
| 6 | **EvidenceGate** | Generates and stores immutable evidence packs for every verified claim. Ensures full provenance chain. |
| 7 | **ReplayGate** | Re-runs previously verified claims and compares results to detect drift or non-determinism. |
| 8 | **ChipGate** | Validates claims about onboard hardware (reaction wheels, thrusters, solar arrays) against known specifications and constraints. |
| 9 | **JARVI3** | Meta-gate that orchestrates multi-gate pipelines and produces a unified verdict with confidence scoring. |

---

## Decision Labels

Every gate produces one of the following decision labels:

| Label | Meaning |
|-------|---------|
| **ALLOW** | Claim passes all applicable checks. Verified as consistent with known physics/data. |
| **BLOCK** | Claim fails verification. Contradicts known physics, uses wrong constants, or is structurally invalid. |
| **NEEDS_REVIEW** | Claim cannot be automatically verified. Requires human expert review. |
| **EVIDENCE_REQUIRED** | Claim is plausible but lacks sufficient supporting data for automatic verification. |
| **REPLAY_REQUIRED** | Claim was previously verified but must be re-run to confirm no drift. |
| **UNSUPPORTED** | Claim type is recognized but the current version of OrbitGate lacks the logic to verify it. |
| **OUT_OF_SCOPE** | Claim falls outside the domain of orbital/satellite/aerospace verification entirely. |

---

## Risk Labels

| Label | Criteria |
|-------|----------|
| **LOW** | General knowledge claims, educational content, well-established facts with no operational impact. |
| **MEDIUM** | Engineering estimates, back-of-envelope calculations, approximate mission parameters. |
| **HIGH** | Mission-critical parameters (Δv budgets, orbital insertion targets, payload mass fractions). |
| **CRITICAL** | Claims that, if wrong, could lead to mission failure, loss of vehicle, or collision risk. |

---

## Claim Types

OrbitGate recognizes and routes **17 claim types**:

| # | Claim Type | Example | Primary Gate(s) |
|---|-----------|---------|-----------------|
| 1 | `orbit_delta_v` | "Δv from LEO to GEO is 3.9 km/s" | PhysicsGate, ConstantsGate |
| 2 | `orbit_period` | "ISS orbital period is ~92 minutes" | PhysicsGate |
| 3 | `orbit_altitude` | "LEO altitude range is 160–2,000 km" | ConstantsGate, ScopeGate |
| 4 | `orbit_inclination` | "Sun-synchronous orbits are near 98°" | PhysicsGate |
| 5 | `orbit_eccentricity` | "GEO eccentricity must be < 0.0001" | PhysicsGate |
| 6 | `orbit_velocity` | "Circular LEO velocity at 400 km is ~7.67 km/s" | PhysicsGate, ConstantsGate |
| 7 | `orbit_ascending_node` | "RAAN drifts due to J2 perturbation" | PhysicsGate |
| 8 | `orbit_perigee_apogee` | "Molniya orbit perigee ~500 km, apogee ~39,900 km" | PhysicsGate, ConstantsGate |
| 9 | `launch_vehicle_delta_v` | "Falcon 9 delivers ~5.5 km/s to LEO" | PhysicsGate, ChipGate |
| 10 | `launch_vehicle_capacity` | "Starship payload to LEO: ~150 t" | ConstantsGate, ChipGate |
| 11 | `launch_window` | "Mars launch windows occur every ~26 months" | PhysicsGate |
| 12 | `satellite_mass` | "Starlink v2 satellite mass: ~800 kg" | ConstantsGate, ChipGate |
| 13 | `satellite_power` | "ISS solar array power: ~120 kW" | ConstantsGate, ChipGate |
| 14 | `satellite_propulsion` | "Hall-effect thruster Isp: 1,500–2,000 s" | ConstantsGate, ChipGate |
| 15 | `constellation_design` | "Starlink shells at 540, 570, 1150 km" | ConstantsGate, ScopeGate |
| 16 | `debris_risk` | "Kessler syndrome threshold: ~critical density" | RiskGate, PhysicsGate |
| 17 | `mission_duration` | "Hubble mission duration: 34+ years" | ConstantsGate, ScopeGate |

---

## CLI Commands

OrbitGate provides a command-line interface via `python -m orbitgate.orbit_cli`.

### Run all benchmarks

```bash
python -m orbitgate.orbit_cli --run
```

### Run demo (subset of cases with summary)

```bash
python -m orbitgate.orbit_cli --demo
```

### Run a specific case

```bash
python -m orbitgate.orbit_cli --case orbit_delta_v_001
```

### Run replay on a specific case

```bash
python -m orbitgate.orbit_cli replay --case orbit_delta_v_001
```

### Generate JSON report

```bash
python -m orbitgate.orbit_cli --run --json orbitgate_report.json
```

### Generate HTML report

```bash
python -m orbitgate.orbit_cli --run --html orbitgate_report.html
```

### Generate both JSON and HTML

```bash
python -m orbitgate.orbit_cli --run --json orbitgate_report.json --html orbitgate_report.html
```

### Generate certificate

```bash
python -m orbitgate.orbit_cli --certificate
```

### Generate handoff pack

```bash
python -m orbitgate.orbit_cli --handoff-pack
```

### Show help

```bash
python -m orbitgate.orbit_cli --help
```

---

## Integration API

### `GET /api/orbitgate/status`

Returns current system status, gate health, and summary statistics.

```bash
curl http://localhost:3000/api/orbitgate/status
```

**Response:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "gates": {
    "ClaimGate": "active",
    "PhysicsGate": "active",
    "ConstantsGate": "active",
    "ScopeGate": "active",
    "RiskGate": "active",
    "EvidenceGate": "active",
    "ReplayGate": "active",
    "ChipGate": "active",
    "JARVI3": "active"
  },
  "total_benchmarks": 160,
  "last_run": "2025-01-01T00:00:00Z",
  "drift_detected": false
}
```

### `POST /api/orbitgate/run`

Runs verification on a submitted claim and returns gate results.

```bash
curl -X POST http://localhost:3000/api/orbitgate/run \
  -H "Content-Type: application/json" \
  -d '{
    "claim": "The delta-v required to transfer from LEO to GEO is approximately 3.9 km/s",
    "claim_type": "orbit_delta_v"
  }'
```

**Response:**
```json
{
  "claim": "The delta-v required to transfer from LEO to GEO is approximately 3.9 km/s",
  "claim_type": "orbit_delta_v",
  "decision": "ALLOW",
  "risk": "MEDIUM",
  "gates_triggered": ["ClaimGate", "PhysicsGate", "ConstantsGate"],
  "evidence_id": "ev_20250101_000001",
  "details": {
    "ClaimGate": {"decision": "ALLOW", "reason": "Valid claim structure"},
    "PhysicsGate": {"decision": "ALLOW", "reason": "Δv within expected range 3.8–4.1 km/s"},
    "ConstantsGate": {"decision": "ALLOW", "reason": "LEO/GEO altitudes use standard reference values"}
  }
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OrbitGate v0                                   │
│                                                                             │
│  ┌──────────────┐                                                           │
│  │  AI / LLM    │  Raw orbital claim                                        │
│  │  Output      │──────────────────────┐                                     │
│  └──────────────┘                      ▼                                     │
│                                ┌─────────────┐                               │
│                                │   Router    │  Classifies claim type,       │
│                                │             │  selects gate chain           │
│                                └──────┬──────┘                               │
│                                       │                                      │
│                    ┌──────────────────┼──────────────────┐                    │
│                    │                  │                  │                    │
│                    ▼                  ▼                  ▼                    │
│             ┌────────────┐    ┌────────────┐    ┌────────────┐               │
│             │ ClaimGate  │    │ ScopeGate  │    │ RiskGate   │               │
│             │ (parse,    │    │ (in-scope? │    │ (classify  │               │
│             │  classify) │    │  domain?)  │    │  severity) │               │
│             └─────┬──────┘    └─────┬──────┘    └─────┬──────┘               │
│                   │                 │                 │                       │
│                   └────────────────┼─────────────────┘                       │
│                                    ▼                                         │
│                          ┌──────────────────┐                                 │
│                          │  Gate Pipeline   │                                 │
│                          │                  │                                 │
│                          │  PhysicsGate     │                                 │
│                          │  ConstantsGate   │                                 │
│                          │  ChipGate        │                                 │
│                          │  EvidenceGate    │                                 │
│                          └────────┬─────────┘                                 │
│                                   │                                           │
│                    ┌──────────────┼──────────────┐                            │
│                    ▼              ▼              ▼                            │
│             ┌───────────┐  ┌───────────┐  ┌──────────┐                        │
│             │ Evidence  │  │  Replay   │  │  JARVI3  │                        │
│             │ Pack      │  │  Gate     │  │  (meta)  │                        │
│             │ (record)  │  │ (drift)   │  │ (unify)  │                        │
│             └───────────┘  └───────────┘  └──────────┘                        │
│                   │              │              │                             │
│                   └──────────────┼──────────────┘                            │
│                                  ▼                                            │
│                        ┌──────────────────┐                                   │
│                        │   GateResult     │                                   │
│                        │                  │                                   │
│                        │  decision: ALLOW │                                   │
│                        │  risk: MEDIUM    │                                   │
│                        │  evidence_id: .. │                                   │
│                        └──────────────────┘                                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Outputs: Evidence Pack (JSON) | HTML Report | Certificate | Handoff Pack   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dependencies

### Required
- **Python 3.8+** — Runtime environment
- **pytest** — Test runner

### Optional (enhanced verification)
- **sgp4** — SGP4 satellite propagation model (used for sanity-checking orbital elements, not certified ephemeris)
- **numpy** — Numerical computation for physics gate checks

### Web Dashboard
- **Next.js 14+** — Frontend framework
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **shadcn/ui** — Component library

> **Note:** OrbitGate operates fully without `sgp4` or `numpy`. If `sgp4` is unavailable, deterministic fallback checks are used instead.

---

## Quick Start

```bash
# 1. Navigate to project
cd /home/z/my-project

# 2. Run the demo (verifies a subset of benchmark cases)
python -m orbitgate.orbit_cli --demo

# 3. Run all 160+ benchmarks
python -m orbitgate.orbit_cli --run

# 4. Generate a full report
python -m orbitgate.orbit_cli --run --json report.json --html report.html

# 5. Generate handoff pack for review
python -m orbitgate.orbit_cli --handoff-pack

# 6. Run tests
python -m pytest tests/ -v

# 7. Start the web dashboard (optional)
npm run dev
# Open http://localhost:3000
```

---

*OrbitGate v0 — Research-only deterministic verification. Not for flight certification.*