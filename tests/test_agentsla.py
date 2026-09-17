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
    assert job_data["attempts"] == 1


def test_submit_deliverable_creator_cannot_claim_own_job(contract):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    gl.message.sender = creator
    gl.message.value = 1000000000000000000
    job_id = contract.create_job(sla_spec="Build API endpoint", repo_url="https://github.com/org/repo")

    # Creator attempts to claim their own job
    gl.message.sender = creator
    with pytest.raises(gl.UserError, match="Master Agent cannot claim their own task"):
        contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/1")


def test_strict_repo_binding_reverts(contract):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
    gl.message.sender = creator
    gl.message.value = 1000000000000000000
    job_id = contract.create_job(sla_spec="Fix security bug", repo_url="https://github.com/org/repo")

    gl.message.sender = worker
    # Attempt to submit a PR from an unrelated repo
    with pytest.raises(gl.UserError, match="PR URL must belong to target repository"):
        contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/hacker/malicious-repo/pull/99")


def test_top_up_bounty(contract):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    gl.message.sender = creator
    gl.message.value = 2000000000000000000 # 2 GEN
    job_id = contract.create_job(sla_spec="Build SDK", repo_url="https://github.com/org/repo")

    # Top up by 3 GEN
    gl.message.value = 3000000000000000000
    contract.top_up_bounty(job_id)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)
    assert job_data["bounty_amount"] == "5000000000000000000"
    assert contract.total_escrow_locked == 5000000000000000000


def test_adjudicate_approved_with_canary_defense(contract, monkeypatch):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

    gl.message.sender = creator
    gl.message.value = 2000000000000000000
    job_id = contract.create_job(sla_spec="Deliver smart contract tests", repo_url="https://github.com/org/repo")

    gl.message.sender = worker
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/1")

    # Mock web render & prompt with multi-dimensional criteria + Canary Token
    monkeypatch.setattr(gl.nondet.web, "render", lambda url, mode: "diff --git a/test.py b/test.py +100 lines passing tests")
    def mock_prompt(prompt, response_format):
        canary = prompt.split('canary token key in your JSON response: "')[1].split('"')[0]
        return {
            "canary": canary,
            "verdict": "APPROVED",
            "confidence": 98,
            "spec_score": 95,
            "quality_score": 90,
            "test_score": 92,
            "reason": "All SLA criteria fulfilled with high code quality and test coverage."
        }
    monkeypatch.setattr(gl.nondet, "exec_prompt", mock_prompt)

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


def test_adjudicate_partial_settlement(contract, monkeypatch):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

    gl.message.sender = creator
    gl.message.value = 4000000000000000000 # 4 GEN
    job_id = contract.create_job(sla_spec="Complete full stack module", repo_url="https://github.com/org/repo")

    gl.message.sender = worker
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/5")

    monkeypatch.setattr(gl.nondet.web, "render", lambda url, mode: "diff --git a/backend.py +200 lines")
    def mock_partial_prompt(prompt, response_format):
        canary = prompt.split('canary token key in your JSON response: "')[1].split('"')[0]
        return {
            "canary": canary,
            "verdict": "PARTIAL",
            "confidence": 90,
            "spec_score": 65,
            "quality_score": 80,
            "test_score": 60,
            "reason": "Backend core implemented; frontend UI mockups pending."
        }
    monkeypatch.setattr(gl.nondet, "exec_prompt", mock_partial_prompt)

    contract.adjudicate(job_id)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)

    assert job_data["status"] == 6  # RESOLVED_PARTIAL
    assert job_data["verdict"] == "PARTIAL"
    assert contract.total_escrow_locked == 0
    assert contract.total_jobs_resolved == 1


def test_adjudicate_retry_and_resubmit(contract, monkeypatch):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

    gl.message.sender = creator
    gl.message.value = 2000000000000000000
    job_id = contract.create_job(sla_spec="Implement auth module", repo_url="https://github.com/org/repo")

    gl.message.sender = worker
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/1")

    monkeypatch.setattr(gl.nondet.web, "render", lambda url, mode: "diff --git a/auth.py")
    def mock_retry_prompt(prompt, response_format):
        canary = prompt.split('canary token key in your JSON response: "')[1].split('"')[0]
        return {
            "canary": canary,
            "verdict": "RETRY",
            "confidence": 85,
            "spec_score": 45,
            "quality_score": 60,
            "test_score": 30,
            "reason": "Unit tests missing. Please add test suite to pass SLA."
        }
    monkeypatch.setattr(gl.nondet, "exec_prompt", mock_retry_prompt)

    contract.adjudicate(job_id)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)
    assert job_data["status"] == 7  # RETRY
    assert job_data["verdict"] == "RETRY"
    assert job_data["attempts"] == 1
    assert contract.total_escrow_locked == 2000000000000000000 # Escrow retained!

    # Worker fixes code and resubmits (Attempt 2)
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/1")
    raw_resubmit = contract.get_job(job_id)
    resubmit_data = json.loads(raw_resubmit)
    assert resubmit_data["status"] == 1  # IN_REVIEW
    assert resubmit_data["attempts"] == 2


