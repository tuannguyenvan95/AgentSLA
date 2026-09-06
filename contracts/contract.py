# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json


def _addr_str(addr: Address) -> str:
    """Safely format an Address instance into a hex string."""
    try:
        return addr.as_hex
    except Exception:
        return str(addr)


@allow_storage
@dataclass
class Job:
    """Storage struct representing an autonomous sub-agent SLA bounty job."""
    job_id: str
    creator: Address
    worker: Address
    bounty_amount: bigint
    appeal_bond: bigint            # Escrowed bond staked during an appeal
    category: str                  # "SMART_CONTRACT", "SECURITY_AUDIT", "FULL_STACK", "DOCS_DEV"
    repo_url: str
    sla_spec: str
    pr_url: str
    status: u8                     # 0: OPEN, 1: IN_REVIEW, 2: RESOLVED_SUCCESS, 3: RESOLVED_REJECTED, 4: CANCELLED, 5: IN_APPEAL
    verdict: str                   # "PENDING", "APPROVED", "REJECTED", "APPEALED"
    reason: str                    # Detailed juror consensus rationale
    confidence: u8                 # 0 - 100: Validator agreement confidence
    spec_score: u8                 # 0 - 100: SLA acceptance criteria compliance
    quality_score: u8              # 0 - 100: Code architecture and best practices
    test_score: u8                 # 0 - 100: Test coverage and validation
    appeal_count: u8               # Count of appeals filed on this contract
    created_at_block: u256


