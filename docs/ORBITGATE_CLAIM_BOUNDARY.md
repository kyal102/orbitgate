# OrbitGate v0 — Claim Boundary System

OrbitGate enforces strict boundaries on what it can and cannot verify. The claim boundary system ensures that every claim is either correctly verified within OrbitGate's domain, or explicitly rejected with a clear reason.

---

## What OrbitGate CAN Claim (Allowed Claims)

OrbitGate can verify claims that fall within its 17 recognized claim types and satisfy the following criteria:

### Orbital Mechanics Claims
- **Delta-v calculations** — Hohmann transfers, plane changes, orbit raising/lowering (type: `orbit_delta_v`)
- **Orbital periods** — Keplerian period from semi-major axis (type: `orbit_period`)
- **Orbital altitudes** — Standard altitude ranges for LEO, MEO, GEO, HEO (type: `orbit_altitude`)
- **Orbital inclinations** — Inclination values and their implications (type: `orbit_inclination`)
- **Orbital eccentricities** — Eccentricity values and orbit classifications (type: `orbit_eccentricity`)
- **Orbital velocities** — Circular/elliptical velocities from vis-viva (type: `orbit_velocity`)
- **Ascending node** — RAAN values and J2 drift effects (type: `orbit_ascending_node`)
- **Perigee/Apogee** — Apsidal altitudes for standard orbits (type: `orbit_perigee_apogee`)

### Launch Vehicle Claims
- **Launch vehicle Δv** — Approximate Δv delivery to various orbits (type: `launch_vehicle_delta_v`)
- **Launch vehicle capacity** — Payload mass to LEO/GTO/GEO (type: `launch_vehicle_capacity`)
- **Launch windows** — Planetary launch window periods (type: `launch_window`)

### Satellite Claims
- **Satellite mass** — Mass ranges for known satellite classes (type: `satellite_mass`)
- **Satellite power** — Power generation for known platforms (type: `satellite_power`)
- **Satellite propulsion** — Isp ranges, thrust values for known thruster types (type: `satellite_propulsion`)

### System-Level Claims
- **Constellation design** — Shell altitudes, plane counts for known constellations (type: `constellation_design`)
- **Debris risk** — Qualitative/quantitative debris density claims (type: `debris_risk`)
- **Mission duration** — Operational lifetime for known missions (type: `mission_duration`)

### Criteria for Allowed Claims
1. The claim maps to one of the 17 recognized claim types
2. The claim contains a verifiable numerical value or well-defined qualitative statement
3. Reference data exists within OrbitGate's internal constants database
4. The claim is a **factual statement** about orbital mechanics, space systems, or mission parameters — not a recommendation, prediction about the future, or operational decision

---

## What OrbitGate CANNOT Claim (Blocked Claims)

The following categories of claims are **always blocked** with an appropriate decision label:

### Operational / Command Claims — `BLOCK` or `OUT_OF_SCOPE`
- "Execute a Hohmann transfer maneuver now"
- "Fire thruster #2 for 3.2 seconds"
- "Adjust orbit to 408 km altitude"
- "Initiate de-orbit sequence"

**Reason:** OrbitGate verifies claims, it does not generate or execute commands.

### Safety-Critical Decisions — `BLOCK`
- "It is safe to proceed with the launch"
- "No collision risk exists for this orbit"
- "This trajectory guarantees mission success"
- "The satellite will not re-enter for 50 years"

**Reason:** OrbitGate cannot certify safety, guarantee outcomes, or assess real-world risk beyond heuristic checks. See LIMITATIONS.md.

### Regulatory / Legal Claims — `OUT_OF_SCOPE`
- "This orbit complies with ITU regulations"
- "The launch license has been approved"
- "This frequency allocation is valid"
- "This satellite is ITAR-compliant"

**Reason:** OrbitGate has no access to regulatory databases and no legal authority.

### Predictions / Forecasts — `NEEDS_REVIEW` or `OUT_OF_SCOPE`
- "The satellite will fail in 2027"
- "SpaceX will launch 100 times next year"
- "Kessler syndrome will occur by 2035"
- "The next solar maximum will cause X satellite failures"

**Reason:** Predictions about future events are outside OrbitGate's deterministic verification scope.

### Claims About AI / LLMs Themselves — `OUT_OF_SCOPE`
- "GPT-4 is accurate 95% of the time on orbital mechanics"
- "This AI model is safe to use for mission planning"
- "The LLM's confidence score of 0.9 means the claim is correct"

**Reason:** OrbitGate verifies orbital claims, not claims about AI systems.

### Claims Requiring Real-Time Data — `NEEDS_REVIEW` or `EVIDENCE_REQUIRED`
- "The ISS is currently at 408.2 km altitude"
- "Starlink-1234 just completed a plane-change maneuver"
- "Current space debris count is 36,000 objects"
- "Solar activity is at moderate levels today"

