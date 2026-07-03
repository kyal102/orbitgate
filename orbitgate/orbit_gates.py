"""OrbitGate base gate class and TLE gate."""

from abc import ABC, abstractmethod
from typing import List

from .orbit_types import GateResult, DecisionLabel, ParsedClaim, ClaimType, RiskLabel
from .orbit_parser import parse_tle


class BaseGate(ABC):
    """Abstract base class for all OrbitGate gates."""

    name: str = "BaseGate"

    @abstractmethod
    def evaluate(self, claim: ParsedClaim) -> GateResult:
        """Evaluate a parsed claim and return a gate result."""
        pass

    def _make_result(
        self,
        decision: DecisionLabel,
        reason: str,
        claim: ParsedClaim | None = None,
        evidence: dict | None = None,
        limitations: list | None = None,
        passing: int = 0,
        total: int = 0,
    ) -> GateResult:
        """Helper to construct a GateResult."""
        return GateResult(
            gate=self.name,
            decision=decision.value,
            reason=reason,
            claim_type=claim.claim_type.value if claim else "",
            risk_label=claim.risk_label.value if claim else "",
            evidence=evidence or {},
            limitations=limitations or [],
            passing=passing,
            total=total,
        )


class TLEGate(BaseGate):
    """Gate for validating Two-Line Element Set claims."""

    name = "TLEGate"

    def evaluate(self, claim: ParsedClaim) -> GateResult:
        text = claim.raw_text
        fields = claim.extracted_fields

        # Extract TLE lines from the text
        tle_lines = self._extract_tle_lines(text)
        if not tle_lines:
            return self._make_result(
                DecisionLabel.EVIDENCE_REQUIRED,
                "No TLE data found in claim text. Provide a valid two-line element set.",
                claim=claim,
            )

        tle_text = "\n".join(tle_lines)
        parsed = parse_tle(tle_text)

        if not parsed["valid"]:
            errors = parsed["errors"]
            # Check severity
            critical_errors = [
                e for e in errors
                if any(kw in e.lower() for kw in [
                    "must have", "must start", "mismatch", "too short"
                ])
            ]
            if critical_errors:
                return self._make_result(
                    DecisionLabel.BLOCK,
                    f"Malformed TLE: {'; '.join(critical_errors)}",
                    claim=claim,
                    evidence={"tle_parsed": parsed["fields"], "tle_errors": errors},
                    limitations=["TLE format validation only; does not verify orbital accuracy"],
                )

            # Non-critical: route to review
            return self._make_result(
                DecisionLabel.NEEDS_REVIEW,
                f"Questionable TLE: {'; '.join(errors)}",
                claim=claim,
                evidence={"tle_parsed": parsed["fields"], "tle_errors": errors},
                limitations=["TLE format validation only; does not verify orbital accuracy"],
            )

        # Valid TLE
        return self._make_result(
            DecisionLabel.ALLOW,
            "TLE structure is valid. Format checks passed.",
            claim=claim,
            evidence={"tle_parsed": parsed["fields"]},
            limitations=[
                "TLE format validation only — does not verify source authenticity",
                "Does not confirm orbital accuracy against independent measurements",
                "No propagation or time-decay verification performed",
            ],
            passing=1,
            total=1,
        )

    def _extract_tle_lines(self, text: str) -> list:
        """Extract TLE line pairs from text.

        TLE lines start with '1 ' and '2 ' respectively and are 69+ chars long.
        """
        lines = text.strip().splitlines()
        tle_lines: list = []
        for line in lines:
            stripped = line.rstrip()
            if len(stripped) >= 10 and (stripped.startswith("1 ") or stripped.startswith("2 ")):
                tle_lines.append(stripped)
        return tle_lines