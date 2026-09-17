import requests, json, time, os
from eth_account import Account
from web3 import Web3
from eth_abi import encode as abi_encode
from eth_utils import keccak
from genlayer_py.consensus.consensus_main.encoder import encode_tx_data_deploy, encode_tx_data_call
from genlayer_py.abi import calldata
from genlayer_py.contracts.utils import make_calldata_object

RPC_URL = "https://studio-dev.genlayer.com/api"
CHAIN_ID = 61997
CONSENSUS_ADDRESS = "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575"
EXPLORER_BASE = "https://explorer-studio-dev.genlayer.com"

def main():
    print("=" * 65)
    print("  Deploying AgentSLA to GenLayer Studio Next (Chain 61997)")
    print("=" * 65)

    account = Account.from_key("0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d")
    print(f"Deployer Address: {account.address}")

    print("Funding deployer account with 10 GEN on Studio Next...")
    fund_res = requests.post(RPC_URL, json={'jsonrpc': '2.0', 'method': 'sim_fundAccount', 'params': [account.address, 10000000000000000000], 'id': 1}, timeout=10).json()
    print("Faucet response:", fund_res)

    print("Reading contract code...")
    contract_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "contracts", "contract.py")
    with open(contract_path, "r", encoding="utf-8") as f:
        contract_code = f.read()

    # 1. Fee Config
    fee_res = requests.post(RPC_URL, json={'jsonrpc': '2.0', 'method': 'sim_getFeeConfig', 'params': [], 'id': 1}, timeout=10).json()
    dist = fee_res['result']['defaultFees']['distribution']
    EXECUTION_BUDGET = 500000000000000 # 500 trillion wei
    dist['executionBudgetPerRound'] = str(EXECUTION_BUDGET)
    fee_value = EXECUTION_BUDGET + 2588

    # 2. Encode Deploy
    tx_data_hex = encode_tx_data_deploy(code=contract_code, leader_only=False, args=[], kwargs={})
    serialized_data = bytes.fromhex(tx_data_hex[2:] if tx_data_hex.startswith("0x") else tx_data_hex)

    fees_dist_tuple = (
        int(dist['leaderTimeunitsAllocation']),
        int(dist['validatorTimeunitsAllocation']),
        int(dist['appealRounds']),
        int(dist['executionBudgetPerRound']),
        int(dist['executionConsumed']),
        int(dist['totalMessageFees']),
        [int(x) for x in dist['rotations']],
        int(dist['maxPriceGenPerTimeUnit']),
        int(dist['storageFeeMaxGasPrice']),
        int(dist['receiptFeeMaxGasPrice'])
    )

    params_tuple = (
        account.address,
        "0x0000000000000000000000000000000000000000",
        5, 3, 0, 0, 0,
        fees_dist_tuple,
        serialized_data,
        []
    )

    fees_dist_type = "(uint256,uint256,uint256,uint256,uint256,uint256,uint256[],uint256,uint256,uint256)"
    msg_alloc_type = "(uint8,bool,uint256,address,bytes32,uint256,bytes)[]"
    params_type = f"(address,address,uint256,uint256,uint256,uint256,uint256,{fees_dist_type},bytes,{msg_alloc_type})"

    sig = f"addTransaction({params_type})"
    selector = keccak(text=sig)[:4]
    encoded_params = abi_encode([params_type], [params_tuple])
    calldata_bytes = selector + encoded_params

    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    nonce = w3.eth.get_transaction_count(account.address)

    tx = {
        "from": account.address,
        "to": CONSENSUS_ADDRESS,
        "nonce": nonce,
        "data": "0x" + calldata_bytes.hex(),
        "value": fee_value,
        "gas": 3000000,
        "maxFeePerGas": w3.to_wei(2, "gwei"),
        "maxPriorityFeePerGas": w3.to_wei(1, "gwei"),
        "chainId": CHAIN_ID
    }

    signed_tx = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    tx_hash_hex = "0x" + tx_hash.hex() if not tx_hash.hex().startswith("0x") else tx_hash.hex()
    print(f"\n1. Sent Deployment Transaction: {tx_hash_hex}")

    print("Waiting for EVM confirmation...")
    evm_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
    print(f"EVM Status: {evm_receipt.status}")
    if evm_receipt.status != 1:
        raise RuntimeError("EVM Transaction failed!")

    print("\nWaiting for GenLayer consensus finalization (validator voting)...")
    contract_address = None
    for attempt in range(40):
        time.sleep(6)
        try:
            res = requests.post(RPC_URL, json={'jsonrpc': '2.0', 'method': 'eth_getTransactionByHash', 'params': [tx_hash_hex], 'id': 1}, timeout=15).json()
            if "error" in res and res["error"].get("code") == -32029:
                wait_sec = res["error"].get("data", {}).get("retry_after_seconds", 15) + 2
                print(f"  Rate limit hit, waiting {wait_sec}s...")
                time.sleep(wait_sec)
                continue
            tx_data = res.get('result', {})
            status = tx_data.get('status')
            exec_name = tx_data.get('txExecutionResultName') or tx_data.get('txExecutionResult')
            print(f"  Attempt {attempt+1}: status={status}, execution={exec_name}")
            if status in ('FINALIZED', 'ACCEPTED'):
                if exec_name == 'FINISHED_WITH_RETURN' or exec_name == 1:
                    contract_address = tx_data.get('recipient') or tx_data.get('to_address')
                    print(f"\n>>> [SUCCESS] AgentSLA Deployed Successfully! <<<")
                    print(f"Contract Address: {contract_address}")
                    print(f"Explorer URL: {EXPLORER_BASE}/address/{contract_address}")
                    break
                elif exec_name == 'FINISHED_WITH_ERROR' or exec_name == 2:
                    raise RuntimeError("Transaction execution failed in GenVM!")
        except requests.exceptions.RequestException:
            print("  Request timed out, retrying...")

    if not contract_address:
        raise RuntimeError("Could not retrieve deployed contract address!")

    # Verify read call
    print("\n2. Verifying deployed contract on-chain state...")
    calldata_obj = make_calldata_object(method='get_job_count', args=[], kwargs={})
    read_data = '0x' + calldata.encode(calldata_obj).hex()
    res = requests.post(RPC_URL, json={
        'jsonrpc': '2.0',
        'method': 'gen_call',
        'params': [{
            'type': 'read',
            'to': contract_address,
            'from': account.address,
            'data': read_data,
            'transaction_hash_variant': 'latest-nonfinal'
        }],
        'id': 1
    }, timeout=15).json()

    print("Initial get_job_count result:", calldata.decode(bytes.fromhex(res['result'])))

    # 3. Create Sample Job On-chain
    print("\n3. Creating initial sample SLA job on-chain...")
    spec = "Implement responsive on-chain SLA adjudication interface with multi-dimensional criteria scoring (Spec, Quality, Tests) and Optimistic Democracy verification."
    repo = "https://github.com/tuannguyenvan95/AgentSLA"
    category = "FULL_STACK"
    bounty = 500000000000000000 # 0.5 GEN

    call_data_hex = encode_tx_data_call(function_name="create_job", leader_only=False, args=[spec, repo, category], kwargs={})
    serialized_call_data = bytes.fromhex(call_data_hex[2:] if call_data_hex.startswith("0x") else call_data_hex)

    call_params_tuple = (
        account.address,
        contract_address,
        5, 3, 0, 0,
        bounty, # userValue
        fees_dist_tuple,
        serialized_call_data,
        []
    )

    encoded_call_params = abi_encode([params_type], [call_params_tuple])
    call_calldata = selector + encoded_call_params

    nonce = w3.eth.get_transaction_count(account.address)
    call_tx = {
        "from": account.address,
        "to": CONSENSUS_ADDRESS,
        "nonce": nonce,
        "data": "0x" + call_calldata.hex(),
        "value": fee_value + bounty,
        "gas": 3000000,
        "maxFeePerGas": w3.to_wei(2, "gwei"),
        "maxPriorityFeePerGas": w3.to_wei(1, "gwei"),
        "chainId": CHAIN_ID
    }

    signed_call = account.sign_transaction(call_tx)
    call_hash = w3.eth.send_raw_transaction(signed_call.raw_transaction)
    print(f"Sent create_job transaction: 0x{call_hash.hex()}")
    w3.eth.wait_for_transaction_receipt(call_hash, timeout=30)
    print("EVM transaction confirmed! Waiting for finalization...")
    time.sleep(12)

    # Save to json
    deployment_info = {
        "network": "GenLayer Studio Next",
        "chainId": CHAIN_ID,
        "rpcUrl": "https://studio-next.genlayer.com/api",
        "canonicalRpcUrl": "https://studio-dev.genlayer.com/api",
        "explorerUrl": f"{EXPLORER_BASE}/address/{contract_address}",
        "contractAddress": contract_address,
        "deployer": account.address,
        "deployedAt": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    }

    out_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "deployed_address.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(deployment_info, f, indent=2)
    print(f"\nSaved deployment info to {out_file}")
    print("\nDeployment completed successfully!")

if __name__ == "__main__":
    main()
