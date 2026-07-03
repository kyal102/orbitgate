"""Collision gate — validates collision avoidance and conjunction claims."""

from .orbit_types import GateResult, DecisionLabel, ParsedClaim
from .orbit_gates import BaseGate


class CollisionGate(BaseGate):
    """Gate for validating collision risk / conjunction claims.

    Rules:
    - "no collision risk" without conjunction data = BLOCK or EVIDENCE_REQUIRED
    - "guaranteed safe orbit" = BLOCK
    - "will never collide" = BLOCK
    - Collision claims require evidence source
    - Cannot certify collision avoidance
    - Any claim of zero collision probability = EVIDENCE_REQUIRED or BLOCK
    """

    name = "CollisionGate"

    # Phrases that are immediately blocked
    BLOCKED_PHRASES = [
        "guaranteed safe orbit",
        "will never collide",
        "zero collision risk",
        "zero probability of collision",
        "collision free",
        "collision-free",
        "no collision risk",
        "impossible to collide",
        "avoid all collisions",
        "will avoid all collisions",
    ]

    # Phrases requiring evidence
    EVIDENCE_PHRASES = [
        "no collision risk",
        "collision probability is zero",
        "probability of collision is zero",
        "safe orbit",
        "orbit is safe",
        "safe from collision",
    ]

    # Evidence indicators that partially satisfy the requirement
    EVIDENCE_INDICATORS = [
        "conjunction data message",
        "cdm",
        "conjunction assessment",
        "space-track",
        "cspoc",
        "18th sds",
        "eu satcen",
        "leo lab",
        "numerica",
        "exodus analytics",
        "kayhan space",
        "slingshot aerospace",
        "miss distance",
        "tca",
        "time of closest approach",
        "probability of collision",
        "pc =",
        "pc=",
        "p_c",
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
            errors.append(f"Blocked absolute safety claim: '{blocked_found[0]}'")
        else:
            passing_checks += 1

        # Check for zero probability claims
        total_checks += 1
        zero_prob_patterns = [
            "probability of collision is zero",
            "pc = 0",
            "pc=0",
            "pc = 0.0",
            "pc=0.0",
            "collision probability is 0",
            "zero probability of collision",
        ]
        zero_found = [p for p in zero_prob_patterns if p in text]
        if zero_found:
            errors.append(f"Zero collision probability claimed: '{zero_found[0]}' — cannot be certified")
        else:
            passing_checks += 1

        # Check for guarantee keywords
        total_checks += 1
        guarantee_kws = fields.get("guarantee_keywords", [])
        dangerous_guarantees = [
            kw for kw in guarantee_kws
            if kw in ("guaranteed", "will never", "no risk", "zero risk", "impossible to fail", "always safe")
        ]
        if dangerous_guarantees and not blocked_found:
            # Already caught by blocked phrases check mostly, but catch edge cases
            errors.append(f"Absolute guarantee in collision context: {dangerous_guarantees}")
        elif not dangerous_guarantees:
            passing_checks += 1

        # Check for evidence source
        total_checks += 1
        has_evidence = any(ind in text for ind in self.EVIDENCE_INDICATORS)
        collision_kws = fields.get("collision_keywords", [])
        if collision_kws and not has_evidence:
            warnings.append(
                "Collision/conjunction claim without evidence source "
                "(e.g., CDM, space-track, conjunction assessment)"
            )
        elif collision_kws and has_evidence:
            passing_checks += 1
        else:
            # No collision keywords found
            passing_checks += 1

        # Determine decision
        if errors:
            return self._make_result(
                DecisionLabel.BLOCK,
                "; ".join(errors),
                claim=claim,
                evidence={
                    "collision_keywords": collision_kws,
                    "has_evidence_source": has_evidence,
                },
                limitations=[
                    "Cannot independently verify collision probability calculations",
                    "Does not access live conjunction data",
                    "Cannot certify collision avoidance",
                    "Does not replace CDM analysis by space surveillance entities",
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
                    "collision_keywords": collision_kws,
                    "has_evidence_source": has_evidence,
                },
                limitations=[
                    "Cannot independently verify collision probability calculations",
                    "Does not access live conjunction data",
                ],
                passing=passing_checks,
                total=total_checks,
            )

        return self._make_result(
            DecisionLabel.ALLOW,
            "Collision claim includes evidence source and avoids absolute guarantees.",
            claim=claim,
            evidence={
                "collision_keywords": collision_kws,
                "has_evidence_source": has_evidence,
            },
            limitations=[
                "Cannot independently verify collision probability calculations",
                "Does not access live conjunction data",
                "Cannot certify collision avoidance",
            ],
            passing=passing_checks,
            total=total_checks,
        )