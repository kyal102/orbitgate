"""Deorbit gate — validates deorbit and disposal claims."""

from .orbit_types import GateResult, DecisionLabel, ParsedClaim
from .orbit_gates import BaseGate


class DeorbitGate(BaseGate):
    """Gate for validating deorbit / re-entry / disposal claims.

    Rules:
    - "will deorbit safely" without evidence = EVIDENCE_REQUIRED
    - "no debris risk" = BLOCK
    - "guaranteed safe re-entry" = BLOCK
    - Regulatory compliance claim requires NEEDS_REVIEW
    - Missing orbital lifetime data = EVIDENCE_REQUIRED
    """

    name = "DeorbitGate"

    BLOCKED_PHRASES = [
        "no debris risk",
        "guaranteed safe re-entry",
        "guaranteed safe reentry",
        "zero debris risk",
        "no debris",
    ]

    EVIDENCE_REQUIRED_PHRASES = [
        "will deorbit safely",
        "safe deorbit",
        "safe re-entry",
        "safe reentry",
        "controlled deorbit",
    ]

    REGULATORY_INDICATORS = [
        "regulatory", "compliance", "fcc", "itu", "fcc",
        "federated", "17 cm", "25-year", "25 year", "debris mitigation",
        "uncops", "iadc",
    ]

    EVIDENCE_INDICATORS = [
        "orbital lifetime", "re-entry prediction", "reentry prediction",
        "drag area", "area-to-mass", "solar activity", "space weather",
        "f10.7", "ap index", "demise altitude", "casht",
        "drapa", "d-reentry",
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
            errors.append(f"Blocked phrase: '{blocked_found[0]}' — cannot guarantee zero debris risk")
        else:
            passing_checks += 1

        # Check guarantee keywords
        total_checks += 1
        guarantee_kws = fields.get("guarantee_keywords", [])
        dangerous_guarantees = [
            kw for kw in guarantee_kws
            if kw in ("guaranteed", "will never", "no risk", "zero risk", "impossible to fail")
        ]
        if dangerous_guarantees and not blocked_found:
            errors.append(f"Absolute guarantee in deorbit context: {dangerous_guarantees}")
        else:
            passing_checks += 1

        # Check for evidence-required phrases
        total_checks += 1
        evidence_required_found = [p for p in self.EVIDENCE_REQUIRED_PHRASES if p in text]
        if evidence_required_found:
            has_evidence = any(ind in text for ind in self.EVIDENCE_INDICATORS)
            if not has_evidence:
                warnings.append(
                    f"Deorbit safety claim '{evidence_required_found[0]}' "
                    f"without supporting evidence (orbital lifetime, re-entry prediction, etc.)"
                )
            else:
                passing_checks += 1
        else:
            passing_checks += 1

        # Check for regulatory claims
        total_checks += 1
        has_regulatory = any(ind in text for ind in self.REGULATORY_INDICATORS)
        if has_regulatory:
            warnings.append(
                "Regulatory compliance claim detected — requires human review for legal accuracy"
            )
        else:
            passing_checks += 1

        # Check for orbital lifetime data in deorbit context
        total_checks += 1
        is_deorbit_context = any(kw in text for kw in [
            "deorbit", "re-entry", "reentry", "disposal", "debris",
            "orbital decay", "end of life", "eol", "decommission",
        ])
        if is_deorbit_context:
            has_lifetime = any(kw in text for kw in self.EVIDENCE_INDICATORS)
            if not has_lifetime:
                warnings.append("Deorbit claim without orbital lifetime or re-entry prediction data")
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
                evidence={
                    "has_evidence": any(ind in text for ind in self.EVIDENCE_INDICATORS),
                    "has_regulatory": has_regulatory,
                },
                limitations=[
                    "Cannot verify re-entry survivability calculations",
                    "Does not model atmospheric breakup",
                    "Regulatory requirements vary by jurisdiction",
                ],
                passing=passing_checks,
                total=total_checks,
            )

        if warnings:
            # If regulatory is the only warning, use NEEDS_REVIEW
            if has_regulatory and len(warnings) == 1:
                return self._make_result(
                    DecisionLabel.NEEDS_REVIEW,
                    "; ".join(warnings),
                    claim=claim,
                    evidence={
                        "has_evidence": any(ind in text for ind in self.EVIDENCE_INDICATORS),
                        "has_regulatory": has_regulatory,
                    },
                    limitations=[
                        "Cannot verify re-entry survivability calculations",
                        "Does not model atmospheric breakup",
                        "Regulatory requirements vary by jurisdiction",
                    ],
                    passing=passing_checks,
                    total=total_checks,
                )

            return self._make_result(
                DecisionLabel.EVIDENCE_REQUIRED,
                "; ".join(warnings),
                claim=claim,
                evidence={
                    "has_evidence": any(ind in text for ind in self.EVIDENCE_INDICATORS),
                    "has_regulatory": has_regulatory,
                },
                limitations=[
                    "Cannot verify re-entry survivability calculations",
                    "Does not model atmospheric breakup",
                ],
                passing=passing_checks,
                total=total_checks,
            )

        return self._make_result(
            DecisionLabel.ALLOW,
            "Deorbit claim passed basic checks.",
            claim=claim,
            evidence={
                "has_evidence": any(ind in text for ind in self.EVIDENCE_INDICATORS),
                "has_regulatory": has_regulatory,
            },
            limitations=[
                "Cannot verify re-entry survivability calculations",
                "Does not model atmospheric breakup",
                "Regulatory requirements vary by jurisdiction",
            ],
            passing=passing_checks,
            total=total_checks,
        )