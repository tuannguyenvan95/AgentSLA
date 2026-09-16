import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

// Official Deployed Intelligent Contract on GenLayer Studio Next (Chain 61997)
export const DEFAULT_CONTRACT_ADDRESS = '0x4Ea7D3381B27E0e93f7A280e6ffefC73f10BE313';

export const studioNext = {
  ...studionet,
  id: 61997,
  name: 'GenLayer Studio Next',
  rpcUrls: {
    default: {
      http: ['https://studio-next.genlayer.com/api', 'https://studio-dev.genlayer.com/api'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Studio Next Explorer',
      url: 'https://explorer-studio-dev.genlayer.com',
    },
  },
};

export function getContractAddress(): string {
  try {
    const saved = localStorage.getItem('agentsla_contract_address');
    if (saved && saved.trim().startsWith('0x') && saved.trim().length === 42) {
      const trimmed = saved.trim();
      // Purge zero address and legacy studionet (61999) contract addresses
      if (
        trimmed.toLowerCase() === '0x0000000000000000000000000000000000000000' ||
        trimmed.toLowerCase() === '0xe0f5e6fdc4810ae2030e680f75d6d9f8abf96829' ||
        trimmed.toLowerCase() === '0x20f857d9b26d74d1b2b6546ffdf295510d210e1b' ||
        trimmed.toLowerCase() === '0x29486f9b2183fe278da68dd838d4a581f1b4e449' ||
        trimmed.toLowerCase() === '0xff9f85509d24567e1bd2c4018a92d263a333e633'
      ) {
        localStorage.removeItem('agentsla_contract_address');
        return DEFAULT_CONTRACT_ADDRESS;
      }
      return trimmed;
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

export const STUDIO_NEXT_CONFIG = {
  chainIdHex: '0xF22D', // 61997 in hex
  chainIdDecimal: 61997,
  chainName: 'GenLayer Studio Next',
  rpcUrl: 'https://studio-next.genlayer.com/api',
  nativeCurrency: {
    name: 'GEN Token',
    symbol: 'GEN',
    decimals: 18,
  },
  blockExplorerUrl: 'https://explorer-studio-dev.genlayer.com',
};

export const STUDIONET_CONFIG = STUDIO_NEXT_CONFIG;

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
 * Returns a genlayer-js client configured for Studio Next (chain 61997).
 * If accountAddress is provided, transactions will be initiated from this account
 * and signed directly by the user's browser wallet (MetaMask).
 * NEVER includes a private key in the bundle (Rule R22).
 */
export function getGenLayerClient(accountAddress?: string) {
  const provider = getEthereumProvider();
  if (accountAddress) {
    return createClient({
      chain: studioNext as any,
      account: accountAddress as `0x${string}`,
      provider: provider || undefined,
    });
  }
  return createClient({
    chain: studioNext as any,
    provider: provider || undefined,
  });
}

/**
 * Ensures MetaMask is switched to GenLayer Studio Next (Chain ID 61997).
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
      params: [{ chainId: STUDIO_NEXT_CONFIG.chainIdHex }],
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
              chainId: STUDIO_NEXT_CONFIG.chainIdHex,
              chainName: STUDIO_NEXT_CONFIG.chainName,
              nativeCurrency: STUDIO_NEXT_CONFIG.nativeCurrency,
              rpcUrls: [STUDIO_NEXT_CONFIG.rpcUrl, 'https://studio-dev.genlayer.com/api'],
              blockExplorerUrls: [STUDIO_NEXT_CONFIG.blockExplorerUrl],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add GenLayer Studio Next to wallet:', addError);
        return false;
      }
    }
    console.error('Failed to switch to GenLayer Studio Next:', switchError);
    return false;
  }
}
