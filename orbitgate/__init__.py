"""OrbitGate v0.2 — Deterministic verification-gate system for AI-generated orbital claims."""

from .orbit_types import (
    DecisionLabel,
    RiskLabel,
    ClaimType,
    GateResult,
    ParsedClaim,
)
from .orbit_router import OrbitRouter
from .orbit_gates import BaseGate, TLEGate
from .orbit_sgp4_gate import SGP4Gate
from .orbit_delta_v_gate import DeltaVGate
from .orbit_collision_gate import CollisionGate
from .orbit_power_gate import PowerGate
from .orbit_thermal_gate import ThermalGate
from .orbit_comms_gate import CommsGate
from .orbit_deorbit_gate import DeorbitGate
from .orbit_command_gate import CommandGate
from .orbit_claims import classify_claim
from .orbit_parser import parse_tle, extract_claim_fields
from .orbit_evidence import OrbitEvidenceRecord
from .orbit_replay import compute_replay_hash, replay_case
from .orbit_claim_boundary import ClaimBoundaryChecker
from .orbit_report import ReportGenerator
from .orbit_certificate import CertificateGenerator
from .orbit_bench import BenchmarkRunner
from .orbit_propagator import propagate_tle, propagate_and_verify, PropagationResult
from .orbit_tle_fetcher import (
    fetch_tle_group,
    fetch_tle_by_norad,
    fetch_tle_by_name_search,
    get_available_groups,
    get_popular_satellites,
    generate_evidence_pack,
    TLEFetchResult,
    TLEEntry,
)

__version__ = "0.2.0"
__all__ = [
    "DecisionLabel",
    "RiskLabel",
    "ClaimType",
    "GateResult",
    "ParsedClaim",
    "OrbitRouter",
    "BaseGate",
    "TLEGate",
    "SGP4Gate",
    "DeltaVGate",
    "CollisionGate",
    "PowerGate",
    "ThermalGate",
    "CommsGate",
    "DeorbitGate",
    "CommandGate",
    "classify_claim",
    "parse_tle",
    "extract_claim_fields",
    "OrbitEvidenceRecord",
    "compute_replay_hash",
    "replay_case",
    "ClaimBoundaryChecker",
    "ReportGenerator",
    "CertificateGenerator",
    "BenchmarkRunner",
    # Phase 2 exports
    "propagate_tle",
    "propagate_and_verify",
    "PropagationResult",
    "fetch_tle_group",
    "fetch_tle_by_norad",
    "fetch_tle_by_name_search",
    "get_available_groups",
    "get_popular_satellites",
    "generate_evidence_pack",
    "TLEFetchResult",
    "TLEEntry",
]