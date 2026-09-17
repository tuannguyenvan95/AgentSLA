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
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/90 ${s.hoverBorder} p-4 flex items-center gap-3 sm:gap-4 group transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-[0_10px_30px_-5px_rgba(6,182,212,0.15)] backdrop-blur-xl`}
          >
            {/* Top neon hairline */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent group-hover:via-cyan-400 transition-all duration-300" />
            
            {/* Cyberpunk corner bracket accents */}
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-cyan-500/30 group-hover:border-cyan-400 transition-colors" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-cyan-500/30 group-hover:border-cyan-400 transition-colors" />

            <div
              className={`w-11 h-11 rounded-xl ${s.iconBg} border ${s.iconBorder} flex items-center justify-center ${s.iconColor} shrink-0 group-hover:scale-110 transition-all duration-300 shadow-inner`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 animate-ping group-hover:bg-cyan-300" />
                <span className="text-[11px] text-slate-400 font-medium truncate block leading-tight">
                  {s.label}
                </span>
              </div>
              <div className={`text-lg sm:text-xl font-black font-mono ${s.valueTxt} leading-tight mt-1 truncate tracking-tight`}>
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
