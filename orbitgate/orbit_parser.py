"""OrbitGate parsers: TLE validation and claim text field extraction."""

import re
from typing import Any, Dict, List, Optional, Tuple


def parse_tle(tle_text: str) -> Dict[str, Any]:
    """Validate and parse a two-line element set.

    Returns a dict with 'valid' (bool), 'fields' (dict), and 'errors' (list).
    """
    lines = tle_text.strip().splitlines()
    # Trim and filter empty lines
    lines = [l.rstrip() for l in lines if l.strip()]

    result: Dict[str, Any] = {"valid": False, "fields": {}, "errors": []}

    if len(lines) < 2:
        result["errors"].append("TLE must have at least two lines")
        return result

    line1 = lines[-2]
    line2 = lines[-1]

    # Check line lengths (standard TLE lines are 69 characters)
    if len(line1) < 69:
        result["errors"].append(f"Line 1 too short: {len(line1)} chars (expected 69)")
    if len(line2) < 69:
        result["errors"].append(f"Line 2 too short: {len(line2)} chars (expected 69)")

    # Check line number identifiers
    if not line1.startswith("1 "):
        result["errors"].append("Line 1 must start with '1 '")
    if not line2.startswith("2 "):
        result["errors"].append("Line 2 must start with '2 '")

    # Extract satellite numbers
    try:
        sat_num_1 = line1[2:7].strip()
        sat_num_2 = line2[2:7].strip()
        result["fields"]["satellite_number"] = sat_num_1
        if sat_num_1 != sat_num_2:
            result["errors"].append(
                f"Satellite number mismatch: line1='{sat_num_1}' vs line2='{sat_num_2}'"
            )
    except (IndexError, ValueError):
        result["errors"].append("Cannot extract satellite number")

    # Extract and validate epoch (line 1, columns 19-32, 0-indexed: 18-31)
    try:
        epoch_str = line1[18:32].strip()
        result["fields"]["epoch"] = epoch_str
        # Basic epoch format check: YYDDD.DDDDDDDD (5 digits + decimal)
        if not re.match(r"^\d{5}\.\d+", epoch_str):
            result["errors"].append(f"Epoch format invalid: '{epoch_str}'")
    except (IndexError, ValueError):
        result["errors"].append("Cannot extract epoch")

    # Extract inclination (line 2, columns 9-16)
    try:
        inc_str = line2[8:16].strip()
        inc_val = float(inc_str)
        result["fields"]["inclination_deg"] = inc_val
        if not (0.0 <= inc_val <= 180.0):
            result["errors"].append(f"Inclination out of range [0, 180]: {inc_val}")
    except (IndexError, ValueError):
        result["errors"].append("Cannot extract inclination")

    # Extract eccentricity (line 2, columns 27-33, 0-indexed: 26-32, implied decimal)
    try:
        ecc_str = line2[26:33].strip()
        ecc_val = float("0." + ecc_str)
        result["fields"]["eccentricity"] = ecc_val
        if not (0.0 <= ecc_val < 1.0):
            result["errors"].append(f"Eccentricity out of range [0, 1): {ecc_val}")
    except (IndexError, ValueError):
        result["errors"].append("Cannot extract eccentricity")

    # Extract mean motion (line 2, columns 53-63, 0-indexed: 52-62)
    try:
        mm_str = line2[52:63].strip()
        mm_val = float(mm_str)
        result["fields"]["mean_motion_rev_per_day"] = mm_val
        if mm_val <= 0:
            result["errors"].append(f"Mean motion must be positive: {mm_val}")
    except (IndexError, ValueError):
        result["errors"].append("Cannot extract mean motion")

    # Extract RAAN (line 2, columns 17-25, 0-indexed: 16-24)
    try:
        raan_str = line2[16:24].strip()
        raan_val = float(raan_str)
        result["fields"]["raan_deg"] = raan_val
    except (IndexError, ValueError):
        pass

    # Extract argument of perigee (line 2, columns 34-42, 0-indexed: 33-41)
    try:
        argp_str = line2[33:42].strip()
        argp_val = float(argp_str)
        result["fields"]["argument_of_perigee_deg"] = argp_val
    except (IndexError, ValueError):
        pass

    # Extract mean anomaly (line 2, columns 44-51, 0-indexed: 43-51)
    try:
        ma_str = line2[43:51].strip()
        ma_val = float(ma_str)
        result["fields"]["mean_anomaly_deg"] = ma_val
    except (IndexError, ValueError):
        pass

    # Extract revolution number at epoch (line 2, columns 64-68, 0-indexed: 63-68)
    try:
        rev_str = line2[63:68].strip()
        rev_val = int(float(rev_str))
        result["fields"]["revolution_number"] = rev_val
    except (IndexError, ValueError):
        pass

    # Extract classification
    try:
        classification = line1[7:8].strip()
        result["fields"]["classification"] = classification
    except (IndexError, ValueError):
        pass

    # Extract element number
    try:
        el_num = line1[64:68].strip()
        result["fields"]["element_number"] = el_num
    except (IndexError, ValueError):
        pass

    # Extract checksum digits
    try:
        checksum1 = line1[68:69]
        checksum2 = line2[68:69]
        result["fields"]["checksum_line1"] = checksum1
        result["fields"]["checksum_line2"] = checksum2
    except (IndexError, ValueError):
        pass

    if not result["errors"]:
        result["valid"] = True

    return result


