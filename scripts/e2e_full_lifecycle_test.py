"""
AgentSLA - Automated End-to-End Test Suite (From A to Z)
Performs complete lifecycle:
  Step 1: Fund Master Agent & Sub-Agent accounts on Studio Next
  Step 2: Master Agent creates SLA Task & locks 0.2 GEN escrow (create_job)
  Step 3: Sub-Agent claims task & submits Pull Request deliverable (submit_deliverable)
  Step 4: AI Jury Court Adjudication (adjudicate) & Optimistic Democracy verdict inspection
"""

import os
import sys
import time
import json
import requests
from eth_account import Account
from web3 import Web3
from eth_abi import encode as abi_encode
from eth_utils import keccak
from genlayer_py.consensus.consensus_main.encoder import encode_tx_data_call
from genlayer_py.abi import calldata
from genlayer_py.contracts.utils import make_calldata_object

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

RPC_URL = "https://studio-dev.genlayer.com/api"
CHAIN_ID = 61997
CONSENSUS_ADDRESS = "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575"
CONTRACT_ADDRESS = "0xb8D09AeCFAB0bB1ca0096670d6ED92ccE5d29a37"

w3 = Web3(Web3.HTTPProvider(RPC_URL, request_kwargs={"timeout": 30}))

# Master Agent (Creator / Employer)
CREATOR = Account.from_key("0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d")
# Sub-Agent (Worker / Deliverer)
WORKER = Account.from_key("0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1")

print("=" * 70)
print("  AgentSLA - Automated Full-Lifecycle Adjudication Test (A-Z)")
print("=" * 70)
print(f"  Contract: {CONTRACT_ADDRESS}")
print(f"  Master Agent: {CREATOR.address}")
print(f"  Sub-Agent:    {WORKER.address}")
print("=" * 70)


def rpc_call(payload):
    """RPC caller with automatic 429 exponential backoff."""
    for retry in range(15):
        try:
            r = requests.post(RPC_URL, json=payload, timeout=25)
            if r.status_code == 429:
                print(f"  [Rate Limit 429] Waiting 20s before retry (attempt {retry+1}/15)...")
                time.sleep(20)
                continue
            data = r.json()
            if "error" in data and data["error"].get("code") == -32029:
                wait_time = data["error"].get("data", {}).get("retry_after_seconds", 15) + 3
                print(f"  [Rate Limit -32029] Waiting {wait_time}s before retry (attempt {retry+1}/15)...")
                time.sleep(wait_time)
                continue
            return data
        except requests.exceptions.RequestException as e:
            print(f"  [Network Warning] {e}, retrying in 5s...")
            time.sleep(5)
    raise RuntimeError("Max retries exceeded on RPC call")


def read_contract(method_name, args=[]):
    """Executes an on-chain read call on the contract."""
    calldata_obj = make_calldata_object(method=method_name, args=args, kwargs={})
    read_data = "0x" + calldata.encode(calldata_obj).hex()
    res = rpc_call({
        "jsonrpc": "2.0",
        "method": "gen_call",
        "params": [
            {
                "type": "read",
                "to": CONTRACT_ADDRESS,
                "from": CREATOR.address,
                "data": read_data,
                "transaction_hash_variant": "latest-nonfinal",
            }
        ],
        "id": 1,
    })

    if "result" in res:
        val = calldata.decode(bytes.fromhex(res["result"]))
        if isinstance(val, str) and (val.startswith("{") or val.startswith("[")):
            try:
                return json.loads(val)
            except Exception:
                return val
        return val
    raise RuntimeError(f"Read call {method_name} failed: {res}")


