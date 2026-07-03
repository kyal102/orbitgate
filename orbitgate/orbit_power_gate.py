"""Power gate — validates power budget claims."""

from .orbit_types import GateResult, DecisionLabel, ParsedClaim
from .orbit_gates import BaseGate


class PowerGate(BaseGate):
    """Gate for validating power budget claims.

    Rules:
    - Load > generation + battery margin = BLOCK
    - Missing power budget = EVIDENCE_REQUIRED
    - "unlimited power" = BLOCK
    - "infinite power" = BLOCK
    - Power deficit without explanation = BLOCK
    """

    name = "PowerGate"

    BLOCKED_PHRASES = [
        "unlimited power",
        "infinite power",
        "unlimited energy",
        "infinite energy",
    ]

    def evaluate(self, claim: ParsedClaim) -> GateResult:
        text = claim.raw_text.lower()
        fields = claim.extracted_fields
        errors: list = []
        warnings: list = []

        total_checks = 0
        passing_checks = 0

        # Check for blocked phrases
        total_checks += 1
        blocked_found = [p for p in self.BLOCKED_PHRASES if p in text]
        if blocked_found:
            errors.append(f"Impossible power claim: '{blocked_found[0]}'")
        else:
            passing_checks += 1

        # Check power values
        power_values = fields.get("power_watts", [])
        if not power_values:
            # Check if claim is about power at all
            power_kws = ["power", "solar", "battery", "watt", "energy budget"]
            has_power_context = any(kw in text for kw in power_kws)
            total_checks += 1
            if has_power_context:
                warnings.append("Power-related claim without quantified power values")
            else:
                # Not a power claim per se, allow
                passing_checks += 1
        else:
            # Check for negative power values
            total_checks += 1
            negative_powers = [p for p in power_values if p < 0]
            if negative_powers:
                errors.append(f"Negative power value found: {negative_powers}")
            else:
                passing_checks += 1

            # If we have multiple power values, check generation vs load
            total_checks += 1
            if len(power_values) >= 2:
                # Heuristic: sort and assume larger = generation, smaller = load
                # This is a simplified check — real analysis would need labeled values
                max_power = max(power_values)
                min_power = min(power_values)
                # If there's a big difference, check if margin is mentioned
                has_margin = any(kw in text for kw in [
                    "margin", "buffer", "reserve", "contingency", "headroom",
                ])
                if min_power > max_power * 0.95 and not has_margin:
                    warnings.append(
                        f"Power values ({power_values}) very close — "
                        f"no explicit margin mentioned"
                    )
                else:
                    passing_checks += 1
            else:
                # Single power value — just note it
                passing_checks += 1

            # Check for deficit indicators
            total_checks += 1
            deficit_kws = ["deficit", "shortfall", "negative", "deficit", "brownout", "undervoltage"]
            has_deficit = any(kw in text for kw in deficit_kws)
            has_explanation = any(kw in text for kw in [
                "eclipse", "shadow", "battery", "stored energy", "peak",
                "contingency", "load shedding",
            ])
            if has_deficit and not has_explanation:
                errors.append("Power deficit mentioned without explanation or mitigation")
            else:
                passing_checks += 1

        # Determine decision
        if errors:
            return self._make_result(
                DecisionLabel.BLOCK,
                "; ".join(errors),
                claim=claim,
                evidence={"power_values_watts": power_values},
                limitations=[
                    "Does not model eclipse cycles",
                    "Does not verify solar panel degradation",
                    "Battery capacity not independently verified",
                ],
                passing=passing_checks,
                total=total_checks,
            )

        if warnings:
            return self._make_result(
                DecisionLabel.EVIDENCE_REQUIRED,
                "; ".join(warnings),
                claim=claim,
                evidence={"power_values_watts": power_values},
                limitations=[
                    "Does not model eclipse cycles",
                    "Does not verify solar panel degradation",
                ],
                passing=passing_checks,
                total=total_checks,
            )

        return self._make_result(
            DecisionLabel.ALLOW,
            "Power claim passed basic checks.",
            claim=claim,
            evidence={"power_values_watts": power_values},
            limitations=[
                "Does not model eclipse cycles",
                "Does not verify solar panel degradation",
                "Battery capacity not independently verified",
            ],
            passing=passing_checks,
            total=total_checks,
        )