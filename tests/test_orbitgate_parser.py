"""Tests for OrbitGate TLE and claim text parsers."""

import pytest
from orbitgate.orbit_parser import parse_tle, extract_claim_fields


# ── TLE Parser ──────────────────────────────────────────────────────────

VALID_TLE = (
    "1 25544U 98067A   24001.50000000  .00016717  00000-0  30186-3 0  9993\n"
    "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537"
)


class TestTLEParserAcceptsValid:
    def test_valid_iss_tle(self):
        result = parse_tle(VALID_TLE)
        assert result["valid"] is True
        assert result.get("fields", {}).get("satellite_number") == "25544"

    def test_valid_tle_has_epoch(self):
        result = parse_tle(VALID_TLE)
        assert "epoch" in result.get("fields", {})

    def test_valid_tle_has_inclination(self):
        result = parse_tle(VALID_TLE)
        assert "inclination_deg" in result.get("fields", {})

    def test_valid_tle_has_eccentricity(self):
        result = parse_tle(VALID_TLE)
        assert "eccentricity" in result.get("fields", {})

    def test_valid_tle_has_mean_motion(self):
        result = parse_tle(VALID_TLE)
        assert "mean_motion_rev_per_day" in result.get("fields", {})


class TestTLEParserRejectsMalformed:
    def test_single_line_rejected(self):
        result = parse_tle("1 25544U 98067A   24001.50000000")
        assert result["valid"] is False

    def test_plain_text_rejected(self):
        result = parse_tle("This is not a valid TLE at all")
        assert result["valid"] is False

    def test_empty_string_rejected(self):
        result = parse_tle("")
        assert result["valid"] is False

    def test_wrong_line_numbers(self):
        tle = (
            "3 25544U 98067A   24001.50000000  .00016717  00000-0  30186-3 0  9993\n"
            "4 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537"
        )
        result = parse_tle(tle)
        assert result["valid"] is False

    def test_inconsistent_satellite_numbers(self):
        tle = (
            "1 25544U 98067A   24001.50000000  .00016717  00000-0  30186-3 0  9993\n"
            "2 99999  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537"
        )
        result = parse_tle(tle)
        assert result["valid"] is False


# ── Claim Text Parser ───────────────────────────────────────────────────

class TestClaimParser:
    def test_extracts_delta_v(self):
        result = extract_claim_fields("Perform a maneuver with delta-v of 150 m/s")
        assert "delta_v_ms2" in result

    def test_extracts_negative_delta_v(self):
        result = extract_claim_fields("Apply delta-v of -50 m/s for deorbit")
        assert "delta_v_ms2" in result

    def test_extracts_altitude(self):
        result = extract_claim_fields("The satellite is at an altitude of 400 km")
        assert "altitudes_km" in result
        assert 400.0 in result["altitudes_km"]

    def test_extracts_power_values(self):
        result = extract_claim_fields("Solar panels generate 500 watts, payload draws 300 watts")
        assert "power_watts" in result

    def test_extracts_temperature(self):
        result = extract_claim_fields("Operating temperature is 45 celsius")
        assert "temperatures_c" in result
        assert 45.0 in result["temperatures_c"]