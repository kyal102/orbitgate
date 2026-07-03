"""OrbitGate deterministic replay system."""

import hashlib
from dataclasses import asdict

from .orbit_types import GateResult, DecisionLabel
from .orbit_router import OrbitRouter


class ReplayResult:
    """Result of a replay check."""

    def __init__(
        self,
        status: str,
        case_id: str,
        original_hash: str = "",
        recomputed_hash: str = "",
        details: str = "",
    ):
        self.status = status  # REPLAY_PASS, REPLAY_DRIFT_DETECTED, REPLAY_ERROR
        self.case_id = case_id
        self.original_hash = original_hash
        self.recomputed_hash = recomputed_hash
        self.details = details

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "case_id": self.case_id,
            "original_hash": self.original_hash,
            "recomputed_hash": self.recomputed_hash,
            "details": self.details,
        }


def compute_replay_hash(case_id: str, claim_text: str, gate: str, decision: str) -> str:
    """Compute a SHA-256 replay hash from case parameters.

    The hash is deterministic: same inputs always produce the same hash.
    """
    payload = f"{case_id}|{claim_text}|{gate}|{decision}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def replay_case(
    case_id: str,
    claim_text: str,
    original_hash: str,
    original_gate: str,
    original_decision: str,
) -> ReplayResult:
    """Re-run a case and verify deterministic replay.

    Args:
        case_id: Unique case identifier.
        claim_text: The original claim text.
        original_hash: The previously stored replay hash.
        original_gate: The gate that was used.
        original_decision: The decision that was returned.

    Returns:
        ReplayResult with status REPLAY_PASS or REPLAY_DRIFT_DETECTED.
    """
    # Re-run the router
    router = OrbitRouter()
    try:
        result = router.route(claim_text)
    except Exception as exc:
        return ReplayResult(
            status="REPLAY_ERROR",
            case_id=case_id,
            original_hash=original_hash,
            details=f"Router error during replay: {exc}",
        )

    # Compute new hash
    recomputed_hash = compute_replay_hash(
        case_id, claim_text, result.gate, result.decision
    )

    # Check for drift
    if recomputed_hash != original_hash:
        return ReplayResult(
            status="REPLAY_DRIFT_DETECTED",
            case_id=case_id,
            original_hash=original_hash,
            recomputed_hash=recomputed_hash,
            details=(
                f"Replay drift detected. "
                f"Original gate: {original_gate} -> new gate: {result.gate}; "
                f"Original decision: {original_decision} -> new decision: {result.decision}"
            ),
        )

    # Also verify gate and decision match
    drift_parts: list = []
    if result.gate != original_gate:
        drift_parts.append(f"gate: {original_gate} -> {result.gate}")
    if result.decision != original_decision:
        drift_parts.append(f"decision: {original_decision} -> {result.decision}")

    if drift_parts:
        return ReplayResult(
            status="REPLAY_DRIFT_DETECTED",
            case_id=case_id,
            original_hash=original_hash,
            recomputed_hash=recomputed_hash,
            details=f"Replay drift: {'; '.join(drift_parts)}",
        )

    return ReplayResult(
        status="REPLAY_PASS",
        case_id=case_id,
        original_hash=original_hash,
        recomputed_hash=recomputed_hash,
        details="Replay passed: gate, decision, and hash all match.",
    )