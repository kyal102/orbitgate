"""OrbitGate certificate generator."""

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class CertificateGenerator:
    """Generates OrbitGate v0 certificates."""

    def __init__(self, report_data: Optional[Dict[str, Any]] = None):
        self.report_data = report_data or {}

    def generate(self, extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate a certificate dict matching the OrbitGate spec.

        Computes certificate_hash as SHA-256 of all certificate content
        excluding the hash field itself.
        """
        from .orbit_report import ReportGenerator

        summary = self.report_data.get("executive_summary", {})
        results = self.report_data.get("gate_results", [])
        limitations = self.report_data.get("limitations", [])

        # Build certificate content (without hash)
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        certificate_content: Dict[str, Any] = {
            "certificate_type": "ORBITGATE_V0_CERTIFICATE",
            "version": "0.1.0",
            "generated_at_utc": now_utc,
            "orbitgate_identity": {
                "name": "OrbitGate",
                "version": "0.1.0",
                "description": "Deterministic verification-gate system for AI-generated orbital/satellite/aerospace claims",
                "type": "public_research_prototype",
            },
            "flight_certified": False,
            "real_spacecraft_control": False,
            "external_validation_complete": False,
            "scope": {
                "supported_gates": [
                    "TLEGate",
                    "SGP4Gate",
                    "DeltaVGate",
                    "CollisionGate",
                    "PowerGate",
                    "ThermalGate",
                    "CommsGate",
                    "DeorbitGate",
                    "CommandGate",
                ],
                "supported_claim_types": [
                    "tle_claim",
                    "orbit_propagation_claim",
                    "altitude_claim",
                    "inclination_claim",
                    "period_claim",
                    "delta_v_claim",
                    "collision_avoidance_claim",
                    "conjunction_claim",
                    "deorbit_claim",
                    "power_budget_claim",
                    "thermal_claim",
                    "comms_window_claim",
                    "ground_station_claim",
                    "command_sequence_claim",
                    "launch_readiness_claim",
                    "flight_certification_claim",
                ],
            },
            "verification_summary": {
                "total_claims_evaluated": summary.get("total_claims", 0),
                "allowed": summary.get("allowed", 0),
                "blocked": summary.get("blocked", 0),
                "needs_review": summary.get("needs_review", 0),
                "evidence_required": summary.get("evidence_required", 0),
            },
            "limitations": limitations,
            "disclaimers": [
                "OrbitGate v0 is a research prototype. It is NOT flight-certified.",
                "OrbitGate does not control real spacecraft.",
                "OrbitGate does not replace mission control or any space agency.",
                "All gate decisions require human review before real-world application.",
                "OrbitGate does not guarantee orbital safety or collision avoidance.",
                "OrbitGate does not prove regulatory compliance.",
            ],
        }

        if extra:
            certificate_content.update(extra)

        # Compute hash of the certificate content (sorted keys for determinism)
        cert_json = json.dumps(certificate_content, sort_keys=True, default=str)
        certificate_hash = hashlib.sha256(cert_json.encode("utf-8")).hexdigest()

        # Add hash to the output
        certificate_content["certificate_hash"] = certificate_hash

        return certificate_content

    def save(self, path: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """Generate and save certificate to JSON file."""
        cert = self.generate(extra)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cert, f, indent=2, default=str)