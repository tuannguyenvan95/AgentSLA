import React from 'react';
import { Scale, X, ExternalLink, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { Job, formatAddress, formatGEN, getExplorerUrl } from '../utils/helpers';
import { AGENTSLA_CONTRACT_ADDRESS } from '../config/genlayer';

interface JuryModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

export const JuryModal: React.FC<JuryModalProps> = ({ job, isOpen, onClose }) => {
  if (!isOpen || !job) return null;

  const isApproved = job.verdict === 'APPROVED';
  const isRejected = job.verdict === 'REJECTED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-cyan-500/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-slate-100">
              AI Jury Consensus Adjudication Verdict
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Top Verdict Banner */}
          <div
            className={`p-5 rounded-xl border flex items-center justify-between ${
              isApproved
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : isRejected
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {isApproved ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              ) : isRejected ? (
                <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
              ) : (
                <Scale className="w-8 h-8 text-slate-400 shrink-0" />
              )}
              <div>
                <span className="text-xs uppercase font-mono tracking-wider opacity-80">
                  On-chain Consensus Outcome
                </span>
                <div className="text-2xl font-black tracking-tight">
                  {job.verdict || 'PENDING'}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase font-mono tracking-wider opacity-80">
                Confidence
              </span>
              <div className="text-xl font-bold font-mono">
                {job.confidence}%
              </div>
            </div>
          </div>

          {/* Confidence bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
              <span>Jury Agreement Index</span>
              <span>{job.confidence}% Confidence</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isApproved
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : isRejected
                    ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${job.confidence}%` }}
              />
            </div>
          </div>

          {/* Immutable Reasoning Section */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Immutable Validator Rationale (GenLayer Optimistic Democracy)</span>
            </div>
            <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap bg-slate-900/50 p-3 rounded-lg border border-slate-800/80">
              {job.reason || 'No detailed reason provided.'}
            </p>
          </div>

          {/* Job & Escrow Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <div className="text-slate-400 text-[11px]">Bounty Amount</div>
              <div className="font-mono font-bold text-cyan-300 mt-0.5">
                {formatGEN(job.bounty_amount)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <div className="text-slate-400 text-[11px]">Deliverable PR</div>
              <a
                href={job.pr_url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-cyan-400 hover:underline flex items-center gap-1 mt-0.5 truncate"
              >
                {job.pr_url ? 'View GitHub PR' : 'Not submitted'}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <div className="text-slate-400 text-[11px]">Master Agent (Creator)</div>
              <div className="font-mono text-slate-300 mt-0.5">
                {formatAddress(job.creator)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <div className="text-slate-400 text-[11px]">Sub-Agent (Worker)</div>
              <div className="font-mono text-slate-300 mt-0.5">
                {formatAddress(job.worker)}
              </div>
            </div>
          </div>

          {/* SLA Specification Summary */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1.5">
            <span className="text-xs font-semibold text-slate-400">
              SLA Specification Target:
            </span>
            <p className="text-xs text-slate-300 font-mono line-clamp-3">
              {job.sla_spec}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <a
            href={getExplorerUrl(AGENTSLA_CONTRACT_ADDRESS, 'address')}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
          >
            <span>Verify on GenLayer Explorer</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
