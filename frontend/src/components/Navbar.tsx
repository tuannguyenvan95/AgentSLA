import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw,
  Cpu,
  LogOut,
  Copy,
  Check,
  ChevronDown,
  LayoutGrid,
  UserCheck,
  Scale,
  BarChart3,
  BookOpen,
  FileCode2,
  Loader2
} from 'lucide-react';
import { 
  switchToStudionet,
  DEFAULT_CONTRACT_ADDRESS
} from '../config/genlayer';
import { formatAddress, formatGEN, getExplorerUrl } from '../utils/helpers';

export type NavTab = 'MARKETPLACE' | 'MY_CONTRACTS' | 'COURT_ROOM' | 'ANALYTICS' | 'DOCS';

interface NavbarProps {
  account: string | null;
  balance: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  isCorrectNetwork: boolean;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openCount: number;
  appealCount: number;
  contractAddress?: string;
  isConnecting?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  balance,
  onConnect,
  onDisconnect,
  onRefresh,
  isCorrectNetwork,
  activeTab,
  onSelectTab,
  openCount,
  appealCount,
  contractAddress,
  isConnecting,
}) => {
  const [isZeroBalance, setIsZeroBalance] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (account && (balance === '0' || balance === '0 GEN' || balance === '')) {
      setIsZeroBalance(true);
    } else {
      setIsZeroBalance(false);
    }
  }, [account, balance]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md">
      {/* Zero balance warning banner as mandated by R21 */}
      {account && isZeroBalance && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Zero Balance Alert:</strong> Your connected address holds 0 GEN on studionet. 
              Please transfer GEN from the <strong>Accounts panel</strong> in GenLayer Studio before executing write transactions.
            </span>
            <a 
              href="https://studio.genlayer.com/run-debug" 
              target="_blank" 
              rel="noreferrer"
              className="ml-auto underline flex items-center gap-1 hover:text-amber-200 shrink-0 font-medium"
            >
              Open Studio Accounts <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  AgentSLA
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 rounded font-semibold">
                  studionet
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5 font-medium hidden sm:block">
                Autonomous Sub-Agent SLA Court & Escrow
              </p>
            </div>
          </div>

          {/* Center: Main Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => onSelectTab('MARKETPLACE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'MARKETPLACE'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Marketplace</span>
              {openCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 font-mono">
                  {openCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('MY_CONTRACTS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'MY_CONTRACTS'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>My Contracts</span>
            </button>

            <button
              onClick={() => onSelectTab('COURT_ROOM')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'COURT_ROOM'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>AI Jury Court</span>
              {appealCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 font-mono animate-pulse">
                  {appealCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('ANALYTICS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ANALYTICS'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => onSelectTab('DOCS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'DOCS'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Architecture</span>
            </button>
          </nav>

          {/* Right: Actions & Comprehensive Wallet Profile */}
          <div className="flex items-center gap-2.5">
            {/* Intelligent Contract Explorer Badge */}
            {contractAddress && (
              <a
                href={getExplorerUrl(contractAddress)}
                target="_blank"
                rel="noreferrer"
                title={`Intelligent Contract on Studionet: ${contractAddress}`}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border bg-cyan-950/40 border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/40"
              >
                <FileCode2 className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                <span>{formatAddress(contractAddress)}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}

            {/* Sync trigger */}
            <button
              onClick={onRefresh}
              title="Refresh On-chain State"
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 rounded-lg transition-colors border border-slate-800"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Network Badge */}
            {account && (
              <div>
                {isCorrectNetwork ? (
                  <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>studionet (61999)</span>
                  </div>
                ) : (
                  <button
                    onClick={switchToStudionet}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono hover:bg-rose-900/60 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Switch Chain</span>
                  </button>
                )}
              </div>
            )}

            {/* Wallet Button & Dropdown */}
            {account ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 px-3 py-1.5 rounded-xl transition-all shadow-md group"
                >
                  <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-xs font-mono text-cyan-300 font-bold leading-none">
                      {formatGEN(balance)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 leading-tight mt-0.5">
                      {formatAddress(account)}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="pb-3 mb-3 border-b border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Connected Account
                      </span>
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-xs font-mono text-slate-200 truncate select-all">
                          {account}
                        </span>
                        <button
                          onClick={handleCopyAddress}
                          title="Copy address"
                          className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs font-mono px-1">
                        <span className="text-slate-400">Balance:</span>
                        <span className="font-bold text-cyan-300">{formatGEN(balance)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono px-1">
                        <span className="text-slate-400">Network:</span>
                        <span className="text-emerald-400">GenLayer Studionet</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <a
                        href={getExplorerUrl(account, 'address')}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          View on Explorer
                        </span>
                      </a>

                      <a
                        href={getExplorerUrl(contractAddress || DEFAULT_CONTRACT_ADDRESS, 'address')}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                          View Contract
                        </span>
                      </a>

                      {/* DISCONNECT WALLET BUTTON */}
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onDisconnect();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors mt-1 border border-transparent hover:border-rose-500/30"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Disconnect Wallet</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                disabled={isConnecting}
                onClick={onConnect}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-80 disabled:cursor-wait cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/80 text-xs overflow-x-auto">
          <button
            onClick={() => onSelectTab('MARKETPLACE')}
            className={`px-3 py-1 font-semibold rounded-lg shrink-0 ${activeTab === 'MARKETPLACE' ? 'text-cyan-400 bg-slate-900' : 'text-slate-400'}`}
          >
            Marketplace
          </button>
          <button
            onClick={() => onSelectTab('MY_CONTRACTS')}
            className={`px-3 py-1 font-semibold rounded-lg shrink-0 ${activeTab === 'MY_CONTRACTS' ? 'text-cyan-400 bg-slate-900' : 'text-slate-400'}`}
          >
            My Contracts
          </button>
          <button
            onClick={() => onSelectTab('COURT_ROOM')}
            className={`px-3 py-1 font-semibold rounded-lg shrink-0 ${activeTab === 'COURT_ROOM' ? 'text-purple-400 bg-slate-900' : 'text-slate-400'}`}
          >
            AI Court
          </button>
          <button
            onClick={() => onSelectTab('ANALYTICS')}
            className={`px-3 py-1 font-semibold rounded-lg shrink-0 ${activeTab === 'ANALYTICS' ? 'text-emerald-400 bg-slate-900' : 'text-slate-400'}`}
          >
            Analytics
          </button>
          <button
            onClick={() => onSelectTab('DOCS')}
            className={`px-3 py-1 font-semibold rounded-lg shrink-0 ${activeTab === 'DOCS' ? 'text-amber-400 bg-slate-900' : 'text-slate-400'}`}
          >
            Docs
          </button>
        </div>
      </div>
    </header>
  );
};