def extract_claim_fields(text: str) -> Dict[str, Any]:
    """Extract numeric values and keywords from claim text.

    Returns a dict with keys like 'delta_v_ms2', 'altitudes_km', etc.
    """
    fields: Dict[str, Any] = {}
    text_lower = text.lower()

    # Delta-v: patterns like "12.5 m/s", "delta-v of 200 m/s", "-50 m/s", "0.5 km/s"
    delta_v_pattern = r"(?:delta[\s-]?v|\b\d+(?:\.\d+)?)\s*(?:of\s+)?([+-]?\d+(?:\.\d+)?)\s*(m/s|km/s|ms\b|cms\b|mm/s)"
    for m in re.finditer(delta_v_pattern, text_lower):
        val = float(m.group(1))
        unit = m.group(2)
        if unit == "km/s":
            val_ms = val * 1000.0
        elif unit in ("cm/s", "cms"):
            val_ms = val / 100.0
        elif unit == "mm/s":
            val_ms = val / 1000.0
        else:
            val_ms = val
        if "delta_v_ms2" not in fields:
            fields["delta_v_ms2"] = []
        fields["delta_v_ms2"].append(val_ms)

    # Also match standalone "delta-v: X m/s" or "dv = X m/s"
    dv_standalone = r"(?:dv|delta[\s-]v)\s*[=:~]\s*([+-]?\d+(?:\.\d+)?)\s*(m/s|km/s)"
    for m in re.finditer(dv_standalone, text_lower):
        val = float(m.group(1))
        unit = m.group(2)
        if unit == "km/s":
            val_ms = val * 1000.0
        else:
            val_ms = val
        if "delta_v_ms2" not in fields:
            fields["delta_v_ms2"] = []
        fields["delta_v_ms2"].append(val_ms)

    # Altitude values: "400 km altitude", "at 550 km", "apogee 800 km", "perigee 350 km"
    alt_pattern = r"(\d+(?:\.\d+)?)\s*km"
    for m in re.finditer(alt_pattern, text_lower):
        val = float(m.group(1))
        if "altitudes_km" not in fields:
            fields["altitudes_km"] = []
        if val < 100000:  # sanity check
            fields["altitudes_km"].append(val)

    # Inclination: "98.7 deg inclination", "inc 51.6"
    inc_pattern = r"(?:inclination|inc)\s*[\w\s]*?(\d+(?:\.\d+)?)\s*(?:deg|degrees|°)?"
    for m in re.finditer(inc_pattern, text_lower):
        val = float(m.group(1))
        if 0 <= val <= 180:
            if "inclinations_deg" not in fields:
                fields["inclinations_deg"] = []
            fields["inclinations_deg"].append(val)

    # Period: "period of 96.5 min", "orbital period 90 minutes"
    period_pattern = r"(?:orbital\s+)?period\s*(?:of\s+)?(\d+(?:\.\d+)?)\s*(min|minutes|hours|hrs?)"
    for m in re.finditer(period_pattern, text_lower):
        val = float(m.group(1))
        unit = m.group(2)
        if unit in ("hours", "hr", "hrs"):
            val_min = val * 60.0
        else:
            val_min = val
        if "periods_min" not in fields:
            fields["periods_min"] = []
        fields["periods_min"].append(val_min)

    # Revolutions per day
    rpd_pattern = r"(\d+(?:\.\d+)?)\s*(?:rev|revolutions)\s*(?:per\s+)?(?:day|daily)"
    for m in re.finditer(rpd_pattern, text_lower):
        val = float(m.group(1))
        if "revolutions_per_day" not in fields:
            fields["revolutions_per_day"] = []
        fields["revolutions_per_day"].append(val)

    # Power values: "500 W", "2.5 kW", "100 watts"
    power_pattern = r"(\d+(?:\.\d+)?)\s*(w|kw|mw|watts?|kilowatts?)"
    for m in re.finditer(power_pattern, text_lower):
        val = float(m.group(1))
        unit = m.group(2).strip()
        if unit.startswith("k"):
            val_w = val * 1000.0
        elif unit.startswith("m") and not unit.startswith("min"):
            val_w = val / 1000.0
        else:
            val_w = val
        if "power_watts" not in fields:
            fields["power_watts"] = []
        fields["power_watts"].append(val_w)

    # Temperature values: "+25 C", "-40 C", "120 deg C", "85 Celsius", "500 degrees Celsius"
    temp_pattern = r"([+-]?\d+(?:\.\d+)?)\s*(?:degrees?\s*)?(?:°)?\s*(?:c|celsius|°c)"
    for m in re.finditer(temp_pattern, text_lower):
        val = float(m.group(1))
        if "temperatures_c" not in fields:
            fields["temperatures_c"] = []
        fields["temperatures_c"].append(val)

    # Command keywords
    command_keywords = [
        "execute", "command", "cmd", "telecommand", "tc", "send command",
        "upload", "fire thruster", "deploy", "activate", "shutdown",
    ]
    found_commands = [kw for kw in command_keywords if kw in text_lower]
    if found_commands:
        fields["command_keywords"] = found_commands

    # Collision/conjunction keywords
    collision_keywords = [
        "collision", "conjunction", "close approach", "miss distance",
        "collision risk", "collision probability", "pc", "probability of collision",
        "tca", "time of closest approach", "cdm", "conjunction data message",
    ]
    found_collision = [kw for kw in collision_keywords if kw in text_lower]
    if found_collision:
        fields["collision_keywords"] = found_collision

    # Safemode keywords
    safemode_keywords = ["safemode", "safe mode", "safe-mode"]
    found_safemode = [kw for kw in safemode_keywords if kw in text_lower]
    if found_safemode:
        fields["safemode_keywords"] = found_safemode

    # Orbit type keywords
    if "leo" in text_lower or "low earth" in text_lower:
        fields["orbit_regime"] = "LEO"
    elif "geo" in text_lower or "geostationary" in text_lower:
        fields["orbit_regime"] = "GEO"
    elif "meo" in text_lower or "medium earth" in text_lower:
        fields["orbit_regime"] = "MEO"
    elif "heo" in text_lower or "highly elliptical" in text_lower:
        fields["orbit_regime"] = "HEO"
    elif "sso" in text_lower or "sun-synchronous" in text_lower:
        fields["orbit_regime"] = "SSO"

    # Guarantee/certainty keywords
    guarantee_keywords = [
        "guarantee", "guaranteed", "certain", "definitely", "will never",
        "no risk", "zero risk", "impossible to fail", "always safe",
        "infinite", "unlimited", "no thermal risk", "no collision risk",
    ]
    found_guarantees = [kw for kw in guarantee_keywords if kw in text_lower]
    if found_guarantees:
        fields["guarantee_keywords"] = found_guarantees

    return fields