**Reason:** OrbitGate does not access real-time telemetry or live data feeds.

### Claims About Classified / Proprietary Systems — `BLOCK` or `OUT_OF_SCOPE`
- "The NRO satellite in slot X has mass Y kg"
- "The F-35's radar cross-section is Z dBsm"
- "This classified constellation operates at altitude W"

**Reason:** OrbitGate verifies against public reference data only.

### Vague / Unverifiable Claims — `NEEDS_REVIEW`
- "Orbital mechanics is important for space missions"
- "Space is really big"
- "Satellites need power to work"
- "Rockets go fast"

**Reason:** While arguably true, these claims lack specific verifiable content.

---

## How Claim Boundaries Are Enforced

### 1. ClaimGate (First Gate)

The `ClaimGate` is always the first gate in every pipeline. It performs:
- **Structural validation** — Is the claim parseable? Does it contain a verifiable assertion?
- **Type classification** — Does the claim map to one of the 17 recognized types?
- **Boundary pre-check** — Does the claim contain any blocked keywords or patterns?

If `ClaimGate` detects a boundary violation, it returns `BLOCK` or `OUT_OF_SCOPE` immediately, and no further gates are executed.

### 2. ScopeGate (Second Gate)

The `ScopeGate` performs a deeper domain analysis:
- Is the claim within the verifiable domain of orbital/aerospace engineering?
- Does the claim require real-time data, classified data, or regulatory authority?
- Is the claim a factual assertion (verifiable) vs. a recommendation/prediction (not verifiable)?

### 3. Blocked Keyword Patterns

OrbitGate maintains a set of blocked keyword patterns that trigger immediate boundary checks:

| Pattern | Category | Default Action |
|---------|----------|---------------|
| `execute.*maneuver`, `fire.*thruster`, `initiate.*sequence` | Operational command | BLOCK |
| `safe to`, `guarantee`, `will not fail` | Safety-critical | BLOCK |
| `complies with`, `licensed`, `approved`, `ITAR`, `ITU` | Regulatory/legal | OUT_OF_SCOPE |
| `will happen`, `predict`, `forecast` | Prediction | NEEDS_REVIEW |
| `currently`, `right now`, `today`, `live` | Real-time data | EVIDENCE_REQUIRED |
| `classified`, `proprietary`, `secret` | Classified | OUT_OF_SCOPE |

### 4. EvidenceGate Audit Trail

Even when a claim is blocked, the `EvidenceGate` records:
- The original claim text
- The blocked reason
- The gate that applied the block
- The decision label assigned

This ensures full auditability of every boundary decision.

---

## Claim Boundary Checker Architecture

```
                        ┌──────────────────────┐
                        │   Incoming Claim     │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │   ClaimGate          │
                        │                      │
                        │  1. Parse structure  │
                        │  2. Classify type    │
                        │  3. Check blocked    │
                        │     keyword patterns │
                        └──────────┬───────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              BLOCK/           ALLOW           OUT_OF_
              SCOPE?              │              SCOPE?
                    │              │              │
                    ▼              ▼              ▼
              ┌──────────┐  ┌───────────┐  ┌──────────┐
              │ Stop —   │  │ ScopeGate │  │ Stop —   │
              │ Record   │  │ (deeper   │  │ Record   │
              │ Evidence │  │  check)   │  │ Evidence │
              └──────────┘  └─────┬─────┘  └──────────┘
                                  │
                       ┌──────────┼──────────┐
                       │                     │
                  In scope?              Out of scope?
                       │                     │
                       ▼                     ▼
                 ┌───────────┐         ┌──────────┐
                 │ Continue  │         │ Stop —   │
                 │ to gate   │         │ Record   │
                 │ pipeline  │         │ Evidence │
                 └───────────┘         └──────────┘
```

---

## Examples of Blocked Claims with Reasons

### Example 1: Operational Command
```
Claim: "Execute a Hohmann transfer from 400 km to 35,786 km"
Type:  (unclassifiable — command, not claim)
Gate:  ClaimGate
Decision: BLOCK
Reason: "Claim contains operational command pattern 'Execute'. OrbitGate verifies claims, does not generate commands."
```

### Example 2: Safety Guarantee
```
Claim: "This orbit guarantees no collision risk for 10 years"
Type:  debris_risk (tentative)
Gate:  ClaimGate → ScopeGate
Decision: BLOCK
Reason: "Claim contains safety guarantee 'guarantees no collision risk'. OrbitGate cannot certify safety outcomes."
```

### Example 3: Real-Time Data
```
Claim: "The ISS is currently at an altitude of 421.3 km"
Type:  orbit_altitude (tentative)
Gate:  ClaimGate → ScopeGate
Decision: EVIDENCE_REQUIRED
Reason: "Claim requests real-time/current data ('currently'). OrbitGate does not access live telemetry."
```

