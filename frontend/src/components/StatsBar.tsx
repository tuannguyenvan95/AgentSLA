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
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-md">
        <div className="w-12 h-12 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-slate-400 font-medium block truncate">Total Escrow Locked</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 truncate">
            {formatGEN(totalEscrowLocked)}
          </div>
        </div>
      </div>

      {/* Active Jobs */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-md">
        <div className="w-12 h-12 rounded-xl bg-amber-950/70 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shrink-0">
          <FileCheck2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-slate-400 font-medium block truncate">Active SLAs</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100 flex items-baseline gap-1.5 truncate">
            <span>{totalJobs}</span>
            <span className="text-xs text-amber-400/90 font-normal truncate">({activeReview} in review)</span>
          </div>
        </div>
      </div>

      {/* SLA Pass Rate */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-md">
        <div className="w-12 h-12 rounded-xl bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
          <Scale className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-slate-400 font-medium block truncate">Jury SLA Pass Rate</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 truncate">
            {totalResolved > 0 ? `${passRate}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Resolved Consensus Verdicts */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden group hover:border-indigo-500/40 transition-all shadow-md">
        <div className="w-12 h-12 rounded-xl bg-indigo-950/70 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-slate-400 font-medium block truncate">On-chain Decisions</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100 flex items-baseline gap-1.5 truncate">
            <span>{totalResolved}</span>
            <span className="text-xs text-slate-400 font-normal">decisions</span>
          </div>
        </div>
      </div>
    </div>
  );
};
