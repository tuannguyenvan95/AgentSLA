import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

// Official Deployed Intelligent Contract on GenLayer Studionet (Chain 61999)
export const DEFAULT_CONTRACT_ADDRESS = '0x20F857D9B26d74D1B2B6546FfdF295510D210e1B';

export function getContractAddress(): string {
  try {
    const saved = localStorage.getItem('agentsla_contract_address');
    if (saved && saved.trim().startsWith('0x') && saved.trim().length === 42 && saved.trim() !== '0x0000000000000000000000000000000000000000') {
      return saved.trim();
    }
  } catch {}
  return DEFAULT_CONTRACT_ADDRESS;
}

export function saveContractAddress(addr: string) {
  try {
    if (addr && addr.trim().startsWith('0x')) {
      localStorage.setItem('agentsla_contract_address', addr.trim());
    } else {
      localStorage.removeItem('agentsla_contract_address');
    }
  } catch {}
}

export const AGENTSLA_CONTRACT_ADDRESS = getContractAddress();

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
 * Returns the active MetaMask/EIP-1193 provider safely, even when multiple wallets are installed.
 */
export function getEthereumProvider() {
  if (typeof window === 'undefined') return null;
  const win = window as any;

  // 1. If window.ethereum.providers exists (e.g. MetaMask + Coinbase + Phantom)
  if (win.ethereum?.providers && Array.isArray(win.ethereum.providers) && win.ethereum.providers.length > 0) {
    const realMetaMask = win.ethereum.providers.find(
      (p: any) => p.isMetaMask && !p.isPhantom && !p.isBraveWallet && !p.isRabby
    );
    if (realMetaMask) return realMetaMask;
    const anyMM = win.ethereum.providers.find((p: any) => p.isMetaMask);
    if (anyMM) return anyMM;
    return win.ethereum.providers[0];
  }

  // 2. Direct window.ethereum (MetaMask, Rabby, Brave, etc.)
  if (win.ethereum) {
    return win.ethereum;
  }

  // 3. Fallbacks for other injected EVM wallets
  if (win.okxwallet) return win.okxwallet;
  if (win.phantom?.ethereum) return win.phantom.ethereum;
  if (win.coinbaseWalletExtension) return win.coinbaseWalletExtension;
  if (win.bitkeep?.ethereum) return win.bitkeep.ethereum;

  return null;
}

/**
 * Returns a genlayer-js client configured for studionet.
 * If accountAddress is provided, transactions will be initiated from this account
 * and signed directly by the user's browser wallet (MetaMask).
 * NEVER includes a private key in the bundle (Rule R22).
 */
export function getGenLayerClient(accountAddress?: string) {
  const provider = getEthereumProvider();
  if (accountAddress) {
    return createClient({
      chain: studionet,
      account: accountAddress as `0x${string}`,
      provider: provider || undefined,
    });
  }
  return createClient({
    chain: studionet,
    provider: provider || undefined,
  });
}

/**
 * Ensures MetaMask is switched to GenLayer studionet (Chain ID 61999).
 * Prompts user to add the network if not previously configured (Rule R23).
 */
export async function switchToStudionet(customProvider?: any): Promise<boolean> {
  const ethereum = customProvider || getEthereumProvider();
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
    const isNotFound = 
      switchError.code === 4902 || 
      switchError.code === -32603 || 
      switchError?.data?.originalError?.code === 4902 ||
      (typeof switchError?.message === 'string' && switchError.message.toLowerCase().includes('unrecognized chain'));

    if (isNotFound) {
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
