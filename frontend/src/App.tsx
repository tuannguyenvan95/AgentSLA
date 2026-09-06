import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { 
  PlusCircle, 
  Search, 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  Terminal, 
  Loader2,
  ExternalLink,
  Bot
} from 'lucide-react';
import { 
  AGENTSLA_CONTRACT_ADDRESS, 
  STUDIONET_CONFIG, 
  switchToStudionet 
} from './config/genlayer';
import { Job, toWeiGEN, getExplorerUrl } from './utils/helpers';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { JobCard } from './components/JobCard';
import { CreateJob } from './components/CreateJob';
import { SubmitPR } from './components/SubmitPR';
import { JuryModal } from './components/JuryModal';

export const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(false);
  const [client, setClient] = useState<any>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalEscrowLocked, setTotalEscrowLocked] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTxPending, setIsTxPending] = useState<boolean>(false);
  const [adjudicatingJobId, setAdjudicatingJobId] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'IN_REVIEW' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedJobForPR, setSelectedJobForPR] = useState<Job | null>(null);
  const [selectedJobForJury, setSelectedJobForJury] = useState<Job | null>(null);

  // Notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [latestTxHash, setLatestTxHash] = useState<string | null>(null);

  // Check network ID
  const checkNetwork = useCallback(async () => {
    const eth = (window as any).ethereum;
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
  const fetchBalance = useCallback(async (userAddr: string) => {
    const eth = (window as any).ethereum;
    if (!eth || !userAddr) return;
    try {
      const balHex = await eth.request({
        method: 'eth_getBalance',
        params: [userAddr, 'latest'],
      });
      setBalance(BigInt(balHex).toString());
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  }, []);

  // Initialize client and connect
  const initClient = useCallback((userAddress?: string) => {
    const eth = (window as any).ethereum;
    const c = createClient({
      chain: studionet,
      provider: eth,
      account: userAddress as `0x${string}` | undefined,
    });
    setClient(c);
    return c;
  }, []);

  // Connect wallet
  const handleConnectWallet = async () => {
    const eth = (window as any).ethereum;
    if (!eth) {
      alert('Please install MetaMask to use AgentSLA.');
      return;
    }

    try {
      const isNetOk = await checkNetwork();
      if (!isNetOk) {
        const switched = await switchToStudionet();
        if (!switched) {
          setErrorMsg('Please switch to GenLayer Studio Network (61999) in your wallet.');
          return;
        }
        setIsCorrectNetwork(true);
      }

      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        const primary = accounts[0];
        setAccount(primary);
        initClient(primary);
        await fetchBalance(primary);
        setSuccessMsg(`Connected: ${primary.slice(0, 6)}...${primary.slice(-4)}`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Wallet connection was rejected.');
    }
  };

  // Fetch all jobs from the Intelligent Contract
  const fetchOnChainData = useCallback(async (customClient?: any) => {
    const c = customClient || client;
    if (!c || !AGENTSLA_CONTRACT_ADDRESS || AGENTSLA_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return;
    }

    setIsLoading(true);
    try {
      // 1. Fetch Stats
      try {
        const statsRaw = await c.readContract({
          address: AGENTSLA_CONTRACT_ADDRESS,
          functionName: 'get_stats',
          args: [],
        });
        const stats = typeof statsRaw === 'string' ? JSON.parse(statsRaw) : statsRaw;
        if (stats && stats.total_escrow_locked) {
          setTotalEscrowLocked(stats.total_escrow_locked);
        }
      } catch (e) {
        console.warn('get_stats failed:', e);
      }

      // 2. Fetch Job Count
      const countRes = await c.readContract({
        address: AGENTSLA_CONTRACT_ADDRESS,
        functionName: 'get_job_count',
        args: [],
      });
      const totalCount = Number(countRes);

      // 3. Fetch each job in parallel
      const jobPromises: Promise<Job | null>[] = [];
      for (let i = totalCount - 1; i >= 0; i--) {
        jobPromises.push(
          (async () => {
            try {
              const jobId = await c.readContract({
                address: AGENTSLA_CONTRACT_ADDRESS,
                functionName: 'get_job_id_by_index',
                args: [i],
              });
              const rawJob = await c.readContract({
                address: AGENTSLA_CONTRACT_ADDRESS,
                functionName: 'get_job',
                args: [jobId],
              });
              return typeof rawJob === 'string' ? JSON.parse(rawJob) : rawJob;
            } catch (err) {
              console.error(`Failed to load job index ${i}:`, err);
              return null;
            }
          })()
        );
      }

      const results = await Promise.all(jobPromises);
      const validJobs = results.filter((j): j is Job => j !== null);
      setJobs(validJobs);
    } catch (err: any) {
      console.error('Failed to fetch on-chain jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // Initial mount
  useEffect(() => {
    const eth = (window as any).ethereum;
    const initialClient = initClient();

    if (eth) {
      checkNetwork();
      eth.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          const userClient = initClient(accounts[0]);
          fetchBalance(accounts[0]);
          fetchOnChainData(userClient);
        } else {
          fetchOnChainData(initialClient);
        }
      });

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const uc = initClient(accounts[0]);
          fetchBalance(accounts[0]);
          fetchOnChainData(uc);
        } else {
          setAccount(null);
          setBalance('0');
        }
      };

      const handleChainChanged = () => {
        checkNetwork();
        window.location.reload();
      };

      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', handleChainChanged);

      return () => {
        eth.removeListener('accountsChanged', handleAccountsChanged);
        eth.removeListener('chainChanged', handleChainChanged);
      };
    } else {
      fetchOnChainData(initialClient);
    }
  }, [initClient, checkNetwork, fetchBalance, fetchOnChainData]);

  // Auto-refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOnChainData();
      if (account) fetchBalance(account);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchOnChainData, account, fetchBalance]);

  // Transaction Actions

  // 1. Create Job & Lock Escrow
  const handleCreateJob = async (slaSpec: string, repoUrl: string, bountyGen: string) => {
    if (!client || !account) {
      throw new Error('Please connect your MetaMask wallet.');
    }
    if (!isCorrectNetwork) {
      throw new Error('Please switch to GenLayer studionet (Chain ID 61999).');
    }

    setIsTxPending(true);
    setErrorMsg(null);
    try {
      const weiAmount = toWeiGEN(bountyGen);
      const hash = await client.writeContract({
        address: AGENTSLA_CONTRACT_ADDRESS,
        functionName: 'create_job',
        args: [slaSpec, repoUrl],
        value: weiAmount,
      });
      setLatestTxHash(hash);
      setSuccessMsg('Transaction submitted! Mining on studionet...');

      const receipt = await client.waitForTransactionReceipt({
        hash,
        timeout: 180_000,
      });

      if (receipt.status === 'reverted' || receipt.status === 0 || String(receipt.status) === '0x0') {
        throw new Error('Transaction was reverted on-chain. Verify you have sufficient GEN balance.');
      }

      setSuccessMsg(`Escrow bounty locked successfully! (Tx: ${hash.slice(0, 10)}...)`);
      await fetchOnChainData();
      await fetchBalance(account);
    } finally {
      setIsTxPending(false);
    }
  };

  // 2. Submit Deliverable PR
  const handleSubmitPR = async (jobId: string, prUrl: string) => {
    if (!client || !account) {
      throw new Error('Please connect your MetaMask wallet.');
    }

    setIsTxPending(true);
    setErrorMsg(null);
    try {
      const hash = await client.writeContract({
        address: AGENTSLA_CONTRACT_ADDRESS,
        functionName: 'submit_deliverable',
        args: [jobId, prUrl],
      });
      setLatestTxHash(hash);
      setSuccessMsg('Submitting PR deliverable to contract...');

      await client.waitForTransactionReceipt({
        hash,
        timeout: 180_000,
      });

      setSuccessMsg(`PR deliverable registered! Ready for AI jury adjudication.`);
      await fetchOnChainData();
    } finally {
      setIsTxPending(false);
    }
  };

  // 3. Adjudicate SLA
  const handleAdjudicate = async (jobId: string) => {
    if (!client || !account) {
      setErrorMsg('Please connect your MetaMask wallet.');
      return;
    }

    setAdjudicatingJobId(jobId);
    setErrorMsg(null);
    try {
      const hash = await client.writeContract({
        address: AGENTSLA_CONTRACT_ADDRESS,
        functionName: 'adjudicate',
        args: [jobId],
      });
      setLatestTxHash(hash);
      setSuccessMsg('Consensus in progress: AI validators rendering GitHub PR live on-chain...');

      const receipt = await client.waitForTransactionReceipt({
        hash,
        timeout: 240_000,
      });

      if (receipt.status === 'reverted' || receipt.status === 0 || String(receipt.status) === '0x0') {
        throw new Error('Adjudication transaction failed consensus or reverted.');
      }

      setSuccessMsg(`Adjudication finalized! Consensus verdict written on-chain.`);
      await fetchOnChainData();
      await fetchBalance(account);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Adjudication failed on GenLayer.');
    } finally {
      setAdjudicatingJobId(null);
    }
  };

  // 4. Cancel Job
  const handleCancelJob = async (jobId: string) => {
    if (!client || !account) return;
    if (!confirm(`Cancel ${jobId} and reclaim your locked escrow bounty?`)) return;

    setIsTxPending(true);
    setErrorMsg(null);
    try {
      const hash = await client.writeContract({
        address: AGENTSLA_CONTRACT_ADDRESS,
        functionName: 'cancel_job',
        args: [jobId],
      });
      setLatestTxHash(hash);
      await client.waitForTransactionReceipt({ hash, timeout: 180_000 });
      setSuccessMsg(`Job ${jobId} cancelled. Bounty refunded.`);
      await fetchOnChainData();
      await fetchBalance(account);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to cancel job.');
    } finally {
      setIsTxPending(false);
    }
  };

  // Filter and search
  const filteredJobs = jobs.filter((job) => {
    // Filter status
    if (activeFilter === 'OPEN' && job.status !== 0) return false;
    if (activeFilter === 'IN_REVIEW' && job.status !== 1) return false;
    if (activeFilter === 'RESOLVED' && job.status !== 2 && job.status !== 3) return false;

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

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Navbar */}
      <Navbar
        account={account}
        balance={balance}
        onConnect={handleConnectWallet}
        onRefresh={() => {
          fetchOnChainData();
          if (account) fetchBalance(account);
        }}
        isCorrectNetwork={isCorrectNetwork}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts / Feedback */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-sm flex items-center justify-between shadow-lg shadow-rose-950/50">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs underline hover:text-rose-200 ml-4 font-mono shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-sm flex items-center justify-between shadow-lg shadow-emerald-950/50">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            {latestTxHash && (
              <a
                href={getExplorerUrl(latestTxHash, 'tx')}
                target="_blank"
                rel="noreferrer"
                className="text-xs underline hover:text-emerald-200 ml-4 font-mono flex items-center gap-1 shrink-0"
              >
                Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Hero Banner / Pitch */}
        <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/80 to-[#090d16] border border-cyan-500/20 p-6 sm:p-8 mb-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-4">
              <Bot className="w-3.5 h-3.5" />
              <span>GenLayer Autonomous Adjudication Court</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              Verifiable SLA Enforcement for the{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Agentic Economy
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
              Master Agents autonomously commission specialized Sub-Agents with natural language SLAs and escrowed GEN bounties. 
              GenLayer AI validators fetch live GitHub PR diffs on-chain via <code className="text-cyan-300 font-mono text-xs bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">gl.nondet.web.render</code>, 
              reach subjective consensus on deliverable quality, and automatically unlock bounties or issue refunds.
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Commission Sub-Agent & Lock Escrow</span>
              </button>

              <a
                href={getExplorerUrl(AGENTSLA_CONTRACT_ADDRESS, 'address')}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white text-sm font-medium transition-all"
              >
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Contract on Explorer</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>
            </div>
          </div>
        </div>

        {/* Aggregated On-Chain Stats Bar */}
        <StatsBar jobs={jobs} totalEscrowLocked={totalEscrowLocked} />

        {/* Dashboard Filter Bar & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          {/* Status Tabs */}
          <div className="flex items-center p-1 bg-slate-900/80 border border-slate-800 rounded-xl w-full md:w-auto overflow-x-auto">
            {(['ALL', 'OPEN', 'IN_REVIEW', 'RESOLVED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 ${
                  activeFilter === tab
                    ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'ALL'
                  ? `All SLAs (${jobs.length})`
                  : tab === 'OPEN'
                  ? `Open Escrows (${jobs.filter((j) => j.status === 0).length})`
                  : tab === 'IN_REVIEW'
                  ? `In Review (${jobs.filter((j) => j.status === 1).length})`
                  : `Resolved (${jobs.filter((j) => j.status === 2 || j.status === 3).length})`}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SLA, repo, ID, or agent..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 placeholder:text-slate-500 outline-none font-mono"
            />
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
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
            <Scale className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300 mb-1">
              No matching SLA Escrows Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {jobs.length === 0
                ? 'No SLA bounties have been commissioned yet on this contract.'
                : 'No contracts match your active filter and search query.'}
            </p>
            {jobs.length === 0 && (
              <button
                onClick={() => {
                  if (!account) handleConnectWallet();
                  else setIsCreateOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Create First SLA Bounty
              </button>
            )}
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
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d16] py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>AgentSLA — Subjective Consensus & Escrow Adjudication Layer</span>
          </div>

          <div className="flex items-center gap-6 font-mono">
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-colors"
            >
              GenLayer Studio
            </a>
            <a
              href="https://genlayer-explorer.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-colors"
            >
              Explorer
            </a>
            <a
              href="https://portal.genlayer.foundation"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-colors"
            >
              Portal (Builders Track)
            </a>
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
      />
    </div>
  );
};
