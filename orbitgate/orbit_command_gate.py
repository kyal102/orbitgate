"""Command gate — validates command sequence and launch readiness claims."""

from .orbit_types import GateResult, DecisionLabel, ParsedClaim
from .orbit_gates import BaseGate


class CommandGate(BaseGate):
    """Gate for validating command sequence and launch readiness claims.

    Rules:
    - Commands that disable safemode = BLOCK unless explicit evidence
    - Commands that disable comms = NEEDS_REVIEW or BLOCK
    - Commands that disable power safeguards = BLOCK
    - "execute command sequence" without safety review = NEEDS_REVIEW
    - Real spacecraft command execution = UNSUPPORTED
    - Launch readiness claims = BLOCK (out of scope for verification)
    """

    name = "CommandGate"

    # Patterns for disabling safety systems
    DISABLE_SAFEMODE = [
        "disable safemode", "disable safe mode", "disable safe-mode",
        "turn off safemode", "turn off safe mode", "turn off safe-mode",
        "override safemode", "override safe mode",
    ]

    DISABLE_COMMS = [
        "disable comms", "disable communications", "turn off comms",
        "disable transceiver", "turn off transceiver", "disable antenna",
        "shutdown comms", "shutdown communications",
        "disable all communications", "disable all comms",
    ]

    DISABLE_POWER = [
        "disable power safeguard", "disable power protection",
        "override power limit", "disable battery protection",
        "bypass power safety", "override thermal cutoff",
    ]

    BLOCKED_LAUNCH_PHRASES = [
        "launch readiness verified",
        "launch is ready",
        "ready to launch",
        "go for launch",
        "launch readiness confirmed",
        "launch approved",
    ]

    def evaluate(self, claim: ParsedClaim) -> GateResult:
        text = claim.raw_text.lower()
        fields = claim.extracted_fields
        errors: list = []
        warnings: list = []

        total_checks = 0
        passing_checks = 0

        # Check for launch readiness claims
        total_checks += 1
        launch_blocked = [p for p in self.BLOCKED_LAUNCH_PHRASES if p in text]
        if launch_blocked:
            errors.append(
                f"Launch readiness claim '{launch_blocked[0]}' — "
                f"out of scope for OrbitGate verification"
            )
        else:
            passing_checks += 1

        # Check for real spacecraft command execution
        total_checks += 1
        real_command_kws = [
            "execute command sequence",
            "send command to satellite",
            "upload to spacecraft",
            "command the spacecraft",
            "transmit command",
            "uplink command",
        ]
        has_real_command = any(kw in text for kw in real_command_kws)
        if has_real_command:
            errors.append(
                "Real spacecraft command execution is outside OrbitGate scope. "
                "OrbitGate is a research prototype and cannot command real spacecraft."
            )
        else:
            passing_checks += 1

        # Check for safemode disabling
        total_checks += 1
        safemode_disable = [p for p in self.DISABLE_SAFEMODE if p in text]
        if safemode_disable:
            has_evidence = any(kw in text for kw in [
                "explicit authorization", "mission control approved",
                "anomaly board", "director approval", "authorized by",
                "emergency", "safe mode re-enter",
            ])
            if not has_evidence:
                errors.append(
                    f"Safemode disable command '{safemode_disable[0]}' without explicit authorization evidence"
                )
            else:
                warnings.append(
                    f"Safemode disable command '{safemode_disable[0]}' — authorization evidence found, "
                    f"but requires human review"
                )
                passing_checks += 1
        else:
            passing_checks += 1

        # Check for comms disabling
        total_checks += 1
        comms_disable = [p for p in self.DISABLE_COMMS if p in text]
        if comms_disable:
            has_rationale = any(kw in text for kw in [
                "rfi", "interference", "safing", "safe mode",
                "emergency", "anomaly", "antenna deployment",
            ])
            if not has_rationale:
                errors.append(f"Comms disable command '{comms_disable[0]}' without rationale")
            else:
                warnings.append(
                    f"Comms disable command '{comms_disable[0]}' — rationale found, requires human review"
                )
                passing_checks += 1
        else:
            passing_checks += 1

        # Check for power safeguard disabling
        total_checks += 1
        power_disable = [p for p in self.DISABLE_POWER if p in text]
        if power_disable:
            has_evidence = any(kw in text for kw in [
                "authorized", "anomaly board", "mission control",
                "thermal analysis", "power analysis",
            ])
            if not has_evidence:
                errors.append(f"Power safeguard disable '{power_disable[0]}' without evidence")
            else:
                warnings.append(
                    f"Power safeguard disable '{power_disable[0]}' — evidence found, requires human review"
                )
                passing_checks += 1
        else:
            passing_checks += 1

        # Check for broad spacecraft action verbs — OrbitGate is read-only
        total_checks += 1
        action_verbs = [
            "fire thruster", "fire engine", "ignite thruster", "ignite engine",
            "rotate solar", "rotate antenna", "rotate panel", "point antenna",
            "deploy solar", "deploy antenna", "deploy panel", "deploy sail",
            "jettison", "release mechanism", "arm pyro",
            "turn on thruster", "turn off thruster",
            "raise orbit", "lower orbit", "change orbit",
            "adjust attitude", "correct attitude",
        ]
        has_action_verb = any(verb in text for verb in action_verbs)
        if has_action_verb and not has_real_command:
            errors.append(
                f"Claim contains direct spacecraft action '{[v for v in action_verbs if v in text][0]}' — "
                "OrbitGate is read-only verification and cannot command real spacecraft"
            )

        # Determine decision
        if errors:
            return self._make_result(
                DecisionLabel.BLOCK,
                "; ".join(errors),
                claim=claim,
                evidence={"matched_patterns": [v for v in action_verbs if v in text]},
                limitations=[
                    "Cannot verify command sequence correctness",
                    "Does not access spacecraft telemetry",
                ],
                passing=passing_checks,
                total=total_checks,
            )

        return self._make_result(
            DecisionLabel.ALLOW,
            "Command claim passed basic checks.",
            claim=claim,
            evidence={},
            limitations=[
                "Cannot verify command sequence correctness",
                "Does not access spacecraft telemetry",
                "Cannot validate real command execution",
            ],
            passing=passing_checks,
            total=total_checks,
        )