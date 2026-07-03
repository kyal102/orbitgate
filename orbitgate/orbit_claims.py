"""OrbitGate claim classifier: maps claim text to ClaimType using pattern matching."""

import re
from typing import Tuple

from .orbit_types import ClaimType, RiskLabel


# Ordered list of (patterns, claim_type, risk_label) tuples.
# First match wins, so order matters — more specific patterns should come first.
_CLASSIFICATION_RULES: list = [
    # Flight certification (check before general command)
    (r"flight\s+cert", ClaimType.FLIGHT_CERTIFICATION_CLAIM, RiskLabel.FLIGHT_CERTIFICATION_CLAIM),
    (r"flight\s+safety", ClaimType.FLIGHT_CERTIFICATION_CLAIM, RiskLabel.FLIGHT_CERTIFICATION_CLAIM),
    (r"\bcertified\b", ClaimType.FLIGHT_CERTIFICATION_CLAIM, RiskLabel.FLIGHT_CERTIFICATION_CLAIM),

    # Launch readiness
    (r"launch\s+readiness", ClaimType.LAUNCH_READINESS_CLAIM, RiskLabel.REGULATORY_CLAIM),
    (r"\bliftoff\b", ClaimType.LAUNCH_READINESS_CLAIM, RiskLabel.REGULATORY_CLAIM),
    (r"\blaunch\b", ClaimType.LAUNCH_READINESS_CLAIM, RiskLabel.REGULATORY_CLAIM),

    # Command sequence (check before collision to avoid "command" matching collision patterns)
    (r"\btelecommand\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\btc\s", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\bcommand\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\bcmd\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\bexecute\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\bfire\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\bthruster\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\bignite\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\brotate\b.*\b(solar|antenna|panel|spacecraft)\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\bsend\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\bdisable\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\benable\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\bactivate\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\bdeploy\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),
    (r"\bjettison\b", ClaimType.COMMAND_SEQUENCE_CLAIM, RiskLabel.COMMAND_SAFETY_CLAIM),

    # Collision avoidance / conjunction
    (r"conjunction\s+data\s+message", ClaimType.COLLISION_AVOIDANCE_CLAIM, RiskLabel.COLLISION_RISK_CLAIM),
    (r"\bcollision\b", ClaimType.COLLISION_AVOIDANCE_CLAIM, RiskLabel.COLLISION_RISK_CLAIM),
    (r"\bconjunction\b", ClaimType.CONJUNCTION_CLAIM, RiskLabel.COLLISION_RISK_CLAIM),
    (r"close\s+approach", ClaimType.COLLISION_AVOIDANCE_CLAIM, RiskLabel.COLLISION_RISK_CLAIM),
    (r"miss\s+distance", ClaimType.COLLISION_AVOIDANCE_CLAIM, RiskLabel.COLLISION_RISK_CLAIM),

    # TLE
    (r"\btle\b", ClaimType.TLE_CLAIM, RiskLabel.ORBITAL_CLAIM),
    (r"two[\s-]line\s+element", ClaimType.TLE_CLAIM, RiskLabel.ORBITAL_CLAIM),

    # Orbit propagation
    (r"propagat", ClaimType.ORBIT_PROPAGATION_CLAIM, RiskLabel.ORBITAL_CLAIM),
    (r"\bephemeris\b", ClaimType.ORBIT_PROPAGATION_CLAIM, RiskLabel.ORBITAL_CLAIM),
    (r"orbit\s+predict", ClaimType.ORBIT_PROPAGATION_CLAIM, RiskLabel.ORBITAL_CLAIM),

    # Delta-v / maneuvers (must come after command patterns so 'fire thruster' matches command first)
    (r"delta[\s-]?v", ClaimType.DELTA_V_CLAIM, RiskLabel.MANEUVER_CLAIM),
    (r"\bhohmann\b", ClaimType.DELTA_V_CLAIM, RiskLabel.MANEUVER_CLAIM),
    (r"\bmaneuver\b", ClaimType.DELTA_V_CLAIM, RiskLabel.MANEUVER_CLAIM),
    (r"\bburn\b", ClaimType.DELTA_V_CLAIM, RiskLabel.MANEUVER_CLAIM),
    (r"\btransfer\b.*\borbit\b", ClaimType.DELTA_V_CLAIM, RiskLabel.MANEUVER_CLAIM),
    (r"\binsertion\b.*\b(geo|leo|meo)\b", ClaimType.DELTA_V_CLAIM, RiskLabel.MANEUVER_CLAIM),

    # Deorbit
    (r"\bdeorbit\b", ClaimType.DEORBIT_CLAIM, RiskLabel.DEORBIT_CLAIM),
    (r"\bre[\s-]entry\b", ClaimType.DEORBIT_CLAIM, RiskLabel.DEORBIT_CLAIM),
    (r"\bdisposal\b", ClaimType.DEORBIT_CLAIM, RiskLabel.DEORBIT_CLAIM),
    (r"\bdebris\b", ClaimType.DEORBIT_CLAIM, RiskLabel.DEORBIT_CLAIM),

    # Power budget
    (r"\bpower\b", ClaimType.POWER_BUDGET_CLAIM, RiskLabel.POWER_BUDGET_CLAIM),
    (r"\bsolar\b", ClaimType.POWER_BUDGET_CLAIM, RiskLabel.POWER_BUDGET_CLAIM),
    (r"\bbattery\b", ClaimType.POWER_BUDGET_CLAIM, RiskLabel.POWER_BUDGET_CLAIM),
    (r"\bwatt\b", ClaimType.POWER_BUDGET_CLAIM, RiskLabel.POWER_BUDGET_CLAIM),
    (r"\beclipse\b", ClaimType.POWER_BUDGET_CLAIM, RiskLabel.POWER_BUDGET_CLAIM),
    (r"energy\s+budget", ClaimType.POWER_BUDGET_CLAIM, RiskLabel.POWER_BUDGET_CLAIM),

    # Thermal
    (r"\bthermal\b", ClaimType.THERMAL_CLAIM, RiskLabel.THERMAL_CLAIM),
    (r"\btemperature\b", ClaimType.THERMAL_CLAIM, RiskLabel.THERMAL_CLAIM),
    (r"\bheat\b", ClaimType.THERMAL_CLAIM, RiskLabel.THERMAL_CLAIM),
    (r"\bcold\b", ClaimType.THERMAL_CLAIM, RiskLabel.THERMAL_CLAIM),
    (r"thermal\s+control", ClaimType.THERMAL_CLAIM, RiskLabel.THERMAL_CLAIM),

    # Communications
    (r"\bcomms\b", ClaimType.COMMS_WINDOW_CLAIM, RiskLabel.COMMS_CLAIM),
    (r"\bcommunication\b", ClaimType.COMMS_WINDOW_CLAIM, RiskLabel.COMMS_CLAIM),
    (r"link\s+budget", ClaimType.COMMS_WINDOW_CLAIM, RiskLabel.COMMS_CLAIM),
    (r"ground\s+station", ClaimType.GROUND_STATION_CLAIM, RiskLabel.COMMS_CLAIM),
    (r"\bcontact\b", ClaimType.COMMS_WINDOW_CLAIM, RiskLabel.COMMS_CLAIM),
    (r"\bcoverage\b", ClaimType.COMMS_WINDOW_CLAIM, RiskLabel.COMMS_CLAIM),
    (r"\bconnected\b", ClaimType.COMMS_WINDOW_CLAIM, RiskLabel.COMMS_CLAIM),
    (r"\bconnectivity\b", ClaimType.COMMS_WINDOW_CLAIM, RiskLabel.COMMS_CLAIM),
    (r"\bcontinuous\b.*\bcontact\b", ClaimType.COMMS_WINDOW_CLAIM, RiskLabel.COMMS_CLAIM),

    # Altitude (before inclination/period so 'orbits at 408 km' matches altitude first)
    (r"\baltitude\b", ClaimType.ALTITUDE_CLAIM, RiskLabel.ORBITAL_CLAIM),
    (r"\bheight\b", ClaimType.ALTITUDE_CLAIM, RiskLabel.ORBITAL_CLAIM),
    (r"\bapogee\b", ClaimType.ALTITUDE_CLAIM, RiskLabel.ORBITAL_CLAIM),
    (r"\bperigee\b", ClaimType.ALTITUDE_CLAIM, RiskLabel.ORBITAL_CLAIM),
    (r"\borbits?\s+at\b", ClaimType.ALTITUDE_CLAIM, RiskLabel.ORBITAL_CLAIM),
    (r"\bkm\s+altitude\b", ClaimType.ALTITUDE_CLAIM, RiskLabel.ORBITAL_CLAIM),

    # Inclination
    (r"\binclination\b", ClaimType.INCLINATION_CLAIM, RiskLabel.ORBITAL_CLAIM),
    (r"\binc\s", ClaimType.INCLINATION_CLAIM, RiskLabel.ORBITAL_CLAIM),
    (r"orbital\s+plane", ClaimType.INCLINATION_CLAIM, RiskLabel.ORBITAL_CLAIM),

    # Period
    (r"\bperiod\b", ClaimType.PERIOD_CLAIM, RiskLabel.ORBITAL_CLAIM),
    (r"orbital\s+period", ClaimType.PERIOD_CLAIM, RiskLabel.ORBITAL_CLAIM),
    (r"rev\s+per\s+day", ClaimType.PERIOD_CLAIM, RiskLabel.ORBITAL_CLAIM),
]


def _looks_like_tle(text: str) -> bool:
    """Check if text contains what looks like TLE data (lines starting with '1 ' and '2 ')."""
    lines = text.strip().splitlines()
    has_line1 = any(l.strip().startswith("1 ") and len(l.strip()) >= 10 for l in lines)
    has_line2 = any(l.strip().startswith("2 ") and len(l.strip()) >= 10 for l in lines)
    return has_line1 and has_line2


def classify_claim(text: str) -> Tuple[ClaimType, RiskLabel]:
    """Classify a claim text string into a ClaimType and RiskLabel.

    Uses ordered pattern matching. First matching rule wins.
    Falls back to UNSUPPORTED_SPACE_CLAIM / RESEARCH_ONLY.
    """
    text_lower = text.lower()

    # Pre-check: raw TLE data (lines starting with '1 ' and '2 ') without keyword
    if _looks_like_tle(text):
        return ClaimType.TLE_CLAIM, RiskLabel.ORBITAL_CLAIM

    for pattern, claim_type, risk_label in _CLASSIFICATION_RULES:
        if re.search(pattern, text_lower):
            return claim_type, risk_label
    return ClaimType.UNSUPPORTED_SPACE_CLAIM, RiskLabel.RESEARCH_ONLY