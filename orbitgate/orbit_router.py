"""OrbitGate router: classifies claims and routes them to appropriate gates."""

from typing import Dict, Type

from .orbit_types import (
    GateResult, DecisionLabel, ParsedClaim, ClaimType, RiskLabel,
)
from .orbit_claims import classify_claim
from .orbit_parser import extract_claim_fields
from .orbit_gates import BaseGate, TLEGate
from .orbit_sgp4_gate import SGP4Gate
from .orbit_delta_v_gate import DeltaVGate
from .orbit_collision_gate import CollisionGate
from .orbit_power_gate import PowerGate
from .orbit_thermal_gate import ThermalGate
from .orbit_comms_gate import CommsGate
from .orbit_deorbit_gate import DeorbitGate
from .orbit_command_gate import CommandGate


# ClaimType -> Gate class mapping
_GATE_REGISTRY: Dict[ClaimType, Type[BaseGate]] = {
    ClaimType.TLE_CLAIM: TLEGate,
    ClaimType.ORBIT_PROPAGATION_CLAIM: SGP4Gate,
    ClaimType.ALTITUDE_CLAIM: SGP4Gate,  # SGP4Gate can handle altitude via TLE
    ClaimType.INCLINATION_CLAIM: TLEGate,
    ClaimType.PERIOD_CLAIM: TLEGate,
    ClaimType.DELTA_V_CLAIM: DeltaVGate,
    ClaimType.COLLISION_AVOIDANCE_CLAIM: CollisionGate,
    ClaimType.CONJUNCTION_CLAIM: CollisionGate,
    ClaimType.DEORBIT_CLAIM: DeorbitGate,
    ClaimType.POWER_BUDGET_CLAIM: PowerGate,
    ClaimType.THERMAL_CLAIM: ThermalGate,
    ClaimType.COMMS_WINDOW_CLAIM: CommsGate,
    ClaimType.GROUND_STATION_CLAIM: CommsGate,
    ClaimType.COMMAND_SEQUENCE_CLAIM: CommandGate,
    ClaimType.LAUNCH_READINESS_CLAIM: CommandGate,
    ClaimType.FLIGHT_CERTIFICATION_CLAIM: CommandGate,
}


class OrbitRouter:
    """Routes claim text through classification and gate evaluation.

    Usage:
        router = OrbitRouter()
        result = router.route("The ISS TLE is: ...")
    """

    def __init__(self):
        self._gate_instances: Dict[str, BaseGate] = {}

    def _get_gate(self, claim_type: ClaimType) -> BaseGate:
        """Get or create a gate instance for the given claim type."""
        gate_cls = _GATE_REGISTRY.get(claim_type)
        if gate_cls is None:
            return None
        gate_name = gate_cls.__name__ if hasattr(gate_cls, "name") else gate_cls.__name__
        if gate_name not in self._gate_instances:
            self._gate_instances[gate_name] = gate_cls()
        return self._gate_instances[gate_name]

    def route(self, claim_text: str) -> GateResult:
        """Classify a claim, route to the appropriate gate, and return the result.

        Args:
            claim_text: Raw claim text string.

        Returns:
            GateResult with decision, reason, evidence, and limitations.
        """
        # Classify
        claim_type, risk_label = classify_claim(claim_text)

        # Handle unsupported claims
        if claim_type == ClaimType.UNSUPPORTED_SPACE_CLAIM:
            return GateResult(
                gate="NoGate",
                decision=DecisionLabel.OUT_OF_SCOPE.value,
                reason="Claim does not match any supported orbital claim category.",
                claim_type=claim_type.value,
                risk_label=risk_label.value,
                limitations=["Claim type not recognized by OrbitGate"],
            )

        # Extract fields
        extracted = extract_claim_fields(claim_text)

        # Build parsed claim
        parsed = ParsedClaim(
            raw_text=claim_text,
            claim_type=claim_type,
            risk_label=risk_label,
            extracted_fields=extracted,
        )

        # Get gate
        gate = self._get_gate(claim_type)
        if gate is None:
            return GateResult(
                gate="NoGate",
                decision=DecisionLabel.OUT_OF_SCOPE.value,
                reason=f"No gate registered for claim type: {claim_type.value}",
                claim_type=claim_type.value,
                risk_label=risk_label.value,
                limitations=[f"Claim type '{claim_type.value}' has no gate implementation"],
            )

        # Evaluate
        return gate.evaluate(parsed)

    def classify_only(self, claim_text: str) -> tuple:
        """Classify claim text without routing to a gate.

        Returns:
            Tuple of (ClaimType, RiskLabel)
        """
        return classify_claim(claim_text)