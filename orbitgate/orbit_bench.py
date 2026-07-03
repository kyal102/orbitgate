"""OrbitGate benchmark runner."""

import json
import os
from typing import Any, Dict, List, Optional

from .orbit_router import OrbitRouter
from .orbit_replay import compute_replay_hash
from .orbit_evidence import OrbitEvidenceRecord
from .orbit_report import ReportGenerator
from .orbit_certificate import CertificateGenerator


class BenchmarkRunner:
    """Loads benchmark cases, runs them through the router, and collects results."""

    def __init__(self):
        self.router = OrbitRouter()
        self.results: List[Dict[str, Any]] = []

    def load_cases(self, path: str) -> List[Dict[str, Any]]:
        """Load benchmark cases from a JSON file.

        Expected format: a list of objects with at least:
            - "case_id": string
            - "claim_text": string
            - "expected_decision": string (optional)
            - "expected_gate": string (optional)
        """
        with open(path, "r", encoding="utf-8") as f:
            cases = json.load(f)

        if isinstance(cases, dict):
            # Some files wrap cases in an object
            cases = cases.get("cases", cases.get("benchmarks", []))

        return cases

    def run_case(self, case: Dict[str, Any]) -> Dict[str, Any]:
        """Run a single benchmark case through the router.

        Returns a result dict with case info, gate result, and replay hash.
        """
        case_id = case.get("case_id", "unknown")
        claim_text = case.get("input", case.get("claim_text", ""))
        expected_decision = case.get("expected_decision", "")
        expected_gate = case.get("expected_gate", "")

        # Route through gates
        gate_result = self.router.route(claim_text)

        # Compute replay hash
        replay_hash = compute_replay_hash(
            case_id, claim_text, gate_result.gate, gate_result.decision
        )

        # Build evidence record
        evidence_record = OrbitEvidenceRecord.from_gate_result(
            case_id=case_id,
            result=gate_result,
            replay_hash=replay_hash,
        )

        # Check match
        match = True
        if expected_decision and gate_result.decision != expected_decision:
            match = False
        if expected_gate and gate_result.gate != expected_gate:
            match = False

        return {
            "case_id": case_id,
            "claim_text": claim_text,
            "claim_type": gate_result.claim_type,
            "gate": gate_result.gate,
            "decision": gate_result.decision,
            "reason": gate_result.reason,
            "expected_decision": expected_decision,
            "expected_gate": expected_gate,
            "match": match,
            "passing": gate_result.passing,
            "total": gate_result.total,
            "limitations": gate_result.limitations,
            "evidence": gate_result.evidence,
            "replay_hash": replay_hash,
            "evidence_record": evidence_record.to_dict(),
        }

    def run_all(
        self,
        cases: List[Dict[str, Any]],
        filter_gate: Optional[str] = None,
        filter_claim_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Run all benchmark cases and return results.

        Args:
            cases: List of case dicts.
            filter_gate: Only run cases matching this expected gate.
            filter_claim_type: Only run cases matching this expected claim type.

        Returns:
            List of result dicts.
        """
        self.results = []

        for case in cases:
            # Apply filters
            if filter_gate:
                expected = case.get("expected_gate", "")
                if expected and expected != filter_gate:
                    continue
            if filter_claim_type:
                expected = case.get("expected_claim_type", "")
                if expected and expected != filter_claim_type:
                    continue

            result = self.run_case(case)
            self.results.append(result)

        return self.results

    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics from the most recent run."""
        if not self.results:
            return {
                "total": 0, "passed": 0, "blocked": 0,
                "needs_review": 0, "evidence_required": 0,
                "benchmark_matches": 0, "benchmark_mismatches": 0,
            }

        decisions: Dict[str, int] = {}
        matches = 0
        mismatches = 0

        for r in self.results:
            dec = r.get("decision", "UNKNOWN")
            decisions[dec] = decisions.get(dec, 0) + 1
            if r.get("expected_decision"):
                if r.get("match"):
                    matches += 1
                else:
                    mismatches += 1

        return {
            "total": len(self.results),
            "allowed": decisions.get("ALLOW", 0),
            "blocked": decisions.get("BLOCK", 0),
            "needs_review": decisions.get("NEEDS_REVIEW", 0),
            "evidence_required": decisions.get("EVIDENCE_REQUIRED", 0),
            "unsupported": decisions.get("UNSUPPORTED", 0),
            "out_of_scope": decisions.get("OUT_OF_SCOPE", 0),
            "benchmark_matches": matches,
            "benchmark_mismatches": mismatches,
        }

    def generate_report(
        self,
        json_path: Optional[str] = None,
        html_path: Optional[str] = None,
        certificate_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate report and optional certificate from results."""
        report_gen = ReportGenerator(results=self.results)
        report_data = report_gen.generate_json_report()
        summary = report_gen._compute_summary()

        if json_path:
            report_gen.save_json_report(json_path)

        if html_path:
            report_gen.save_html_report(html_path)

        if certificate_path:
            cert_gen = CertificateGenerator(report_data=report_data)
            cert_gen.save(certificate_path)

        return summary

    def run_benchmark_file(
        self,
        benchmark_path: str,
        json_path: Optional[str] = None,
        html_path: Optional[str] = None,
        certificate_path: Optional[str] = None,
        filter_gate: Optional[str] = None,
        filter_claim_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Load a benchmark file, run all cases, and generate reports.

        Returns summary stats.
        """
        cases = self.load_cases(benchmark_path)
        self.run_all(cases, filter_gate=filter_gate, filter_claim_type=filter_claim_type)
        return self.generate_report(json_path, html_path, certificate_path)

    def run_demo(self) -> List[Dict[str, Any]]:
        """Run a small set of demo cases and return results."""
        demo_cases = [
            {
                "case_id": "demo_tle_valid",
                "claim_text": (
                    "1 25544U 98067A   24001.50000000  .00016717  00000-0  30186-3 0  9993\n"
                    "2 25544  51.6416 247.4627 0006703  41.5696 318.5524 15.49560460470687"
                ),
                "expected_decision": "ALLOW",
                "expected_gate": "TLEGate",
            },
            {
                "case_id": "demo_tle_malformed",
                "claim_text": "This is not a valid TLE at all",
                "expected_decision": "EVIDENCE_REQUIRED",
                "expected_gate": "TLEGate",
            },
            {
                "case_id": "demo_collision_guarantee",
                "claim_text": "This satellite is guaranteed safe orbit with no collision risk.",
                "expected_decision": "BLOCK",
                "expected_gate": "CollisionGate",
            },
            {
                "case_id": "demo_delta_v_negative",
                "claim_text": "Perform a maneuver with delta-v of -50 m/s.",
                "expected_decision": "BLOCK",
                "expected_gate": "DeltaVGate",
            },
            {
                "case_id": "demo_power_unlimited",
                "claim_text": "The satellite has unlimited power for all operations.",
                "expected_decision": "BLOCK",
                "expected_gate": "PowerGate",
            },
            {
                "case_id": "demo_comms_leo_always",
                "claim_text": "The LEO satellite at 400 km has continuous coverage and is always connected.",
                "expected_decision": "BLOCK",
                "expected_gate": "CommsGate",
            },
            {
                "case_id": "demo_thermal_guarantee",
                "claim_text": "The satellite has guaranteed thermal stability at all times.",
                "expected_decision": "BLOCK",
                "expected_gate": "ThermalGate",
            },
            {
                "case_id": "demo_deorbit_no_risk",
                "claim_text": "The deorbit will result in no debris risk at all.",
                "expected_decision": "BLOCK",
                "expected_gate": "DeorbitGate",
            },
            {
                "case_id": "demo_command_real",
                "claim_text": "Execute command sequence to disable safemode on the spacecraft.",
                "expected_decision": "BLOCK",
                "expected_gate": "CommandGate",
            },
            {
                "case_id": "demo_unsupported",
                "claim_text": "The weather on Mars will be sunny tomorrow with temperatures of 20C.",
                "expected_decision": "OUT_OF_SCOPE",
                "expected_gate": "NoGate",
            },
        ]

        self.results = []
        for case in demo_cases:
            result = self.run_case(case)
            self.results.append(result)

        return self.results