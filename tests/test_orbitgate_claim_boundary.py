"""Tests for OrbitGate claim boundary checker."""

import pytest
from orbitgate.orbit_claim_boundary import ClaimBoundaryChecker


checker = ClaimBoundaryChecker()


class TestBoundaryBlocksOverclaims:
    def test_blocks_nasa_replacement(self):
        decision, reason = checker.check_claim("OrbitGate replaces NASA")
        assert decision.value == "BLOCK"
        assert "NASA" in reason or "replace" in reason.lower()

    def test_blocks_flight_certified(self):
        decision, reason = checker.check_claim("OrbitGate is flight certified")
        assert decision.value == "BLOCK"

    def test_blocks_real_spacecraft_control(self):
        decision, reason = checker.check_claim("OrbitGate controls satellites")
        assert decision.value == "BLOCK"

    def test_blocks_guarantees_orbital_safety(self):
        decision, reason = checker.check_claim("OrbitGate guarantees orbital safety")
        assert decision.value == "BLOCK"

    def test_blocks_production_ready(self):
        decision, reason = checker.check_claim("OrbitGate is production ready")
        assert decision.value == "BLOCK"

    def test_blocks_defence_ready(self):
        decision, reason = checker.check_claim("OrbitGate is defence ready")
        assert decision.value == "BLOCK"

    def test_blocks_guarantees_collision_avoidance(self):
        decision, reason = checker.check_claim("OrbitGate guarantees collision avoidance")
        assert decision.value == "BLOCK"

    def test_blocks_regulatory_compliance(self):
        decision, reason = checker.check_claim("OrbitGate proves regulatory compliance")
        assert decision.value == "BLOCK"


class TestBoundaryAllowsScopedClaims:
    def test_allows_research_prototype(self):
        decision, reason = checker.check_claim(
            "OrbitGate is a public research prototype for deterministic checking of AI-generated orbital claims."
        )
        assert decision.value == "ALLOW"

    def test_allows_no_flight_certification(self):
        decision, reason = checker.check_claim(
            "OrbitGate does not provide flight certification or real spacecraft control."
        )
        assert decision.value == "ALLOW"

    def test_allows_no_spacecraft_control(self):
        decision, reason = checker.check_claim("OrbitGate does not control real spacecraft.")
        assert decision.value == "ALLOW"

    def test_allows_deterministic_gates(self):
        decision, reason = checker.check_claim(
            "OrbitGate routes orbital claims through deterministic gates and evidence records."
        )
        assert decision.value == "ALLOW"