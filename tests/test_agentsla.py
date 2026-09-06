import pytest
import json
from genlayer import gl, Address
from contract import Contract, Job


@pytest.fixture
def contract():
    c = Contract()
    c.jobs = {}
    c.job_ids = []
    return c


def test_create_job_success(contract):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    gl.message.sender = creator
    gl.message.value = 5000000000000000000  # 5 GEN

    sla = "Implement ERC-4337 UserOperation validation module with 100% test coverage."
    repo = "https://github.com/agent-economy/account-abstraction"

    job_id = contract.create_job(sla_spec=sla, repo_url=repo, category="SMART_CONTRACT")
    assert job_id == "sla-1"

    # Verify state via view
    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)

    assert job_data["job_id"] == "sla-1"
    assert job_data["creator"] == creator
    assert job_data["bounty_amount"] == "5000000000000000000"
    assert job_data["category"] == "SMART_CONTRACT"
    assert job_data["status"] == 0  # OPEN
    assert job_data["verdict"] == "PENDING"
    assert job_data["spec_score"] == 0
    assert contract.total_escrow_locked == 5000000000000000000
    assert contract.get_job_count() == 1


def test_create_job_zero_bounty_reverts(contract):
    gl.message.value = 0
    with pytest.raises(gl.UserError, match="Bounty escrow amount must be greater than 0"):
        contract.create_job(sla_spec="Task without bounty", repo_url="https://github.com/test/repo")


def test_submit_deliverable_success(contract):
    gl.message.sender = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    gl.message.value = 1000000000000000000
    job_id = contract.create_job(sla_spec="Build API endpoint", repo_url="https://github.com/org/repo")

    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
    gl.message.sender = worker
    pr_url = "https://github.com/org/repo/pull/42"

    contract.submit_deliverable(job_id=job_id, pr_url=pr_url)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)

    assert job_data["worker"] == worker
    assert job_data["pr_url"] == pr_url
    assert job_data["status"] == 1  # IN_REVIEW


def test_adjudicate_approved_with_multi_scores(contract, monkeypatch):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

    gl.message.sender = creator
    gl.message.value = 2000000000000000000
    job_id = contract.create_job(sla_spec="Deliver smart contract tests", repo_url="https://github.com/org/repo")

    gl.message.sender = worker
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/1")

    # Mock web render & prompt with multi-dimensional criteria
    monkeypatch.setattr(gl.nondet.web, "render", lambda url, mode: "diff --git a/test.py b/test.py +100 lines passing tests")
    monkeypatch.setattr(gl.nondet, "exec_prompt", lambda prompt, response_format: {
        "verdict": "APPROVED",
        "confidence": 98,
        "spec_score": 95,
        "quality_score": 90,
        "test_score": 92,
        "reason": "All SLA criteria fulfilled with high code quality and test coverage."
    })

    contract.adjudicate(job_id)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)

    assert job_data["status"] == 2  # RESOLVED_SUCCESS
    assert job_data["verdict"] == "APPROVED"
    assert job_data["confidence"] == 98
    assert job_data["spec_score"] == 95
    assert job_data["quality_score"] == 90
    assert job_data["test_score"] == 92
    assert contract.total_escrow_locked == 0
    assert contract.total_jobs_resolved == 1


def test_adjudicate_rejected_and_appeal_flow(contract, monkeypatch):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

    gl.message.sender = creator
    gl.message.value = 4000000000000000000  # 4 GEN
    job_id = contract.create_job(sla_spec="Strict SLA: Must implement feature X", repo_url="https://github.com/org/repo")

    gl.message.sender = worker
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/2")

    monkeypatch.setattr(gl.nondet.web, "render", lambda url, mode: "diff --git a/readme.md - typo only")
    monkeypatch.setattr(gl.nondet, "exec_prompt", lambda prompt, response_format: {
        "verdict": "REJECTED",
        "confidence": 85,
        "spec_score": 20,
        "quality_score": 40,
        "test_score": 10,
        "reason": "PR contains only README typo fixes, failing core requirements."
    })

    contract.adjudicate(job_id)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)
    assert job_data["status"] == 3  # RESOLVED_REJECTED

    # Worker appeals with bond (minimum bond is 25% = 1 GEN)
    gl.message.sender = worker
    gl.message.value = 1000000000000000000  # 1 GEN bond

    contract.appeal_adjudication(job_id)

    raw_appeal = contract.get_job(job_id)
    appeal_data = json.loads(raw_appeal)

    assert appeal_data["status"] == 5  # IN_APPEAL
    assert appeal_data["verdict"] == "IN_APPEAL"
    assert appeal_data["appeal_count"] == 1
    assert appeal_data["appeal_bond"] == "1000000000000000000"
    assert contract.total_appeals_processed == 1


def test_adjudicate_dead_url_fallback(contract, monkeypatch):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

    gl.message.sender = creator
    gl.message.value = 1000000000000000000
    job_id = contract.create_job(sla_spec="Bug fix", repo_url="https://github.com/org/repo")

    gl.message.sender = worker
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/404")

    def mock_dead_url(url, mode):
        raise ConnectionError("404 Not Found")
    monkeypatch.setattr(gl.nondet.web, "render", mock_dead_url)

    contract.adjudicate(job_id)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)

    assert job_data["status"] == 3  # RESOLVED_REJECTED
    assert job_data["verdict"] == "REJECTED"
    assert "Could not access or parse GitHub PR URL" in job_data["reason"]


def test_cancel_job_by_creator(contract):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    gl.message.sender = creator
    gl.message.value = 4000000000000000000
    job_id = contract.create_job(sla_spec="Cancelled task", repo_url="https://github.com/org/repo")

    assert contract.total_escrow_locked == 4000000000000000000

    contract.cancel_job(job_id)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)

    assert job_data["status"] == 4  # CANCELLED
    assert job_data["verdict"] == "CANCELLED"
    assert contract.total_escrow_locked == 0
