"""SGP4 propagation gate — validates orbit propagation claims with real SGP4."""

import math
from typing import Optional, Dict, Any

from .orbit_types import GateResult, DecisionLabel, ParsedClaim, ClaimType, RiskLabel
from .orbit_gates import BaseGate

# Try importing sgp4; if unavailable, gate will use fallback mode
try:
    from sgp4.api import Satrec, SGP4_ERRORS
    _SGP4_AVAILABLE = True
except ImportError:
    _SGP4_AVAILABLE = False

# Physical constants
EARTH_RADIUS_KM = 6371.0

# Default epoch offset range in days
DEFAULT_EPOCH_MIN_DAYS = 0
DEFAULT_EPOCH_MAX_DAYS = 365


class SGP4Gate(BaseGate):
    """Gate for validating orbit propagation claims with real SGP4.

    If sgp4 is available, runs real propagation and checks:
    - NaN/inf values in orbital elements
    - Propagation stability over multiple orbits
    - Physical plausibility of trajectory
    - Perigee altitude bounds

    If sgp4 is unavailable, returns EVIDENCE_REQUIRED.
    """

    name = "SGP4Gate"

    def __init__(
        self,
        epoch_min_days: float = DEFAULT_EPOCH_MIN_DAYS,
        epoch_max_days: float = DEFAULT_EPOCH_MAX_DAYS,
    ):
        self.epoch_min_days = epoch_min_days
        self.epoch_max_days = epoch_max_days

    def evaluate(self, claim: ParsedClaim) -> GateResult:
        if not _SGP4_AVAILABLE:
            return self._make_result(
                DecisionLabel.EVIDENCE_REQUIRED,
                "SGP4 library not available. Cannot verify propagation claims. "
                "Install sgp4 package to enable this gate.",
                claim=claim,
                limitations=["sgp4 library not installed"],
            )

        text = claim.raw_text
        fields = claim.extracted_fields

        # Try to find TLE in the text
        tle_lines = self._extract_tle_lines(text)
        if len(tle_lines) < 2:
            return self._make_result(
                DecisionLabel.EVIDENCE_REQUIRED,
                "No valid TLE found in claim. Cannot propagate without TLE data.",
                claim=claim,
            )

        line1 = tle_lines[-2]
        line2 = tle_lines[-1]

        # Parse with sgp4
        try:
            sat = Satrec.twoline2rv(line1, line2)
        except Exception as exc:
            return self._make_result(
                DecisionLabel.BLOCK,
                f"SGP4 failed to parse TLE: {exc}",
                claim=claim,
            )

        errors: list = []
        warnings: list = []
        total_checks = 0
        passing_checks = 0
        propagation_data: Dict[str, Any] = {}

        # === Check 1: Orbital elements sanity ===
        orbital_attrs = ["ecco", "inclo", "nodeo", "argpo", "mo", "no", "ndot", "nddot", "bstar"]
        orbital_values = {}
        for attr in orbital_attrs:
            total_checks += 1
            try:
                val = getattr(sat, attr, None)
                if val is not None:
                    orbital_values[attr] = val
                    if math.isnan(val) or math.isinf(val):
                        errors.append(f"Orbital element '{attr}' is NaN or inf")
                    else:
                        passing_checks += 1
            except Exception:
                errors.append(f"Cannot read orbital element '{attr}'")

        # === Check 2: Epoch Julian date range ===
        total_checks += 1
        try:
            jd = sat.jdsatepoch + sat.jdsatepochF
            if jd < 2400000.5 or jd > 2500000.5:
                errors.append(f"Suspicious epoch Julian date: {jd}")
            else:
                passing_checks += 1
                propagation_data["epoch_jd"] = round(jd, 6)
        except Exception:
            errors.append("Cannot read epoch from TLE")

        # === Check 3: Real propagation — propagate for 2 orbits ===
        propagation_points = []
        sgp4_error_count = 0

        # Estimate period from mean motion
        try:
            no_rad_min = sat.no  # rad/min
            if no_rad_min and no_rad_min > 0:
                period_min = (2 * math.pi) / no_rad_min
                propagation_data["period_min"] = round(period_min, 2)
                # Propagate for 2 orbits
                duration = min(period_min * 2, 200)
            else:
                duration = 100.0
        except Exception:
            duration = 100.0

        propagation_data["duration_min"] = round(duration, 2)
        step = 1.0  # 1 minute steps
        num_steps = int(duration / step)

        altitudes = []
        speeds = []

        for i in range(num_steps + 1):
            t = i * step
            jd_t = jd + (t / 1440.0)

            total_checks += 1
            try:
                error_code, position, velocity = sat.sgp4(jd_t, 0.0)
                if error_code != 0:
                    error_msg = SGP4_ERRORS.get(error_code, f"error {error_code}")
                    errors.append(f"SGP4 error at t={t}min: {error_msg}")
                    sgp4_error_count += 1
                    continue

                # Check NaN/inf
                if any(math.isnan(p) or math.isinf(p) for p in position + velocity):
                    errors.append(f"NaN/inf at t={t}min")
                    sgp4_error_count += 1
                    continue

                r = math.sqrt(position[0]**2 + position[1]**2 + position[2]**2)
                v = math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2)
                alt = r - EARTH_RADIUS_KM

                altitudes.append(alt)
                speeds.append(v)

                if i % 10 == 0:  # Store every 10th point
                    lat = math.degrees(math.asin(position[2] / r)) if r > 0 else 0.0
                    lon = math.degrees(math.atan2(position[1], position[0]))
                    propagation_points.append({
                        "t_min": t,
                        "alt_km": round(alt, 2),
                        "lat": round(lat, 3),
                        "lon": round(lon, 3),
                        "speed_kms": round(v, 4),
                    })

                passing_checks += 1

            except Exception as exc:
                errors.append(f"Propagation failed at t={t}min: {exc}")
                sgp4_error_count += 1

        # === Check 4: Perigee altitude bounds ===
        if altitudes:
            min_alt = min(altitudes)
            max_alt = max(altitudes)
            mean_alt = sum(altitudes) / len(altitudes)
            propagation_data["altitude"] = {
                "min_km": round(min_alt, 2),
                "max_km": round(max_alt, 2),
                "mean_km": round(mean_alt, 2),
                "range_km": round(max_alt - min_alt, 2),
            }

            total_checks += 1
            if min_alt < 100:
                errors.append(f"Perigee altitude {min_alt:.1f} km is below 100 km — reentry imminent")
            elif min_alt < 150:
                warnings.append(f"Perigee altitude {min_alt:.1f} km is low — significant drag expected")
            else:
                passing_checks += 1

            # Check altitude range is reasonable for orbit type
            total_checks += 1
            alt_range = max_alt - min_alt
            if alt_range > 10000:
                errors.append(f"Altitude range {alt_range:.1f} km is unusually large — HEO check recommended")
            else:
                passing_checks += 1
        else:
            total_checks += 2  # Count the checks we couldn't perform

        # === Check 5: Speed bounds ===
        if speeds:
            propagation_data["speed"] = {
                "min_kms": round(min(speeds), 4),
                "max_kms": round(max(speeds), 4),
                "mean_kms": round(sum(speeds) / len(speeds), 4),
            }

            total_checks += 1
            if min(speeds) < 0.5:
                errors.append(f"Orbital speed {min(speeds):.4f} km/s is too low — check TLE validity")
            elif min(speeds) > 11.0:
                errors.append(f"Orbital speed {min(speeds):.4f} km/s is too high — escape velocity check")
            else:
                passing_checks += 1
        else:
            total_checks += 1

        # === Check 6: SGP4 error rate ===
        total_checks += 1
        error_rate = sgp4_error_count / max(num_steps + 1, 1)
        propagation_data["sgp4_error_rate"] = round(error_rate, 4)
        propagation_data["sgp4_errors"] = sgp4_error_count
        propagation_data["total_steps"] = num_steps + 1
        propagation_data["propagation_points_sample"] = propagation_points

        if error_rate > 0.1:
            errors.append(f"SGP4 error rate {error_rate:.1%} is too high — TLE may be stale or invalid")
        elif error_rate > 0:
            warnings.append(f"SGP4 error rate {error_rate:.1%} — some propagation steps failed")
        else:
            passing_checks += 1

        # === Determine decision ===
        if errors:
            blocking = [e for e in errors if any(k in e.lower() for k in ["nan", "inf", "failed", "below", "too low", "too high", "too large", "stale", "invalid"])]
            if blocking:
                decision = DecisionLabel.BLOCK
                reason = f"SGP4 propagation produced invalid results: {'; '.join(blocking)}"
            else:
                decision = DecisionLabel.NEEDS_REVIEW
                reason = f"SGP4 propagation has issues: {'; '.join(errors)}"
        else:
            decision = DecisionLabel.ALLOW
            summary = propagation_data.get("altitude", {})
            reason = (
                f"SGP4 real propagation completed: {len(altitudes)} points over {duration:.0f} min, "
                f"altitude {summary.get('min_km', '?')}-{summary.get('max_km', '?')} km, "
                f"mean {summary.get('mean_km', '?')} km. All checks passed."
            )

        evidence = {
            "sgp4_checks": {
                "passing": passing_checks,
                "total": total_checks,
                "errors": errors,
                "warnings": warnings,
            },
            "propagation": propagation_data,
        }

        limitations = [
            "SGP4 is a simplified perturbation model — not a high-fidelity propagator",
            "Does not verify source TLE accuracy or freshness",
            "Does not claim certified accuracy",
            "Atmospheric drag model uses default constants only",
            "No solar radiation pressure or lunar/solar perturbation validation",
            "RESEARCH PROTOTYPE — Not flight certified",
        ]

        return self._make_result(
            decision,
            reason,
            claim=claim,
            evidence=evidence,
            limitations=limitations,
            passing=passing_checks,
            total=total_checks,
        )

    def _extract_tle_lines(self, text: str) -> list:
        """Extract TLE line pairs from text."""
        lines = text.strip().splitlines()
        tle_lines: list = []
        for line in lines:
            stripped = line.rstrip()
            if len(stripped) >= 10 and (stripped.startswith("1 ") or stripped.startswith("2 ")):
                tle_lines.append(stripped)
        return tle_lines