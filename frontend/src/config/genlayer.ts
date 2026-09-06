import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

// Environment or configured contract address
export const AGENTSLA_CONTRACT_ADDRESS = 
  ((import.meta as any).env?.VITE_CONTRACT_ADDRESS as string) || '0x0000000000000000000000000000000000000000';

export const STUDIONET_CONFIG = {
  chainIdHex: '0x' + studionet.id.toString(16), // 61999 -> 0xF1EF
  chainIdDecimal: studionet.id,
  chainName: 'GenLayer Studio Network',
  rpcUrl: 'https://studio.genlayer.com/api',
  nativeCurrency: {
    name: 'GEN Token',
    symbol: 'GEN',
    decimals: 18,
  },
  blockExplorerUrl: 'https://genlayer-explorer.vercel.app',
};

/**
 * Returns a genlayer-js client configured for studionet.
 * If accountAddress is provided, transactions will be initiated from this account
 * and signed directly by the user's browser wallet (MetaMask).
 * NEVER includes a private key in the bundle (Rule R22).
 */
export function getGenLayerClient(accountAddress?: string) {
  if (accountAddress) {
    return createClient({
      chain: studionet,
      account: accountAddress as `0x${string}`,
    });
  }
  return createClient({
    chain: studionet,
  });
}

/**
 * Ensures MetaMask is switched to GenLayer studionet (Chain ID 61999).
 * Prompts user to add the network if not previously configured (Rule R23).
 */
export async function switchToStudionet(): Promise<boolean> {
  const ethereum = (window as unknown as { ethereum?: any }).ethereum;
  if (!ethereum) {
    alert('MetaMask or Web3 wallet is not detected. Please install MetaMask to interact with AgentSLA.');
    return false;
  }

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CONFIG.chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    // Error code 4902 or -32603 indicates chain has not been added yet
    if (switchError.code === 4902 || switchError.code === -32603) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: STUDIONET_CONFIG.chainIdHex,
              chainName: STUDIONET_CONFIG.chainName,
              nativeCurrency: STUDIONET_CONFIG.nativeCurrency,
              rpcUrls: [STUDIONET_CONFIG.rpcUrl],
              blockExplorerUrls: [STUDIONET_CONFIG.blockExplorerUrl],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add GenLayer studionet to wallet:', addError);
        return false;
      }
    }
    console.error('Failed to switch to GenLayer studionet:', switchError);
    return false;
  }
}
