"""OrbitGate Real SGP4 Propagator — produces full propagation data for evidence packs."""

import math
import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field, asdict

from .orbit_types import GateResult, DecisionLabel, ParsedClaim, ClaimType, RiskLabel
from .orbit_gates import BaseGate

try:
    from sgp4.api import Satrec, SGP4_ERRORS
    _SGP4_AVAILABLE = True
except ImportError:
    _SGP4_AVAILABLE = False

# Physical constants
EARTH_RADIUS_KM = 6371.0
EARTH_MU_KM3S2 = 398600.4418


@dataclass
class PropagationPoint:
    """A single point in a propagation track."""
    t_min: float = 0.0
    x_km: float = 0.0
    y_km: float = 0.0
    z_km: float = 0.0
    vx_kms: float = 0.0
    vy_kms: float = 0.0
    vz_kms: float = 0.0
    altitude_km: float = 0.0
    latitude_deg: float = 0.0
    longitude_deg: float = 0.0
    speed_kms: float = 0.0

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class PropagationResult:
    """Complete propagation result for evidence pack."""
    success: bool = False
    norad_id: str = ""
    satellite_name: str = ""
    tle_source: str = ""
    tle_epoch: str = ""
    propagation_start: str = ""
    propagation_end: str = ""
    duration_min: float = 0.0
    num_points: int = 0
    step_min: float = 0.0
    points: List[Dict[str, Any]] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    sgp4_available: bool = False
    propagation_hash: str = ""

    def to_dict(self) -> dict:
        d = asdict(self)
        # Don't include full points in summary display
        d["_point_count"] = len(self.points)
        return d


def propagate_tle(
    line1: str,
    line2: str,
    duration_min: float = 100.0,
    step_min: float = 1.0,
    name: str = "",
    source: str = "",
) -> PropagationResult:
    """Run real SGP4 propagation and return full data.

    Args:
        line1: TLE line 1
        line2: TLE line 2
        duration_min: Total propagation duration in minutes
        step_min: Time step between points in minutes
        name: Satellite name (optional)
        source: TLE source (e.g. 'celestrak')

    Returns:
        PropagationResult with all track points and summary statistics
    """
    result = PropagationResult(
        sgp4_available=_SGP4_AVAILABLE,
        satellite_name=name,
        tle_source=source,
    )

    if not _SGP4_AVAILABLE:
        result.errors.append("SGP4 library not available")
        return result

    try:
        sat = Satrec.twoline2rv(line1, line2)
    except Exception as exc:
        result.errors.append(f"Failed to parse TLE: {exc}")
        return result

    result.norad_id = str(sat.satnum)
    result.tle_epoch = line1[18:32].strip() if len(line1) > 31 else ""

    # Epoch Julian date
    jd_epoch = sat.jdsatepoch + sat.jdsatepochF

    points: List[Dict[str, Any]] = []
    alts = []
    lats = []
    lons = []
    speeds = []
    sgp4_errors = []

    num_steps = int(duration_min / step_min)
    for i in range(num_steps + 1):
        t_min = i * step_min
        jd_t = jd_epoch + (t_min / 1440.0)

        try:
            error_code, pos, vel = sat.sgp4(jd_t, 0.0)

            if error_code != 0:
                err_msg = SGP4_ERRORS.get(error_code, f"error {error_code}")
                sgp4_errors.append(f"t={t_min}min: {err_msg}")
                continue

            # Check for NaN/inf
            if any(math.isnan(p) or math.isinf(p) for p in pos + vel):
                sgp4_errors.append(f"t={t_min}min: NaN/inf in position/velocity")
                continue

            r = math.sqrt(pos[0]**2 + pos[1]**2 + pos[2]**2)
            v = math.sqrt(vel[0]**2 + vel[1]**2 + vel[2]**2)
            alt = r - EARTH_RADIUS_KM
            lat = math.degrees(math.asin(pos[2] / r)) if r > 0 else 0.0
            lon = math.degrees(math.atan2(pos[1], pos[0]))

            pt = PropagationPoint(
                t_min=round(t_min, 2),
                x_km=round(pos[0], 4),
                y_km=round(pos[1], 4),
                z_km=round(pos[2], 4),
                vx_kms=round(vel[0], 6),
                vy_kms=round(vel[1], 6),
                vz_kms=round(vel[2], 6),
                altitude_km=round(alt, 2),
                latitude_deg=round(lat, 4),
                longitude_deg=round(lon, 4),
                speed_kms=round(v, 6),
            )
            points.append(pt.to_dict())
            alts.append(alt)
            lats.append(lat)
            lons.append(lon)
            speeds.append(v)

        except Exception as exc:
            sgp4_errors.append(f"t={t_min}min: {exc}")

    result.points = points
    result.num_points = len(points)
    result.duration_min = duration_min
    result.step_min = step_min
    result.errors = sgp4_errors

    if points:
        result.success = True
        result.propagation_start = points[0]["t_min"]
        result.propagation_end = points[-1]["t_min"]

        # Compute summary statistics
        result.summary = {
            "altitude_min_km": round(min(alts), 2),
            "altitude_max_km": round(max(alts), 2),
            "altitude_mean_km": round(sum(alts) / len(alts), 2),
            "altitude_range_km": round(max(alts) - min(alts), 2),
            "speed_min_kms": round(min(speeds), 6),
            "speed_max_kms": round(max(speeds), 6),
            "speed_mean_kms": round(sum(speeds) / len(speeds), 6),
            "latitude_min_deg": round(min(lats), 2),
            "latitude_max_deg": round(max(lats), 2),
            "latitude_range_deg": round(max(lats) - min(lats), 2),
            "ground_track_lon_coverage_deg": round(max(lons) - min(lons), 2),
            "orbital_elements": {
                "inclination_deg": round(math.degrees(sat.inclo), 4),
                "eccentricity": round(sat.ecco, 7),
                "raan_deg": round(math.degrees(sat.nodeo), 4),
                "arg_perigee_deg": round(math.degrees(sat.argpo), 4),
                "mean_anomaly_deg": round(math.degrees(sat.mo), 4),
                "mean_motion_rev_day": round(sat.no * 1440.0 / (2 * math.pi), 8) if sat.no else 0.0,
                "bstar": round(sat.bstar, 6),
            },
            "period_estimated_min": 1440.0 / (sat.no * 1440.0 / (2 * math.pi)) if sat.no else 0.0,
            "regime": _classify_regime_alt(sum(alts) / len(alts)),
        }

    # Compute deterministic hash of propagation
    hash_input = f"{line1}|{line2}|{duration_min}|{step_min}"
    result.propagation_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:16]

    return result


