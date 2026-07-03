# OrbitGate v0 — Limitations Summary

**OrbitGate is research-only software.** This is the most important sentence in this document.

---

## Critical Limitations

| # | Limitation | Implication |
|---|-----------|-------------|
| 1 | **Does not control real spacecraft** | No connection to operational hardware. Cannot send commands. |
| 2 | **Does not provide flight-certified decisions** | No DO-178C, ECSS, or aerospace qualification. |
| 3 | **Does not replace aerospace engineers** | Every output needs human expert review. |
| 4 | **Does not replace mission-control systems** | No real-time tracking, telemetry, or operations. |
| 5 | **Does not replace orbital-dynamics tools** | Not a substitute for STK, GMAT, or Orekit. Sanity checks only. |
| 6 | **Does not replace NASA/ESA/defence review** | Not reviewed by any space agency. No regulatory standing. |
| 7 | **Does not guarantee collision avoidance** | No real-time conjunction assessment. |
| 8 | **Does not prove launch readiness** | No vehicle health, range safety, or environmental checks. |
| 9 | **Is not defence-ready** | No security review, classification handling, or MIL-STD compliance. |
| 10 | **Is not production-ready** | Research prototype. No FMEA, ORR, or CI/CD hardening. |
| 11 | **Does not perform real-time autonomous control** | Batch processing only. No sensor inputs or actuator outputs. |
| 12 | **Does not provide legal/regulatory approval** | No FCC, ITU, FAA, ITAR/EAR authority. |
| 13 | **Does not prove real-world orbital safety** | Verification = internal consistency, not real-world safety. |

## Technical Limitations

| # | Limitation | Detail |
|---|-----------|--------|
| 14 | **SGP4 is for sanity checking only** | Not certified ephemeris. Uses public TLE data which may be inaccurate. |
| 15 | **Fallback checks if SGP4 unavailable** | Deterministic analytical checks used when sgp4/numpy not installed. |

## Bottom Line

**OrbitGate v0 is a research prototype for demonstrating deterministic gate-based verification of AI-generated orbital claims.**

It must not be used in any operational, safety-critical, regulatory, or defence context. An `ALLOW` decision means the claim is internally consistent — it does not mean the claim is safe, certified, or approved.

---

For the full limitations document, see `/docs/ORBITGATE_LIMITATIONS.md`.

---

*By receiving this handoff pack, you acknowledge that OrbitGate v0 is research-only software and must not be used in operational contexts.*