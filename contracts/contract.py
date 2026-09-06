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
    repo_url: str
    sla_spec: str
    pr_url: str
    status: u8  # 0: OPEN, 1: IN_REVIEW, 2: RESOLVED_SUCCESS, 3: RESOLVED_REJECTED, 4: CANCELLED
    verdict: str  # "PENDING", "APPROVED", "REJECTED"
    reason: str
    confidence: u8
    created_at_block: u256


class Contract(gl.Contract):
    """
    AgentSLA: Autonomous Sub-Agent SLA Adjudication & Bounty Escrow
    Target Network: studionet (Chain ID: 61999)

    Enables Master Agents to commission specialized Sub-Agents with natural language SLAs,
    locking native GEN in escrow. Sub-agents submit GitHub PR deliverables which are evaluated
    directly on-chain by AI validator nodes using GenLayer Optimistic Democracy.
    """
    jobs: TreeMap[str, Job]
    job_ids: DynArray[str]
    total_escrow_locked: bigint
    total_jobs_resolved: u32
    job_counter: u64

    def __init__(self):
        # GenVM auto-initializes TreeMap and DynArray to empty state.
        # Do NOT reassign TreeMap() or DynArray() here (Rule #2).
        self.total_escrow_locked = bigint(0)
        self.total_jobs_resolved = u32(0)
        self.job_counter = u64(0)

    @gl.public.write.payable
    def create_job(self, sla_spec: str, repo_url: str) -> str:
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

        self.job_counter = self.job_counter + u64(1)
        job_id = f"sla-{int(self.job_counter)}"

        empty_worker = Address("0x0000000000000000000000000000000000000000")
        current_block = u256(gl.block.number)

        new_job = Job(
            job_id=job_id,
            creator=gl.message.sender,
            worker=empty_worker,
            bounty_amount=bounty,
            repo_url=repo_url.strip(),
            sla_spec=sla_spec.strip(),
            pr_url="",
            status=u8(0),  # OPEN
            verdict="PENDING",
            reason="Awaiting sub-agent PR deliverable submission.",
            confidence=u8(0),
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

        job.worker = gl.message.sender
        job.pr_url = cleaned_url
        job.status = u8(1)  # IN_REVIEW
        job.reason = "PR deliverable submitted. Ready for on-chain AI jury adjudication."

    @gl.public.write
    def adjudicate(self, job_id: str) -> None:
        """
        Triggers on-chain non-deterministic adjudication.
        Validators fetch PR diff/metadata directly from GitHub, evaluate SLA compliance
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
                    "reason": "Could not access or parse GitHub PR URL. Evidence diff is missing or 404."
                }

            # Truncate content defensively to respect context window limit
            truncated_diff = pr_content[:7000] if len(pr_content) > 7000 else pr_content

            # 2. Construct LLM Adjudication Prompt
            prompt = f"""You are the Lead Adjudicator for AgentSLA on GenLayer.
Evaluate whether the Sub-Agent's submitted Pull Request deliverable fulfills the Master Agent's SLA.

TARGET REPOSITORY:
{repo_url}

SLA SPECIFICATION & ACCEPTANCE CRITERIA:
{sla_spec}

PULL REQUEST DELIVERABLE EVIDENCE (Extracted on-chain):
{truncated_diff}

EVALUATION CRITERIA:
1. Did the sub-agent implement what was specified in the SLA?
2. Are tests, logic, or bug fixes consistent with the criteria?
3. If the PR is incomplete, broken, spam, or fails criteria -> REJECTED.
4. If the PR satisfies the criteria with reasonable engineering quality -> APPROVED.

Provide your verdict as pure JSON with no markdown backticks or commentary:
{{"verdict": "APPROVED"|"REJECTED", "confidence": <0-100>, "reason": "<clear explanation of evaluation>"}}"""

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
                    "reason": "Consensus failed to parse validator output."
                }

            verdict_str = str(parsed.get("verdict", "")).strip().upper()
            if verdict_str not in ("APPROVED", "REJECTED"):
                verdict_str = "REJECTED"

            conf_val = parsed.get("confidence", 80)
            try:
                confidence_int = int(conf_val)
                if confidence_int < 0:
                    confidence_int = 0
                elif confidence_int > 100:
                    confidence_int = 100
            except Exception:
                confidence_int = 80

            reason_str = str(parsed.get("reason", "Consensus verdict rendered."))
            return {
                "verdict": verdict_str,
                "confidence": confidence_int,
                "reason": reason_str
            }

        def validator_fn(leader_res) -> bool:
            # GenLayer Optimistic Democracy verification:
            # Leader result is wrapped in gl.vm.Return.
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False

            # Validator re-executes locally
            mine = leader_fn()

            # ✅ CRITICAL: Compare VERDICT / MEANING only!
            # Differences in natural language wording in `reason` are ignored,
            # ensuring deterministic consensus on subjective outcomes.
            return mine["verdict"] == leader["verdict"]

        adjudication_res = gl.vm.run_nondet(leader_fn, validator_fn)

        verdict = adjudication_res["verdict"]
        reason = adjudication_res["reason"]
        confidence = u8(int(adjudication_res["confidence"]))

        job.verdict = verdict
        job.reason = reason
        job.confidence = confidence

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

    @gl.public.write
    def cancel_job(self, job_id: str) -> None:
        """
        Master Agent can cancel an OPEN job and reclaim escrow before a sub-agent claims it.
        """
        if job_id not in self.jobs:
            raise gl.UserError(f"Job {job_id} does not exist.")

        job = self.jobs[job_id]
        if gl.message.sender != job.creator:
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
        """Returns JSON serialized representation of a job."""
        if job_id not in self.jobs:
            raise gl.UserError(f"Job {job_id} does not exist.")

        job = self.jobs[job_id]
        job_data = {
            "job_id": job.job_id,
            "creator": _addr_str(job.creator),
            "worker": _addr_str(job.worker),
            "bounty_amount": str(job.bounty_amount),
            "repo_url": job.repo_url,
            "sla_spec": job.sla_spec,
            "pr_url": job.pr_url,
            "status": int(job.status),
            "verdict": job.verdict,
            "reason": job.reason,
            "confidence": int(job.confidence),
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
        }
        return json.dumps(data)