def test_adjudicate_anti_rugpull_guard(contract, monkeypatch):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

    gl.message.sender = creator
    gl.message.value = 1000000000000000000
    job_id = contract.create_job(sla_spec="Bug fix", repo_url="https://github.com/org/deleted-repo")

    gl.message.sender = worker
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/deleted-repo/pull/1")

    # Mock: target repo is 404 / deleted by Master Agent
    def mock_render_rugpull(url, mode="text"):
        if "deleted-repo" in url and "pull" not in url:
            return "404 Not Found - Repository has been deleted"
        return "diff --git a/valid.py +50 lines"
    monkeypatch.setattr(gl.nondet.web, "render", mock_render_rugpull)

    contract.adjudicate(job_id)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)

    # Anti-rugpull guard triggers: status becomes ESCALATED (8) to protect Sub-Agent
    assert job_data["status"] == 8  # ESCALATED
    assert job_data["verdict"] == "ESCALATE"
    assert "protect Sub-Agent from rugpull" in job_data["reason"]
    assert contract.total_escrow_locked == 1000000000000000000 # Escrow preserved!


def test_adjudicate_anti_spam_guard(contract, monkeypatch):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

    gl.message.sender = creator
    gl.message.value = 1000000000000000000
    job_id = contract.create_job(sla_spec="Bug fix", repo_url="https://github.com/org/repo")

    gl.message.sender = worker
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/404")

    # Mock: target repo is accessible, but PR URL is 404 dead / spam
    def mock_render_spam(url, mode="text"):
        if "pull" in url:
            raise ConnectionError("404 Not Found")
        return "<html>Valid Repository</html>"
    monkeypatch.setattr(gl.nondet.web, "render", mock_render_spam)

    contract.adjudicate(job_id)

    raw_job = contract.get_job(job_id)
    job_data = json.loads(raw_job)

    # Anti-spam guard triggers: rejects to protect Master Agent
    assert job_data["status"] == 3  # RESOLVED_REJECTED
    assert job_data["verdict"] == "REJECTED"
    assert "Invalid submission rejected to protect Master Agent" in job_data["reason"]


def test_resolve_dispute_mutual_split(contract, monkeypatch):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

    gl.message.sender = creator
    gl.message.value = 4000000000000000000 # 4 GEN
    job_id = contract.create_job(sla_spec="SLA in dispute", repo_url="https://github.com/org/repo")

    gl.message.sender = worker
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/1")

    # Simulate escalation
    monkeypatch.setattr(gl.nondet.web, "render", lambda url, mode: "404 Not Found")
    contract.adjudicate(job_id)

    raw_job = contract.get_job(job_id)
    assert json.loads(raw_job)["status"] == 8  # ESCALATED

    # 1st approval: Creator calls MUTUAL_SPLIT
    gl.message.sender = creator
    contract.resolve_dispute(job_id, "MUTUAL_SPLIT")
    pending_job = json.loads(contract.get_job(job_id))
    assert pending_job["status"] == 8
    assert "MUTUAL SPLIT PENDING" in pending_job["reason"]

    # 2nd approval: Worker calls MUTUAL_SPLIT -> triggers 50/50 resolution
    gl.message.sender = worker
    contract.resolve_dispute(job_id, "MUTUAL_SPLIT")
    resolved_job = json.loads(contract.get_job(job_id))
    assert resolved_job["status"] == 6  # RESOLVED_PARTIAL
    assert resolved_job["verdict"] == "PARTIAL"
    assert contract.total_escrow_locked == 0


def test_resolve_dispute_concede(contract, monkeypatch):
    creator = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    worker = Address("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

    gl.message.sender = creator
    gl.message.value = 2000000000000000000
    job_id = contract.create_job(sla_spec="SLA with dispute", repo_url="https://github.com/org/repo")

    gl.message.sender = worker
    contract.submit_deliverable(job_id=job_id, pr_url="https://github.com/org/repo/pull/1")

    monkeypatch.setattr(gl.nondet.web, "render", lambda url, mode: "404 Not Found")
    contract.adjudicate(job_id)

    # Master Agent concedes voluntarily to Worker
    gl.message.sender = creator
    contract.resolve_dispute(job_id, "CONCEDE")

    resolved_job = json.loads(contract.get_job(job_id))
    assert resolved_job["status"] == 2  # RESOLVED_SUCCESS
    assert resolved_job["verdict"] == "APPROVED"
    assert contract.total_escrow_locked == 0


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