def _classify_regime_alt(alt_km: float) -> str:
    if alt_km < 2000:
        return "LEO"
    elif alt_km < 35786 - 1000:
        return "MEO"
    elif abs(alt_km - 35786) < 1000:
        return "GEO"
    elif alt_km > 35786 + 1000:
        return "HEO"
    return "UNKNOWN"


def propagate_and_verify(
    line1: str,
    line2: str,
    claim_text: str = "",
    duration_min: float = 100.0,
    step_min: float = 1.0,
    name: str = "",
    source: str = "",
) -> Dict[str, Any]:
    """Propagate and run gate verification, returning combined evidence pack entry.

    Returns a dict with:
    - propagation: PropagationResult
    - gate_result: GateResult (from SGP4Gate)
    - claim_text: original claim
    - evidence_pack_id: unique ID
    """
    from .orbit_claims import classify_claim
    from .orbit_parser import extract_claim_fields
    from .orbit_evidence import OrbitEvidenceRecord
    from .orbit_replay import compute_replay_hash

    # Run propagation
    prop_result = propagate_tle(line1, line2, duration_min, step_min, name, source)

    # Run gate verification
    gate_result_data = None
    evidence_record = None
    if claim_text:
        claim_type, risk_label = classify_claim(claim_text)
        extracted = extract_claim_fields(claim_text)
        parsed = ParsedClaim(
            raw_text=claim_text,
            claim_type=claim_type,
            risk_label=risk_label,
            extracted_fields=extracted,
        )

        # Use SGP4Gate
        from .orbit_sgp4_gate import SGP4Gate
        gate = SGP4Gate()
        gate_result = gate.evaluate(parsed)
        gate_result_data = {
            "gate": gate_result.gate,
            "decision": gate_result.decision,
            "reason": gate_result.reason,
            "passing": gate_result.passing,
            "total": gate_result.total,
            "evidence": gate_result.evidence,
            "limitations": gate_result.limitations,
            "claim_type": gate_result.claim_type,
            "risk_label": gate_result.risk_label,
        }

        # Create evidence record
        replay_h = compute_replay_hash(claim_text)
        evidence_record = OrbitEvidenceRecord(
            case_id=f"EP-{prop_result.propagation_hash[:8]}",
            claim_type=claim_type.value,
            gate=gate_result.gate,
            decision=gate_result.decision,
            evidence_used=[f"SGP4 propagation: {prop_result.num_points} points, hash={prop_result.propagation_hash}"],
            limitations=gate_result.limitations,
            replay_hash=replay_h,
            timestamp_utc=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        )

    return {
        "propagation": prop_result.to_dict(),
        "gate_result": gate_result_data,
        "evidence_record": evidence_record.to_dict() if evidence_record else None,
        "claim_text": claim_text,
        "evidence_pack_id": f"OEP-{prop_result.propagation_hash[:12]}",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "version": "0.2.0",
        "disclaimer": "RESEARCH PROTOTYPE — Not flight certified. Not for mission-critical decisions.",
    }
