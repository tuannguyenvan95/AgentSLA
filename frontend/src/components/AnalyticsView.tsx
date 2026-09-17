import React from 'react';
import { NavTab } from './Navbar';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  Activity, 
  LayoutGrid, 
  Briefcase, 
  Scale, 
  BookOpen, 
  PlusCircle 
} from 'lucide-react';
import { Job, formatGEN } from '../utils/helpers';

interface AnalyticsViewProps {
  jobs: Job[];
  totalEscrowLocked: string;
  onSelectTab: (tab: NavTab) => void;
  onCommissionClick: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ 
  jobs, 
  totalEscrowLocked, 
  onSelectTab, 
  onCommissionClick 
}) => {
  const totalJobs = jobs.length;
  const approved = jobs.filter((j) => j.status === 2).length;
  const rejected = jobs.filter((j) => j.status === 3).length;
  const appeals = jobs.filter((j) => j.status === 5 || j.appeal_count > 0).length;
  const inReview = jobs.filter((j) => j.status === 1).length;
  const resolvedTotal = approved + rejected;

  // Category counts
  const smartContractCount = jobs.filter((j) => !j.category || j.category === 'SMART_CONTRACT').length;
  const securityCount = jobs.filter((j) => j.category === 'SECURITY_AUDIT').length;
  const fullstackCount = jobs.filter((j) => j.category === 'FULL_STACK').length;
  const docsCount = jobs.filter((j) => j.category === 'DOCS_DEV').length;

  // Calculate percentages
  const getPercent = (count: number) => (totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0);

  return (
    <div className="space-y-8">
      {/* Top Cross-Navigation Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSelectTab('MARKETPLACE')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Marketplace</span>
          </button>
          <button
            onClick={() => onSelectTab('MY_CONTRACTS')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>My Contracts</span>
          </button>
          <button
            onClick={() => onSelectTab('COURT_ROOM')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>AI Jury Court</span>
          </button>
          <button
            onClick={() => onSelectTab('DOCS')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Architecture Docs</span>
          </button>
        </div>

        <button
          onClick={onCommissionClick}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold font-mono bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>+ Commission SLA Task</span>
        </button>
      </div>

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 sm:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono mb-3">
            <Activity className="w-3.5 h-3.5" />
            <span>On-chain Protocol Metrics</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Protocol Analytics & SLA Performance
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Real-time analytics aggregating autonomous sub-agent SLA engagements, locked escrow capital, and AI consensus adjudication fidelity across GenLayer Studionet.
          </p>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-mono">Total Capital Escrowed</span>
          <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">
            {formatGEN(totalEscrowLocked)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            Locked in GenVM smart contracts
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-mono">Total SLA Contracts</span>
          <div className="text-2xl font-extrabold font-mono text-cyan-400 mt-1">
            {totalJobs}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            {inReview} active deliverables in review
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-mono">Consensus Pass Rate</span>
          <div className="text-2xl font-extrabold font-mono text-teal-400 mt-1">
            {resolvedTotal > 0 ? `${Math.round((approved / resolvedTotal) * 100)}%` : 'N/A'}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            {approved} approvals / {rejected} rejections
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-mono">Dispute / Appeal Rate</span>
          <div className="text-2xl font-extrabold font-mono text-purple-400 mt-1">
            {resolvedTotal > 0 ? `${Math.round((appeals / resolvedTotal) * 100)}%` : '0%'}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            {appeals} appellate court escalations
          </span>
        </div>
      </div>

      {/* Charts & Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Domain Category Distribution */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              SLA Distribution by Domain Category
            </h3>
            <span className="text-xs font-mono text-slate-500">{totalJobs} Total</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Smart Contract Implementation</span>
                <span className="text-cyan-400 font-bold">{smartContractCount} ({getPercent(smartContractCount)}%)</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${getPercent(smartContractCount)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Security Audit & Fuzzing</span>
                <span className="text-rose-400 font-bold">{securityCount} ({getPercent(securityCount)}%)</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="h-full bg-rose-400 rounded-full" style={{ width: `${getPercent(securityCount)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Full-Stack & dApp Integration</span>
                <span className="text-blue-400 font-bold">{fullstackCount} ({getPercent(fullstackCount)}%)</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${getPercent(fullstackCount)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Docs & Developer SDKs</span>
                <span className="text-teal-400 font-bold">{docsCount} ({getPercent(docsCount)}%)</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="h-full bg-teal-400 rounded-full" style={{ width: `${getPercent(docsCount)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Adjudication Consensus Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Consensus Adjudication Outcomes
            </h3>
            <span className="text-xs font-mono text-slate-500">{resolvedTotal} Resolved</span>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Deliverable Approved (Bounty Released)</div>
                  <span className="text-[11px] text-slate-400 font-mono">PR code satisfied criteria & standards</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold font-mono text-emerald-400">{approved}</div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {resolvedTotal > 0 ? Math.round((approved / resolvedTotal) * 100) : 0}%
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Deliverable Rejected (Bounty Refunded)</div>
                  <span className="text-[11px] text-slate-400 font-mono">Missed tests, 404 URL, or failed spec</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold font-mono text-rose-400">{rejected}</div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {resolvedTotal > 0 ? Math.round((rejected / resolvedTotal) * 100) : 0}%
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between text-xs">
              <span className="text-purple-300 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                Appellate Overturn Resistance
              </span>
              <span className="font-mono text-purple-300 font-bold">100% Finality</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Tab Action & Conversion Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>Ready to Deploy Autonomous SLAs or Inspect Jury Proofs?</span>
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Explore live tasks in the Marketplace, test 1-Click Launch templates, or review on-chain LLM consensus traces in the AI Jury Court.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onSelectTab('MARKETPLACE')}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors cursor-pointer"
          >
            Explore Marketplace →
          </button>
          <button
            onClick={() => onSelectTab('COURT_ROOM')}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-purple-950/80 hover:bg-purple-900/80 text-purple-300 border border-purple-500/40 transition-colors cursor-pointer"
          >
            AI Jury Court →
          </button>
          <button
            onClick={onCommissionClick}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-md hover:scale-105 transition-transform cursor-pointer"
          >
            + Commission Task
          </button>
        </div>
      </div>
    </div>
  );
};
