"""OrbitGate evidence record: tracks evidence used for each gate evaluation."""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any


@dataclass
class OrbitEvidenceRecord:
    """Structured evidence record for a gate evaluation."""

    case_id: str = ""
    claim_type: str = ""
    gate: str = ""
    decision: str = ""
    evidence_used: List[str] = field(default_factory=list)
    missing_evidence: List[str] = field(default_factory=list)
    limitations: List[str] = field(default_factory=list)
    replay_hash: str = ""
    timestamp_utc: str = ""

    def to_dict(self) -> dict:
        """Serialize to a plain dict suitable for JSON."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "OrbitEvidenceRecord":
        """Deserialize from a dict (e.g., loaded from JSON)."""
        return cls(
            case_id=data.get("case_id", ""),
            claim_type=data.get("claim_type", ""),
            gate=data.get("gate", ""),
            decision=data.get("decision", ""),
            evidence_used=data.get("evidence_used", []),
            missing_evidence=data.get("missing_evidence", []),
            limitations=data.get("limitations", []),
            replay_hash=data.get("replay_hash", ""),
            timestamp_utc=data.get("timestamp_utc", ""),
        )

    @classmethod
    def from_gate_result(
        cls,
        case_id: str,
        result: "GateResult",  # noqa: F821 — forward ref
        evidence_used: List[str] | None = None,
        missing_evidence: List[str] | None = None,
        replay_hash: str = "",
    ) -> "OrbitEvidenceRecord":
        """Create an evidence record from a GateResult."""
        from datetime import datetime, timezone

        # Determine missing evidence from decision
        missing: List[str] = list(missing_evidence or [])
        if result.decision == "EVIDENCE_REQUIRED":
            # Extract from reason
            if "without" in result.reason.lower():
                missing.append(result.reason)

        return cls(
            case_id=case_id,
            claim_type=result.claim_type,
            gate=result.gate,
            decision=result.decision,
            evidence_used=list(evidence_used or []),
            missing_evidence=missing,
            limitations=result.limitations,
            replay_hash=replay_hash,
            timestamp_utc=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        )