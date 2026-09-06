import React, { useState } from 'react';
import { GitPullRequest, X, ShieldAlert, Loader2 } from 'lucide-react';
import { Job } from '../utils/helpers';

interface SubmitPRProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (jobId: string, prUrl: string) => Promise<void>;
  isLoading: boolean;
}

export const SubmitPR: React.FC<SubmitPRProps> = ({
  job,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [prUrl, setPrUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !job) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleaned = prUrl.trim();
    if (!cleaned.startsWith('http') || !cleaned.includes('github.com')) {
      setError('Please provide a valid public GitHub Pull Request URL (e.g. https://github.com/org/repo/pull/123)');
      return;
    }

    try {
      await onSubmit(job.job_id, cleaned);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit PR deliverable.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-cyan-500/40 rounded-2xl w-full max-w-lg shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-slate-100">
              Submit Pull Request Deliverable
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1">
            <div className="text-slate-400">Target SLA Job:</div>
            <div className="font-mono font-bold text-cyan-300">{job.job_id}</div>
            <div className="text-[11px] text-slate-500 truncate font-mono">
              Repo: {job.repo_url}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              GitHub Pull Request URL
            </label>
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/organization/repository/pull/42"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-slate-100 font-mono placeholder:text-slate-600 outline-none"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Ensure the PR is public so GenLayer validator nodes can read the diff directly on-chain via <code className="text-cyan-400">gl.nondet.web.render</code>.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Deliverable...</span>
                </>
              ) : (
                <>
                  <GitPullRequest className="w-4 h-4" />
                  <span>Submit Deliverable for Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
