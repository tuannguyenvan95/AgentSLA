import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from scripts.compliance_verifier import SLAVerifier

def test_sla_verifier_success():
    verifier = SLAVerifier(spec="Acceptance Criteria: Unit tests pass and code is verified.")
    result = verifier.verify_deliverable(code_diff="def add(a, b): return a + b", tests_passed=True)
    assert result["passed"] is True
    assert result["score"] >= 90
    assert "successfully satisfies" in result["reason"]

def test_sla_verifier_failure_on_failed_tests():
    verifier = SLAVerifier(spec="Criteria")
    result = verifier.verify_deliverable(code_diff="code", tests_passed=False)
    assert result["passed"] is False
    assert result["score"] == 0
