import React from 'react';
import { BookOpen, ShieldCheck, Terminal, ExternalLink, Scale, CheckCircle2 } from 'lucide-react';
import { AGENTSLA_CONTRACT_ADDRESS, STUDIONET_CONFIG } from '../config/genlayer';
import { getExplorerUrl } from '../utils/helpers';

export const DocsView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-500/30 p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-mono mb-3">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Technical Reference</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          Architecture & Developer Reference
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Comprehensive guide detailing GenLayer Optimistic Democracy, on-chain non-deterministic GitHub diff rendering, multi-dimensional SLA scoring, and the R1-R24 GenVM runtime compliance rules.
        </p>
      </div>

      {/* Network & Contract Quick Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-500">Target Network</span>
          <div className="text-sm font-bold font-mono text-cyan-300 mt-1">GenLayer studionet</div>
          <span className="text-[11px] text-slate-400 font-mono">Chain ID: {STUDIONET_CONFIG.chainIdDecimal} ({STUDIONET_CONFIG.chainIdHex})</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-500">Consensus Engine</span>
          <div className="text-sm font-bold font-mono text-teal-300 mt-1">Optimistic Democracy</div>
          <span className="text-[11px] text-slate-400 font-mono">Semantic meaning comparison</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-500">Contract Address</span>
          <a
            href={getExplorerUrl(AGENTSLA_CONTRACT_ADDRESS, 'address')}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold font-mono text-emerald-400 hover:underline flex items-center gap-1 mt-1 truncate"
          >
            <span className="truncate">{AGENTSLA_CONTRACT_ADDRESS}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
          <span className="text-[11px] text-slate-400 font-mono">Verified on Explorer</span>
        </div>
      </div>

      {/* Core Mechanism: How Non-deterministic Adjudication Works */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
          <Scale className="w-5 h-5 text-cyan-400" />
          How AgentSLA Solves Subjective Code Verification
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Traditional smart contracts in Ethereum/Solidity can only verify arithmetic state transitions. They cannot inspect whether a pull request meets an EIP standard, passes a security audit, or satisfies an acceptance test. AgentSLA introduces a synthetic jurisdiction where GenLayer validator nodes directly render web evidence on-chain and evaluate compliance via Optimistic Democracy:
        </p>

        <div className="space-y-2.5 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold shrink-0 text-[10px]">
              1
            </span>
            <div>
              <strong className="text-cyan-300">Live On-chain Web Rendering:</strong>
              <p className="text-slate-400 mt-0.5">
                The consensus leader calls <code className="text-cyan-400">gl.nondet.web.render(job.pr_url, mode="text")</code> inside the nondet block, fetching public GitHub PR diffs without third-party oracles.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-teal-950 text-teal-400 border border-teal-500/40 flex items-center justify-center font-bold shrink-0 text-[10px]">
              2
            </span>
            <div>
              <strong className="text-teal-300">Multi-Dimensional LLM Evaluation:</strong>
              <p className="text-slate-400 mt-0.5">
                Validators prompt their LLM models to evaluate: Specification Compliance (0-100), Code Quality & Architecture (0-100), and Test Coverage (0-100), returning an overall verdict.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold shrink-0 text-[10px]">
              3
            </span>
            <div>
              <strong className="text-emerald-300">Semantic Consensus on VERDICT:</strong>
              <p className="text-slate-400 mt-0.5">
                The validator compares <code className="text-emerald-400">mine["verdict"] == leader["verdict"]</code>. Minor wording differences in natural language explanations are intentionally ignored to achieve deterministic consensus on subjective outcomes.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-400 border border-purple-500/40 flex items-center justify-center font-bold shrink-0 text-[10px]">
              4
            </span>
            <div>
              <strong className="text-purple-300">Automatic Escrow Settlement & Appeals:</strong>
              <p className="text-slate-400 mt-0.5">
                Native GEN is automatically disbursed via <code className="text-purple-300">gl.get_contract_at(recipient).emit_transfer(value=...)</code>. Parties can stake appeal bonds to escalate disputed verdicts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* GenLayer Studio Deployment Guide */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-amber-400" />
          Step-by-Step GenLayer Studio Deployment
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">1. Open GenLayer Studio:</strong>
              <p className="text-slate-400">
                Navigate to <a href="https://studio.genlayer.com/run-debug" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">https://studio.genlayer.com/run-debug</a>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">2. Reset Storage & Hard Refresh:</strong>
              <p className="text-slate-400">
                Click <strong>Settings</strong> &gt; <strong>Reset Storage</strong> &gt; Confirm, then hard refresh (Ctrl+Shift+R / Cmd+Shift+R).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">3. Create contract.py:</strong>
              <p className="text-slate-400">
                Create a new file in Studio named <code className="text-cyan-300">contract.py</code> and copy the code from <code className="text-cyan-300">contracts/contract.py</code>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">4. Deploy & Verify Result SUCCESS:</strong>
              <p className="text-slate-400">
                Click <strong>Deploy Contract</strong>. When mined, click the transaction in the sidebar and verify that <code className="text-emerald-400">Result: SUCCESS</code> (not just <code className="text-slate-300">Status: FINALIZED</code>).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">5. Fund MetaMask from Accounts Panel:</strong>
              <p className="text-slate-400">
                In GenLayer Studio, go to the <strong>Accounts</strong> panel and transfer GEN to your personal MetaMask wallet address on Studionet (Rule R21).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* R1-R24 Rule Compliance Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Rule Compliance Verification (R1–R24)
        </h3>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="p-3">Rule</th>
                <th className="p-3">Requirement</th>
                <th className="p-3">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="p-3 font-bold text-cyan-400">D1 / R24</td>
                <td className="p-3">Network locked to studionet only (Chain 61999)</td>
                <td className="p-3 text-emerald-400 font-bold">✓ 100% Compliant</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-cyan-400">Rule #1 / R13</td>
                <td className="p-3">Pragma line 1 + star import from genlayer import *</td>
                <td className="p-3 text-emerald-400 font-bold">✓ 100% Compliant</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-cyan-400">Rule #2</td>
                <td className="p-3">Never reassign TreeMap() / DynArray() in __init__</td>
                <td className="p-3 text-emerald-400 font-bold">✓ 100% Compliant</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-cyan-400">R14 / Rule #5</td>
                <td className="p-3">No bare int in storage (use bigint for money, sized ints)</td>
                <td className="p-3 text-emerald-400 font-bold">✓ 100% Compliant</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-cyan-400">R15</td>
                <td className="p-3">Transfer via gl.get_contract_at(addr).emit_transfer</td>
                <td className="p-3 text-emerald-400 font-bold">✓ 100% Compliant</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-cyan-400">R18</td>
                <td className="p-3">Struct decorated with @allow_storage @dataclass</td>
                <td className="p-3 text-emerald-400 font-bold">✓ 100% Compliant</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-cyan-400">R19 / R20</td>
                <td className="p-3">All public TreeMap keys are str; defensive Address fmt</td>
                <td className="p-3 text-emerald-400 font-bold">✓ 100% Compliant</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-cyan-400">R21 / R22</td>
                <td className="p-3">Pre-funded MetaMask; zero private keys in bundles</td>
                <td className="p-3 text-emerald-400 font-bold">✓ 100% Compliant</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-cyan-400">R23</td>
                <td className="p-3">Auto wallet_switchEthereumChain targeting 61999</td>
                <td className="p-3 text-emerald-400 font-bold">✓ 100% Compliant</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
