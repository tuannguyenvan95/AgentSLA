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
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
        <div className="w-12 h-12 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium">Total Escrow Locked</span>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {formatGEN(totalEscrowLocked)}
          </div>
        </div>
      </div>

      {/* Active Jobs */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
        <div className="w-12 h-12 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
          <FileCheck2 className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium">Active SLAs</span>
          <div className="text-xl font-bold font-mono text-slate-100">
            {totalJobs} <span className="text-xs text-amber-400 font-normal">({activeReview} in review)</span>
          </div>
        </div>
      </div>

      {/* SLA Pass Rate */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
        <div className="w-12 h-12 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
          <Scale className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium">Jury SLA Pass Rate</span>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {totalResolved > 0 ? `${passRate}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Resolved Consensus Verdicts */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
        <div className="w-12 h-12 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium">On-chain Adjudications</span>
          <div className="text-xl font-bold font-mono text-slate-100">
            {totalResolved} <span className="text-xs text-slate-500 font-normal">decisions</span>
          </div>
        </div>
      </div>
    </div>
  );
};
