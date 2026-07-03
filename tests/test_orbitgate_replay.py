"""Tests for OrbitGate deterministic replay system."""

import pytest
from orbitgate.orbit_replay import compute_replay_hash, replay_case
from orbitgate.orbit_evidence import OrbitEvidenceRecord


class TestReplayHashStability:
    def test_same_input_same_hash(self):
        h1 = compute_replay_hash("case_001", "input text", "DeltaVGate", "BLOCK")
        h2 = compute_replay_hash("case_001", "input text", "DeltaVGate", "BLOCK")
        assert h1 == h2

    def test_different_input_different_hash(self):
        h1 = compute_replay_hash("case_001", "input text A", "DeltaVGate", "BLOCK")
        h2 = compute_replay_hash("case_001", "input text B", "DeltaVGate", "BLOCK")
        assert h1 != h2


class TestEvidenceRecordDeterminism:
    def test_same_case_same_record(self):
        r1 = OrbitEvidenceRecord(
            case_id="test_001",
            claim_type="delta_v_claim",
            gate="DeltaVGate",
            decision="BLOCK",
            evidence_used=["zero delta-v detected"],
            missing_evidence=[],
            limitations=["research_only"],
            timestamp_utc="2024-01-01T00:00:00Z",
        )
        r2 = OrbitEvidenceRecord(
            case_id="test_001",
            claim_type="delta_v_claim",
            gate="DeltaVGate",
            decision="BLOCK",
            evidence_used=["zero delta-v detected"],
            missing_evidence=[],
            limitations=["research_only"],
            timestamp_utc="2024-01-01T00:00:00Z",
        )
        assert r1.to_dict() == r2.to_dict()


class TestReplayDriftDetection:
    def test_replay_pass_for_consistent(self):
        claim_text = "Perform a maneuver with delta-v of -50 m/s."
        # First compute hash based on what the router would produce
        from orbitgate.orbit_router import OrbitRouter
        from orbitgate.orbit_replay import compute_replay_hash
        router = OrbitRouter()
        result = router.route(claim_text)
        replay_hash = compute_replay_hash("test_case", claim_text, result.gate, result.decision)
        # Now replay should pass
        from orbitgate.orbit_replay import replay_case
        replay_result = replay_case("test_case", claim_text, replay_hash, result.gate, result.decision)
        assert replay_result.status == "REPLAY_PASS"

    def test_replay_detects_drift(self):
        claim_text = "Perform a maneuver with delta-v of -50 m/s."
        from orbitgate.orbit_replay import compute_replay_hash, replay_case
        original_hash = compute_replay_hash("case_001", claim_text, "DeltaVGate", "BLOCK")
        # Simulate decision drift by passing a different original decision
        result = replay_case("case_001", claim_text, original_hash, "DeltaVGate", "ALLOW")
        assert result.status == "REPLAY_DRIFT_DETECTED"