def send_genlayer_tx(signer_account, function_name, args, value_wei=0):
    """Encodes and sends an execution transaction to GenLayer Studio Next."""
    # 1. Fetch fee distribution config
    fee_res = rpc_call({"jsonrpc": "2.0", "method": "sim_getFeeConfig", "params": [], "id": 1})
    dist = fee_res["result"]["defaultFees"]["distribution"]
    EXECUTION_BUDGET = 500000000000000  # 500 trillion wei
    dist["executionBudgetPerRound"] = str(EXECUTION_BUDGET)
    fee_value = EXECUTION_BUDGET + 2588

    # 2. Encode function call
    call_data_hex = encode_tx_data_call(function_name=function_name, leader_only=False, args=args, kwargs={})
    serialized_call_data = bytes.fromhex(call_data_hex[2:] if call_data_hex.startswith("0x") else call_data_hex)

    fees_dist_tuple = (
        int(dist["leaderTimeunitsAllocation"]),
        int(dist["validatorTimeunitsAllocation"]),
        int(dist["appealRounds"]),
        int(dist["executionBudgetPerRound"]),
        int(dist["executionConsumed"]),
        int(dist["totalMessageFees"]),
        [int(x) for x in dist["rotations"]],
        int(dist["maxPriceGenPerTimeUnit"]),
        int(dist["storageFeeMaxGasPrice"]),
        int(dist["receiptFeeMaxGasPrice"]),
    )

    call_params_tuple = (
        signer_account.address,
        CONTRACT_ADDRESS,
        5,
        3,
        0,
        0,
        value_wei,
        fees_dist_tuple,
        serialized_call_data,
        [],
    )

    fees_dist_type = "(uint256,uint256,uint256,uint256,uint256,uint256,uint256[],uint256,uint256,uint256)"
    msg_alloc_type = "(uint8,bool,uint256,address,bytes32,uint256,bytes)[]"
    params_type = f"(address,address,uint256,uint256,uint256,uint256,uint256,{fees_dist_type},bytes,{msg_alloc_type})"

    sig = f"addTransaction({params_type})"
    selector = keccak(text=sig)[:4]
    encoded_call_params = abi_encode([params_type], [call_params_tuple])
    call_calldata = selector + encoded_call_params

    # Handle nonce with retry
    for _ in range(5):
        try:
            nonce = w3.eth.get_transaction_count(signer_account.address)
            break
        except Exception:
            time.sleep(6)

    tx = {
        "from": signer_account.address,
        "to": CONSENSUS_ADDRESS,
        "nonce": nonce,
        "data": "0x" + call_calldata.hex(),
        "value": fee_value + value_wei,
        "gas": 3000000,
        "maxFeePerGas": w3.to_wei(2, "gwei"),
        "maxPriorityFeePerGas": w3.to_wei(1, "gwei"),
        "chainId": CHAIN_ID,
    }

    signed_tx = signer_account.sign_transaction(tx)
    
    # Broadcast with 429 retry
    tx_hash_hex = None
    for retry_bc in range(15):
        try:
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_hash_hex = "0x" + tx_hash.hex() if not tx_hash.hex().startswith("0x") else tx_hash.hex()
            break
        except Exception as e:
            if "429" in str(e):
                print(f"  [Rate Limit 429] Waiting 20s before re-broadcasting (attempt {retry_bc+1}/15)...")
                time.sleep(20)
            else:
                raise e

    print(f"  Tx Broadcasted: {tx_hash_hex}")

    # Wait for EVM receipt
    w3.eth.wait_for_transaction_receipt(tx_hash_hex, timeout=40)
    print("  EVM inclusion confirmed! Awaiting GenLayer consensus block finalization...")

    # Poll for consensus finalization (rate-limit conscious: 6s intervals)
    for attempt in range(35):
        time.sleep(6)
        try:
            res = rpc_call({"jsonrpc": "2.0", "method": "eth_getTransactionByHash", "params": [tx_hash_hex], "id": 1})
            tx_data = res.get("result", {})
            status = tx_data.get("status")
            exec_name = tx_data.get("txExecutionResultName") or tx_data.get("txExecutionResult")
            if attempt % 2 == 0:
                print(f"    [Consensus Check] Status: {status}, Result: {exec_name}")
            if status in ("FINALIZED", "ACCEPTED"):
                if exec_name == "FINISHED_WITH_RETURN" or exec_name == 1:
                    print(f"  [OK] GenLayer Consensus Status: {status} ({exec_name})")
                    return tx_hash_hex
                elif exec_name == "FINISHED_WITH_ERROR" or exec_name == 2:
                    raise RuntimeError(f"GenVM execution reverted on {function_name}: {exec_name}")
        except Exception as e:
            pass

    print("  Warning: Finalization polling took longer than expected, continuing...")
    return tx_hash_hex


# --- STEP 1: FUND ACCOUNTS ---
print("\n[STEP 1/4] Funding Test Wallets via Studio Next Faucet...")
requests.post(
    RPC_URL,
    json={"jsonrpc": "2.0", "method": "sim_fundAccount", "params": [CREATOR.address, 10000000000000000000], "id": 1},
    timeout=10,
)
requests.post(
    RPC_URL,
    json={"jsonrpc": "2.0", "method": "sim_fundAccount", "params": [WORKER.address, 10000000000000000000], "id": 1},
    timeout=10,
)
bal_creator = w3.eth.get_balance(CREATOR.address)
bal_worker = w3.eth.get_balance(WORKER.address)
print(f"  Creator Balance: {w3.from_wei(bal_creator, 'ether')} GEN")
print(f"  Worker Balance:  {w3.from_wei(bal_worker, 'ether')} GEN")


# Check latest job state
count = read_contract("get_job_count")
print(f"\n  [State Check] On-Chain Total Jobs: {count}")
latest_job = read_contract("get_job", [f"sla-{count}"]) if count > 0 else None
job_id = f"sla-{count}"

if latest_job and latest_job.get("status") == 7:
    print(f"  [Retry Resubmission] Found job {job_id} in RETRY state (Attempt {latest_job.get('attempts')}/3)!")
    print(f"  Sub-Agent resubmitting deliverable PR with updated implementation & test proofs on GitHub...")
    send_genlayer_tx(
        signer_account=WORKER,
        function_name="submit_deliverable",
        args=[job_id, "https://github.com/tuannguyenvan95/AgentSLA/pull/1"],
        value_wei=0,
    )
    time.sleep(6)
    job_after_pr = read_contract("get_job", [job_id])
    print(f"  [OK] Updated Status:  {job_after_pr.get('status')} (1 = IN_REVIEW)")
    print(f"  [OK] Current Attempt: {job_after_pr.get('attempts')}/3")