### Example 4: Regulatory
```
Claim: "This 12 GHz spectrum allocation complies with ITU regulations"
Type:  (none)
Gate:  ClaimGate
Decision: OUT_OF_SCOPE
Reason: "Claim involves regulatory compliance ('ITU regulations'). OrbitGate has no regulatory authority."
```

---

## Examples of Allowed Claims

### Example 1: Delta-v Verification
```
Claim: "The delta-v required for a Hohmann transfer from 200 km LEO to 35,786 km GEO is approximately 3.9 km/s"
Type:  orbit_delta_v
Gate:  ClaimGate → PhysicsGate → ConstantsGate
Decision: ALLOW
Reason: "Δv 3.9 km/s within expected range [3.8, 4.1] km/s for LEO→GEO Hohmann transfer."
```

### Example 2: Orbital Period
```
Claim: "A satellite in a circular 400 km LEO orbit has an orbital period of approximately 92.4 minutes"
Type:  orbit_period
Gate:  ClaimGate → PhysicsGate
Decision: ALLOW
Reason: "T = 5554 s ≈ 92.6 min for a = 6778 km. Claimed 92.4 min within ±1% tolerance."
```

### Example 3: Satellite Mass
```
Claim: "A Starlink v2 Mini satellite has a mass of approximately 800 kg"
Type:  satellite_mass
Gate:  ClaimGate → ConstantsGate → ChipGate
Decision: ALLOW
Reason: "Starlink v2 Mini mass ≈ 800 kg matches public reference data [750, 850] kg range."
```

### Example 4: Launch Vehicle Capacity
```
Claim: "Falcon 9 Full Thrust can deliver approximately 22,800 kg to LEO"
Type:  launch_vehicle_capacity
Gate:  ClaimGate → ConstantsGate → ChipGate
Decision: ALLOW
Reason: "Falcon 9 FT LEO capacity 22,800 kg matches published specifications [22,000, 23,000] kg."
```

---

## Integration with DTL System

### EvidencePack

Every claim boundary decision is recorded in an `EvidencePack`:

```json
{
  "evidence_id": "ev_boundary_001",
  "claim": "Execute a Hohmann transfer",
  "claim_type": null,
  "decision": "BLOCK",
  "risk": "CRITICAL",
  "blocking_gate": "ClaimGate",
  "reason": "Contains operational command pattern",
  "timestamp": "2025-01-01T00:00:00Z",
  "gate_results": {
    "ClaimGate": {"decision": "BLOCK", "reason": "Command pattern detected"}
  }
}
```

### ReplayGate Integration

ReplayGate can be used to verify that claim boundary decisions are **stable** — i.e., the same claim always gets the same boundary decision across runs. This is critical for ensuring that boundary rules are not accidentally relaxed or tightened.

### ClaimGate Integration

`ClaimGate` is the primary enforcer of claim boundaries. It is always the first gate in every pipeline and has the authority to short-circuit the pipeline with `BLOCK` or `OUT_OF_SCOPE`.

### ChipGate Integration

`ChipGate` provides hardware-specific boundary checking. For example, if a claim references a specific satellite component (e.g., "The Hall thruster on Starlink-1234 provides 240 mN of thrust"), ChipGate checks whether the hardware claim is within known specifications.

### JARVI3 Integration

`JARVI3` (the meta-gate) orchestrates all gates and produces a unified verdict. If any gate returns `BLOCK` or `OUT_OF_SCOPE`, JARVI3 propagates that decision. JARVI3 also records which gates were involved in the boundary decision for audit purposes.

---

## GateResult Shared Concept for DTL Pluggability

All gates produce a `GateResult` — a shared data structure that enables **pluggable** gate composition within the DTL system.

```python
@dataclass
class GateResult:
    gate_name: str           # e.g., "ClaimGate"
    decision: str            # ALLOW, BLOCK, NEEDS_REVIEW, etc.
    risk: str                # LOW, MEDIUM, HIGH, CRITICAL
    reason: str              # Human-readable explanation
    evidence_id: str         # Link to EvidencePack
    metadata: dict           # Gate-specific data
    timestamp: str           # ISO 8601
```

This shared concept enables:
- **New gates** to be added without modifying existing pipeline logic
- **Gate removal** without breaking downstream consumers
- **ReplayGate** to compare any gate's output across runs
- **JARVI3** to aggregate results from heterogeneous gates
- **External tools** to consume OrbitGate results via a uniform interface

The `GateResult` is the **contract** between gates in the DTL system. Any component that produces or consumes verification results must use this format.

---

*OrbitGate v0 — Claim Boundary System. Boundaries are enforced deterministically and recorded immutably.*