"""OrbitGate core types: enums, dataclasses, and shared structures."""

from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


class DecisionLabel(Enum):
    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    EVIDENCE_REQUIRED = "EVIDENCE_REQUIRED"
    REPLAY_REQUIRED = "REPLAY_REQUIRED"
    UNSUPPORTED = "UNSUPPORTED"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"


class RiskLabel(Enum):
    RESEARCH_ONLY = "research_only"
    ORBITAL_CLAIM = "orbital_claim"
    SATELLITE_OPERATION = "satellite_operation"
    MANEUVER_CLAIM = "maneuver_claim"
    COLLISION_RISK_CLAIM = "collision_risk_claim"
    POWER_BUDGET_CLAIM = "power_budget_claim"
    THERMAL_CLAIM = "thermal_claim"
    COMMS_CLAIM = "comms_claim"
    DEORBIT_CLAIM = "deorbit_claim"
    COMMAND_SAFETY_CLAIM = "command_safety_claim"
    REGULATORY_CLAIM = "regulatory_claim"
    FLIGHT_CERTIFICATION_CLAIM = "flight_certification_claim"


class ClaimType(Enum):
    TLE_CLAIM = "tle_claim"
    ORBIT_PROPAGATION_CLAIM = "orbit_propagation_claim"
    ALTITUDE_CLAIM = "altitude_claim"
    INCLINATION_CLAIM = "inclination_claim"
    PERIOD_CLAIM = "period_claim"
    DELTA_V_CLAIM = "delta_v_claim"
    COLLISION_AVOIDANCE_CLAIM = "collision_avoidance_claim"
    CONJUNCTION_CLAIM = "conjunction_claim"
    DEORBIT_CLAIM = "deorbit_claim"
    POWER_BUDGET_CLAIM = "power_budget_claim"
    THERMAL_CLAIM = "thermal_claim"
    COMMS_WINDOW_CLAIM = "comms_window_claim"
    GROUND_STATION_CLAIM = "ground_station_claim"
    COMMAND_SEQUENCE_CLAIM = "command_sequence_claim"
    LAUNCH_READINESS_CLAIM = "launch_readiness_claim"
    FLIGHT_CERTIFICATION_CLAIM = "flight_certification_claim"
    UNSUPPORTED_SPACE_CLAIM = "unsupported_space_claim"


@dataclass
class GateResult:
    gate: str = ""
    decision: str = ""
    passing: int = 0
    total: int = 0
    evidence: Dict[str, Any] = field(default_factory=dict)
    limitations: List[str] = field(default_factory=list)
    reason: str = ""
    claim_type: str = ""
    risk_label: str = ""


@dataclass
class ParsedClaim:
    raw_text: str = ""
    claim_type: ClaimType = ClaimType.UNSUPPORTED_SPACE_CLAIM
    risk_label: RiskLabel = RiskLabel.RESEARCH_ONLY
    extracted_fields: Dict[str, Any] = field(default_factory=dict)