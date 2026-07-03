"""Tests for OrbitGate benchmark runner, reports, and certificates."""

import json
import os
import pytest

CASES_DIR = "/home/z/my-project/benchmarks/orbitgate_v0/cases"
ALL_CASES_PATH = os.path.join(CASES_DIR, "all_cases.json")


class TestBenchCasesExist:
    def test_all_cases_file_exists(self):
        assert os.path.isfile(ALL_CASES_PATH), f"Missing {ALL_CASES_PATH}"

    def test_all_cases_has_160_plus(self):
        with open(ALL_CASES_PATH) as f:
            cases = json.load(f)
        assert len(cases) >= 160, f"Expected >= 160 cases, got {len(cases)}"

    def test_all_cases_have_required_fields(self):
        with open(ALL_CASES_PATH) as f:
            cases = json.load(f)
        required = {"case_id", "claim_type", "input", "expected_decision", "expected_gate", "risk_label", "reason"}
        for i, case in enumerate(cases):
            missing = required - set(case.keys())
            assert not missing, f"Case {i} ({case.get('case_id', '?')}) missing fields: {missing}"

    def test_all_case_ids_unique(self):
        with open(ALL_CASES_PATH) as f:
            cases = json.load(f)
        ids = [c["case_id"] for c in cases]
        assert len(ids) == len(set(ids)), "Duplicate case IDs found"


VALID_DECISIONS = {"ALLOW", "BLOCK", "NEEDS_REVIEW", "EVIDENCE_REQUIRED", "REPLAY_REQUIRED", "UNSUPPORTED", "OUT_OF_SCOPE"}
VALID_GATES = {"TLEGate", "SGP4Gate", "DeltaVGate", "CollisionGate", "PowerGate", "ThermalGate", "CommsGate", "DeorbitGate", "CommandGate"}


class TestBenchCaseValues:
    def test_valid_decisions(self):
        with open(ALL_CASES_PATH) as f:
            cases = json.load(f)
        for case in cases:
            assert case["expected_decision"] in VALID_DECISIONS, (
                f"Case {case['case_id']}: invalid decision '{case['expected_decision']}'"
            )

    def test_valid_gates(self):
        with open(ALL_CASES_PATH) as f:
            cases = json.load(f)
        for case in cases:
            assert case["expected_gate"] in VALID_GATES, (
                f"Case {case['case_id']}: invalid gate '{case['expected_gate']}'"
            )


class TestCategoryFilesExist:
    @pytest.mark.parametrize("filename", [
        "tle_cases.json", "sgp4_cases.json", "delta_v_cases.json",
        "collision_cases.json", "power_cases.json", "thermal_cases.json",
        "comms_cases.json", "cmd_deorbit_cases.json",
    ])
    def test_category_file(self, filename):
        path = os.path.join(CASES_DIR, filename)
        assert os.path.isfile(path), f"Missing {path}"
        with open(path) as f:
            data = json.load(f)
        assert len(data) >= 20, f"{filename} has {len(data)} cases, expected >= 20"


class TestNoSecretsOrNonEnglish:
    def test_no_secrets_in_cases(self):
        secret_patterns = ["api_key", "apikey", "api-key", "password", "bearer_token", "auth_token"]
        with open(ALL_CASES_PATH) as f:
            content = f.read().lower()
        for pat in secret_patterns:
            assert pat not in content, f"Potential secret pattern '{pat}' found in cases"

    def test_english_only(self):
        """Ensure no non-ASCII characters in benchmark data."""
        with open(ALL_CASES_PATH) as f:
            content = f.read()
        for i, ch in enumerate(content):
            if ord(ch) > 127:
                # Allow specific JSON formatting chars
                assert False, f"Non-ASCII char at position {i}: {repr(ch)}"