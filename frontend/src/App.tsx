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
  Bot,
  Sparkles,
  FileCode2
} from 'lucide-react';
import { 
  DEFAULT_CONTRACT_ADDRESS,
  getContractAddress,
  saveContractAddress,
  STUDIONET_CONFIG, 
  switchToStudionet,
  getEthereumProvider
} from './config/genlayer';
import { Job, toWeiGEN, getExplorerUrl, SAMPLE_JOBS } from './utils/helpers';
import { Navbar, NavTab } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { JobCard } from './components/JobCard';
import { CreateJob } from './components/CreateJob';
import { SubmitPR } from './components/SubmitPR';
import { JuryModal } from './components/JuryModal';
import { CourtRoom } from './components/CourtRoom';
import { AnalyticsView } from './components/AnalyticsView';
import { DocsView } from './components/DocsView';
import { ContractConfigModal } from './components/ContractConfigModal';

export const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(false);
  const [client, setClient] = useState<any>(null);

  // Contract Address & Config
  const [contractAddress, setContractAddressState] = useState<string>(getContractAddress());
  const [isContractConfigOpen, setIsContractConfigOpen] = useState<boolean>(false);

  // Initialize with SAMPLE_JOBS so the user has immediate rich data to explore
  const [jobs, setJobs] = useState<Job[]>(SAMPLE_JOBS);
  const [totalEscrowLocked, setTotalEscrowLocked] = useState<string>('60000000000000000000'); // 60 GEN
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTxPending, setIsTxPending] = useState<boolean>(false);
  const [adjudicatingJobId, setAdjudicatingJobId] = useState<string | null>(null);

  // Navigation & Filtering
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('MARKETPLACE');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'IN_REVIEW' | 'IN_APPEAL' | 'RESOLVED'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedJobForPR, setSelectedJobForPR] = useState<Job | null>(null);
  const [selectedJobForJury, setSelectedJobForJury] = useState<Job | null>(null);

  // Feedback notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [latestTxHash, setLatestTxHash] = useState<string | null>(null);

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
  const fetchBalance = useCallback(async (userAddr: string) => {
    const eth = getEthereumProvider();
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
    const eth = getEthereumProvider();
    const c = createClient({
      chain: studionet,
      provider: eth || undefined,
      account: userAddress as `0x${string}` | undefined,
    });
    setClient(c);
    return c;
  }, []);

  // Connect wallet: 1. Request accounts FIRST, 2. Check/switch chain SECOND
  const handleConnectWallet = async () => {
    const eth = getEthereumProvider();
    if (!eth) {
      alert('Không tìm thấy MetaMask hoặc Web3 wallet. Vui lòng cài đặt tiện ích MetaMask trên trình duyệt của bạn.');
      return;
    }

    setErrorMsg(null);
    try {
      // Step 1: Prompt account authorization
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        setErrorMsg('Không tìm thấy tài khoản nào được kết nối.');
        return;
      }

      const primary = accounts[0];
      setAccount(primary);
      const userClient = initClient(primary);
      await fetchBalance(primary);
      setSuccessMsg(`Kết nối ví thành công: ${primary.slice(0, 6)}...${primary.slice(-4)}`);

      // Step 2: Check & prompt chain switch without failing authorization
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
            setErrorMsg('Ví đã kết nối, nhưng chưa ở mạng GenLayer Studionet (Chain 61999). Hãy bấm "Switch Chain" trên thanh menu để chuyển mạng.');
          }
        }
      } catch (netErr: any) {
        console.warn('Network switch issue:', netErr);
      }

      fetchOnChainData(userClient);
    } catch (err: any) {
      console.error('Wallet connection rejected:', err);
      if (err.code === 4001) {
        setErrorMsg('Bạn đã hủy yêu cầu kết nối trên ví MetaMask.');
      } else {
        setErrorMsg(err?.message || 'Kết nối ví thất bại. Vui lòng thử lại.');
      }
    }
  };

  // Disconnect wallet
  const handleDisconnectWallet = () => {
    setAccount(null);
    setBalance('0');
    initClient();
    setSuccessMsg('Đã ngắt kết nối ví thành công.');
  };

  // Update Contract Address
  const handleUpdateContractAddress = (newAddr: string) => {
    saveContractAddress(newAddr);
    setContractAddressState(newAddr);
    setSuccessMsg(`Đã cập nhật địa chỉ Intelligent Contract: ${newAddr.slice(0, 6)}...${newAddr.slice(-4)}`);
    fetchOnChainData(client, newAddr);
  };

  // Fetch all jobs from the Intelligent Contract
  const fetchOnChainData = useCallback(async (customClient?: any, targetContract?: string) => {
    const c = customClient || client;
    const addr = targetContract || contractAddress;
    if (!c || !addr || addr === DEFAULT_CONTRACT_ADDRESS) {
      return;
    }

    setIsLoading(true);
    try {
      // 1. Fetch Stats
      try {
        const statsRaw = await c.readContract({
          address: addr,
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
        address: addr,
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
                address: addr,
                functionName: 'get_job_id_by_index',
                args: [i],
              });
              const rawJob = await c.readContract({
                address: addr,
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
      if (validJobs.length > 0) {
        setJobs(validJobs);
      }
    } catch (err: any) {
      console.error('Failed to fetch on-chain jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [client, contractAddress]);

  // Initial mount
  useEffect(() => {
    const eth = getEthereumProvider();
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
      }).catch(() => {
        fetchOnChainData(initialClient);
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

      eth.on?.('accountsChanged', handleAccountsChanged);
      eth.on?.('chainChanged', handleChainChanged);

      return () => {
        eth.removeListener?.('accountsChanged', handleAccountsChanged);
        eth.removeListener?.('chainChanged', handleChainChanged);
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
  const handleCreateJob = async (slaSpec: string, repoUrl: string, bountyGen: string, category: string) => {
    if (!client || !account) {
      throw new Error('Vui lòng kết nối ví MetaMask.');
    }
    if (!isCorrectNetwork) {
      throw new Error('Vui lòng chuyển sang mạng GenLayer studionet (Chain ID 61999).');
    }
    if (!contractAddress || contractAddress === DEFAULT_CONTRACT_ADDRESS) {
      setIsContractConfigOpen(true);
      throw new Error('Chưa kết nối Intelligent Contract. Vui lòng deploy contract trên GenLayer Studio và dán địa chỉ contract vào popup cấu hình!');
    }

    setIsTxPending(true);
    setErrorMsg(null);
    try {
      const weiAmount = toWeiGEN(bountyGen);
      const hash = await client.writeContract({
        address: contractAddress,
        functionName: 'create_job',
        args: [slaSpec, repoUrl, category],
        value: weiAmount,
      });
      setLatestTxHash(hash);
      setSuccessMsg('Giao dịch đã gửi! Đang chờ xác nhận trên studionet...');

      const receipt = await client.waitForTransactionReceipt({
        hash,
        timeout: 180_000,
      });

      if (receipt.status === 'reverted' || receipt.status === 0 || String(receipt.status) === '0x0') {
        throw new Error('Giao dịch bị revert on-chain. Hãy kiểm tra bạn có đủ số dư GEN.');
      }

      setSuccessMsg(`Đã tạo SLA Job & khóa Escrow thành công! (Tx: ${hash.slice(0, 10)}...)`);
      await fetchOnChainData();
      await fetchBalance(account);
    } finally {
      setIsTxPending(false);
    }
  };

  // 2. Submit Deliverable PR
  const handleSubmitPR = async (jobId: string, prUrl: string) => {
    if (!client || !account) {
      throw new Error('Vui lòng kết nối ví MetaMask.');
    }
    if (!contractAddress || contractAddress === DEFAULT_CONTRACT_ADDRESS) {
      setIsContractConfigOpen(true);
      throw new Error('Chưa kết nối Intelligent Contract. Vui lòng deploy contract trên GenLayer Studio.');
    }

    setIsTxPending(true);
    setErrorMsg(null);
    try {
      const hash = await client.writeContract({
        address: contractAddress,
        functionName: 'submit_deliverable',
        args: [jobId, prUrl],
      });
      setLatestTxHash(hash);
      setSuccessMsg('Đang gửi PR nghiệm thu lên contract...');

      await client.waitForTransactionReceipt({
        hash,
        timeout: 180_000,
      });

      setSuccessMsg(`Đã nộp PR nghiệm thu! Sẵn sàng cho AI Consensus phán xử.`);
      await fetchOnChainData();
    } finally {
      setIsTxPending(false);
    }
  };

  // 3. Adjudicate SLA
  const handleAdjudicate = async (jobId: string) => {
    if (!client || !account) {
      setErrorMsg('Vui lòng kết nối ví MetaMask.');
      return;
    }
    if (!contractAddress || contractAddress === DEFAULT_CONTRACT_ADDRESS) {
      setIsContractConfigOpen(true);
      setErrorMsg('Chưa kết nối Intelligent Contract. Vui lòng deploy contract trên GenLayer Studio.');
      return;
    }

    setAdjudicatingJobId(jobId);
    setErrorMsg(null);
    try {
      const hash = await client.writeContract({
        address: contractAddress,
        functionName: 'adjudicate',
        args: [jobId],
      });
      setLatestTxHash(hash);
      setSuccessMsg('Đang chạy đồng thuận: Các validator AI đang render GitHub PR trực tiếp on-chain...');

      const receipt = await client.waitForTransactionReceipt({
        hash,
        timeout: 240_000,
      });

      if (receipt.status === 'reverted' || receipt.status === 0 || String(receipt.status) === '0x0') {
        throw new Error('Phán xử thất bại hoặc bị revert trên GenLayer.');
      }

      setSuccessMsg(`Phán xử hoàn tất! Phán quyết đồng thuận AI đã được ghi nhận on-chain.`);
      await fetchOnChainData();
      await fetchBalance(account);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Phán xử thất bại trên GenLayer.');
    } finally {
      setAdjudicatingJobId(null);
    }
  };

  // 4. Appeal Adjudication
  const handleAppealJob = async (jobId: string, bondGen: string) => {
    if (!client || !account) {
      throw new Error('Vui lòng kết nối ví MetaMask.');
    }
    if (!contractAddress || contractAddress === DEFAULT_CONTRACT_ADDRESS) {
      setIsContractConfigOpen(true);
      throw new Error('Chưa kết nối Intelligent Contract. Vui lòng deploy contract trên GenLayer Studio.');
    }

    setIsTxPending(true);
    setErrorMsg(null);
    try {
      const bondWei = toWeiGEN(bondGen);
      const hash = await client.writeContract({
        address: contractAddress,
        functionName: 'appeal_adjudication',
        args: [jobId],
        value: bondWei,
      });
      setLatestTxHash(hash);
      setSuccessMsg('Đang nộp đơn kháng cáo on-chain...');

      await client.waitForTransactionReceipt({
        hash,
        timeout: 180_000,
      });

      setSuccessMsg(`Đã nộp đơn kháng cáo thành công! Vụ việc đã được chuyển lên Hội đồng Phúc thẩm AI.`);
      await fetchOnChainData();
      await fetchBalance(account);
    } finally {
      setIsTxPending(false);
    }
  };

  // 5. Cancel Job
  const handleCancelJob = async (jobId: string) => {
    if (!client || !account) return;
    if (!contractAddress || contractAddress === DEFAULT_CONTRACT_ADDRESS) {
      setIsContractConfigOpen(true);
      setErrorMsg('Chưa kết nối Intelligent Contract. Vui lòng deploy contract trên GenLayer Studio.');
      return;
    }
    if (!confirm(`Hủy job ${jobId} và hoàn lại tiền bảo chứng Escrow?`)) return;

    setIsTxPending(true);
    setErrorMsg(null);
    try {
      const hash = await client.writeContract({
        address: contractAddress,
        functionName: 'cancel_job',
        args: [jobId],
      });
      setLatestTxHash(hash);
      await client.waitForTransactionReceipt({ hash, timeout: 180_000 });
      setSuccessMsg(`Job ${jobId} đã hủy. Tiền Escrow đã được hoàn lại.`);
      await fetchOnChainData();
      await fetchBalance(account);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể hủy job.');
    } finally {
      setIsTxPending(false);
    }
  };

  // Filter and search
  const filteredJobs = jobs.filter((job) => {
    // Dedicated Tab: My Contracts
    if (activeNavTab === 'MY_CONTRACTS') {
      if (!account) return false;
      const isMyCreator = job.creator.toLowerCase() === account.toLowerCase();
      const isMyWorker = job.worker.toLowerCase() === account.toLowerCase();
      if (!isMyCreator && !isMyWorker) return false;
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
        onOpenContractConfig={() => setIsContractConfigOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Mode / Contract Not Connected Banner */}
        {contractAddress === DEFAULT_CONTRACT_ADDRESS && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/30 border border-amber-500/40 text-amber-200 text-xs sm:text-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-2">
                  <span>Chế độ Demo (Dữ liệu mô phỏng SLA)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
                    DEMO MODE
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Bạn đang xem dữ liệu mô phỏng. Để thực hiện tạo Job, nộp PR, và chạy phán xử AI Consensus thật trên mạng <strong>GenLayer Studionet (61999)</strong>, hãy deploy contract <code className="text-cyan-300 font-mono">contracts/contract.py</code> trên GenLayer Studio rồi bấm nút kết nối bên cạnh.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
              <button
                onClick={() => setIsContractConfigOpen(true)}
                className="w-full md:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <FileCode2 className="w-4 h-4" />
                <span>Kết nối Contract đã deploy</span>
              </button>
            </div>
          </div>
        )}

        {/* Alerts / Feedback */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-sm flex items-center justify-between shadow-lg shadow-rose-950/50 animate-in fade-in">
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
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-sm flex items-center justify-between shadow-lg shadow-emerald-950/50 animate-in fade-in">
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
                  {activeNavTab === 'MY_CONTRACTS' ? 'My Active SLA Engagements' : 'Verifiable SLA Enforcement for the '}
                  {activeNavTab !== 'MY_CONTRACTS' && (
                    <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                      Agentic Economy
                    </span>
                  )}
                </h1>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
                  Master Agents autonomously commission specialized Sub-Agents with natural language SLAs and escrowed GEN bounties. 
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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Commission Sub-Agent & Lock Escrow</span>
                  </button>

                  <a
                    href={getExplorerUrl(contractAddress, 'address')}
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

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 pb-4 overflow-x-auto">
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Dashboard Filter Bar & Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
              {/* Status Tabs */}
              <div className="flex items-center p-1 bg-slate-900/80 border border-slate-800 rounded-xl w-full md:w-auto overflow-x-auto">
                {(['ALL', 'OPEN', 'IN_REVIEW', 'IN_APPEAL', 'RESOLVED'] as const).map((tab) => (
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
                  {activeNavTab === 'MY_CONTRACTS'
                    ? 'You have no active contracts yet'
                    : 'No matching SLA Escrows Found'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  {activeNavTab === 'MY_CONTRACTS'
                    ? 'You have not commissioned any sub-agents or claimed any tasks with your connected wallet address.'
                    : 'No contracts match your active filter and search query.'}
                </p>
                <button
                  onClick={() => {
                    if (!account) handleConnectWallet();
                    else setIsCreateOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
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
                href="https://genlayer-explorer.vercel.app"
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

      <ContractConfigModal
        isOpen={isContractConfigOpen}
        onClose={() => setIsContractConfigOpen(false)}
        currentAddress={contractAddress}
        onSaveAddress={handleUpdateContractAddress}
      />
    </div>
  );
};
