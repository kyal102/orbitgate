"""Tests for all OrbitGate gate modules."""

import pytest
from orbitgate.orbit_types import ParsedClaim, ClaimType, RiskLabel, DecisionLabel
from orbitgate.orbit_gates import TLEGate
from orbitgate.orbit_sgp4_gate import SGP4Gate
from orbitgate.orbit_delta_v_gate import DeltaVGate
from orbitgate.orbit_collision_gate import CollisionGate
from orbitgate.orbit_power_gate import PowerGate
from orbitgate.orbit_thermal_gate import ThermalGate
from orbitgate.orbit_comms_gate import CommsGate
from orbitgate.orbit_deorbit_gate import DeorbitGate
from orbitgate.orbit_command_gate import CommandGate
from orbitgate.orbit_parser import extract_claim_fields


VALID_TLE = (
    "1 25544U 98067A   24001.50000000  .00016717  00000-0  30186-3 0  9993\n"
    "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537"
)


def _claim(text: str, ct: ClaimType = ClaimType.UNSUPPORTED_SPACE_CLAIM) -> ParsedClaim:
    fields = extract_claim_fields(text)
    return ParsedClaim(raw_text=text, claim_type=ct, extracted_fields=fields)


# ── TLEGate ─────────────────────────────────────────────────────────────

class TestTLEGate:
    def test_accepts_valid_tle(self):
        gate = TLEGate()
        result = gate.evaluate(_claim(VALID_TLE, ClaimType.TLE_CLAIM))
        assert result.decision == DecisionLabel.ALLOW.value

    def test_blocks_malformed_tle(self):
        gate = TLEGate()
        result = gate.evaluate(_claim("not a tle", ClaimType.TLE_CLAIM))
        assert result.decision in (
            DecisionLabel.BLOCK.value,
            DecisionLabel.EVIDENCE_REQUIRED.value,
        )


# ── SGP4Gate ────────────────────────────────────────────────────────────

class TestSGP4Gate:
    def test_unavailable_returns_evidence_required(self):
        gate = SGP4Gate()
        # If sgp4 is not installed the gate should return EVIDENCE_REQUIRED
        try:
            import sgp4  # noqa: F401
            sgp4_available = True
        except ImportError:
            sgp4_available = False

        result = gate.evaluate(
            _claim("The satellite orbit propagates to perigee of 408 km", ClaimType.ORBIT_PROPAGATION_CLAIM)
        )
        if not sgp4_available:
            assert result.decision == DecisionLabel.EVIDENCE_REQUIRED.value


# ── DeltaVGate ──────────────────────────────────────────────────────────

