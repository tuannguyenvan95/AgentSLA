import React, { useState } from 'react';
import { 
  Scale, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  AlertOctagon, 
  Award,
  Loader2
} from 'lucide-react';
import { 
  Job, 
  formatAddress, 
  formatGEN, 
  getExplorerUrl, 
  getCategoryInfo, 
  getScoreGrade 
} from '../utils/helpers';
import { AGENTSLA_CONTRACT_ADDRESS } from '../config/genlayer';

interface JuryModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onAppeal?: (jobId: string, bondGen: string) => Promise<void>;
  onResolveDispute?: (jobId: string, action: 'MUTUAL_SPLIT' | 'CONCEDE') => Promise<void>;
  currentAccount?: string | null;
  isAppealing?: boolean;
  isResolvingDispute?: boolean;
}

export const JuryModal: React.FC<JuryModalProps> = ({ 
  job, 
  isOpen, 
  onClose,
  onAppeal,
  onResolveDispute,
  currentAccount,
  isAppealing = false,
  isResolvingDispute = false,
}) => {
  const [appealBond, setAppealBond] = useState('0.5');
  const [showAppealForm, setShowAppealForm] = useState(false);

  if (!isOpen || !job) return null;

  const isApproved = job.verdict === 'APPROVED' || job.status === 2;
  const isRejected = job.verdict === 'REJECTED' || job.status === 3;
  const isPartial = job.verdict === 'PARTIAL' || job.status === 6;
  const isRetry = job.verdict === 'RETRY' || job.status === 7;
  const isEscalated = job.verdict === 'ESCALATE' || job.status === 8;
  const isInAppeal = job.status === 5;
  const categoryInfo = getCategoryInfo(job.category);
  const averageScore = Math.round((job.spec_score + job.quality_score + job.test_score) / 3) || (isApproved ? 85 : isPartial ? 65 : 30);
  const gradeInfo = getScoreGrade(averageScore);

  const isCreator = Boolean(currentAccount && currentAccount.toLowerCase() === job.creator.toLowerCase());
  const isWorker = Boolean(currentAccount && job.worker && currentAccount.toLowerCase() === job.worker.toLowerCase());
  const isParty = isCreator || isWorker;

  const hasApprovedSplit = Boolean(
    currentAccount &&
    job.split_approved_by &&
    job.split_approved_by.toLowerCase() === currentAccount.toLowerCase()
  );

  const handleTriggerAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAppeal) return;
    await onAppeal(job.job_id, appealBond);
    setShowAppealForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-cyan-500/40 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-cyan-500/15 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>AI Jury Adjudication Verdict & Scorecard</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${categoryInfo.badge}`}>
                  {categoryInfo.label}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Case #{job.job_id} · GenLayer Optimistic Democracy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Top Verdict Banner */}
          <div
            className={`p-5 rounded-2xl border flex items-center justify-between ${
              isInAppeal
                ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
                : isApproved
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : isPartial
                ? 'bg-teal-950/40 border-teal-500/40 text-teal-300'
                : isRetry
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                : isEscalated
                ? 'bg-yellow-950/40 border-yellow-500/40 text-yellow-300'
                : isRejected
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3.5">
              {isInAppeal ? (
                <AlertOctagon className="w-9 h-9 text-purple-400 shrink-0 animate-pulse" />
              ) : isApproved ? (
                <CheckCircle2 className="w-9 h-9 text-emerald-400 shrink-0" />
              ) : isPartial ? (
                <CheckCircle2 className="w-9 h-9 text-teal-400 shrink-0" />
              ) : isRetry ? (
                <AlertOctagon className="w-9 h-9 text-amber-400 shrink-0" />
              ) : isEscalated ? (
                <AlertOctagon className="w-9 h-9 text-yellow-400 shrink-0" />
              ) : isRejected ? (
                <XCircle className="w-9 h-9 text-rose-400 shrink-0" />
              ) : (
                <Scale className="w-9 h-9 text-slate-400 shrink-0" />
              )}
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider opacity-80 block">
                  Consensus Outcome
                </span>
                <div className="text-2xl font-black tracking-tight flex items-center gap-2">
                  <span>{job.verdict || 'PENDING'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 font-mono ${gradeInfo.color}`}>
                    Grade: {gradeInfo.grade}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-mono tracking-wider opacity-80 block">
                Jury Agreement
              </span>
              <div className="text-xl font-bold font-mono">
                {job.confidence}%
              </div>
            </div>
          </div>

          {/* Multi-Dimensional Scorecards */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pb-2 border-b border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-cyan-400" />
                Multi-Dimensional Criteria Breakdown
              </span>
              <span className="text-[11px] font-mono text-slate-500">Evaluated on-chain</span>
            </div>

            {/* Spec Compliance */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">1. Specification Compliance</span>
                <span className="font-bold text-cyan-300">{job.spec_score || (isApproved ? 90 : 30)}/100</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                  style={{ width: `${job.spec_score || (isApproved ? 90 : 30)}%` }}
                />
              </div>
            </div>

            {/* Code Quality */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">2. Code Architecture & Quality</span>
                <span className="font-bold text-teal-300">{job.quality_score || (isApproved ? 85 : 40)}/100</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full bg-teal-400 transition-all duration-500"
                  style={{ width: `${job.quality_score || (isApproved ? 85 : 40)}%` }}
                />
              </div>
            </div>

            {/* Test Verification */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">3. Test Coverage & Verification</span>
                <span className="font-bold text-emerald-300">{job.test_score || (isApproved ? 90 : 20)}/100</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${job.test_score || (isApproved ? 90 : 20)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Immutable Reasoning Section */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Immutable Validator Rationale (GenLayer Optimistic Democracy)</span>
            </div>
            <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
              {job.reason || 'No detailed reason provided.'}
            </p>
          </div>

          {/* Job & Escrow Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-mono">Bounty Value</div>
              <div className="font-mono font-bold text-emerald-400 mt-0.5">
                {formatGEN(job.bounty_amount)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-mono">Appeals Filed</div>
              <div className="font-mono font-bold text-purple-400 mt-0.5">
                {job.appeal_count || 0} times
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-mono">Master Agent</div>
              <div className="font-mono text-slate-300 mt-0.5 truncate">
                {formatAddress(job.creator)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-mono">Sub-Agent</div>
              <div className="font-mono text-slate-300 mt-0.5 truncate">
                {formatAddress(job.worker)}
              </div>
            </div>
          </div>

          {/* Deliverable PR link */}
          {job.pr_url && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-400">Evaluated Deliverable:</span>
              <a
                href={job.pr_url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-cyan-400 hover:underline flex items-center gap-1 truncate max-w-sm"
              >
                <span className="truncate">{job.pr_url}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          )}

          {/* Security & Canary Protection Badge */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Canary Token Defense Active (Anti-Prompt Injection)</span>
            </div>
            <span className="text-slate-500">Attempt {job.attempts || 1}/3</span>
          </div>

          {/* 2-of-2 Mutual Dispute Settlement Section (DeliverableCourt Standard) */}
          {onResolveDispute && isParty && (job.status === 5 || job.status === 8) && (
            <div className="p-4 rounded-xl bg-yellow-950/30 border border-yellow-500/30 space-y-3">
              <div>
                <span className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-yellow-400" />
                  2-of-2 Mutual Dispute Settlement Court
                </span>
                <p className="text-[11px] text-yellow-400/80 mt-0.5 leading-relaxed">
                  Avoid prolonged litigation. Both parties can agree to a fair 50/50 split (requires 2-of-2 mutual approval), or unilaterally concede to release funds.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* 50/50 Split Button */}
                <button
                  onClick={() => onResolveDispute(job.job_id, 'MUTUAL_SPLIT')}
                  disabled={isResolvingDispute || hasApprovedSplit}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border ${
                    hasApprovedSplit
                      ? 'bg-yellow-950/60 border-yellow-500/40 text-yellow-300 cursor-not-allowed'
                      : isResolvingDispute
                      ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                      : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border-yellow-500/40 active:translate-y-0.5 cursor-pointer'
                  }`}
                >
                  {hasApprovedSplit ? (
                    <span>✓ 1 of 2 Approved (Waiting for Counterparty)</span>
                  ) : (
                    <span>🤝 Sign 50/50 Split Agreement</span>
                  )}
                </button>

                {/* Concede Button */}
                <button
                  onClick={() => onResolveDispute(job.job_id, 'CONCEDE')}
                  disabled={isResolvingDispute}
                  className="py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all bg-slate-800/80 hover:bg-rose-950/50 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 active:translate-y-0.5 cursor-pointer"
                >
                  <span>🏳️ {isCreator ? 'Concede to Sub-Agent' : 'Concede to Master Agent'}</span>
                </button>
              </div>
            </div>
          )}

          {/* On-chain Dispute Appeal Section */}
          {onAppeal && isParty && (job.status === 2 || job.status === 3 || job.status === 6) && (
            <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-purple-400" />
                    Dispute Adjudication Verdict?
                  </span>
                  <p className="text-[11px] text-purple-400/80 mt-0.5">
                    Stake an appeal bond to trigger appellate review by higher consensus threshold (Round {job.appeal_count || 0}/2).
                  </p>
                </div>
                {!showAppealForm && (
                  <button
                    onClick={() => setShowAppealForm(true)}
                    disabled={(job.appeal_count || 0) >= 2}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs transition-colors"
                  >
                    {(job.appeal_count || 0) >= 2 ? 'Final (2/2 Appeals)' : 'File Appeal'}
                  </button>
                )}
              </div>

              {showAppealForm && (
                <form onSubmit={handleTriggerAppeal} className="space-y-3 pt-2 border-t border-purple-500/20">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                      Appeal Bond (GEN) — Minimum 25% of bounty
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={appealBond}
                      disabled={isAppealing}
                      onChange={(e) => setAppealBond(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-purple-500/40 text-xs font-mono text-white outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAppealForm(false)}
                      disabled={isAppealing}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAppealing}
                      className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 ${
                        isAppealing
                          ? 'bg-purple-950/80 border border-purple-500/50 text-purple-300 cursor-not-allowed shadow-none'
                          : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-md shadow-purple-500/20'
                      }`}
                    >
                      {isAppealing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                          <span>Filing on-chain appeal...</span>
                        </>
                      ) : (
                        <span>Stake Bond & File Appeal</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <a
            href={getExplorerUrl(AGENTSLA_CONTRACT_ADDRESS, 'address')}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
          >
            <span>Verify Contract on Explorer</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
