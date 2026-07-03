# OrbitGate v0 — Replay Commands Reference

Replay is the final stage of the DTL (Deterministic Trust Loop). It re-runs previously verified claims and compares results to detect drift.

---

## How to Replay All Cases

```bash
cd /home/z/my-project
python -m orbitgate.orbit_cli replay --all
```

This replays every case in the benchmark suite and compares against the recorded evidence.

---

## How to Replay Specific Cases

```bash
# Replay a single case
python -m orbitgate.orbit_cli replay --case orbit_delta_v_001

# Replay multiple cases
python -m orbitgate.orbit_cli replay --case orbit_delta_v_001 --case orbit_period_003 --case satellite_mass_010

# Replay all cases of a specific type
python -m orbitgate.orbit_cli replay --type orbit_delta_v

# Replay all BLOCKED cases
python -m orbitgate.orbit_cli replay --decision BLOCK

# Replay all HIGH/CRITICAL risk cases
python -m orbitgate.orbit_cli replay --risk HIGH,CRITICAL
```

---

## How to Check for Drift

### Automatic Drift Detection

When you run any replay command, OrbitGate automatically compares the replay result against the original evidence and reports drift:

```
Replay Summary
═══════════════════════════════════════════════════
Total replayed: 160
Drift detected:  0
  DECISION_CHANGED: 0
  REASON_CHANGED:   0
  RISK_CHANGED:     0
  NO_DRIFT:         160

Drift rate: 0.0%
Status: PASS
```

### Manual Drift Comparison

For detailed comparison of a specific case:

```bash
python -m orbitgate.orbit_cli replay --case orbit_delta_v_001 --verbose
```

This shows gate-by-gate comparison:

```
Case: orbit_delta_v_001
─────────────────────────────────────────────
Gate           Original        Replay          Status
─────────────  ──────────────  ──────────────  ──────
ClaimGate      ALLOW           ALLOW           NO_DRIFT
PhysicsGate    ALLOW           ALLOW           NO_DRIFT
ConstantsGate  ALLOW           ALLOW           NO_DRIFT
─────────────────────────────────────────────
Overall: ALLOW → ALLOW (NO_DRIFT)
```

---

## Expected Replay Output Format

### Successful Replay (No Drift)

```json
{
  "replay_id": "replay_20250101_000005",
  "timestamp": "2025-01-01T00:00:05Z",
  "cases_replayed": 160,
  "drift_summary": {
    "DECISION_CHANGED": 0,
    "REASON_CHANGED": 0,
    "RISK_CHANGED": 0,
    "NO_DRIFT": 160
  },
  "drift_rate": 0.0,
  "status": "PASS"
}
```

### Failed Replay (Drift Detected)

```json
{
  "replay_id": "replay_20250101_000005",
  "timestamp": "2025-01-01T00:00:05Z",
  "cases_replayed": 160,
  "drift_summary": {
    "DECISION_CHANGED": 1,
    "REASON_CHANGED": 2,
    "RISK_CHANGED": 0,
    "NO_DRIFT": 157
  },
  "drift_rate": 1.875,
  "status": "FAIL",
  "drift_details": [
    {
      "case_id": "orbit_delta_v_015",
      "drift_type": "DECISION_CHANGED",
      "original": {"decision": "ALLOW", "reason": "Δv within range"},
      "replay": {"decision": "BLOCK", "reason": "Δv exceeds range"},
      "affected_gate": "PhysicsGate"
    }
  ]
}
```

### Single Case Replay Output

```json
{
  "case_id": "orbit_delta_v_001",
  "original": {
    "decision": "ALLOW",
    "risk": "MEDIUM",
    "gates": {
      "ClaimGate": {"decision": "ALLOW", "reason": "Valid structure"},
      "PhysicsGate": {"decision": "ALLOW", "reason": "Δv within range"},
      "ConstantsGate": {"decision": "ALLOW", "reason": "Constants match"}
    },
    "evidence_id": "ev_orbit_delta_v_001",
    "timestamp": "2025-01-01T00:00:00Z"
  },
  "replay": {
    "decision": "ALLOW",
    "risk": "MEDIUM",
    "gates": {
      "ClaimGate": {"decision": "ALLOW", "reason": "Valid structure"},
      "PhysicsGate": {"decision": "ALLOW", "reason": "Δv within range"},
      "ConstantsGate": {"decision": "ALLOW", "reason": "Constants match"}
    },
    "evidence_id": "ev_orbit_delta_v_001_replay",
    "timestamp": "2025-01-01T00:00:05Z"
  },
  "drift": {
    "decision_changed": false,
    "reason_changed": false,
    "risk_changed": false,
    "status": "NO_DRIFT"
  }
}
```

---

## Drift Types

| Drift Type | Meaning | Severity |
|------------|---------|----------|
| `DECISION_CHANGED` | The overall decision label changed (e.g., ALLOW → BLOCK) | **CRITICAL** |
| `REASON_CHANGED` | The decision is the same but the reason text differs | LOW |
| `RISK_CHANGED` | The risk label changed (e.g., MEDIUM → HIGH) | MEDIUM |
| `NO_DRIFT` | Original and replay results are identical | None |

---

## Common Scenarios

### No Drift — Expected Behavior

A clean replay with 0% drift means the system is deterministic and the evidence is reproducible. This is the expected state.

### Reason Changed — Usually Benign

If only `REASON_CHANGED` drift is detected, it typically means:
- A minor text change in a gate's reason string
- Floating-point formatting differences
- Timestamp differences (expected)

This is usually benign but should be investigated to confirm.

### Decision Changed — Requires Investigation

A `DECISION_CHANGED` drift is **always significant**. It means the same input now produces a different verification result. Possible causes:
- Code change to a gate's logic (this is intentional drift detection)
- Reference constant database was modified
- Dependency version change (e.g., sgp4 updated)

Action: Compare the gate-level results to identify which gate changed and why.

---

*OrbitGate v0 — Replay Commands Reference*