"""Comms gate — validates communications claims."""

from .orbit_types import GateResult, DecisionLabel, ParsedClaim
from .orbit_gates import BaseGate


class CommsGate(BaseGate):
    """Gate for validating communications / link budget claims.

    Rules:
    - "always connected" for LEO = BLOCK
    - "continuous coverage" for LEO = BLOCK
    - Ground station claim requires location/time evidence = EVIDENCE_REQUIRED
    - Missing link budget = EVIDENCE_REQUIRED
    - "guaranteed communication" = BLOCK
    """

    name = "CommsGate"

    BLOCKED_PHRASES = [
        "guaranteed communication",
        "guaranteed connectivity",
    ]

    LEO_BLOCKED_PHRASES = [
        "always connected",
        "continuous coverage",
        "always in contact",
        "continuous contact",
        "24/7 contact",
        "24/7 coverage",
        "24-7 contact",
        "non-stop contact",
    ]

    def evaluate(self, claim: ParsedClaim) -> GateResult:
        text = claim.raw_text.lower()
        fields = claim.extracted_fields
        errors: list = []
        warnings: list = []

        total_checks = 0
        passing_checks = 0

        orbit_regime = fields.get("orbit_regime", "")

        # Check for blocked guarantee phrases
        total_checks += 1
        blocked_found = [p for p in self.BLOCKED_PHRASES if p in text]
        if blocked_found:
            errors.append(f"Blocked guarantee phrase: '{blocked_found[0]}'")
        else:
            passing_checks += 1

        # Check LEO-specific blocked phrases
        total_checks += 1
        leo_blocked_found = [p for p in self.LEO_BLOCKED_PHRASES if p in text]
        if leo_blocked_found and orbit_regime == "LEO":
            errors.append(
                f"LEO satellites cannot have '{leo_blocked_found[0]}' — "
                f"LEO has natural contact gaps"
            )
        elif leo_blocked_found and not orbit_regime:
            # If regime not specified, still flag for LEO claims
            has_leo_indicator = any(kw in text for kw in [
                "leo", "low earth", "iss", "400 km", "550 km", "sun-synchronous",
            ])
            if has_leo_indicator:
                errors.append(
                    f"LEO context suggests '{leo_blocked_found[0]}' is invalid — "
                    f"LEO has natural contact gaps"
                )
            else:
                warnings.append(
                    f"'{leo_blocked_found[0]}' claim — orbit regime not confirmed LEO, "
                    f"but this is impossible for LEO satellites"
                )
        elif leo_blocked_found and orbit_regime in ("GEO", "MEO", "HEO"):
            # GEO can have continuous coverage
            passing_checks += 1
        else:
            passing_checks += 1

        # Check ground station claims
        total_checks += 1
        has_ground_station = "ground station" in text
        if has_ground_station:
            has_location = any(kw in text for kw in [
                "latitude", "longitude", "lat", "lon", "location",
                "svalbard", "poker flat", "mcmurdo", "kourou",
                "canberra", "goldstone", "madrid",
            ])
            has_time = any(kw in text for kw in [
                "pass time", "contact time", "aos", "los", "acquisition",
                "elevation", "azimuth",
            ])
            if not has_location and not has_time:
                warnings.append(
                    "Ground station claim without location or timing evidence"
                )
            else:
                passing_checks += 1
        else:
            passing_checks += 1

        # Check for link budget
        total_checks += 1
        has_link_budget = "link budget" in text
        has_comms_claim = any(kw in text for kw in [
            "comms", "communication", "contact", "ground station",
            "transmit", "receive", "data rate", "bit rate", "bandwidth",
            "antenna", "eb/n0", "snr",
        ])
        if has_comms_claim and not has_link_budget:
            warnings.append("Communications claim without link budget analysis")
        else:
            passing_checks += 1

        # Determine decision
        if errors:
            return self._make_result(
                DecisionLabel.BLOCK,
                "; ".join(errors),
                claim=claim,
                evidence={
                    "orbit_regime": orbit_regime,
                    "has_link_budget": has_link_budget,
                },
                limitations=[
                    "Does not compute link budgets",
                    "Does not verify antenna patterns or pointing",
                    "Atmospheric attenuation not modeled",
                ],
                passing=passing_checks,
                total=total_checks,
            )

        if warnings:
            return self._make_result(
                DecisionLabel.EVIDENCE_REQUIRED,
                "; ".join(warnings),
                claim=claim,
                evidence={
                    "orbit_regime": orbit_regime,
                    "has_link_budget": has_link_budget,
                },
                limitations=[
                    "Does not compute link budgets",
                    "Does not verify antenna patterns or pointing",
                ],
                passing=passing_checks,
                total=total_checks,
            )

        return self._make_result(
            DecisionLabel.ALLOW,
            "Communications claim passed basic checks.",
            claim=claim,
            evidence={
                "orbit_regime": orbit_regime,
                "has_link_budget": has_link_budget,
            },
            limitations=[
                "Does not compute link budgets",
                "Does not verify antenna patterns or pointing",
                "Atmospheric attenuation not modeled",
            ],
            passing=passing_checks,
            total=total_checks,
        )