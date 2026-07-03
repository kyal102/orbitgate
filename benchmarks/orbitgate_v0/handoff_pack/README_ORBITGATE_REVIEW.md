# OrbitGate v0 — Handoff Pack Review Guide

This pack contains everything needed to independently verify, reproduce, and audit the OrbitGate v0 benchmark run.

---

## What Is In This Pack

| File / Directory | Contents |
|------------------|----------|
| `certificate.json` | Verification certificate with run ID, timestamps, hash, summary statistics |
| `benchmark_results.json` | Full results for all 160+ benchmark cases with gate-level details |
| `evidence/` | Individual evidence packs (one JSON file per case) |
| `replay_results.json` | Results from replaying all cases to check for drift |
| `README_ORBITGATE_REVIEW.md` | **This file** — review instructions |
| `REPLAY_COMMANDS.md` | Reference for running replay commands |
| `CLAIM_BOUNDARY.md` | Claim boundary rules and examples |
| `LIMITATIONS.md` | Condensed limitations statement |

---

## How to Verify Results

### Step 1: Check the Certificate

Open `certificate.json` and verify:
- [ ] Run ID and timestamp are present
- [ ] Version is `0.1.0`
- [ ] Total case count matches (should be 160+)
- [ ] SHA-256 hash is present
- [ ] Summary statistics (ALLOW/BLOCK/etc. counts) match `benchmark_results.json`

### Step 2: Spot-Check Benchmark Results

Open `benchmark_results.json` and verify:
- [ ] Every case has a non-null `decision` field
- [ ] Every case has a non-null `risk` field
- [ ] Every case has at least one gate in `gates_triggered`
- [ ] Every case has a valid `evidence_id`
- [ ] Blocked cases (`BLOCK`) have a clear `reason` in their gate results
- [ ] Pick 5 random cases and manually verify the decision is correct

### Step 3: Verify Evidence Packs

Open 3–5 files in the `evidence/` directory and verify:
- [ ] Each file matches its corresponding case in `benchmark_results.json`
- [ ] All gates that were triggered have entries
- [ ] Timestamps are consistent with the certificate
- [ ] No evidence pack is empty or malformed

---

## How to Run Replay

Replay re-runs all benchmark cases and compares results against the recorded evidence. This detects drift (non-determinism).

### Replay All Cases

```bash
cd /home/z/my-project
python -m orbitgate.orbit_cli replay --all
```

### Replay a Specific Case

```bash
python -m orbitgate.orbit_cli replay --case orbit_delta_v_001
```

### Verify Replay Results

After running replay, compare against `replay_results.json` in this pack:
- [ ] Drift should be 0% for all cases
- [ ] No `DECISION_CHANGED` entries
- [ ] If drift is detected, investigate which gate changed and why

See `REPLAY_COMMANDS.md` for full replay command reference.

---

## How to Check Certificate

```bash
# View the certificate
cat benchmarks/orbitgate_v0/handoff_pack/certificate.json | python -m json.tool

# Verify the hash matches the benchmark results
cd /home/z/my-project
python -c "
import json, hashlib
with open('benchmarks/orbitgate_v0/handoff_pack/benchmark_results.json') as f:
    data = f.read().encode()
print('SHA-256:', hashlib.sha256(data).hexdigest())
"
```

Compare the output hash with the `hash` field in `certificate.json`. They should match.

---

## How to Validate Claim Boundaries

### Step 1: Review Blocked Cases

Filter `benchmark_results.json` for `decision: "BLOCK"` cases and verify:
- [ ] Each blocked case has a clear reason
- [ ] The blocking gate is identified
- [ ] The block reason matches the boundary rules in `CLAIM_BOUNDARY.md`

### Step 2: Review Out-of-Scope Cases

Filter for `decision: "OUT_OF_SCOPE"` cases and verify:
- [ ] Each case truly falls outside OrbitGate's domain
- [ ] The reason references a specific scope boundary

### Step 3: Test Boundary Enforcement

Manually submit test claims via the CLI or API:

```bash
# This should be BLOCKED (operational command)
python -m orbitgate.orbit_cli --claim "Execute a Hohmann transfer now"

# This should be OUT_OF_SCOPE (regulatory)
python -m orbitgate.orbit_cli --claim "This orbit complies with ITU regulations"

# This should be ALLOWED (factual claim)
python -m orbitgate.orbit_cli --claim "The ISS orbits at approximately 408 km altitude"
```

See `CLAIM_BOUNDARY.md` for the full boundary ruleset.

---

## Review Checklist

### Integrity
- [ ] Certificate hash matches benchmark results
- [ ] All 160+ cases are present in benchmark_results.json
- [ ] All evidence packs exist and are non-empty
- [ ] Replay shows 0% drift

### Correctness
- [ ] Spot-checked 5+ cases manually — decisions are correct
- [ ] Blocked cases have valid reasons matching boundary rules
- [ ] No false positives (correct claims blocked) found
- [ ] No false negatives (wrong claims allowed) found

### Boundary Enforcement
- [ ] Operational commands are blocked
- [ ] Safety guarantees are blocked
- [ ] Regulatory claims are out-of-scope
- [ ] Predictions are flagged for review
- [ ] Real-time data claims require evidence

### Documentation
- [ ] LIMITATIONS.md has been read and acknowledged
- [ ] CLAIM_BOUNDARY.md rules match observed behavior
- [ ] REPLAY_COMMANDS.md commands produce expected output

### Critical Acknowledgment
- [ ] I understand OrbitGate is **research-only** software
- [ ] I understand OrbitGate does **not** provide flight-certified decisions
- [ ] I understand OrbitGate results must **not** be used in operational contexts

---

*OrbitGate v0 Handoff Pack — Review Guide*