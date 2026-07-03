# OrbitGate v0 — Claim Boundary Reference (Handoff Pack)

This document provides a quick reference for claim boundaries. For the full treatment, see `/docs/ORBITGATE_CLAIM_BOUNDARY.md`.

---

## Blocked Claims

The following claim categories are **always blocked** by OrbitGate.

### 1. Operational Commands

| Example Claim | Why Blocked |
|---------------|-------------|
| "Execute a Hohmann transfer maneuver now" | Contains operational command pattern. OrbitGate verifies, does not execute. |
| "Fire thruster #2 for 3.2 seconds" | Direct hardware command. Not a verifiable claim. |
| "Adjust orbit to 408 km altitude" | Implies a command to change orbit. |
| "Initiate de-orbit sequence" | Operational sequence command. |

### 2. Safety Guarantees

| Example Claim | Why Blocked |
|---------------|-------------|
| "It is safe to proceed with the launch" | OrbitGate cannot certify safety. |
| "No collision risk exists for this orbit" | OrbitGate cannot guarantee collision avoidance. |
| "This trajectory guarantees mission success" | Guarantees of success are unverifiable. |
| "The satellite will not re-enter for 50 years" | Long-term prediction presented as guarantee. |

### 3. Regulatory / Legal Claims

| Example Claim | Why Blocked |
|---------------|-------------|
| "This orbit complies with ITU regulations" | OrbitGate has no regulatory authority. |
| "The launch license has been approved" | Legal/regulatory matter. |
| "This frequency allocation is valid" | Regulatory compliance. |
| "This satellite is ITAR-compliant" | Legal compliance. |

### 4. Classified / Proprietary Information

| Example Claim | Why Blocked |
|---------------|-------------|
| "The NRO satellite has mass X kg" | Classified data. Not in public reference. |
| "The F-35's RCS is Y dBsm" | Proprietary/classified parameter. |

### 5. Claims About AI Systems Themselves

| Example Claim | Why Blocked |
|---------------|-------------|
| "GPT-4 is 95% accurate on orbital mechanics" | Meta-claim about AI, not orbital claim. |
| "This AI model is safe for mission planning" | Safety certification of AI. |

---

## Allowed Claims

The following claim categories **can** be verified by OrbitGate.

### Orbital Mechanics

| Example Claim | Why Allowed |
|---------------|-------------|
| "Δv from LEO to GEO is approximately 3.9 km/s" | Factual claim with verifiable numerical value. |
| "ISS orbital period is ~92 minutes" | Well-known value verifiable from Kepler's law. |
| "LEO altitude range is 160–2,000 km" | Standard definition with reference values. |
| "Circular velocity at 400 km is ~7.67 km/s" | Computable from vis-viva equation. |

### Launch Vehicles

| Example Claim | Why Allowed |
|---------------|-------------|
| "Falcon 9 delivers ~22,800 kg to LEO" | Published specification. |
| "Starship payload to LEO: ~150 t" | Publicly stated capability. |
| "Mars launch windows occur every ~26 months" | Well-established synodic period. |

### Satellites

| Example Claim | Why Allowed |
|---------------|-------------|
| "Starlink v2 satellite mass: ~800 kg" | Public reference data available. |
| "ISS solar array power: ~120 kW" | Published specification. |
| "Hall-effect thruster Isp: 1,500–2,000 s" | Standard range for this thruster type. |

### Constellations & Missions

| Example Claim | Why Allowed |
|---------------|-------------|
| "Starlink shells at 540, 570, 1150 km" | Public FCC filing data. |
| "Hubble mission duration: 34+ years" | Publicly known mission fact. |

---

## How to Add New Boundary Rules

### 1. Add a Blocked Keyword Pattern

Edit the `ClaimGate` configuration to add new blocked patterns:

```python
# In orbitgate/gates/claim_gate.py
BLOCKED_PATTERNS = {
    # Existing patterns...
    "new_blocked_pattern": {
        "category": "new_category",
        "action": "BLOCK",
        "reason": "Explanation of why this is blocked"
    }
}
```

### 2. Add a New Claim Type

To support verification of a new claim type:

1. Add the type to the claim type taxonomy (17 → 18)
2. Create or update the gate that will verify this type
3. Add reference data to the constants database
4. Add benchmark cases for the new type
5. Update documentation

### 3. Modify Boundary Rules

To change an existing boundary rule (e.g., from `BLOCK` to `NEEDS_REVIEW`):

1. Identify the pattern in `ClaimGate` or `ScopeGate`
2. Change the `action` field
3. Update the `reason` field
4. Run full replay to verify no unexpected drift
5. Document the change

> **Warning:** Modifying boundary rules will cause ReplayGate to detect drift. This is expected and correct behavior — it means the system caught a logic change. Document the intentional change in the worklog.

---

*OrbitGate v0 — Claim Boundary Reference (Handoff Pack)*