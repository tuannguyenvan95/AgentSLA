import React, { useState } from 'react';
import { PlusCircle, X, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';

interface CreateJobProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (slaSpec: string, repoUrl: string, bountyGen: string) => Promise<void>;
  isLoading: boolean;
}

const TEMPLATES = [
  {
    name: 'Smart Contract Auditor Sub-Agent',
    repo: 'https://github.com/agent-economy/defi-vault',
    bounty: '2.0',
    spec: `Task: Comprehensive Security Audit & Fuzz Testing
Acceptance Criteria:
1. Deliver a security analysis pull request with Slither and Echidna fuzz test harness.
2. Identify and fix any reentrancy or integer overflow vulnerabilities.
3. Test coverage for vault deposit/withdraw logic must exceed 95%.
Constraints:
- Must not alter external public function signatures.
- Must include detailed NatSpec documentation on all newly added test mocks.`,
  },
  {
    name: 'Full-Stack Sub-Agent (ERC-4337 Module)',
    repo: 'https://github.com/agent-economy/account-abstraction',
    bounty: '3.5',
    spec: `Task: Implement ERC-4337 UserOperation Paymaster Sponsor Module
Acceptance Criteria:
1. Complete implementation of SponsorPaymaster.sol conforming to EIP-4337.
2. Provide TypeScript integration tests simulating Bundler UserOp submission.
3. Gas overhead for validatePaymasterUserOp must remain below 45,000 gas.
Constraints:
- Clean code formatted with Prettier and passing all linter rules.`,
  },
  {
    name: 'Documentation & SDK Sub-Agent',
    repo: 'https://github.com/agent-economy/agentsla-core',
    bounty: '1.0',
    spec: `Task: Interactive API Documentation & Quickstart Tutorials
Acceptance Criteria:
1. Create comprehensive Markdown documentation in /docs covering contract deployment and frontend integration.
2. Provide copy-pasteable code snippets for Python SDK and genlayer-js.
3. Add a troubleshooting guide mapping common GenVM error codes (R1-R24).`,
  },
];

export const CreateJob: React.FC<CreateJobProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [slaSpec, setSlaSpec] = useState('');
  const [bountyGen, setBountyGen] = useState('1.0');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyTemplate = (t: typeof TEMPLATES[0]) => {
    setRepoUrl(t.repo);
    setSlaSpec(t.spec);
    setBountyGen(t.bounty);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!repoUrl.trim().startsWith('http')) {
      setError('Please provide a valid GitHub repository URL.');
      return;
    }
    if (slaSpec.trim().length < 20) {
      setError('SLA Specification is too brief. Provide detailed criteria for the AI jury.');
      return;
    }
    if (parseFloat(bountyGen) <= 0 || isNaN(parseFloat(bountyGen))) {
      setError('Bounty must be greater than 0 GEN.');
      return;
    }

    try {
      await onSubmit(slaSpec, repoUrl, bountyGen);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit transaction.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-cyan-500/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-slate-100">
              Commission Sub-Agent & Lock Escrow Bounty
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Preset Templates */}
          <div>
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Quick Templates
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TEMPLATES.map((t, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleApplyTemplate(t)}
                  className="text-left p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all text-xs group"
                >
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300 truncate">
                    {t.name}
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                    {t.bounty} GEN Escrow
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Repository URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Target GitHub Repository URL
            </label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/organization/repository"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-slate-100 font-mono placeholder:text-slate-600 outline-none"
              required
            />
          </div>

          {/* Bounty Escrow Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Bounty Escrow Amount (GEN)
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Locked safely in GenLayer contract
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={bountyGen}
                onChange={(e) => setBountyGen(e.target.value)}
                placeholder="1.0"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-slate-100 font-mono placeholder:text-slate-600 outline-none"
                required
              />
              <div className="absolute right-3.5 top-2.5 text-xs font-mono font-bold text-cyan-400">
                GEN
              </div>
            </div>
          </div>

          {/* SLA Specification */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Service Level Agreement (SLA) & Acceptance Criteria
              </label>
              <span className="text-[11px] text-amber-400/80 font-mono">
                Evaluated by GenLayer AI Validators
              </span>
            </div>
            <textarea
              rows={6}
              value={slaSpec}
              onChange={(e) => setSlaSpec(e.target.value)}
              placeholder="Describe exact requirements, deliverables, test standards, and constraints for the Sub-Agent..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-slate-100 font-mono placeholder:text-slate-600 outline-none leading-relaxed"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-3">
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
                  <span>Locking Escrow on-chain...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Lock Escrow & Create SLA ({bountyGen} GEN)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
