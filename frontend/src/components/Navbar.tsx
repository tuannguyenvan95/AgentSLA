import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw,
  Cpu
} from 'lucide-react';
import { 
  switchToStudionet, 
  AGENTSLA_CONTRACT_ADDRESS 
} from '../config/genlayer';
import { formatAddress, formatGEN, getExplorerUrl } from '../utils/helpers';

interface NavbarProps {
  account: string | null;
  balance: string;
  onConnect: () => void;
  onRefresh: () => void;
  isCorrectNetwork: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  balance,
  onConnect,
  onRefresh,
  isCorrectNetwork,
}) => {
  const [isZeroBalance, setIsZeroBalance] = useState(false);

  useEffect(() => {
    if (account && (balance === '0' || balance === '0 GEN' || balance === '')) {
      setIsZeroBalance(true);
    } else {
      setIsZeroBalance(false);
    }
  }, [account, balance]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#090d16]/90 backdrop-blur-md">
      {/* Zero balance warning banner as mandated by R21 */}
      {account && isZeroBalance && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                AgentSLA
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 rounded">
                studionet
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5">
              Autonomous Sub-Agent SLA Court & Escrow
            </p>
          </div>
        </div>

        {/* Center: Contract link */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
          <span className="text-slate-500">Contract:</span>
          <a
            href={getExplorerUrl(AGENTSLA_CONTRACT_ADDRESS, 'address')}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-400 hover:underline flex items-center gap-1"
          >
            {formatAddress(AGENTSLA_CONTRACT_ADDRESS)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Right: Actions & Wallet */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            title="Refresh On-chain State"
            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 rounded-lg transition-colors border border-slate-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Network Switcher Badge */}
          {account && (
            <div>
              {isCorrectNetwork ? (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>studionet (61999)</span>
                </div>
              ) : (
                <button
                  onClick={switchToStudionet}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono hover:bg-rose-900/60 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Switch to Studionet</span>
                </button>
              )}
            </div>
          )}

          {/* Wallet Connect / Account Info */}
          {account ? (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg">
              <div className="flex flex-col items-end">
                <span className="text-xs font-mono text-cyan-300 font-semibold">
                  {formatGEN(balance)}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {formatAddress(account)}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <button
              onClick={onConnect}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-cyan-500/25"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
