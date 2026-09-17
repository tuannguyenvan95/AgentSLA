import { encodeAbiParameters, parseAbiParameters, keccak256, toHex } from 'viem';
import { abi } from 'genlayer-js';
import { getEthereumProvider } from '../config/genlayer';

const CONSENSUS_ADDRESS = '0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575';
const RPC_ENDPOINT = 'https://studio-dev.genlayer.com/api';

const FEES_DIST_TYPE = '(uint256,uint256,uint256,uint256,uint256,uint256,uint256[],uint256,uint256,uint256)';
const MSG_ALLOC_TYPE = '(uint8,bool,uint256,address,bytes32,uint256,bytes)[]';
const PARAMS_TYPE = `(address,address,uint256,uint256,uint256,uint256,uint256,${FEES_DIST_TYPE},bytes,${MSG_ALLOC_TYPE})`;
const SIG = `addTransaction(${PARAMS_TYPE})`;
const SELECTOR = keccak256(toHex(SIG)).slice(0, 10);

interface SendGenLayerTxParams {
  contractAddress: string;
  functionName: string;
  args?: any[];
  value?: bigint;
  account: string;
}

/**
 * Robust transaction dispatcher for GenLayer Studio Next.
 * Encodes addTransaction with the required fees distribution tuple,
 * bypassing the outdated ABI in genlayer-js that causes "FeesDistributionMissing" reverts.
 */
export async function sendGenLayerTransaction({
  contractAddress,
  functionName,
  args = [],
  value = 0n,
  account,
}: SendGenLayerTxParams): Promise<`0x${string}`> {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error('No Web3 wallet (MetaMask) detected.');
  }

  // 1. Fetch current Fee Config from GenLayer node
  let dist: any;
  try {
    const feeRes = await fetch(RPC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'sim_getFeeConfig', params: [], id: 1 }),
    }).then((r) => r.json());
    dist = feeRes?.result?.defaultFees?.distribution;
  } catch (err) {
    console.warn('Failed to fetch fee config from RPC, using resilient defaults:', err);
  }

  // Fallback defaults conforming to GenLayer Studio Next spec
  const executionBudget = 500000000000000n; // 500 trillion wei
  const feeValue = executionBudget + 2588n;

  const feesDistTuple = [
    BigInt(dist?.leaderTimeunitsAllocation ?? 10000),
    BigInt(dist?.validatorTimeunitsAllocation ?? 20000),
    BigInt(dist?.appealRounds ?? 1),
    executionBudget,
    BigInt(dist?.executionConsumed ?? 0),
    BigInt(dist?.totalMessageFees ?? 2588),
    Array.isArray(dist?.rotations) ? dist.rotations.map((x: any) => BigInt(x)) : [5n, 7n, 9n],
    BigInt(dist?.maxPriceGenPerTimeUnit ?? 1),
    BigInt(dist?.storageFeeMaxGasPrice ?? 1),
    BigInt(dist?.receiptFeeMaxGasPrice ?? 1),
  ];

  // 2. Encode contract calldata via genlayer-js ABI utilities (3 arguments required)
  const calldataObj = abi.calldata.makeCalldataObject(functionName, args, {});
  const encodedCalldata = abi.calldata.encode(calldataObj);
  const serializedData = abi.transactions.serialize([encodedCalldata, false]);

  // 3. Assemble parameters tuple matching Studio Next consensus contract
  const paramsTuple = [
    account as `0x${string}`,
    contractAddress as `0x${string}`,
    5n, // initial validators
    3n, // max rotations
    0n,
    0n,
    value, // userValue (e.g. bounty)
    feesDistTuple,
    serializedData,
    [],
  ];

  const encodedArgs = encodeAbiParameters(
    parseAbiParameters(PARAMS_TYPE),
    [paramsTuple as any]
  );
  const fullTxData = `${SELECTOR}${encodedArgs.slice(2)}` as `0x${string}`;

  // 4. Send transaction via MetaMask provider
  const totalValue = feeValue + value;
  const txParams = {
    from: account,
    to: CONSENSUS_ADDRESS,
    data: fullTxData,
    value: totalValue > 0n ? `0x${totalValue.toString(16)}` : '0x0',
    gas: '0x2dc6c0', // 3,000,000 gas limit
  };

  const txHash = (await provider.request({
    method: 'eth_sendTransaction',
    params: [txParams],
  })) as `0x${string}`;

  return txHash;
}
