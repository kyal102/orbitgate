# OrbitGate v0 — Limitations

**This document is mandatory reading for anyone using, reviewing, or integrating OrbitGate.**

OrbitGate is a **research-only** deterministic verification system. It has strict boundaries that must be understood and respected. Violating these boundaries could result in misuse of verification results in safety-critical contexts.

---

## 1. OrbitGate Does Not Control Real Spacecraft

OrbitGate is a **software verification pipeline**. It has no connection to, and no ability to affect, any real spacecraft, satellite, ground station, or telemetry system. It reads claims and produces verification results. It cannot send commands, trigger maneuvers, or interact with any operational hardware.

**Implication:** OrbitGate outputs must never be used as inputs to real spacecraft command-and-control systems.

---

## 2. OrbitGate Does Not Provide Flight-Certified Decisions

OrbitGate's verification results are **deterministic software outputs** based on hardcoded constants, heuristic checks, and optional SGP4 propagation. They are **not** produced by a flight-certified software system and have not undergone any aerospace qualification process (DO-178C, ECSS, etc.).

**Implication:** No OrbitGate decision label (including ALLOW) constitutes a flight certification or engineering sign-off.

---

## 3. OrbitGate Does Not Replace Aerospace Engineers

OrbitGate is a **triage and evidence-generation tool**. It is designed to assist, not replace, qualified aerospace engineers, astrodynamics specialists, and mission analysts. An `ALLOW` decision means the claim is *consistent with OrbitGate's internal checks* — it does not mean the claim has been reviewed by a qualified professional.

**Implication:** Every OrbitGate output should be reviewed by a competent engineer before use in any professional or operational context.

---

## 4. OrbitGate Does Not Replace Mission-Control Systems

OrbitGate is not a mission-control system. It does not track satellites in real time, does not process telemetry, does not compute conjunction screens, and does not manage mission timelines or operations.

**Implication:** OrbitGate should not be integrated into mission operations workflows as a replacement for systems like GMAT, STK, EVM, or proprietary mission-control software.

---

## 5. OrbitGate Does Not Replace Orbital-Dynamics Tools

Professional orbital-dynamics tools (AGI STK, NASA GMAT, Orekit, etc.) perform high-fidelity propagation, perturbation modeling, and mission design. OrbitGate performs **sanity-check-level verification** of AI-generated claims using simplified physics and heuristic comparisons.

**Implication:** OrbitGate results should never be used as a substitute for results from certified orbital-dynamics tools when precision matters.

---

## 6. OrbitGate Does Not Replace NASA/ESA/Defence Review

Government and defence space agencies (NASA, ESA, USSPACECOM, national defence agencies) have established review processes for orbital operations, conjunction assessment, launch licensing, and mission assurance. OrbitGate is not part of any such process and has not been reviewed or approved by any such agency.

**Implication:** OrbitGate outputs cannot be submitted in lieu of required agency reviews, and should not be cited in regulatory filings.

---

## 7. OrbitGate Does Not Guarantee Collision Avoidance

While OrbitGate can verify claims about debris risk and orbital parameters, it **cannot** and **does not** guarantee that any spacecraft will avoid collision with another object. OrbitGate does not perform real-time conjunction assessment, does not access Space Situational Awareness (SSA) catalogs, and does not generate collision-avoidance maneuvers.

**Implication:** An `ALLOW` on a debris-risk claim does not mean the described scenario is collision-free.

---

## 8. OrbitGate Does Not Prove Launch Readiness

OrbitGate can verify certain launch-vehicle and mission-design claims, but it does not perform launch-readiness reviews. It does not check vehicle health, environmental conditions, range safety, flight-termination systems, or any of the myriad factors that determine whether a launch can proceed safely.

**Implication:** OrbitGate results must never be used as evidence of launch readiness.

---

## 9. OrbitGate Is Not Defence-Ready

