"""Thermal gate — validates thermal control claims."""

from .orbit_types import GateResult, DecisionLabel, ParsedClaim
from .orbit_gates import BaseGate


class ThermalGate(BaseGate):
    """Gate for validating thermal control claims.

    Rules:
    - "thermal safe" without thermal model = EVIDENCE_REQUIRED
    - Temperature outside -100 to +100 Celsius default range = BLOCK (configurable)
    - "guaranteed thermal stability" = BLOCK
    - "no thermal risk" = EVIDENCE_REQUIRED
    - Missing thermal data = EVIDENCE_REQUIRED
    """

    name = "ThermalGate"

    BLOCKED_PHRASES = [
        "guaranteed thermal stability",
        "guaranteed thermal control",
    ]

    EVIDENCE_REQUIRED_PHRASES = [
        "thermal safe",
        "no thermal risk",
        "no thermal issues",
        "thermal is fine",
    ]

    def __init__(self, temp_min_c: float = -100.0, temp_max_c: float = 100.0):
        self.temp_min_c = temp_min_c
        self.temp_max_c = temp_max_c

    def evaluate(self, claim: ParsedClaim) -> GateResult:
        text = claim.raw_text.lower()
        fields = claim.extracted_fields
        errors: list = []
        warnings: list = []

        total_checks = 0
        passing_checks = 0

        # Check for blocked guarantee phrases
        total_checks += 1
        blocked_found = [p for p in self.BLOCKED_PHRASES if p in text]
        if blocked_found:
            errors.append(f"Blocked guarantee phrase: '{blocked_found[0]}'")
        else:
            passing_checks += 1

        # Check for evidence-required phrases
        total_checks += 1
        evidence_required_found = [p for p in self.EVIDENCE_REQUIRED_PHRASES if p in text]
        if evidence_required_found:
            has_model = any(kw in text for kw in [
                "thermal model", "thermal analysis", "thermal simulation",
                "esatan", "thermal desktop", "model", "analysis", "simulation",
            ])
            if not has_model:
                warnings.append(
                    f"Thermal safety claim '{evidence_required_found[0]}' "
                    f"without thermal model/analysis reference"
                )
            else:
                passing_checks += 1
        else:
            passing_checks += 1

        # Check temperature values
        temperatures = fields.get("temperatures_c", [])
        if temperatures:
            total_checks += 1
            out_of_range = [
                t for t in temperatures
                if t < self.temp_min_c or t > self.temp_max_c
            ]
            if out_of_range:
                errors.append(
                    f"Temperature(s) {out_of_range}°C outside reasonable range "
                    f"[{self.temp_min_c}, {self.temp_max_c}]°C for typical spacecraft"
                )
            else:
                passing_checks += 1
        else:
            # Check if claim is about thermal at all
            thermal_kws = ["thermal", "temperature", "heat", "cold", "thermal control"]
            has_thermal_context = any(kw in text for kw in thermal_kws)
            total_checks += 1
            if has_thermal_context:
                warnings.append("Thermal claim without quantified temperature values")
            else:
                passing_checks += 1

        # Check guarantee keywords more broadly
        total_checks += 1
        guarantee_kws = fields.get("guarantee_keywords", [])
        thermal_guarantees = [
            kw for kw in guarantee_kws
            if kw in ("guaranteed", "no risk", "zero risk")
        ]
        if thermal_guarantees and not blocked_found:
            # Already caught if it matches BLOCKED_PHRASES
            if any("thermal" in text for kw in thermal_guarantees):
                errors.append(f"Thermal guarantee found: {thermal_guarantees}")
            else:
                passing_checks += 1
        else:
            passing_checks += 1

        # Determine decision
        if errors:
            return self._make_result(
                DecisionLabel.BLOCK,
                "; ".join(errors),
                claim=claim,
                evidence={"temperatures_c": temperatures},
                limitations=[
                    f"Default temperature range [{self.temp_min_c}, {self.temp_max_c}]°C may not suit all missions",
                    "Does not verify thermal model accuracy",
                    "Eclipse/insolation transitions not modeled",
                ],
                passing=passing_checks,
                total=total_checks,
            )

        if warnings:
            return self._make_result(
                DecisionLabel.EVIDENCE_REQUIRED,
                "; ".join(warnings),
                claim=claim,
                evidence={"temperatures_c": temperatures},
                limitations=[
                    "Does not verify thermal model accuracy",
                    "Eclipse/insolation transitions not modeled",
                ],
                passing=passing_checks,
                total=total_checks,
            )

        return self._make_result(
            DecisionLabel.ALLOW,
            "Thermal claim passed basic checks.",
            claim=claim,
            evidence={"temperatures_c": temperatures},
            limitations=[
                f"Default temperature range [{self.temp_min_c}, {self.temp_max_c}]°C may not suit all missions",
                "Does not verify thermal model accuracy",
                "Eclipse/insolation transitions not modeled",
            ],
            passing=passing_checks,
            total=total_checks,
        )