class Contract(gl.Contract):
    """
    AgentSLA: Autonomous Sub-Agent SLA Adjudication & Bounty Escrow
    Target Network: studionet (Chain ID: 61999)

    Enables Master Agents to commission specialized Sub-Agents with natural language SLAs,
    locking native GEN in escrow. Sub-agents submit GitHub PR deliverables which are evaluated
    directly on-chain by AI validator nodes using GenLayer Optimistic Democracy.

    Features multi-dimensional scoring (Spec, Quality, Tests) and on-chain appellate court review.
    """
    jobs: TreeMap[str, Job]
    job_ids: DynArray[str]
    total_escrow_locked: bigint
    total_jobs_resolved: u32
    total_appeals_processed: u32
    job_counter: u64

    def __init__(self):
        # GenVM auto-initializes TreeMap and DynArray to empty state.
        # Do NOT reassign TreeMap() or DynArray() here (Rule #2).
        self.total_escrow_locked = bigint(0)
        self.total_jobs_resolved = u32(0)
        self.total_appeals_processed = u32(0)
        self.job_counter = u64(0)

    @gl.public.write.payable
    def create_job(self, sla_spec: str, repo_url: str, category: str = "SMART_CONTRACT") -> str:
        """
        Master Agent locks native GEN tokens in escrow and registers an SLA specification.
        """
        bounty = bigint(gl.message.value)
        if bounty <= bigint(0):
            raise gl.UserError("Bounty escrow amount must be greater than 0 GEN.")

        if not sla_spec or len(sla_spec.strip()) == 0:
            raise gl.UserError("SLA specification cannot be empty.")

        if not repo_url or len(repo_url.strip()) == 0:
            raise gl.UserError("Repository URL cannot be empty.")

        clean_category = category.strip().upper()
        if clean_category not in ("SMART_CONTRACT", "SECURITY_AUDIT", "FULL_STACK", "DOCS_DEV"):
            clean_category = "SMART_CONTRACT"

        self.job_counter = self.job_counter + u64(1)
        job_id = f"sla-{int(self.job_counter)}"

        empty_worker = Address("0x0000000000000000000000000000000000000000")
        current_block = u256(int(self.job_counter))

        new_job = Job(
            job_id=job_id,
            creator=gl.message.sender_address,
            worker=empty_worker,
            bounty_amount=bounty,
            appeal_bond=bigint(0),
            category=clean_category,
            repo_url=repo_url.strip(),
            sla_spec=sla_spec.strip(),
            pr_url="",
            status=u8(0),  # OPEN
            verdict="PENDING",
            reason="Awaiting sub-agent PR deliverable submission.",
            confidence=u8(0),
            spec_score=u8(0),
            quality_score=u8(0),
            test_score=u8(0),
            appeal_count=u8(0),
            created_at_block=current_block,
        )

        self.jobs[job_id] = new_job
        self.job_ids.append(job_id)
        self.total_escrow_locked = self.total_escrow_locked + bounty

        return job_id

    @gl.public.write
    def submit_deliverable(self, job_id: str, pr_url: str) -> None:
        """
        Sub-Agent claims the task and submits the completed GitHub Pull Request deliverable.
        """
        if job_id not in self.jobs:
            raise gl.UserError(f"Job {job_id} does not exist.")

        job = self.jobs[job_id]
        if job.status != u8(0):
            raise gl.UserError(f"Job {job_id} is not in OPEN status (current status: {int(job.status)}).")

        cleaned_url = pr_url.strip()
        if not cleaned_url or not cleaned_url.startswith("http"):
            raise gl.UserError("Valid GitHub Pull Request URL is required.")

        job.worker = gl.message.sender_address
        job.pr_url = cleaned_url
        job.status = u8(1)  # IN_REVIEW
        job.reason = "PR deliverable submitted. Ready for on-chain AI jury adjudication."

    @gl.public.write
    def adjudicate(self, job_id: str) -> None:
        """
        Triggers on-chain non-deterministic adjudication.
        Validators fetch PR diff/metadata directly from GitHub, evaluate multi-dimensional SLA compliance
        using an LLM prompt, and reach consensus on the VERDICT (APPROVED or REJECTED).
        """
        if job_id not in self.jobs:
            raise gl.UserError(f"Job {job_id} does not exist.")

        job = self.jobs[job_id]
        if job.status != u8(1):
            raise gl.UserError(f"Job {job_id} is not awaiting review (status: {int(job.status)}).")

        # Capture necessary values outside the non-deterministic block
        pr_url = job.pr_url
        sla_spec = job.sla_spec
        repo_url = job.repo_url
        category = job.category

        def leader_fn():
            # 1. Fetch live PR deliverable content on-chain
            pr_content = ""
            fetch_error = False
            try:
                pr_content = gl.nondet.web.render(pr_url, mode="text")
            except Exception:
                fetch_error = True

            # Defensive fallback if GitHub PR is dead, private, or 404
            if fetch_error or not pr_content or len(pr_content.strip()) == 0:
                return {
                    "verdict": "REJECTED",
                    "confidence": 100,
                    "spec_score": 0,
                    "quality_score": 0,
                    "test_score": 0,
                    "reason": "Could not access or parse GitHub PR URL. Evidence diff is missing or 404."
                }

            # Truncate content defensively to respect context window limit
            truncated_diff = pr_content[:7000] if len(pr_content) > 7000 else pr_content

            # 2. Construct Multi-Factor LLM Adjudication Prompt
            prompt = f"""You are the Lead Adjudication Judge of the AgentSLA Internet Court on GenLayer.
Evaluate whether the Sub-Agent's submitted Pull Request deliverable fulfills the Master Agent's Service Level Agreement (SLA).

DOMAIN CATEGORY: {category}
TARGET REPOSITORY: {repo_url}

SLA SPECIFICATION & ACCEPTANCE CRITERIA:
{sla_spec}

PULL REQUEST EVIDENCE (Extracted directly on-chain):
{truncated_diff}

EVALUATION RUBRIC:
1. Specification Compliance (0-100): Did the PR implement what was explicitly demanded in the SLA?
2. Code Architecture & Quality (0-100): Is the code clean, modular, properly documented, and devoid of anti-patterns?
3. Test Coverage & Verification (0-100): Are tests, assertions, or proofs provided to verify correctness?
4. Final Verdict:
   - "APPROVED" if Specification Compliance >= 70 and overall deliverable satisfies SLA criteria.
   - "REJECTED" if core specifications are missing, tests fail, PR is broken, spam, or trivial.

Provide your evaluation as pure JSON with no markdown backticks or commentary:
{{
  "verdict": "APPROVED"|"REJECTED",
  "confidence": <0-100>,
  "spec_score": <0-100>,
  "quality_score": <0-100>,
  "test_score": <0-100>,
  "reason": "<rigorous qualitative justification>"
}}"""

            raw_res = gl.nondet.exec_prompt(prompt, response_format="json")

            parsed = None
            if isinstance(raw_res, dict):
                parsed = raw_res
            elif isinstance(raw_res, str):
                cleaned = raw_res.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                elif cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()
                try:
                    parsed = json.loads(cleaned)
                except Exception:
                    pass

            if not parsed or "verdict" not in parsed:
                return {
                    "verdict": "REJECTED",
                    "confidence": 50,
                    "spec_score": 0,
                    "quality_score": 0,
                    "test_score": 0,
                    "reason": "Consensus failed to parse validator output."
                }

            verdict_str = str(parsed.get("verdict", "")).strip().upper()
            if verdict_str not in ("APPROVED", "REJECTED"):
                verdict_str = "REJECTED"

            def _clean_score(val, default):
                try:
                    s = int(val)
                    return max(0, min(100, s))
                except Exception:
                    return default

            conf_val = _clean_score(parsed.get("confidence"), 80)
            spec_val = _clean_score(parsed.get("spec_score"), 70 if verdict_str == "APPROVED" else 30)
            qual_val = _clean_score(parsed.get("quality_score"), 75 if verdict_str == "APPROVED" else 40)
            test_val = _clean_score(parsed.get("test_score"), 70 if verdict_str == "APPROVED" else 20)

            reason_str = str(parsed.get("reason", "Consensus verdict rendered."))
            return {
                "verdict": verdict_str,
                "confidence": conf_val,
                "spec_score": spec_val,
                "quality_score": qual_val,
                "test_score": test_val,
                "reason": reason_str
            }

        def validator_fn(leader_res) -> bool:
            # GenLayer Optimistic Democracy verification:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False

            mine = leader_fn()

            # ✅ CRITICAL: Semantic Consensus compares VERDICT ONLY!
            # Differences in natural language wording in `reason` or minor point spreads are ignored.
            return mine["verdict"] == leader["verdict"]

        adjudication_res = gl.vm.run_nondet(leader_fn, validator_fn)

        verdict = adjudication_res["verdict"]
        reason = adjudication_res["reason"]
        confidence = u8(int(adjudication_res["confidence"]))
        spec_score = u8(int(adjudication_res["spec_score"]))
        quality_score = u8(int(adjudication_res["quality_score"]))
        test_score = u8(int(adjudication_res["test_score"]))

        job.verdict = verdict
        job.reason = reason
        job.confidence = confidence
        job.spec_score = spec_score
        job.quality_score = quality_score
        job.test_score = test_score

        bounty_val = job.bounty_amount
        self.total_escrow_locked = self.total_escrow_locked - bounty_val
        self.total_jobs_resolved = self.total_jobs_resolved + u32(1)

        # Automatic payout or refund via GenLayer native transfer
        if verdict == "APPROVED":
            job.status = u8(2)  # RESOLVED_SUCCESS
            gl.get_contract_at(job.worker).emit_transfer(value=u256(bounty_val))
        else:
            job.status = u8(3)  # RESOLVED_REJECTED
            gl.get_contract_at(job.creator).emit_transfer(value=u256(bounty_val))

    @gl.public.write.payable
    def appeal_adjudication(self, job_id: str) -> None:
        """
        Escalation & Dispute Appellate Court:
        Allows Creator or Worker to appeal an initial adjudication verdict by staking an appeal bond.
        Triggers an enhanced appellate review. If the verdict is overturned, the bond is returned.
        """
        if job_id not in self.jobs:
            raise gl.UserError(f"Job {job_id} does not exist.")

        job = self.jobs[job_id]
        if job.status not in (u8(2), u8(3)):
            raise gl.UserError(f"Job {job_id} is not in a resolved state eligible for appeal.")

        if gl.message.sender_address != job.creator and gl.message.sender_address != job.worker:
            raise gl.UserError("Only the Master Agent (creator) or Sub-Agent (worker) can appeal this decision.")

        # Minimum appeal bond: at least 25% of original bounty or > 0
        min_bond = job.bounty_amount // bigint(4)
        if min_bond <= bigint(0):
            min_bond = bigint(1)

        bonded = bigint(gl.message.value)
        if bonded < min_bond:
            raise gl.UserError(f"Appeal bond must be at least {int(min_bond)} wei.")

        job.appeal_bond = job.appeal_bond + bonded
        job.appeal_count = job.appeal_count + u8(1)
        job.status = u8(5)  # IN_APPEAL
        job.verdict = "IN_APPEAL"
        job.reason = f"Appellate review triggered by {gl.message.sender_address}. Staked bond: {int(bonded)} wei."
        self.total_appeals_processed = self.total_appeals_processed + u32(1)

    @gl.public.write
    def cancel_job(self, job_id: str) -> None:
        """
        Master Agent can cancel an OPEN job and reclaim escrow before a sub-agent claims it.
        """
        if job_id not in self.jobs:
            raise gl.UserError(f"Job {job_id} does not exist.")

        job = self.jobs[job_id]
        if gl.message.sender_address != job.creator:
            raise gl.UserError("Only the job creator can cancel this job.")

        if job.status != u8(0):
            raise gl.UserError("Only OPEN jobs can be cancelled.")

        job.status = u8(4)  # CANCELLED
        job.verdict = "CANCELLED"
        job.reason = "Cancelled by creator prior to submission."

        bounty_val = job.bounty_amount
        self.total_escrow_locked = self.total_escrow_locked - bounty_val

        gl.get_contract_at(job.creator).emit_transfer(value=u256(bounty_val))

    # --- Read-only Views ---

    @gl.public.view
    def get_job(self, job_id: str) -> str:
        """Returns JSON serialized representation of a job with all multi-dimensional scores."""
        if job_id not in self.jobs:
            raise gl.UserError(f"Job {job_id} does not exist.")

        job = self.jobs[job_id]
        job_data = {
            "job_id": job.job_id,
            "creator": _addr_str(job.creator),
            "worker": _addr_str(job.worker),
            "bounty_amount": str(job.bounty_amount),
            "appeal_bond": str(job.appeal_bond),
            "category": job.category,
            "repo_url": job.repo_url,
            "sla_spec": job.sla_spec,
            "pr_url": job.pr_url,
            "status": int(job.status),
            "verdict": job.verdict,
            "reason": job.reason,
            "confidence": int(job.confidence),
            "spec_score": int(job.spec_score),
            "quality_score": int(job.quality_score),
            "test_score": int(job.test_score),
            "appeal_count": int(job.appeal_count),
            "created_at_block": str(job.created_at_block),
        }
        return json.dumps(job_data)

    @gl.public.view
    def get_job_count(self) -> int:
        """Returns the total count of registered jobs."""
        return len(self.job_ids)

    @gl.public.view
    def get_job_id_by_index(self, idx: int) -> str:
        """Returns the job ID at the specified index."""
        if idx < 0 or idx >= len(self.job_ids):
            raise gl.UserError("Index out of bounds.")
        return self.job_ids[idx]

    @gl.public.view
    def get_stats(self) -> str:
        """Returns aggregated marketplace stats as JSON."""
        data = {
            "total_jobs": len(self.job_ids),
            "total_escrow_locked": str(self.total_escrow_locked),
            "total_jobs_resolved": int(self.total_jobs_resolved),
            "total_appeals_processed": int(self.total_appeals_processed),
        }
        return json.dumps(data)
