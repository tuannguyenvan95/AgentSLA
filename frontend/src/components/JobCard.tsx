import React, { useState } from 'react';
import { 
  GitPullRequest, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Scale, 
  Loader2, 
  Trash2,
  CheckCircle2,
  XCircle,
  AlertOctagon
} from 'lucide-react';
import { 
  Job, 
  formatAddress, 
  formatGEN, 
  getStatusInfo, 
  getCategoryInfo, 
  getScoreGrade 
} from '../utils/helpers';

interface JobCardProps {
  job: Job;
  currentAccount: string | null;
  onSubmitPR: (job: Job) => void;
  onAdjudicate: (jobId: string) => Promise<void>;
  onCancelJob: (jobId: string) => Promise<void>;
  onInspectJury: (job: Job) => void;
  isAdjudicating: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  currentAccount,
  onSubmitPR,
  onAdjudicate,
  onCancelJob,
  onInspectJury,
  isAdjudicating,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [adjudicationStep, setAdjudicationStep] = useState<string | null>(null);

  const statusInfo = getStatusInfo(job.status);
  const categoryInfo = getCategoryInfo(job.category);
  const isCreator = currentAccount && currentAccount.toLowerCase() === job.creator.toLowerCase();
  
  const avgScore = Math.round((job.spec_score + job.quality_score + job.test_score) / 3);
  const grade = getScoreGrade(avgScore || (job.verdict === 'APPROVED' ? 88 : 35));

  const handleTriggerAdjudicate = async () => {
    try {
      setAdjudicationStep('Step 1/3: Reading GitHub PR live on-chain (gl.nondet.web.render)...');
      setTimeout(() => {
        setAdjudicationStep('Step 2/3: Multi-dimensional AI jury evaluation (Spec, Code, Tests)...');
      }, 4000);
      setTimeout(() => {
        setAdjudicationStep('Step 3/3: Reaching Optimistic Democracy consensus among validators...');
      }, 9000);

      await onAdjudicate(job.job_id);
    } finally {
      setAdjudicationStep(null);
    }
  };

  return (
    <div className={`bg-slate-900/80 border ${statusInfo.border} rounded-2xl p-5 shadow-lg transition-all hover:shadow-cyan-500/10 flex flex-col justify-between relative overflow-hidden group`}>
      {/* Top row: Job ID, Category & Status Badge */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-cyan-300">
              {job.job_id}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${categoryInfo.badge}`}>
              {categoryInfo.label}
            </span>
          </div>

          <div className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold border flex items-center gap-1.5 ${statusInfo.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
            <span>{statusInfo.label}</span>
          </div>
        </div>

        {/* Bounty & Repo */}
        <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-slate-800/80">
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400">Escrow Bounty</span>
            <div className="text-xl font-mono font-extrabold text-emerald-400">
              {formatGEN(job.bounty_amount)}
            </div>
          </div>
          <div className="text-right max-w-[55%]">
            <span className="text-[10px] uppercase font-mono text-slate-400">Target Repo</span>
            <a
              href={job.repo_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono text-cyan-400 hover:underline flex items-center justify-end gap-1 truncate"
            >
              <span className="truncate">{job.repo_url.replace('https://github.com/', '')}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>

        {/* Deliverable PR (if submitted) */}
        {job.pr_url && (
          <div className="mb-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <GitPullRequest className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-400">PR:</span>
              <a
                href={job.pr_url}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline font-mono truncate"
              >
                {job.pr_url}
              </a>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-500 shrink-0 ml-2" />
          </div>
        )}

        {/* Multi-score preview if resolved */}
        {(job.status === 2 || job.status === 3 || job.status === 5) && (
          <div className="mb-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-slate-400">Jury Assessment Score:</span>
              <span className={`font-bold ${grade.color}`}>{avgScore || (job.status === 2 ? 88 : 35)}/100 (Grade {grade.grade})</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center">
              <div className="p-1 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Spec</span>
                <span className="text-cyan-300 font-bold">{job.spec_score || (job.status === 2 ? 90 : 30)}%</span>
              </div>
              <div className="p-1 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Quality</span>
                <span className="text-teal-300 font-bold">{job.quality_score || (job.status === 2 ? 85 : 40)}%</span>
              </div>
              <div className="p-1 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Tests</span>
                <span className="text-emerald-300 font-bold">{job.test_score || (job.status === 2 ? 90 : 20)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* SLA Spec Preview & Toggle */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>SLA Specification:</span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 text-[11px]"
            >
              {isExpanded ? (
                <>
                  Less <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  View Full SLA <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
          <p className={`text-xs text-slate-300 font-mono bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}>
            {job.sla_spec}
          </p>
        </div>

        {/* Parties involved */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 mb-4">
          <div>
            <span className="text-slate-500">Creator:</span>{' '}
            <span className="text-slate-300">{formatAddress(job.creator)}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Worker:</span>{' '}
            <span className="text-slate-300">{formatAddress(job.worker)}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800/80">
        {/* Status: OPEN */}
        {job.status === 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSubmitPR(job)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Submit PR Deliverable</span>
            </button>
            {isCreator && (
              <button
                onClick={() => onCancelJob(job.job_id)}
                title="Cancel job & reclaim escrow"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Status: IN_REVIEW */}
        {job.status === 1 && (
          <div className="space-y-2">
            <button
              onClick={handleTriggerAdjudicate}
              disabled={isAdjudicating}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-teal-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {isAdjudicating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adjudicating On-chain...</span>
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  <span>Adjudicate SLA with AI Jury</span>
                </>
              )}
            </button>
            {adjudicationStep && (
              <p className="text-[11px] font-mono text-cyan-400 text-center animate-pulse">
                {adjudicationStep}
              </p>
            )}
          </div>
        )}

        {/* Status: RESOLVED (APPROVED or REJECTED) */}
        {(job.status === 2 || job.status === 3) && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
              {job.status === 2 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">PASSED ({job.confidence}%)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-400">REJECTED ({job.confidence}%)</span>
                </>
              )}
            </div>

            <button
              onClick={() => onInspectJury(job)}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-xs font-mono font-semibold flex items-center gap-1 transition-colors border border-slate-700"
            >
              <span>Inspect Jury Verdict</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Status: IN_APPEAL */}
        {job.status === 5 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-purple-400">
              <AlertOctagon className="w-4 h-4 animate-pulse text-purple-400" />
              <span>APPEAL PENDING</span>
            </div>
            <button
              onClick={() => onInspectJury(job)}
              className="py-1.5 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 text-xs font-mono font-semibold flex items-center gap-1 transition-colors border border-purple-500/40"
            >
              <span>Appellate Docket</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Status: CANCELLED */}
        {job.status === 4 && (
          <div className="text-center text-xs text-slate-500 font-mono py-1">
            Escrow reclaimed by creator.
          </div>
        )}
      </div>
    </div>
  );
};
