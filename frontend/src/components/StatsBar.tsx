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

  const stats = [
    {
      label: 'Total Escrow Locked',
      value: formatGEN(totalEscrowLocked),
      sub: null,
      icon: Lock,
      iconBg: 'bg-cyan-950/70',
      iconBorder: 'border-cyan-500/30',
      iconColor: 'text-cyan-400',
      valueTxt: 'text-cyan-300',
      hoverBorder: 'hover:border-cyan-500/40',
    },
    {
      label: 'Active SLAs',
      value: String(totalJobs),
      sub: `${activeReview} in review`,
      icon: FileCheck2,
      iconBg: 'bg-amber-950/70',
      iconBorder: 'border-amber-500/30',
      iconColor: 'text-amber-400',
      valueTxt: 'text-slate-100',
      hoverBorder: 'hover:border-amber-500/40',
    },
    {
      label: 'Jury SLA Pass Rate',
      value: totalResolved > 0 ? `${passRate}%` : 'N/A',
      sub: null,
      icon: Scale,
      iconBg: 'bg-emerald-950/70',
      iconBorder: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
      valueTxt: 'text-emerald-400',
      hoverBorder: 'hover:border-emerald-500/40',
    },
    {
      label: 'On-chain Decisions',
      value: String(totalResolved),
      sub: 'decisions',
      icon: Users,
      iconBg: 'bg-indigo-950/70',
      iconBorder: 'border-indigo-500/30',
      iconColor: 'text-indigo-400',
      valueTxt: 'text-slate-100',
      hoverBorder: 'hover:border-indigo-500/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className={`rounded-2xl bg-slate-900/70 border border-slate-800/80 ${s.hoverBorder} p-4 flex items-center gap-3 sm:gap-4 group transition-all duration-200 hover:-translate-y-0.5 shadow-md backdrop-blur-md`}
          >
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${s.iconBg} border ${s.iconBorder} flex items-center justify-center ${s.iconColor} shrink-0 group-hover:scale-105 transition-transform`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] text-slate-400 font-medium block leading-tight">
                {s.label}
              </span>
              <div className={`text-lg sm:text-xl font-bold font-mono ${s.valueTxt} leading-tight mt-0.5 truncate`}>
                {s.value}
                {s.sub && (
                  <span className="text-[11px] text-slate-400 font-mono font-normal ml-1.5">
                    ({s.sub})
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
