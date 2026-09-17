import requests, json, time, sys
from eth_account import Account
from web3 import Web3
from eth_abi import encode as abi_encode
from eth_utils import keccak
from genlayer_py.consensus.consensus_main.encoder import encode_tx_data_deploy
from genlayer_py.abi import calldata
from genlayer_py.contracts.utils import make_calldata_object

RPC_URL = "https://studio-dev.genlayer.com/api"
CHAIN_ID = 61997
CONSENSUS_ADDRESS = "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575"

account = Account.from_key("0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d")
w3 = Web3(Web3.HTTPProvider(RPC_URL, request_kwargs={"timeout": 30}))

test_contract = """# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
import genlayer as gl
import json

class Inspector(gl.contract.Contract):
    def __init__(self):
        pass

    @gl.public.view
    def inspect(self) -> str:
        attrs = [x for x in dir(gl) if not x.startswith('_')]
        contract_attrs = [x for x in dir(gl.contract) if not x.startswith('_')] if hasattr(gl, 'contract') else []
        return json.dumps({"gl": attrs, "gl_contract": contract_attrs})
"""

fee_res = requests.post(RPC_URL, json={"jsonrpc": "2.0", "method": "sim_getFeeConfig", "params": [], "id": 1}, timeout=10).json()
dist = fee_res["result"]["defaultFees"]["distribution"]
EXECUTION_BUDGET = 500000000000000
dist["executionBudgetPerRound"] = str(EXECUTION_BUDGET)
fee_value = EXECUTION_BUDGET + 2588

tx_data_hex = encode_tx_data_deploy(code=test_contract, leader_only=False, args=[], kwargs={})
serialized_data = bytes.fromhex(tx_data_hex[2:] if tx_data_hex.startswith("0x") else tx_data_hex)

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

params_tuple = (
    account.address,
    "0x0000000000000000000000000000000000000000",
    5, 3, 0, 0, 0,
    fees_dist_tuple,
    serialized_data,
    [],
)

fees_dist_type = "(uint256,uint256,uint256,uint256,uint256,uint256,uint256[],uint256,uint256,uint256)"
msg_alloc_type = "(uint8,bool,uint256,address,bytes32,uint256,bytes)[]"
params_type = f"(address,address,uint256,uint256,uint256,uint256,uint256,{fees_dist_type},bytes,{msg_alloc_type})"

sig = f"addTransaction({params_type})"
selector = keccak(text=sig)[:4]
encoded_params = abi_encode([params_type], [params_tuple])
calldata_bytes = selector + encoded_params

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
    "chainId": CHAIN_ID,
}

signed_tx = account.sign_transaction(tx)
tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
tx_hash_hex = "0x" + tx_hash.hex() if not tx_hash.hex().startswith("0x") else tx_hash.hex()
print("Deploying inspector contract, tx:", tx_hash_hex)
w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
print("EVM confirmed, polling consensus...")

for attempt in range(30):
    time.sleep(5)
    res = requests.post(RPC_URL, json={"jsonrpc": "2.0", "method": "eth_getTransactionByHash", "params": [tx_hash_hex], "id": 1}, timeout=15).json()
    tx_data = res.get("result", {})
    status = tx_data.get("status")
    exec_name = tx_data.get("txExecutionResultName") or tx_data.get("txExecutionResult")
    if status in ("FINALIZED", "ACCEPTED"):
        if exec_name == "FINISHED_WITH_RETURN" or exec_name == 1:
            addr = tx_data.get("recipient") or tx_data.get("to_address")
            print("Inspector deployed at:", addr)
            calldata_obj = make_calldata_object(method="inspect", args=[], kwargs={})
            read_data = "0x" + calldata.encode(calldata_obj).hex()
            read_res = requests.post(RPC_URL, json={"jsonrpc": "2.0", "method": "gen_call", "params": [{"type": "read", "to": addr, "from": account.address, "data": read_data, "transaction_hash_variant": "latest-nonfinal"}], "id": 1}, timeout=15).json()
            ret = calldata.decode(bytes.fromhex(read_res["result"]))
            print("=== INSPECTION RESULT ===\n", ret)
            break
        elif exec_name == "FINISHED_WITH_ERROR" or exec_name == 2:
            print("Failed deploy:", tx_data)
            break
