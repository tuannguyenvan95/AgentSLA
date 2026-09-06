import pytest
import json
from genlayer import gl, Address
from contract import Contract, Job


@pytest.fixture
def contract():
    # Instantiate contract
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

    job_id = contract.create_job(sla_spec=sla, repo_url=repo)
    assert job_id == "sla-1"

    # Verify state via view
    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)

    assert job_data["job_id"] == "sla-1"
    assert job_data["creator"] == creator
    assert job_data["bounty_amount"] == "5000000000000000000"
    assert job_data["status"] == 0  # OPEN
    assert job_data["verdict"] == "PENDING"
    assert job_data["sla_spec"] == sla
    assert contract.total_escrow_locked == 5000000000000000000
    assert contract.get_job_count() == 1


def test_create_job_zero_bounty_reverts(contract):
    gl.message.value = 0
    with pytest.raises(gl.UserError, match="Bounty escrow amount must be greater than 0"):
        contract.create_job(sla_spec="Task without bounty", repo_url="https://github.com/test/repo")


def test_submit_deliverable_success(contract):
    # Setup job
    gl.message.sender = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    gl.message.value = 1000000000000000000
    job_id = contract.create_job(sla_spec="Build API endpoint", repo_url="https://github.com/org/repo")

    # Worker submits deliverable
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
    gl.message.sender = worker
    pr_url = "https://github.com/org/repo/pull/42"

    contract.submit_deliverable(job_id=job_id, pr_url=pr_url)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)

    assert job_data["worker"] == worker
    assert job_data["pr_url"] == pr_url
    assert job_data["status"] == 1  # IN_REVIEW


def test_adjudicate_approved(contract, monkeypatch):
    # Create and submit
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

    gl.message.sender = creator
    gl.message.value = 2000000000000000000
    job_id = contract.create_job(sla_spec="Deliver smart contract tests", repo_url="https://github.com/org/repo")

    gl.message.sender = worker
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/1")

    # Mock web render & prompt
    monkeypatch.setattr(gl.nondet.web, "render", lambda url, mode: "diff --git a/test.py b/test.py +100 lines passing tests")
    monkeypatch.setattr(gl.nondet, "exec_prompt", lambda prompt, response_format: {
        "verdict": "APPROVED",
        "confidence": 98,
        "reason": "All SLA criteria fulfilled with high code quality and test coverage."
    })

    contract.adjudicate(job_id)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)

    assert job_data["status"] == 2  # RESOLVED_SUCCESS
    assert job_data["verdict"] == "APPROVED"
    assert job_data["confidence"] == 98
    assert contract.total_escrow_locked == 0
    assert contract.total_jobs_resolved == 1


def test_adjudicate_rejected(contract, monkeypatch):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

    gl.message.sender = creator
    gl.message.value = 3000000000000000000
    job_id = contract.create_job(sla_spec="Strict SLA: Must implement feature X with zero warnings", repo_url="https://github.com/org/repo")

    gl.message.sender = worker
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/2")

    monkeypatch.setattr(gl.nondet.web, "render", lambda url, mode: "diff --git a/readme.md - typo only")
    monkeypatch.setattr(gl.nondet, "exec_prompt", lambda prompt, response_format: {
        "verdict": "REJECTED",
        "confidence": 90,
        "reason": "PR contains only README typo fixes, failing core feature X implementation requirements."
    })

    contract.adjudicate(job_id)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)

    assert job_data["status"] == 3  # RESOLVED_REJECTED
    assert job_data["verdict"] == "REJECTED"
    assert contract.total_escrow_locked == 0
    assert contract.total_jobs_resolved == 1


def test_adjudicate_dead_url_fallback(contract, monkeypatch):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

    gl.message.sender = creator
    gl.message.value = 1000000000000000000
    job_id = contract.create_job(sla_spec="Bug fix", repo_url="https://github.com/org/repo")

    gl.message.sender = worker
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/404")

    # Simulate 404 / network failure
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

    # Cancel
    contract.cancel_job(job_id)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)

    assert job_data["status"] == 4  # CANCELLED
    assert job_data["verdict"] == "CANCELLED"
    assert contract.total_escrow_locked == 0