class TestDeltaVGate:
    def test_blocks_zero_cost_manoeuvre(self):
        gate = DeltaVGate()
        result = gate.evaluate(
            _claim("The satellite can raise orbit by 500 km with delta-v of 0 m/s.", ClaimType.DELTA_V_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value

    def test_blocks_negative_delta_v(self):
        gate = DeltaVGate()
        result = gate.evaluate(
            _claim("Perform a maneuver with delta-v of -50 m/s.", ClaimType.DELTA_V_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value

    def test_routes_missing_budget_to_evidence_required(self):
        gate = DeltaVGate()
        result = gate.evaluate(
            _claim("Perform a 150 m/s Hohmann transfer.", ClaimType.DELTA_V_CLAIM)
        )
        assert result.decision in (
            DecisionLabel.EVIDENCE_REQUIRED.value,
            DecisionLabel.ALLOW.value,
        )

    def test_blocks_guaranteed_success(self):
        gate = DeltaVGate()
        result = gate.evaluate(
            _claim("This maneuver is guaranteed to succeed.", ClaimType.DELTA_V_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value


# ── CollisionGate ───────────────────────────────────────────────────────

class TestCollisionGate:
    def test_blocks_guaranteed_no_collision(self):
        gate = CollisionGate()
        result = gate.evaluate(
            _claim("There is guaranteed no collision risk for this orbit.", ClaimType.COLLISION_AVOIDANCE_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value

    def test_blocks_safe_orbit_claim(self):
        gate = CollisionGate()
        result = gate.evaluate(
            _claim("This is a guaranteed safe orbit.", ClaimType.COLLISION_AVOIDANCE_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value

    def test_requires_evidence_for_collision_claim(self):
        gate = CollisionGate()
        result = gate.evaluate(
            _claim("The satellite will avoid all collisions.", ClaimType.COLLISION_AVOIDANCE_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value


# ── PowerGate ───────────────────────────────────────────────────────────

class TestPowerGate:
    def test_blocks_unlimited_power(self):
        gate = PowerGate()
        result = gate.evaluate(
            _claim("The satellite has unlimited power for all operations.", ClaimType.POWER_BUDGET_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value

    def test_blocks_infinite_power(self):
        gate = PowerGate()
        result = gate.evaluate(
            _claim("Infinite power is available from solar arrays.", ClaimType.POWER_BUDGET_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value

    def test_requires_evidence_for_missing_budget(self):
        gate = PowerGate()
        result = gate.evaluate(
            _claim("Power budget looks fine for nominal operations.", ClaimType.POWER_BUDGET_CLAIM)
        )
        assert result.decision == DecisionLabel.EVIDENCE_REQUIRED.value

    def test_blocks_impossible_budget(self):
        gate = PowerGate()
        result = gate.evaluate(
            _claim(
                "Solar generation 100W, payload draw 500W. Power deficit without explanation.",
                ClaimType.POWER_BUDGET_CLAIM,
            )
        )
        assert result.decision == DecisionLabel.BLOCK.value


# ── ThermalGate ─────────────────────────────────────────────────────────

class TestThermalGate:
    def test_blocks_guaranteed_safety(self):
        gate = ThermalGate()
        result = gate.evaluate(
            _claim("The satellite has guaranteed thermal stability at all times.", ClaimType.THERMAL_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value

    def test_requires_evidence_without_model(self):
        gate = ThermalGate()
        result = gate.evaluate(
            _claim("Thermal conditions are safe.", ClaimType.THERMAL_CLAIM)
        )
        assert result.decision == DecisionLabel.EVIDENCE_REQUIRED.value

    def test_blocks_out_of_range_temp(self):
        gate = ThermalGate()
        text = "The operating temperature will reach 500 degrees Celsius."
        result = gate.evaluate(_claim(text, ClaimType.THERMAL_CLAIM))
        assert result.decision == DecisionLabel.BLOCK.value


# ── CommsGate ───────────────────────────────────────────────────────────

class TestCommsGate:
    def test_blocks_always_connected_leo(self):
        gate = CommsGate()
        result = gate.evaluate(
            _claim("The LEO satellite is always connected to ground.", ClaimType.COMMS_WINDOW_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value

    def test_blocks_continuous_coverage_leo(self):
        gate = CommsGate()
        result = gate.evaluate(
            _claim("The LEO satellite has continuous coverage.", ClaimType.COMMS_WINDOW_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value

    def test_requires_evidence_for_missing_link_budget(self):
        gate = CommsGate()
        result = gate.evaluate(
            _claim("Communication with the ground station is nominal.", ClaimType.COMMS_WINDOW_CLAIM)
        )
        assert result.decision == DecisionLabel.EVIDENCE_REQUIRED.value


# ── DeorbitGate ─────────────────────────────────────────────────────────

class TestDeorbitGate:
    def test_blocks_no_debris_guarantee(self):
        gate = DeorbitGate()
        result = gate.evaluate(
            _claim("The deorbit will result in no debris risk at all.", ClaimType.DEORBIT_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value

    def test_requires_evidence_for_safe_deorbit(self):
        gate = DeorbitGate()
        result = gate.evaluate(
            _claim("The satellite will deorbit safely.", ClaimType.DEORBIT_CLAIM)
        )
        assert result.decision == DecisionLabel.EVIDENCE_REQUIRED.value

    def test_blocks_guaranteed_safe_reentry(self):
        gate = DeorbitGate()
        result = gate.evaluate(
            _claim("Guaranteed safe re-entry over the South Pacific.", ClaimType.DEORBIT_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value


# ── CommandGate ─────────────────────────────────────────────────────────

class TestCommandGate:
    def test_blocks_disable_safemode(self):
        gate = CommandGate()
        result = gate.evaluate(
            _claim("Execute command to disable safemode.", ClaimType.COMMAND_SEQUENCE_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value

    def test_blocks_disable_comms(self):
        gate = CommandGate()
        result = gate.evaluate(
            _claim("Disable all communications on the satellite.", ClaimType.COMMAND_SEQUENCE_CLAIM)
        )
        assert result.decision in (
            DecisionLabel.BLOCK.value,
            DecisionLabel.NEEDS_REVIEW.value,
        )

    def test_blocks_disable_power_safeguards(self):
        gate = CommandGate()
        result = gate.evaluate(
            _claim("Disable power protection safeguards.", ClaimType.COMMAND_SEQUENCE_CLAIM)
        )
        assert result.decision == DecisionLabel.BLOCK.value