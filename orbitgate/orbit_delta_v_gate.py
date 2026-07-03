"""Delta-V gate — validates maneuver and delta-v claims."""

from .orbit_types import GateResult, DecisionLabel, ParsedClaim
from .orbit_gates import BaseGate

# Thresholds
HIGH_DELTA_V_MS = 1000.0  # m/s — requires budget justification


class DeltaVGate(BaseGate):
    """Gate for validating delta-v / maneuver claims.

    Rules:
    - Blocks negative delta-v
    - Blocks zero-cost manoeuvres (delta-v=0 with altitude change)
    - Routes high delta-v (>1000 m/s) without budget to NEEDS_REVIEW
    - Blocks "guaranteed manoeuvre success" claims
    - Blocks "guaranteed orbit change" claims
    """

    name = "DeltaVGate"

    def evaluate(self, claim: ParsedClaim) -> GateResult:
        text = claim.raw_text.lower()
        fields = claim.extracted_fields
        errors: list = []
        warnings: list = []

        total_checks = 0
        passing_checks = 0

        # Check guarantee keywords
        guarantee_kws = fields.get("guarantee_keywords", [])
        total_checks += 1
        guarantee_blockers = [
            "guaranteed manoeuvre success", "guaranteed orbit change",
            "guaranteed maneuver success", "guaranteed",
        ]
        # Check text directly for specific blocked phrases
        blocked_phrases = [
            "guaranteed manoeuvre success",
            "guaranteed maneuver success",
            "guaranteed orbit change",
            "guaranteed to change orbit",
        ]
        blocked_found = [p for p in blocked_phrases if p in text]
        if blocked_found:
            errors.append(f"Blocked guarantee phrase: '{blocked_found[0]}'")
        else:
            passing_checks += 1

        # Check for negative delta-v
        delta_v_values = fields.get("delta_v_ms2", [])
        if delta_v_values:
            total_checks += 1
            negative_dvs = [dv for dv in delta_v_values if dv < 0]
            if negative_dvs:
                errors.append(f"Negative delta-v found: {negative_dvs}")
            else:
                passing_checks += 1

            # Check for zero delta-v with altitude change
            total_checks += 1
            altitudes = fields.get("altitudes_km", [])
            zero_dvs = [dv for dv in delta_v_values if dv == 0.0]
            has_alt_change = altitudes and any(kw in text for kw in ["raise", "lower", "change orbit", "altitude change", "transfer"])
            if zero_dvs and (has_alt_change or (altitudes and len(altitudes) >= 2)):
                errors.append("Zero delta-v claimed with altitude change — physically impossible")
            else:
                passing_checks += 1

            # Check for high delta-v without budget
            total_checks += 1
            max_dv = max(delta_v_values) if delta_v_values else 0
            if max_dv > HIGH_DELTA_V_MS:
                has_budget = any(kw in text for kw in [
                    "budget", "fuel budget", "propellant budget", "fuel available",
                    "propellant available", "delta-v budget", "dv budget",
                ])
                if not has_budget:
                    warnings.append(
                        f"High delta-v ({max_dv:.1f} m/s) without fuel budget justification"
                    )
                else:
                    passing_checks += 1
            else:
                passing_checks += 1

            # Check delta-v magnitude sanity
            total_checks += 1
            # LEO to GEO transfer is about 3900 m/s total
            # Interplanetary can be much higher but unusual for standard ops
            if max_dv > 20000:
                errors.append(f"Extremely high delta-v ({max_dv:.1f} m/s) — likely erroneous")
            else:
                passing_checks += 1
        else:
            # No delta-v values extracted
            if "maneuver" in text or "burn" in text:
                total_checks += 1
                errors.append("Maneuver/burn claim without quantified delta-v")
            else:
                total_checks += 1
                passing_checks += 1

        # Determine decision
        if errors:
            return self._make_result(
                DecisionLabel.BLOCK,
                "; ".join(errors),
                claim=claim,
                evidence={"delta_v_values_ms2": delta_v_values},
                limitations=[
                    "Does not verify thrust vector accuracy",
                    "Does not validate delta-v against spacecraft capability",
                    "Mass and Isp assumptions not checked",
                ],
                passing=passing_checks,
                total=total_checks,
            )

        if warnings:
            return self._make_result(
                DecisionLabel.NEEDS_REVIEW,
                "; ".join(warnings),
                claim=claim,
                evidence={"delta_v_values_ms2": delta_v_values},
                limitations=[
                    "Does not verify thrust vector accuracy",
                    "Does not validate delta-v against spacecraft capability",
                ],
                passing=passing_checks,
                total=total_checks,
            )

        return self._make_result(
            DecisionLabel.ALLOW,
            "Delta-v claim passed basic checks.",
            claim=claim,
            evidence={"delta_v_values_ms2": delta_v_values},
            limitations=[
                "Does not verify thrust vector accuracy",
                "Does not validate delta-v against spacecraft capability",
                "Mass and Isp assumptions not checked",
            ],
            passing=passing_checks,
            total=total_checks,
        )