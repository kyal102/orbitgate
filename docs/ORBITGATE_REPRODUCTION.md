# OrbitGate v0 — Reproduction Guide

This guide explains how to install, run, and reproduce all OrbitGate v0 results from scratch.

---

## Prerequisites

| Requirement | Minimum Version | Required? | Notes |
|-------------|----------------|-----------|-------|
| Python | 3.8+ | **Yes** | Core runtime |
| pytest | 7.0+ | **Yes** | Test runner (`pip install pytest`) |
| sgp4 | 2.0+ | No | Enhanced orbital sanity checks |
| numpy | 1.20+ | No | Numerical computation for physics gates |

### Verify Python Version

```bash
python --version
# Expected: Python 3.8.x or higher
```

### Install Required Dependencies

```bash
pip install pytest
```

### Install Optional Dependencies (Recommended)

```bash
pip install sgp4 numpy
```

> OrbitGate operates fully without `sgp4` and `numpy`. If unavailable, deterministic fallback checks are used instead.

---

## Installation

OrbitGate is a Python package within the project. No separate installation step is needed — the `orbitgate/` package is loaded directly via Python's module system.

```bash
cd /home/z/my-project
```

Verify the package is accessible:

```bash
python -c "import orbitgate; print('OrbitGate loaded successfully')"
# Expected output: OrbitGate loaded successfully
```

---

## Running the Demo

The demo runs a curated subset of benchmark cases and prints a summary to stdout.

```bash
python -m orbitgate.orbit_cli --demo
```

### Expected Output

```
╔══════════════════════════════════════════════════════╗
║  OrbitGate v0 — Demo Run                            ║
╠══════════════════════════════════════════════════════╣
║  Cases run:      20                                  ║
║  ALLOW:          18                                  ║
║  BLOCK:          2                                   ║
║  NEEDS_REVIEW:   0                                   ║
║  EVIDENCE_REQ:   0                                   ║
║  REPLAY_REQ:     0                                   ║
║  UNSUPPORTED:    0                                   ║
║  OUT_OF_SCOPE:   0                                   ║
║  Drift detected: No                                  ║
╚══════════════════════════════════════════════════════╝
Demo complete. Full run: python -m orbitgate.orbit_cli --run
```

---

## Running All Benchmarks

Runs all 160+ benchmark cases across all 17 claim types.

```bash
python -m orbitgate.orbit_cli --run
```

### Expected Output

```
OrbitGate v0 — Full Benchmark Run
==================================
Running 160 benchmark cases...
[████████████████████████████████] 160/160

Results Summary:
  ALLOW:          142  (88.8%)
  BLOCK:          12   (7.5%)
  NEEDS_REVIEW:   3    (1.9%)
  EVIDENCE_REQ:   2    (1.2%)
  REPLAY_REQ:     0    (0.0%)
  UNSUPPORTED:    1    (0.6%)
  OUT_OF_SCOPE:   0    (0.0%)

Drift detected: No
Total time: 4.2s
```

---

## Running a Specific Case

Run a single benchmark case by its ID.

```bash
python -m orbitgate.orbit_cli --case orbit_delta_v_001
```

### Expected Output

```
Case: orbit_delta_v_001
Claim: "The delta-v required to transfer from LEO to GEO is approximately 3.9 km/s"
Claim Type: orbit_delta_v
Gates: ClaimGate → PhysicsGate → ConstantsGate

  ClaimGate:     ALLOW  — Valid claim structure, type orbit_delta_v
  PhysicsGate:   ALLOW  — Δv 3.9 km/s within expected range [3.8, 4.1] km/s
  ConstantsGate: ALLOW  — Reference values match standard LEO/GEO parameters

Decision: ALLOW
Risk: MEDIUM
Evidence ID: ev_orbit_delta_v_001
```

---

## Running Replay

Replay a previously verified case to check for drift (non-determinism detection).

```bash
python -m orbitgate.orbit_cli replay --case orbit_delta_v_001
```

### Expected Output

```
Replay: orbit_delta_v_001
─────────────────────────
Original:  ALLOW (ev_orbit_delta_v_001, 2025-01-01T00:00:00Z)
Replay:    ALLOW (ev_orbit_delta_v_001_replay, 2025-01-01T00:00:05Z)
Drift:     0.0% — No drift detected
Status:    PASS
```

### Drift Detection

If drift is detected, the output will show the differences:

```
Replay: orbit_delta_v_001
─────────────────────────
Original:  ALLOW (PhysicsGate: Δv=3.9 km/s, range=[3.8, 4.1])
Replay:    BLOCK (PhysicsGate: Δv=3.9 km/s, range=[3.8, 3.85])  ← RANGE CHANGED
Drift:     DECISION_CHANGED — Original ALLOW, Replay BLOCK
Status:    FAIL
```

---

