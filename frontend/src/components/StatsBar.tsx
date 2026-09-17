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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Escrow Locked */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 hover:border-cyan-500/50 p-4 sm:p-5 flex items-center gap-4 group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(6,182,212,0.3)] backdrop-blur-md">
        {/* Top neon accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-950/80 to-slate-900 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-slate-400 font-medium block truncate tracking-wide">Total Escrow Locked</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 truncate drop-shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            {formatGEN(totalEscrowLocked)}
          </div>
        </div>
      </div>

      {/* Active Jobs */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 hover:border-amber-500/50 p-4 sm:p-5 flex items-center gap-4 group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(245,158,11,0.3)] backdrop-blur-md">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-950/80 to-slate-900 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all shrink-0">
          <FileCheck2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-slate-400 font-medium block truncate tracking-wide">Active SLAs</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-100 flex items-baseline gap-1.5 truncate">
            <span>{totalJobs}</span>
            <span className="text-xs text-amber-400/90 font-mono font-medium truncate">({activeReview} in review)</span>
          </div>
        </div>
      </div>

      {/* SLA Pass Rate */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 hover:border-emerald-500/50 p-4 sm:p-5 flex items-center gap-4 group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)] backdrop-blur-md">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all shrink-0">
          <Scale className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-slate-400 font-medium block truncate tracking-wide">Jury SLA Pass Rate</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 truncate drop-shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            {totalResolved > 0 ? `${passRate}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Resolved Consensus Verdicts */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 hover:border-indigo-500/50 p-4 sm:p-5 flex items-center gap-4 group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(99,102,241,0.3)] backdrop-blur-md">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-slate-400 font-medium block truncate tracking-wide">On-chain Decisions</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-100 flex items-baseline gap-1.5 truncate">
            <span>{totalResolved}</span>
            <span className="text-xs text-slate-400 font-mono font-medium">decisions</span>
          </div>
        </div>
      </div>
    </div>
  );
};
