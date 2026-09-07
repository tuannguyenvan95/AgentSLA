import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus, ExecutionResult } from 'genlayer-js/types';
import { 
  PlusCircle, 
  Search, 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  Terminal, 
  Loader2,
  ExternalLink,
  Bot,
  Wallet,
  ShieldCheck
} from 'lucide-react';
import { 
  getContractAddress,
  STUDIONET_CONFIG, 
  switchToStudionet,
  getEthereumProvider
} from './config/genlayer';
import { Job, toWeiGEN, formatGEN, getExplorerUrl } from './utils/helpers';
import { Navbar, NavTab } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { JobCard, PendingTxState } from './components/JobCard';
import { CreateJob } from './components/CreateJob';
import { SubmitPR } from './components/SubmitPR';
import { JuryModal } from './components/JuryModal';
import { CourtRoom } from './components/CourtRoom';
import { AnalyticsView } from './components/AnalyticsView';
import { DocsView } from './components/DocsView';

export const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [showWalletPromptModal, setShowWalletPromptModal] = useState<boolean>(false);

  // Official Contract Address
  const [contractAddress] = useState<string>(getContractAddress());

  // Memoized GenLayer client for reading & writing
  const client = useMemo(() => {
    const eth = getEthereumProvider();
    return createClient({
      chain: studionet,
      provider: eth || undefined,
      account: account as `0x${string}` | undefined,
    });
  }, [account]);

  // 100% Real On-Chain State with SWR local caching to prevent rate-limit flickering
  const [jobs, setJobs] = useState<Job[]>(() => {
    try {
      const cached = localStorage.getItem(`agentsla_cached_jobs_${contractAddress}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [totalEscrowLocked, setTotalEscrowLocked] = useState<string>(() => {
    try {
      return localStorage.getItem(`agentsla_cached_escrow_${contractAddress}`) || '0';
    } catch {
      return '0';
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTxPending, setIsTxPending] = useState<boolean>(false);
  const [pendingTx, setPendingTx] = useState<PendingTxState | null>(null);
  const [adjudicatingJobId, setAdjudicatingJobId] = useState<string | null>(null);

  // Navigation & Filtering
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('MARKETPLACE');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'IN_REVIEW' | 'IN_APPEAL' | 'RESOLVED'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [myRoleFilter, setMyRoleFilter] = useState<'ALL' | 'CREATOR' | 'WORKER'>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedJobForPR, setSelectedJobForPR] = useState<Job | null>(null);
  const [selectedJobForJury, setSelectedJobForJury] = useState<Job | null>(null);

  // Feedback notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [latestTxHash, setLatestTxHash] = useState<string | null>(null);

  // Auto-dismiss notification toasts with gentle pulse effect (auto fades after 6-7s)
  useEffect(() => {
    if (!successMsg || isTxPending) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [successMsg, isTxPending]);

  useEffect(() => {
    if (!errorMsg || isTxPending) return;
    const timer = setTimeout(() => {
      setErrorMsg(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [errorMsg, isTxPending]);

  // Check network ID
  const checkNetwork = useCallback(async () => {
    const eth = getEthereumProvider();
    if (!eth) return false;
    try {
      const chainIdHex = await eth.request({ method: 'eth_chainId' });
      const isMatch = chainIdHex?.toLowerCase() === STUDIONET_CONFIG.chainIdHex.toLowerCase();
      setIsCorrectNetwork(isMatch);
      return isMatch;
    } catch {
      setIsCorrectNetwork(false);
      return false;
    }
  }, []);

  // Fetch balance
  const fetchBalance = useCallback(async (userAddr?: string) => {
    const eth = getEthereumProvider();
    const target = userAddr || account;
    if (!eth || !target) return;
    try {
      const balHex = await eth.request({
        method: 'eth_getBalance',
        params: [target, 'latest'],
      });
      setBalance(BigInt(balHex).toString());
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  }, [account]);

  // Connect wallet: Interactive request triggered by user click
  const handleConnectWallet = async () => {
    const eth = getEthereumProvider();
    if (!eth) {
      alert('Web3 wallet extension not found (MetaMask, OKX, Rabby...). Please install MetaMask in your browser.');
      return;
    }

    setIsConnecting(true);
    setErrorMsg(null);
    setShowWalletPromptModal(true);

    try {
      // Step 1: Prompt account authorization on extension
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No account connected.');
      }

      const primary = accounts[0];
      setAccount(primary);
      try {
        localStorage.setItem('agentsla_wallet_connected', 'true');
      } catch {}

      setShowWalletPromptModal(false);
      setSuccessMsg(`Wallet connected successfully: ${primary.slice(0, 6)}...${primary.slice(-4)}`);

      // Step 2: Fetch balance
      await fetchBalance(primary);

      // Step 3: Check and switch chain to Studionet
      try {
        const chainIdHex = await eth.request({ method: 'eth_chainId' });
        const isMatch = chainIdHex?.toLowerCase() === STUDIONET_CONFIG.chainIdHex.toLowerCase();
        setIsCorrectNetwork(isMatch);
        if (!isMatch) {
          const switched = await switchToStudionet(eth);
          if (switched) {
            setIsCorrectNetwork(true);
            await fetchBalance(primary);
          } else {
            setErrorMsg('Wallet connected, but on an unsupported network. Please click "Switch Chain" in the top bar to switch to GenLayer Studionet (Chain 61999).');
          }
        }
      } catch (netErr: any) {
        console.warn('Network switch issue:', netErr);
      }
    } catch (err: any) {
      console.error('Wallet connection rejected:', err);
      setShowWalletPromptModal(false);
      if (err.code === 4001) {
        setErrorMsg('Connection request was cancelled in your wallet extension.');
      } else if (err.code === -32002) {
        setErrorMsg('A wallet approval request is pending! Please click the MetaMask extension icon in your browser toolbar to approve.');
      } else {
        setErrorMsg(err?.message || 'Wallet connection failed. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const handleDisconnectWallet = () => {
    try {
      localStorage.removeItem('agentsla_wallet_connected');
    } catch {}
    setAccount(null);
    setBalance('0');
    setSuccessMsg('Wallet disconnected.');
  };

  // Fetch all jobs from the Intelligent Contract (with SWR caching & rate-limit resilience)
  const fetchOnChainData = useCallback(async () => {
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      setJobs([]);
      setTotalEscrowLocked('0');
      return;
    }

    // Skip polling if the browser tab is hidden/in background
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    setIsLoading(true);
    try {
      let statsTotalJobs: number | null = null;

      // 1. Fetch Stats
      try {
        const statsRaw = await client.readContract({
          address: contractAddress as `0x${string}`,
          functionName: 'get_stats',
          args: [],
        });
        const stats = typeof statsRaw === 'string' ? JSON.parse(statsRaw) : statsRaw;
        if (stats) {
          if (stats.total_escrow_locked !== undefined) {
            setTotalEscrowLocked(stats.total_escrow_locked);
            try {
              localStorage.setItem(`agentsla_cached_escrow_${contractAddress}`, stats.total_escrow_locked);
            } catch {}
          }
          if (typeof stats.total_jobs === 'number') {
            statsTotalJobs = stats.total_jobs;
          }
        }
      } catch (e) {
        console.warn('get_stats call warning (rate-limit or network):', e);
      }

      // 2. Determine Job Count (from stats or fallback to get_job_count)
      let totalCount = statsTotalJobs;
      if (totalCount === null) {
        try {
          const countRes = await client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: 'get_job_count',
            args: [],
          });
          totalCount = Number(countRes);
        } catch (cntErr) {
          console.warn('get_job_count warning:', cntErr);
        }
      }

      // If both RPC calls failed (e.g. rate limit), keep existing cached jobs intact!
      if (totalCount === null) {
        return;
      }

      // If contract legitimately has 0 jobs
      if (totalCount === 0) {
        setJobs([]);
        try {
          localStorage.removeItem(`agentsla_cached_jobs_${contractAddress}`);
        } catch {}
        return;
      }

      // 3. Build current cache map to allow instant fallback and reuse
      const currentCacheMap = new Map<string, Job>();
      setJobs((prev) => {
        prev.forEach((j) => currentCacheMap.set(j.job_id, j));
        return prev;
      });

      // 4. Fetch jobs with fallback to existing cached job on transient RPC errors
      const jobPromises: Promise<Job | null>[] = [];
      for (let i = totalCount - 1; i >= 0; i--) {
        jobPromises.push(
          (async () => {
            const expectedId = `sla-${i + 1}`;
            const existingJob = currentCacheMap.get(expectedId);

            // Optimization: If a job is already in terminal resolved state (APPROVED/REJECTED/CANCELLED),
            // its on-chain data is immutable unless an appeal occurs. Reusing it saves 2 RPC calls per cycle!
            if (existingJob && (existingJob.status === 2 || existingJob.status === 3 || existingJob.status === 4)) {
              return existingJob;
            }

            try {
              const jobId = await client.readContract({
                address: contractAddress as `0x${string}`,
                functionName: 'get_job_id_by_index',
                args: [i],
              });
              const rawJob = await client.readContract({
                address: contractAddress as `0x${string}`,
                functionName: 'get_job',
                args: [jobId],
              });
              const parsed = typeof rawJob === 'string' ? JSON.parse(rawJob) : rawJob;
              return parsed;
            } catch (err) {
              console.warn(`Transient RPC issue loading job index ${i}:`, err);
              // Fall back to existing cached job so it never disappears!
              return existingJob || null;
            }
          })()
        );
      }

      const results = await Promise.all(jobPromises);
      const validJobs = results.filter((j): j is Job => j !== null);

      if (validJobs.length > 0) {
        setJobs((prev) => {
          const jobMap = new Map<string, Job>();
          // Preserve all previously loaded jobs
          prev.forEach((j) => jobMap.set(j.job_id, j));
          // Overlay fresh on-chain data
          validJobs.forEach((j) => jobMap.set(j.job_id, j));

          const merged = Array.from(jobMap.values()).sort((a, b) => {
            const numA = parseInt(a.job_id.replace('sla-', ''), 10) || 0;
            const numB = parseInt(b.job_id.replace('sla-', ''), 10) || 0;
            return numB - numA;
          });

          try {
            localStorage.setItem(`agentsla_cached_jobs_${contractAddress}`, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    } catch (err: any) {
      console.warn('Transient error in fetchOnChainData:', err);
    } finally {
      setIsLoading(false);
    }
  }, [client, contractAddress]);

  // Initial mount: Check silent authorization and register listeners once
  useEffect(() => {
    const eth = getEthereumProvider();
    if (eth) {
      checkNetwork();

      // Silent authorization check only - NEVER prompt popup on initial load
      eth.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          fetchBalance(accounts[0]);
        }
      }).catch((err: any) => {
        console.warn('Silent eth_accounts error:', err);
      });

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          try {
            localStorage.setItem('agentsla_wallet_connected', 'true');
          } catch {}
          fetchBalance(accounts[0]);
        } else {
          try {
            localStorage.removeItem('agentsla_wallet_connected');
          } catch {}
          setAccount(null);
          setBalance('0');
        }
      };

      const handleChainChanged = (newChainId: string) => {
        const isMatch = typeof newChainId === 'string' && newChainId.toLowerCase() === STUDIONET_CONFIG.chainIdHex.toLowerCase();
        setIsCorrectNetwork(isMatch);
        if (account) {
          fetchBalance(account);
        }
      };

      eth.on?.('accountsChanged', handleAccountsChanged);
      eth.on?.('chainChanged', handleChainChanged);

      return () => {
        eth.removeListener?.('accountsChanged', handleAccountsChanged);
        eth.removeListener?.('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Fetch on-chain data on load and when dependencies change
  useEffect(() => {
    fetchOnChainData();
  }, [fetchOnChainData]);

  // Auto-refresh interval (with visibility awareness to respect RPC rate limits)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchOnChainData();
        if (account) fetchBalance(account);
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOnChainData();
        if (account) fetchBalance(account);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchOnChainData, account, fetchBalance]);

  // Transaction Actions
  const isTxSuccessful = (receipt: any): boolean => {
    return (
      receipt?.txExecutionResultName === ExecutionResult.FINISHED_WITH_RETURN ||
      receipt?.txExecutionResultName === 'FINISHED_WITH_RETURN'
    );
  };

  // 1. Create Job & Lock Escrow
  const handleCreateJob = async (slaSpec: string, repoUrl: string, bountyGen: string, category: string) => {
    if (!client || !account) {
      throw new Error('Please connect your MetaMask wallet.');
    }
    if (!isCorrectNetwork) {
      throw new Error('Please switch to GenLayer Studionet (Chain ID 61999).');
    }
    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('No valid Intelligent Contract configured.');
    }

    setIsTxPending(true);
    setPendingTx({ action: 'create', statusText: 'Awaiting MetaMask signature...' });
    setErrorMsg(null);
    try {
      const weiAmount = toWeiGEN(bountyGen);
      const hash = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'create_job',
        args: [slaSpec, repoUrl, category],
        value: weiAmount,
      });
      setLatestTxHash(hash);
      setPendingTx({ action: 'create', statusText: 'Locking Escrow on Studionet...' });
      setSuccessMsg('Transaction broadcasted! Awaiting FINALIZED block on GenLayer Studionet...');

      // Close modal immediately once user confirms in MetaMask so they are never trapped in the modal
      setIsCreateOpen(false);

      try {
        const receipt = await client.waitForTransactionReceipt({
          hash,
          status: TransactionStatus.FINALIZED,
          interval: 2000,
          retries: 120,
        });

        if (!isTxSuccessful(receipt)) {
          throw new Error(`Transaction reverted: expected FINISHED_WITH_RETURN, got ${receipt?.txExecutionResultName || 'EXECUTION_FAILURE'}`);
        }

        setSuccessMsg(`SLA Job created & Escrow locked successfully! (Tx: ${hash.slice(0, 10)}...)`);
      } catch (receiptErr: any) {
        console.warn('Receipt check warning, verifying on-chain data directly:', receiptErr);
        // Resilient fallback: Even if receipt polling timed out or encountered transient network error,
        // transaction was broadcasted; update user with progress
        setSuccessMsg(`Transaction broadcasted (Tx: ${hash.slice(0, 10)}...). Finalizing block on-chain...`);
      }

      await fetchOnChainData();
      await fetchBalance(account);
    } catch (txErr: any) {
      if (txErr?.code === 4001 || txErr?.message?.includes('User rejected')) {
        throw new Error('Transaction was cancelled in your wallet extension.');
      }
      throw txErr;
    } finally {
      setIsTxPending(false);
      setPendingTx(null);
    }
  };

  // 2. Submit Deliverable PR
  const handleSubmitPR = async (jobId: string, prUrl: string) => {
    if (!client || !account) {
      throw new Error('Please connect your MetaMask wallet.');
    }
    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('No valid Intelligent Contract configured.');
    }

    setIsTxPending(true);
    setPendingTx({ jobId, action: 'claim', statusText: 'Awaiting MetaMask signature...' });
    setErrorMsg(null);
    try {
      const hash = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'submit_deliverable',
        args: [jobId, prUrl],
        value: BigInt(0),
      });
      setLatestTxHash(hash);
      setPendingTx({ jobId, action: 'claim', statusText: 'Submitting PR & Claiming on-chain...' });
      setSuccessMsg('Submitting PR deliverable to contract...');

      // Close deliverable modal immediately once confirmed in wallet
      setSelectedJobForPR(null);

      try {
        const receipt = await client.waitForTransactionReceipt({
          hash,
          status: TransactionStatus.FINALIZED,
          interval: 2000,
          retries: 120,
        });

        if (!isTxSuccessful(receipt)) {
          throw new Error(`Submit PR deliverable failed: expected FINISHED_WITH_RETURN, got ${receipt?.txExecutionResultName || 'EXECUTION_FAILURE'}`);
        }

        setSuccessMsg('PR deliverable submitted! Ready for on-chain AI Jury adjudication.');
      } catch (receiptErr: any) {
        console.warn('Receipt check warning:', receiptErr);
        setSuccessMsg(`PR submission broadcasted (Tx: ${hash.slice(0, 10)}...). Finalizing on-chain...`);
      }

      await fetchOnChainData();
    } catch (txErr: any) {
      if (txErr?.code === 4001 || txErr?.message?.includes('User rejected')) {
        throw new Error('Transaction was cancelled in your wallet extension.');
      }
      throw txErr;
    } finally {
      setIsTxPending(false);
      setPendingTx(null);
    }
  };

  // 3. Adjudicate SLA
  const handleAdjudicate = async (jobId: string) => {
    if (!client || !account) {
      setErrorMsg('Please connect your MetaMask wallet.');
      return;
    }
    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress === '0x0000000000000000000000000000000000000000') {
      setErrorMsg('No valid Intelligent Contract configured.');
      return;
    }

    setAdjudicatingJobId(jobId);
    setIsTxPending(true);
    setPendingTx({ jobId, action: 'adjudicate', statusText: 'Awaiting MetaMask signature...' });
    setErrorMsg(null);
    try {
      const hash = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'adjudicate',
        args: [jobId],
        value: BigInt(0),
      });
      setLatestTxHash(hash);
      setPendingTx({ jobId, action: 'adjudicate', statusText: 'AI Validator Consensus in progress...' });
      setSuccessMsg('Running AI consensus: Validator nodes are rendering GitHub PR directly on-chain...');

      const receipt = await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.FINALIZED,
        interval: 2000,
        retries: 180,
      });

      if (!isTxSuccessful(receipt)) {
        throw new Error(`Adjudication failed: expected FINISHED_WITH_RETURN, got ${receipt?.txExecutionResultName || 'EXECUTION_FAILURE'}`);
      }

      setSuccessMsg('Adjudication completed! AI Consensus verdict recorded on-chain.');
      await fetchOnChainData();
      await fetchBalance(account);
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes('User rejected')) {
        setErrorMsg('Adjudication was cancelled in your wallet extension.');
      } else {
        setErrorMsg(err?.message || 'Adjudication failed on GenLayer.');
      }
    } finally {
      setAdjudicatingJobId(null);
      setIsTxPending(false);
      setPendingTx(null);
    }
  };

  // 4. Appeal Adjudication
  const handleAppealJob = async (jobId: string, bondGen: string) => {
    if (!client || !account) {
      throw new Error('Please connect your MetaMask wallet.');
    }
    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('No valid Intelligent Contract configured.');
    }

    setIsTxPending(true);
    setPendingTx({ jobId, action: 'appeal', statusText: 'Awaiting MetaMask signature...' });
    setErrorMsg(null);
    try {
      const bondWei = toWeiGEN(bondGen);
      const hash = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'appeal_adjudication',
        args: [jobId],
        value: bondWei,
      });
      setLatestTxHash(hash);
      setPendingTx({ jobId, action: 'appeal', statusText: 'Filing appeal on-chain...' });
      setSuccessMsg('Submitting appeal transaction on-chain...');

      const receipt = await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.FINALIZED,
        interval: 2000,
        retries: 120,
      });

      if (!isTxSuccessful(receipt)) {
        throw new Error(`Appeal submission failed: expected FINISHED_WITH_RETURN, got ${receipt?.txExecutionResultName || 'EXECUTION_FAILURE'}`);
      }

      setSuccessMsg('Appeal filed successfully! Case escalated to AI Appellate Council.');
      await fetchOnChainData();
      await fetchBalance(account);
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes('User rejected')) {
        throw new Error('Appeal was cancelled in your wallet extension.');
      }
      throw err;
    } finally {
      setIsTxPending(false);
      setPendingTx(null);
    }
  };

  // 5. Cancel Job
  const handleCancelJob = async (jobId: string) => {
    if (!client || !account) return;
    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress === '0x0000000000000000000000000000000000000000') {
      setErrorMsg('No valid Intelligent Contract configured.');
      return;
    }
    if (!confirm(`Cancel job ${jobId} and refund escrowed funds to your wallet?`)) return;

    setIsTxPending(true);
    setPendingTx({ jobId, action: 'cancel', statusText: 'Awaiting MetaMask signature...' });
    setErrorMsg(null);
    try {
      const hash = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'cancel_job',
        args: [jobId],
        value: BigInt(0),
      });
      setLatestTxHash(hash);
      setPendingTx({ jobId, action: 'cancel', statusText: 'Refunding escrow on-chain...' });
      const receipt = await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.FINALIZED,
        interval: 2000,
        retries: 120,
      });

      if (!isTxSuccessful(receipt)) {
        throw new Error(`Cancel job failed: expected FINISHED_WITH_RETURN, got ${receipt?.txExecutionResultName || 'EXECUTION_FAILURE'}`);
      }

      setSuccessMsg(`Job ${jobId} cancelled. Escrow refund completed.`);
      await fetchOnChainData();
      await fetchBalance(account);
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes('User rejected')) {
        setErrorMsg('Cancel request was rejected in your wallet extension.');
      } else {
        setErrorMsg(err?.message || 'Failed to cancel job.');
      }
    } finally {
      setIsTxPending(false);
      setPendingTx(null);
    }
  };

  // Role-based filtering and computation for authenticated user
  const myCreatedJobs = useMemo(() => {
    if (!account) return [];
    return jobs.filter((j) => j.creator.toLowerCase() === account.toLowerCase());
  }, [jobs, account]);

  const myWorkerJobs = useMemo(() => {
    if (!account) return [];
    return jobs.filter(
      (j) => j.worker && j.worker !== '0x0000000000000000000000000000000000000000' && j.worker.toLowerCase() === account.toLowerCase()
    );
  }, [jobs, account]);

  const myCreatedEscrowTotal = useMemo(() => {
    return myCreatedJobs.reduce((acc, curr) => acc + BigInt(curr.bounty_amount), BigInt(0)).toString();
  }, [myCreatedJobs]);

  const myEarnedBountiesTotal = useMemo(() => {
    return myWorkerJobs
      .filter((j) => j.status === 2)
      .reduce((acc, curr) => acc + BigInt(curr.bounty_amount), BigInt(0)).toString();
  }, [myWorkerJobs]);

  // Filter and search
  const filteredJobs = jobs.filter((job) => {
    // Dedicated Tab: My Contracts (Role-separated)
    if (activeNavTab === 'MY_CONTRACTS') {
      if (!account) return false;
      const isMyCreator = job.creator.toLowerCase() === account.toLowerCase();
      const isMyWorker = Boolean(
        job.worker && 
        job.worker !== '0x0000000000000000000000000000000000000000' && 
        job.worker.toLowerCase() === account.toLowerCase()
      );
      if (myRoleFilter === 'CREATOR' && !isMyCreator) return false;
      if (myRoleFilter === 'WORKER' && !isMyWorker) return false;
      if (myRoleFilter === 'ALL' && !isMyCreator && !isMyWorker) return false;
    }

    // Status filter
    if (activeFilter === 'OPEN' && job.status !== 0) return false;
    if (activeFilter === 'IN_REVIEW' && job.status !== 1) return false;
    if (activeFilter === 'IN_APPEAL' && job.status !== 5) return false;
    if (activeFilter === 'RESOLVED' && job.status !== 2 && job.status !== 3) return false;

    // Category filter
    if (selectedCategory !== 'ALL' && job.category !== selectedCategory) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = job.job_id.toLowerCase().includes(q);
      const matchRepo = job.repo_url.toLowerCase().includes(q);
      const matchSla = job.sla_spec.toLowerCase().includes(q);
      const matchCreator = job.creator.toLowerCase().includes(q);
      const matchWorker = job.worker.toLowerCase().includes(q);
      return matchId || matchRepo || matchSla || matchCreator || matchWorker;
    }
    return true;
  });

  const openCount = jobs.filter((j) => j.status === 0).length;
  const appealCount = jobs.filter((j) => j.status === 5).length;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Navbar with full Tabs and Disconnect Dropdown */}
      <Navbar
        account={account}
        balance={balance}
        onConnect={handleConnectWallet}
        onDisconnect={handleDisconnectWallet}
        onRefresh={() => {
          fetchOnChainData();
          if (account) fetchBalance(account);
        }}
        isCorrectNetwork={isCorrectNetwork}
        activeTab={activeNavTab}
        onSelectTab={(tab) => setActiveNavTab(tab)}
        openCount={openCount}
        appealCount={appealCount}
        contractAddress={contractAddress}
        isConnecting={isConnecting}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts / Feedback (Pulsing with auto-dismiss progress bar) */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/70 text-rose-200 text-sm flex items-center justify-between shadow-2xl shadow-rose-950/60 backdrop-blur-md relative overflow-hidden animate-pulse transition-all duration-300">
            <div className="flex items-center gap-2.5 min-w-0 z-10">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
              <span className="font-medium">{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs text-rose-300 hover:text-white ml-4 font-mono shrink-0 px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-900/90 border border-rose-500/40 transition-colors z-10"
            >
              Dismiss ✕
            </button>
            {/* Auto-fade timer progress bar */}
            {!isTxPending && (
              <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-rose-500 to-rose-400 toast-progress-error" />
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/70 text-emerald-200 text-sm flex items-center justify-between shadow-2xl shadow-emerald-950/50 backdrop-blur-md relative overflow-hidden animate-pulse transition-all duration-300">
            <div className="flex items-center gap-3 min-w-0 z-10">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-medium truncate">{successMsg}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4 z-10">
              {latestTxHash && (
                <a
                  href={getExplorerUrl(latestTxHash, 'tx')}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-300 hover:underline font-mono flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/80 border border-cyan-500/30"
                >
                  Explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={() => setSuccessMsg(null)}
                className="text-xs text-emerald-300 hover:text-white px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-900/90 border border-emerald-500/40 transition-colors"
              >
                ✕
              </button>
            </div>
            {/* Auto-fade timer progress bar */}
            {!isTxPending && (
              <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-300 toast-progress-success" />
            )}
          </div>
        )}

        {/* View Routing */}
        {activeNavTab === 'COURT_ROOM' ? (
          <CourtRoom
            jobs={jobs}
            onInspectCase={(j) => setSelectedJobForJury(j)}
          />
        ) : activeNavTab === 'ANALYTICS' ? (
          <AnalyticsView
            jobs={jobs}
            totalEscrowLocked={totalEscrowLocked}
          />
        ) : activeNavTab === 'DOCS' ? (
          <DocsView />
        ) : (
          /* MARKETPLACE or MY_CONTRACTS */
          <div>
            {/* CONDITIONAL BANNER: ROLE DASHBOARD (MY_CONTRACTS) vs PLATFORM HERO (MARKETPLACE) */}
            {activeNavTab === 'MY_CONTRACTS' ? (
              /* DEDICATED ROLE-BASED GOVERNANCE & PORTFOLIO BANNER */
              <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d1526] to-[#070c17] border border-cyan-500/30 p-6 sm:p-8 mb-8 overflow-hidden shadow-2xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono mb-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Role-Based Governance & Portfolio</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                      My Autonomous Agent Engagements
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1">
                      Strict role separation between <strong className="text-cyan-300">Master Agent (Employer)</strong> and <strong className="text-emerald-300">Sub-Agent (Worker)</strong>.
                    </p>
                  </div>

                  {/* Role Switcher Tabs */}
                  <div className="flex items-center p-1.5 bg-slate-950/90 border border-slate-800 rounded-2xl shadow-inner shrink-0 overflow-x-auto max-w-full">
                    <button
                      onClick={() => setMyRoleFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                        myRoleFilter === 'ALL'
                          ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ⭐ All ({myCreatedJobs.length + myWorkerJobs.length})
                    </button>
                    <button
                      onClick={() => setMyRoleFilter('CREATOR')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                        myRoleFilter === 'CREATOR'
                          ? 'bg-cyan-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      👑 Master Agent ({myCreatedJobs.length})
                    </button>
                    <button
                      onClick={() => setMyRoleFilter('WORKER')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                        myRoleFilter === 'WORKER'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ⚡ Sub-Agent ({myWorkerJobs.length})
                    </button>
                  </div>
                </div>

                {/* Role-Specific Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  {myRoleFilter === 'CREATOR' ? (
                    <>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-cyan-500/30">
                        <span className="text-[11px] font-mono text-slate-400 block">Total Escrow Locked</span>
                        <div className="text-xl font-bold font-mono text-cyan-300 mt-1">{formatGEN(myCreatedEscrowTotal)}</div>
                        <span className="text-[10px] text-slate-500 font-mono">Bounties in Escrow</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-[11px] font-mono text-slate-400 block">Open Tasks</span>
                        <div className="text-xl font-bold font-mono text-slate-100 mt-1">{myCreatedJobs.filter(j => j.status === 0).length}</div>
                        <span className="text-[10px] text-slate-500 font-mono">Awaiting Sub-Agents</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/30">
                        <span className="text-[11px] font-mono text-slate-400 block">PRs Under Review</span>
                        <div className="text-xl font-bold font-mono text-amber-400 mt-1">{myCreatedJobs.filter(j => j.status === 1).length}</div>
                        <span className="text-[10px] text-slate-500 font-mono">Pending AI Consensus</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30">
                        <span className="text-[11px] font-mono text-slate-400 block">Settled Tasks</span>
                        <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{myCreatedJobs.filter(j => j.status === 2 || j.status === 3).length}</div>
                        <span className="text-[10px] text-slate-500 font-mono">Passed or Reclaimed</span>
                      </div>
                    </>
                  ) : myRoleFilter === 'WORKER' ? (
                    <>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30">
                        <span className="text-[11px] font-mono text-slate-400 block">Bounties Earned</span>
                        <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{formatGEN(myEarnedBountiesTotal)}</div>
                        <span className="text-[10px] text-slate-500 font-mono">Auto-transferred to you</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/30">
                        <span className="text-[11px] font-mono text-slate-400 block">PRs In Review</span>
                        <div className="text-xl font-bold font-mono text-amber-400 mt-1">{myWorkerJobs.filter(j => j.status === 1).length}</div>
                        <span className="text-[10px] text-slate-500 font-mono">Awaiting Jury Verdict</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-[11px] font-mono text-slate-400 block">Approved Deliverables</span>
                        <div className="text-xl font-bold font-mono text-slate-100 mt-1">{myWorkerJobs.filter(j => j.status === 2).length}</div>
                        <span className="text-[10px] text-slate-500 font-mono">SLA Spec Compliant</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-purple-500/30">
                        <span className="text-[11px] font-mono text-slate-400 block">Appeals Active</span>
                        <div className="text-xl font-bold font-mono text-purple-300 mt-1">{myWorkerJobs.filter(j => j.status === 5).length}</div>
                        <span className="text-[10px] text-slate-500 font-mono">Appellate Court Docket</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-cyan-500/30">
                        <span className="text-[11px] font-mono text-slate-400 block">👑 Master Agent Tasks</span>
                        <div className="text-xl font-bold font-mono text-cyan-300 mt-1">{myCreatedJobs.length} commissioned</div>
                        <span className="text-[10px] text-slate-500 font-mono">Where you are Creator</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30">
                        <span className="text-[11px] font-mono text-slate-400 block">⚡ Sub-Agent Deliveries</span>
                        <div className="text-xl font-bold font-mono text-emerald-300 mt-1">{myWorkerJobs.length} claimed</div>
                        <span className="text-[10px] text-slate-500 font-mono">Where you are Worker</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-[11px] font-mono text-slate-400 block">Escrow Funded by You</span>
                        <div className="text-xl font-bold font-mono text-slate-100 mt-1">{formatGEN(myCreatedEscrowTotal)}</div>
                        <span className="text-[10px] text-slate-500 font-mono">Total committed</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-[11px] font-mono text-slate-400 block">Bounties Received</span>
                        <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{formatGEN(myEarnedBountiesTotal)}</div>
                        <span className="text-[10px] text-slate-500 font-mono">Total payouts won</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* MARKETPLACE: HERO / BALANCED 2-COLUMN PLATFORM BANNER */
              <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-[#0b1220] to-[#070b14] border border-cyan-500/20 p-6 sm:p-8 lg:p-10 mb-8 overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column: Title, Subtitle, CTAs */}
                  <div className="lg:col-span-7 flex flex-col justify-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-4 w-fit">
                      <Bot className="w-3.5 h-3.5 text-cyan-400" />
                      <span>GenLayer Autonomous Adjudication Court</span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-4 leading-tight">
                      Verifiable SLA Enforcement for the{' '}
                      <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                        Agentic Economy
                      </span>
                    </h1>

                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
                      Master Agents commission specialized Sub-Agents with natural language SLAs and escrowed GEN bounties. 
                      GenLayer AI validators fetch live GitHub PR diffs on-chain via <code className="text-cyan-300 font-mono text-xs bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">gl.nondet.web.render</code>, 
                      reach subjective consensus on multi-dimensional criteria (Specification, Quality, Tests), and automatically settle escrow.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          if (!account) {
                            handleConnectWallet();
                          } else {
                            setIsCreateOpen(true);
                          }
                        }}
                        disabled={isTxPending}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                          isTxPending
                            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60 shadow-none'
                            : 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                        }`}
                      >
                        {isTxPending && pendingTx?.action === 'create' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                            <span className="text-cyan-300">{pendingTx.statusText}</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-4 h-4" />
                            <span>Commission Sub-Agent & Lock Escrow</span>
                          </>
                        )}
                      </button>

                      <a
                        href={getExplorerUrl(contractAddress, 'address')}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/40 text-slate-300 hover:text-white text-sm font-medium transition-all shadow-sm"
                      >
                        <Terminal className="w-4 h-4 text-cyan-400" />
                        <span>Contract on Explorer</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      </a>
                    </div>
                  </div>

                  {/* Right Column: Visual Autonomous Protocol Pipeline Card */}
                  <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                          SLA Execution Pipeline
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                        On-Chain AI
                      </span>
                    </div>

                    {/* 4 Pipeline Stages */}
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-cyan-500/30 transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0 text-xs font-mono font-bold mt-0.5">
                          1
                        </div>
                        <div className="text-xs min-w-0">
                          <div className="font-semibold text-slate-200">1. Escrow Locked</div>
                          <div className="text-slate-400 text-[11px] leading-tight mt-0.5">
                            Master Agent locks GEN bounty in Intelligent Contract.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-amber-500/30 transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-amber-950 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 text-xs font-mono font-bold mt-0.5">
                          2
                        </div>
                        <div className="text-xs min-w-0">
                          <div className="font-semibold text-slate-200">2. Deliverable PR</div>
                          <div className="text-slate-400 text-[11px] leading-tight mt-0.5">
                            Sub-Agent submits verifiable GitHub Pull Request diff.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-purple-500/30 transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-purple-950 text-purple-300 border border-purple-500/40 flex items-center justify-center shrink-0 text-xs font-mono font-bold mt-0.5">
                          3
                        </div>
                        <div className="text-xs min-w-0">
                          <div className="font-semibold text-slate-200">3. AI Jury Consensus</div>
                          <div className="text-slate-400 text-[11px] leading-tight mt-0.5">
                            Validators render code and reach subjective consensus.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-emerald-500/30 transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 text-xs font-mono font-bold mt-0.5">
                          4
                        </div>
                        <div className="text-xs min-w-0">
                          <div className="font-semibold text-slate-200">4. Settlement & Appeal</div>
                          <div className="text-slate-400 text-[11px] leading-tight mt-0.5">
                            Automatic bounty release or decentralized appeal court.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aggregated On-Chain Stats Bar */}
            <StatsBar jobs={jobs} totalEscrowLocked={totalEscrowLocked} />

            {/* UNIFIED CONTROLS & FILTER BAR */}
            <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 mb-6 shadow-lg backdrop-blur-md space-y-4">
              {/* Top Row: Category Filter Chips */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                  <span className="text-xs font-mono text-slate-400 mr-2 uppercase tracking-wider font-semibold shrink-0">
                    Category:
                  </span>
                  {[
                    { id: 'ALL', label: 'All Domains' },
                    { id: 'SMART_CONTRACT', label: 'Smart Contract' },
                    { id: 'SECURITY_AUDIT', label: 'Security Audit' },
                    { id: 'FULL_STACK', label: 'Full-Stack' },
                    { id: 'DOCS_DEV', label: 'Docs & SDK' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 whitespace-nowrap ${
                        selectedCategory === cat.id
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-mono text-slate-400 hidden sm:block shrink-0">
                  Showing <span className="text-cyan-400 font-bold">{filteredJobs.length}</span> of <span className="text-slate-200 font-semibold">{jobs.length}</span> SLAs
                </div>
              </div>

              {/* Bottom Row: Status Tabs & Search Input */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Status Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-xl overflow-x-auto">
                  {(['ALL', 'OPEN', 'IN_REVIEW', 'IN_APPEAL', 'RESOLVED'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveFilter(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 whitespace-nowrap ${
                        activeFilter === tab
                          ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {tab === 'ALL'
                        ? `All (${jobs.length})`
                        : tab === 'OPEN'
                        ? `Open (${jobs.filter((j) => j.status === 0).length})`
                        : tab === 'IN_REVIEW'
                        ? `In Review (${jobs.filter((j) => j.status === 1).length})`
                        : tab === 'IN_APPEAL'
                        ? `In Appeal (${jobs.filter((j) => j.status === 5).length})`
                        : `Resolved (${jobs.filter((j) => j.status === 2 || j.status === 3).length})`}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search SLA, repo, ID, or agent..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 placeholder:text-slate-500 outline-none font-mono transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Job Cards Grid */}
            {isLoading && jobs.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
                <span className="text-sm font-mono text-slate-400">
                  Synchronizing with GenLayer studionet...
                </span>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-16 px-4 text-center border border-dashed border-slate-800/90 rounded-3xl bg-slate-900/40 backdrop-blur-sm max-w-2xl mx-auto my-6 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-4">
                  <Scale className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-200 mb-1.5">
                  {activeNavTab === 'MY_CONTRACTS'
                    ? 'You have no active contracts yet'
                    : 'No matching SLA Escrows Found'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
                  {activeNavTab === 'MY_CONTRACTS'
                    ? 'You have not commissioned any sub-agents or claimed any tasks with your connected wallet address.'
                    : 'No contracts match your active filter and search query. Commission a new task or adjust your filters.'}
                </p>
                <button
                  onClick={() => {
                    if (!account) handleConnectWallet();
                    else setIsCreateOpen(true);
                  }}
                  disabled={isTxPending}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
                    isTxPending
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50 shadow-none'
                      : 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-cyan-500/20 hover:scale-105 cursor-pointer'
                  }`}
                >
                  Commission SLA Bounty
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.job_id}
                    job={job}
                    currentAccount={account}
                    onSubmitPR={(j) => setSelectedJobForPR(j)}
                    onAdjudicate={handleAdjudicate}
                    onCancelJob={handleCancelJob}
                    onInspectJury={(j) => setSelectedJobForJury(j)}
                    isAdjudicating={adjudicatingJobId === job.job_id}
                    isTxPending={isTxPending}
                    pendingTx={pendingTx}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Complete Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d16] py-8 mt-16 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block">AgentSLA Protocol</span>
                <span className="text-[11px] text-slate-500">Autonomous Sub-Agent SLA Adjudication & Escrow Court</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                studionet (61999) Active
              </span>
              <span className="text-slate-600">|</span>
              <a
                href={getExplorerUrl(contractAddress, 'address')}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                Contract Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
            <div>
              Built for the <strong className="text-slate-300">Agent Tank Hackathon</strong> on GenLayer.
            </div>

            <div className="flex items-center gap-6">
              <a
                href="https://studio.genlayer.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-cyan-400 transition-colors"
              >
                GenLayer Studio
              </a>
              <a
                href="https://explorer-studio.genlayer.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-cyan-400 transition-colors"
              >
                Block Explorer
              </a>
              <a
                href="https://portal.genlayer.foundation"
                target="_blank"
                rel="noreferrer"
                className="hover:text-cyan-400 transition-colors"
              >
                Portal (Builders Track)
              </a>
              <a
                href="https://github.com/tuannguyenvan95/AgentSLA"
                target="_blank"
                rel="noreferrer"
                className="hover:text-cyan-400 transition-colors"
              >
                GitHub Repo
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateJob
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateJob}
        isLoading={isTxPending}
      />

      <SubmitPR
        job={selectedJobForPR}
        isOpen={!!selectedJobForPR}
        onClose={() => setSelectedJobForPR(null)}
        onSubmit={handleSubmitPR}
        isLoading={isTxPending}
      />

      <JuryModal
        job={selectedJobForJury}
        isOpen={!!selectedJobForJury}
        onClose={() => setSelectedJobForJury(null)}
        onAppeal={handleAppealJob}
        currentAccount={account}
        isAppealing={isTxPending}
      />

      {/* Interactive Wallet Guidance Prompt */}
      {showWalletPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0b1220] border border-cyan-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
              <Wallet className="w-7 h-7 animate-pulse text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Connecting MetaMask...</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              Please open the <strong>MetaMask extension</strong> from your browser toolbar to unlock your wallet and approve <strong>Next / Connect</strong>.
            </p>
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-300 mb-5 text-left">
              💡 <strong>Note:</strong> Browser may minimize the MetaMask popup in your extension tray. Click the MetaMask fox icon in your toolbar to approve.
            </div>
            <button
              onClick={() => {
                setShowWalletPromptModal(false);
                setIsConnecting(false);
              }}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