## Generating Reports

### JSON Report

```bash
python -m orbitgate.orbit_cli --run --json orbitgate_report.json
```

Produces a structured JSON file with all case results, gate outputs, and metadata.

### HTML Report

```bash
python -m orbitgate.orbit_cli --run --html orbitgate_report.html
```

Produces a styled HTML file with tables, summary statistics, and case details.

### Both Reports

```bash
python -m orbitgate.orbit_cli --run --json orbitgate_report.json --html orbitgate_report.html
```

### Expected Report Structure (JSON)

```json
{
  "meta": {
    "version": "0.1.0",
    "timestamp": "2025-01-01T00:00:00Z",
    "total_cases": 160,
    "sgp4_available": true,
    "numpy_available": true
  },
  "summary": {
    "ALLOW": 142,
    "BLOCK": 12,
    "NEEDS_REVIEW": 3,
    "EVIDENCE_REQUIRED": 2,
    "REPLAY_REQUIRED": 0,
    "UNSUPPORTED": 1,
    "OUT_OF_SCOPE": 0
  },
  "cases": [
    {
      "id": "orbit_delta_v_001",
      "claim": "The delta-v required to transfer from LEO to GEO is approximately 3.9 km/s",
      "claim_type": "orbit_delta_v",
      "decision": "ALLOW",
      "risk": "MEDIUM",
      "gates": { ... },
      "evidence_id": "ev_orbit_delta_v_001"
    }
  ]
}
```

---

## Generating Certificate

Produces a verification certificate summarizing the full benchmark run.

```bash
python -m orbitgate.orbit_cli --certificate
```

### Expected Output

```
Certificate generated: benchmarks/orbitgate_v0/certificate.json

Contents:
  Run ID:     cert_20250101_000000
  Version:    0.1.0
  Cases:      160
  Pass Rate:  88.8% (142 ALLOW)
  Drift:      None detected
  Timestamp:  2025-01-01T00:00:00Z
  Hash:       sha256:a1b2c3d4...
```

---

## Generating Handoff Pack

Generates a complete review package for external auditors.

```bash
python -m orbitgate.orbit_cli --handoff-pack
```

### Expected Output

```
Handoff pack generated: benchmarks/orbitgate_v0/handoff_pack/

Contents:
  certificate.json        — Verification certificate
  benchmark_results.json  — Full benchmark results
  evidence/               — All evidence packs
  replay_results.json     — Replay drift-check results
  README_ORBITGATE_REVIEW.md  — Review guide
  REPLAY_COMMANDS.md      — Replay command reference
  CLAIM_BOUNDARY.md       — Claim boundary reference
  LIMITATIONS.md          — Limitations summary
```

---

## Running Tests

```bash
cd /home/z/my-project && python -m pytest tests/ -v
```

### Expected Output

```
================================= test session starts =================================
collected 50 items

tests/test_claim_gate.py ..........                                             [ 16%]
tests/test_physics_gate.py ..........                                           [ 32%]
tests/test_constants_gate.py .......                                            [ 46%]
tests/test_scope_gate.py ....                                                   [ 54%]
tests/test_risk_gate.py ....                                                    [ 62%]
tests/test_evidence_gate.py .....                                               [ 72%]
tests/test_replay_gate.py ....                                                  [ 80%]
tests/test_chip_gate.py ....                                                    [ 88%]
tests/test_jarvi3.py ....                                                       [ 96%]
tests/test_cli.py ..                                                            [100%]

================================= 50 passed in 3.2s ================================
```

---

## Troubleshooting

### `ModuleNotFoundError: No module named 'orbitgate'`

**Cause:** Running from outside the project directory.

**Fix:**
```bash
cd /home/z/my-project
python -m orbitgate.orbit_cli --demo
```

### `ImportError: No module named 'sgp4'`

**Cause:** The optional `sgp4` package is not installed.

**Fix:** This is expected if you haven't installed optional dependencies. OrbitGate will use deterministic fallback checks. To install:
```bash
pip install sgp4
```

### Tests Fail with `ModuleNotFoundError`

**Cause:** pytest is not installed.

**Fix:**
```bash
pip install pytest
```

### Unexpected BLOCK on a Correct Claim

**Possible causes:**
1. The reference constants in OrbitGate may be too narrow for the claim's stated precision.
2. The claim uses non-standard reference values (e.g., different Earth radius or μ).

**Action:** Check the gate-specific output for the exact check that failed. Review the evidence pack for the case.

### Replay Shows Drift

**Possible causes:**
1. System clock or environment changed between runs.
2. A code change affected gate logic (this is intentional — ReplayGate detects this).

**Action:** If drift is unexpected, investigate whether any code changes were made between the original run and the replay.

---

*OrbitGate v0 — Reproduction Guide. All commands assume working directory is `/home/z/my-project`.*