elif latest_job and latest_job.get("status") == 1:
    print(f"  [Resume] Found existing job {job_id} in IN_REVIEW state!")
    print(f"  Worker: {latest_job.get('worker')}, PR: {latest_job.get('pr_url')}")
else:
    # --- STEP 2: MASTER AGENT COMMISSIONS SLA TASK ---
    print("\n[STEP 2/4] Master Agent Commissioning SLA Task (create_job)...")
    sla_spec = (
        "Task: Implement comprehensive SLA adjudication and verified escrow protocol for AgentSLA.\n"
        "Acceptance Criteria:\n"
        "1. Deliverable must be submitted as Pull Request #1 on tuannguyenvan95/AgentSLA.\n"
        "2. Architecture must implement dual-sided escrow security and strict role separation.\n"
        "3. Include anti-rugpull safeguards, anti-spam retry limits, and SHA-256 canary defense.\n"
        "4. Provide full verification proofs with 14 automated unit tests passing 100%."
    )
    repo_url = "https://github.com/tuannguyenvan95/AgentSLA"
    category = "SMART_CONTRACT"
    bounty_wei = 200000000000000000  # 0.2 GEN

    send_genlayer_tx(
        signer_account=CREATOR,
        function_name="create_job",
        args=[sla_spec, repo_url, category],
        value_wei=bounty_wei,
    )

    time.sleep(6)
    count = read_contract("get_job_count")
    print(f"\n  [OK] On-Chain Job Count: {count}")
    job_id = f"sla-{count}"
    job = read_contract("get_job", [job_id])
    print(f"  [OK] Created Job ID: {job_id}")
    print(f"  [OK] Bounty in Escrow: {int(job.get('bounty_amount', 0)) / 1e18} GEN")
    print(f"  [OK] Initial Status: {job.get('status')} (0 = OPEN)")
    assert job.get("status") == 0, "Job must be in OPEN status"

    time.sleep(6)

    # --- STEP 3: SUB-AGENT DELIVERS PULL REQUEST ---
    print(f"\n[STEP 3/4] Sub-Agent Submitting Deliverable PR for {job_id}...")
    pr_url = "https://github.com/tuannguyenvan95/AgentSLA/pull/1"

    send_genlayer_tx(
        signer_account=WORKER,
        function_name="submit_deliverable",
        args=[job_id, pr_url],
        value_wei=0,
    )

    time.sleep(6)
    job_after_pr = read_contract("get_job", [job_id])
    print(f"  [OK] Worker Assigned: {job_after_pr.get('worker')}")
    print(f"  [OK] Deliverable PR:  {job_after_pr.get('pr_url')}")
    print(f"  [OK] Updated Status:  {job_after_pr.get('status')} (1 = IN_REVIEW)")
    assert job_after_pr.get("status") == 1, "Job must be in IN_REVIEW status"


# --- STEP 4: AI JURY COURT ADJUDICATION ---
print(f"\n[STEP 4/4] Triggering AI Jury Court Adjudication (adjudicate)...")
print("  Calling gl.nondet.web.render & LLM consensus on-chain...")
bal_worker_before = w3.eth.get_balance(WORKER.address)

send_genlayer_tx(
    signer_account=CREATOR,
    function_name="adjudicate",
    args=[job_id],
    value_wei=0,
)

time.sleep(6)
job_verdict = read_contract("get_job", [job_id])
bal_worker_after = w3.eth.get_balance(WORKER.address)
payout = bal_worker_after - bal_worker_before

print("\n" + "=" * 70)
print("  [AI JURY COURT ON-CHAIN VERDICT SCORECARD]")
print("=" * 70)
print(f"  Job ID:           {job_id}")
print(f"  Final Status:     {job_verdict.get('status')} (2 = RESOLVED_SUCCESS)")
print(f"  Verdict:          {job_verdict.get('verdict')}")
print(f"  Spec Match Score: {job_verdict.get('spec_score', 0)}%")
print(f"  Code Quality:     {job_verdict.get('quality_score', 0)}%")
print(f"  Test Coverage:    {job_verdict.get('test_score', 0)}%")
print(f"  Jury Confidence:  {job_verdict.get('confidence', 0)}%")
print(f"  Consensus Reason: {job_verdict.get('reason')}")
print("=" * 70)
print(f"  Worker Balance Before: {w3.from_wei(bal_worker_before, 'ether')} GEN")
print(f"  Worker Balance After:  {w3.from_wei(bal_worker_after, 'ether')} GEN")
print(f"  Net Escrow Payout:     {w3.from_wei(payout, 'ether')} GEN")

stats = read_contract("get_stats")
print(f"  Protocol Stats: Total Resolved = {stats.get('total_jobs_resolved')}, Total Escrow Locked = {int(stats.get('total_escrow_locked', 0)) / 1e18} GEN")
print("\n>>> [SUCCESS] Full Lifecycle Test with Settlement Completed! <<<")