OrbitGate has not been developed under any defence contract, has not undergone security review, has not been evaluated for classification handling, and does not meet any defense-acquisition standards (MIL-STD, DIACAP, RMF, etc.).

**Implication:** OrbitGate must not be used in any defence, intelligence, or national-security context without a full independent security and certification review.

---

## 10. OrbitGate Is Not Production-Ready

OrbitGate v0 is a **research prototype**. It has not undergone:
- Formal code review by an independent team
- Penetration testing or security audit
- Performance testing at scale
- Continuous integration / continuous deployment (CI/CD) hardening
- Failure-mode effects analysis (FMEA)
- Operational readiness review (ORR)

**Implication:** OrbitGate v0 is suitable for research, demonstration, and internal evaluation only. It is not suitable for operational deployment.

---

## 11. OrbitGate Does Not Perform Real-Time Autonomous Spacecraft Control

OrbitGate is a **batch verification system**. It processes claims and produces results. It has no real-time loop, no sensor inputs, no actuator outputs, and no ability to close a control loop with any physical system.

**Implication:** OrbitGate must never be placed in a control loop for any physical system, especially spacecraft.

---

## 12. OrbitGate Does Not Provide Legal or Regulatory Approval

OrbitGate's verification results have no legal standing. They do not constitute:
- FCC/ITU frequency coordination approval
- FAA/CAA launch licensing approval
- ITAR/EAR compliance certification
- Insurance underwriting basis
- Liability protection

**Implication:** OrbitGate outputs cannot be used as legal or regulatory evidence.

---

## 13. OrbitGate Does Not Prove Real-World Orbital Safety

OrbitGate verifies *claims about orbital mechanics and space systems*. A claim passing verification means the numbers are internally consistent and within expected ranges. It does **not** mean the real-world scenario described by the claim is safe, feasible, or risk-free.

**Implication:** Verified claims are still subject to all real-world uncertainties, unmodeled perturbations, system failures, and human error.

---

## 14. SGP4 Propagation Is for Sanity Checking Only

When the optional `sgp4` package is available, OrbitGate uses it to propagate TLE-derived orbital elements and compare against claim values. This propagation is used **solely for sanity checking** — confirming that claimed orbital parameters produce reasonable results when fed into SGP4.

SGP4 propagation within OrbitGate:
- Uses **public TLE data** (which may be inaccurate or outdated)
- Does **not** produce certified ephemeris
- Does **not** account for atmospheric drag variations, solar radiation pressure uncertainties, or other perturbations beyond SGP4's built-in models
- Is **not** a substitute for high-fidelity propagation tools

**Implication:** SGP4-derived checks are heuristic indicators, not precise measurements.

---

## 15. If SGP4 Is Unavailable, Deterministic Fallback Checks Are Used

OrbitGate is designed to operate fully without `sgp4` or `numpy`. When these packages are not installed, the system falls back to deterministic analytical checks:
- Vis-viva equation validation
- Keplerian period/velocity cross-checks
- Reference-constant comparison (gravitational parameters, planetary radii)
- Heuristic range checks (altitude, Δv, Isp, mass ranges)

These fallback checks are less precise than SGP4-based checks but maintain full determinism and reproducibility.

**Implication:** Verification results may differ slightly depending on whether SGP4 is installed, but decision labels should remain consistent.

---

## 16. OrbitGate Is Research-Only

All of the above limitations converge on a single statement:

**OrbitGate v0 is research-only software.**

It is designed to demonstrate and validate the concept of deterministic gate-based verification for AI-generated orbital claims. It is a tool for researchers, engineers, and reviewers to evaluate the DTL (Deterministic Trust Loop) architecture.

It must not be deployed in any operational, safety-critical, regulatory, or defence context without a complete independent review, certification, and approval process that is beyond the scope of this project.

---

*This limitations document is part of the OrbitGate v0 release and must accompany all distributions, handoff packs, and presentations of OrbitGate results.*