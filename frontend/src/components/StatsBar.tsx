import React from 'react';
import { Lock, FileCheck2, Scale, Users } from 'lucide-react';
import { formatGEN, Job } from '../utils/helpers';

interface StatsBarProps {
  jobs: Job[];
  totalEscrowLocked: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({ jobs, totalEscrowLocked }) => {
  const totalJobs = jobs.length;
  const resolvedSuccess = jobs.filter((j) => j.status === 2).length;
  const resolvedRejected = jobs.filter((j) => j.status === 3).length;
  const totalResolved = resolvedSuccess + resolvedRejected;
  const passRate = totalResolved > 0 ? Math.round((resolvedSuccess / totalResolved) * 100) : 0;
  const activeReview = jobs.filter((j) => j.status === 1).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-8">
      {/* 01: Total Escrow Locked */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#080e1a]/95 border border-cyan-500/20 hover:border-cyan-400/50 p-4 sm:p-5 group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-5px_rgba(6,182,212,0.3)] backdrop-blur-xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Lock className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
            Escrow Vault
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium block">Total Escrow Locked</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight mt-0.5 flex items-baseline gap-1.5">
            <span className="bg-gradient-to-r from-cyan-300 to-teal-200 bg-clip-text text-transparent">
              {formatGEN(totalEscrowLocked)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Intelligent Contract Storage</span>
          </div>
        </div>
      </div>

      {/* 02: Active SLAs */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#080e1a]/95 border border-amber-500/20 hover:border-amber-400/50 p-4 sm:p-5 group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-5px_rgba(245,158,11,0.25)] backdrop-blur-xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <FileCheck2 className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/30">
            Chain 61997
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium block">Active Sub-Agent SLAs</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight mt-0.5 flex items-baseline gap-2">
            <span>{totalJobs}</span>
            <span className="text-xs text-amber-400/90 font-mono font-normal">
              ({activeReview} in review)
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Awaiting Sub-Agent PRs</span>
          </div>
        </div>
      </div>

      {/* 03: Jury SLA Pass Rate */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#080e1a]/95 border border-emerald-500/20 hover:border-emerald-400/50 p-4 sm:p-5 group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-5px_rgba(16,185,129,0.25)] backdrop-blur-xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Scale className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            67% Quorum
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium block">AI Jury Pass Rate</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight mt-0.5 flex items-baseline gap-1.5">
            <span>{totalResolved > 0 ? `${passRate}%` : 'Ready'}</span>
            {totalResolved === 0 && (
              <span className="text-xs text-slate-500 font-mono font-normal">(no cases yet)</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Multi-Validator Consensus</span>
          </div>
        </div>
      </div>

      {/* 04: On-Chain Decisions */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#080e1a]/95 border border-purple-500/20 hover:border-purple-400/50 p-4 sm:p-5 group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-5px_rgba(168,85,247,0.25)] backdrop-blur-xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-slate-950 transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Users className="w-4.5 h-4.5" />
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/30">
            Autonomous
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium block">On-Chain Decisions</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight mt-0.5 flex items-baseline gap-1.5">
            <span>{totalResolved}</span>
            <span className="text-xs text-slate-400 font-normal font-sans">verdicts</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span>GenVM Subjective LLM</span>
          </div>
        </div>
      </div>
    </div>
  );
};
