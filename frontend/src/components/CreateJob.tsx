import React, { useState } from 'react';
import { PlusCircle, X, ShieldAlert, Sparkles, Loader2, Code2, ShieldCheck, Layers, FileCode2 } from 'lucide-react';

interface CreateJobProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (slaSpec: string, repoUrl: string, bountyGen: string, category: string) => Promise<void>;
  isLoading: boolean;
}

const CATEGORIES = [
  { id: 'SMART_CONTRACT', label: 'Smart Contract', icon: Code2, desc: 'EVM/GenVM contracts, token standards, state logic' },
  { id: 'SECURITY_AUDIT', label: 'Security Audit', icon: ShieldCheck, desc: 'Fuzzing, formal verification, vulnerability mitigation' },
  { id: 'FULL_STACK', label: 'Full-Stack Agent', icon: Layers, desc: 'dApp frontends, Web3 SDKs, indexers & bundlers' },
  { id: 'DOCS_DEV', label: 'Docs & Tutorials', icon: FileCode2, desc: 'NatSpec, API references, architecture guides' },
];

const TEMPLATES = [
  {
    name: 'ERC-4337 Account Abstraction Sub-Agent',
    category: 'SMART_CONTRACT',
    repo: 'https://github.com/agent-economy/account-abstraction',
    bounty: '3.0',
    spec: `Task: Implement ERC-4337 UserOperation validation module with 100% test coverage.
Acceptance Criteria:
1. Complete validation logic for custom bundler transactions conforming to EIP-4337.
2. Gas overhead for validation must remain strictly below 45,000 gas.
3. Unit test coverage must exceed 95% using Foundry / Hardhat.
Constraints:
- No upgradeability proxies or delegatecall anti-patterns without reentrancy guards.`,
  },
  {
    name: 'Smart Contract Security Auditor Sub-Agent',
    category: 'SECURITY_AUDIT',
    repo: 'https://github.com/agent-economy/defi-vault',
    bounty: '4.5',
    spec: `Task: Comprehensive Security Audit & Echidna/Slither Fuzz Harness
Acceptance Criteria:
1. Deliver automated fuzz test harness testing invariant: totalAssets() == sum(userBalances).
2. Identify and fix any potential inflation attacks on first ERC-4626 deposit.
3. Provide automated report diff with zero critical or high severity findings.
Constraints:
- Must not alter public view function signatures.`,
  },
  {
    name: 'Web3 dApp Frontend Sub-Agent',
    category: 'FULL_STACK',
    repo: 'https://github.com/agent-economy/agentsla-frontend',
    bounty: '2.5',
    spec: `Task: High-performance React 18 + Viem Dashboard for Escrow Management
Acceptance Criteria:
1. Implement real-time block event subscriptions for contract payouts.
2. Ensure responsive Dark Cyberpunk theme with zero layout shift (CLS < 0.05).
3. MetaMask auto-network switch targeting GenLayer Studionet (61999).
Constraints:
- Zero private keys in environment bundles; strict wallet signing.`,
  },
  {
    name: 'GenVM Developer Documentation Sub-Agent',
    category: 'DOCS_DEV',
    repo: 'https://github.com/agent-economy/agentsla-core',
    bounty: '1.5',
    spec: `Task: Comprehensive Technical Documentation & GenVM R1-R24 Troubleshooting Guide
Acceptance Criteria:
1. Write interactive tutorials covering Intelligent Contract deployment.
2. Detail storage gotchas: bigint for financial amounts and sized ints.
3. Provide step-by-step Studionet MetaMask onboarding instructions.`,
  },
];

export const CreateJob: React.FC<CreateJobProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [category, setCategory] = useState('SMART_CONTRACT');
  const [repoUrl, setRepoUrl] = useState('');
  const [slaSpec, setSlaSpec] = useState('');
  const [bountyGen, setBountyGen] = useState('1.5');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyTemplate = (t: typeof TEMPLATES[0]) => {
    setCategory(t.category);
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
      await onSubmit(slaSpec, repoUrl, bountyGen, category);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit transaction.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-cyan-500/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-cyan-500/15 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Commission Sub-Agent & Lock Escrow Bounty
              </h2>
              <p className="text-[11px] text-slate-400">
                Define natural language SLA requirements and lock native GEN in GenLayer court
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Quick Templates
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map((t, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleApplyTemplate(t)}
                  className="text-left p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all text-xs group"
                >
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300 truncate">
                    {t.name}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span className="text-cyan-400">{t.bounty} GEN Escrow</span>
                    <span>{t.category.replace('_', ' ')}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Task Domain Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-bold leading-tight block">{cat.label}</span>
                  </button>
                );
              })}
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
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-slate-100 font-mono placeholder:text-slate-600 outline-none"
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
                Locked securely in contract on Studionet
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={bountyGen}
                onChange={(e) => setBountyGen(e.target.value)}
                placeholder="1.5"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-slate-100 font-mono placeholder:text-slate-600 outline-none"
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
              <span className="text-[11px] text-amber-400 font-mono">
                Evaluated by GenLayer AI Validators
              </span>
            </div>
            <textarea
              rows={5}
              value={slaSpec}
              onChange={(e) => setSlaSpec(e.target.value)}
              placeholder="Describe exact requirements, deliverables, test standards, and constraints for the Sub-Agent..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs text-slate-100 font-mono placeholder:text-slate-600 outline-none leading-relaxed"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
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
