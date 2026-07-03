"""OrbitGate claim boundary checker: blocks system-level false claims."""

import re
from typing import List, Tuple

from .orbit_types import DecisionLabel


class ClaimBoundaryChecker:
    """Checks claims against blocked and allowed system-level claim patterns.

    This is a separate safety layer that prevents OrbitGate from being
    misrepresented. It operates independently of the gate system.
    """

    BLOCKED_CLAIMS: List[str] = [
        "OrbitGate guarantees orbital safety",
        "OrbitGate controls satellites",
        "OrbitGate replaces mission control",
        "OrbitGate replaces NASA",
        "OrbitGate replaces ESA",
        "OrbitGate guarantees collision avoidance",
        "OrbitGate proves launch readiness",
        "OrbitGate is flight certified",
        "OrbitGate is defence ready",
        "OrbitGate proves regulatory compliance",
        "OrbitGate is production ready",
        "OrbitGate can autonomously command spacecraft",
    ]

    ALLOWED_CLAIMS: List[str] = [
        "OrbitGate is a public research prototype",
        "deterministic checking of AI-generated orbital claims",
        "routes orbital claims through deterministic gates",
        "blocks or reviews unsupported claims",
        "does not provide flight certification",
        "does not control real spacecraft",
    ]

    def check_claim(self, text: str) -> Tuple[DecisionLabel, str]:
        """Check a claim against blocked and allowed lists.

        Args:
            text: The claim text to check.

        Returns:
            Tuple of (DecisionLabel, reason).
            - BLOCK if the claim matches a blocked pattern
            - ALLOW if the claim matches an allowed pattern
            - DecisionLabel.ALLOW with info message if neither matched
        """
        text_lower = text.lower().strip()

        # Check blocked claims
        for blocked in self.BLOCKED_CLAIMS:
            if blocked.lower() in text_lower:
                return (
                    DecisionLabel.BLOCK,
                    f"Blocked system claim: '{blocked}'. "
                    f"OrbitGate is a research prototype and cannot make this claim.",
                )

        # Check allowed claims
        for allowed in self.ALLOWED_CLAIMS:
            if allowed.lower() in text_lower:
                return (
                    DecisionLabel.ALLOW,
                    f"Allowed system claim: '{allowed}'",
                )

        # Neither blocked nor allowed — neutral
        return (
            DecisionLabel.ALLOW,
            "Claim does not match any blocked or allowed system-level patterns.",
        )