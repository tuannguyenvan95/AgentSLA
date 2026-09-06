import React from 'react';
import { 
  Scale, 
  Gavel, 
  AlertOctagon, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Cpu
} from 'lucide-react';
import { Job, formatAddress, formatGEN, getCategoryInfo, getScoreGrade } from '../utils/helpers';

interface CourtRoomProps {
  jobs: Job[];
  onInspectCase: (job: Job) => void;
}

export const CourtRoom: React.FC<CourtRoomProps> = ({ jobs, onInspectCase }) => {
  const inReviewCases = jobs.filter((j) => j.status === 1);
  const inAppealCases = jobs.filter((j) => j.status === 5);
  const resolvedCases = jobs.filter((j) => j.status === 2 || j.status === 3);

  const totalEvaluated = resolvedCases.length;
  const passedCount = resolvedCases.filter((j) => j.status === 2).length;
  const passRatio = totalEvaluated > 0 ? Math.round((passedCount / totalEvaluated) * 100) : 0;
  const avgConfidence = totalEvaluated > 0 
    ? Math.round(resolvedCases.reduce((acc, curr) => acc + curr.confidence, 0) / totalEvaluated)
    : 0;

  return (
    <div className="space-y-8">
      {/* Court Room Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-500/30 p-6 sm:p-8 overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-mono mb-3">
            <Gavel className="w-3.5 h-3.5" />
            <span>GenLayer Synthetic Jurisdiction</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            AI Jury Court Room & Consensus Docket
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Every SLA deliverable submitted to AgentSLA is adjudicated by independent GenLayer validator nodes running LLM consensus models via Optimistic Democracy. View active dockets, inspection scorecards, and appellate proceedings.
          </p>
        </div>
      </div>

      {/* Consensus Health Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-mono">Cases Adjudicated</span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{totalEvaluated}</div>
          <span className="text-[11px] text-slate-500">Immutable on-chain verdicts</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-mono">Approval Rate</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{passRatio}%</div>
          <span className="text-[11px] text-slate-500">{passedCount} deliverables approved</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-mono">Avg Jury Confidence</span>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{avgConfidence}%</div>
          <span className="text-[11px] text-slate-500">Validator agreement index</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 font-mono">Active Appeals</span>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-1">{inAppealCases.length}</div>
          <span className="text-[11px] text-slate-500">Appellate court escalation</span>
        </div>
      </div>

      {/* Active Appeals / Dispute Docket */}
      {inAppealCases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
            <AlertOctagon className="w-4 h-4 text-purple-400" />
            <span>Active Appellate Proceedings ({inAppealCases.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inAppealCases.map((job) => (
              <div
                key={job.job_id}
                className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-300">{job.job_id}</span>
                  <span className="px-2 py-0.5 text-xs font-mono rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                    Bond Staked: {formatGEN(job.appeal_bond)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono line-clamp-2">
                  {job.reason}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-purple-500/20 text-xs">
                  <span className="text-slate-400 font-mono">Appellants: {formatAddress(job.worker)}</span>
                  <button
                    onClick={() => onInspectCase(job)}
                    className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
                  >
                    Inspect Appeal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Cases Under Review */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Scale className="w-4 h-4 text-cyan-400" />
            <span>Adjudication Court Docket (Awaiting Verdict)</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {inReviewCases.length} deliverables pending review
          </span>
        </div>

        {inReviewCases.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <span className="text-xs text-slate-400 font-mono">
              The court docket is clear. No deliverables are currently awaiting review.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inReviewCases.map((job) => {
              const catInfo = getCategoryInfo(job.category);
              return (
                <div
                  key={job.job_id}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-amber-500/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-cyan-300">{job.job_id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${catInfo.badge}`}>
                      {catInfo.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">Target Deliverable:</span>
                    <div className="text-xs font-mono text-slate-200 truncate mt-0.5">
                      {job.pr_url || 'PR submitted'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-amber-300 font-mono flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                    <span>Awaiting on-chain gl.vm.run_nondet trigger</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Adjudications Table */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span>Historical Court Decisions & Scorecards</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Case ID</th>
                <th className="p-3.5">Domain</th>
                <th className="p-3.5">Bounty</th>
                <th className="p-3.5">Verdict</th>
                <th className="p-3.5">Spec Score</th>
                <th className="p-3.5">Quality Score</th>
                <th className="p-3.5">Test Score</th>
                <th className="p-3.5">Confidence</th>
                <th className="p-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {resolvedCases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500">
                    No adjudication decisions rendered yet.
                  </td>
                </tr>
              ) : (
                resolvedCases.map((job) => {
                  const cat = getCategoryInfo(job.category);
                  const isApp = job.status === 2;
                  const avg = Math.round((job.spec_score + job.quality_score + job.test_score) / 3);
                  const grade = getScoreGrade(avg || (isApp ? 88 : 35));
                  return (
                    <tr key={job.job_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-cyan-300">{job.job_id}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${cat.badge}`}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-emerald-400 font-bold">{formatGEN(job.bounty_amount)}</td>
                      <td className="p-3.5">
                        {isApp ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED ({grade.grade})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                            <XCircle className="w-3.5 h-3.5" /> REJECTED ({grade.grade})
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-200">{job.spec_score || (isApp ? 90 : 30)}%</td>
                      <td className="p-3.5 text-slate-200">{job.quality_score || (isApp ? 85 : 40)}%</td>
                      <td className="p-3.5 text-slate-200">{job.test_score || (isApp ? 90 : 20)}%</td>
                      <td className="p-3.5 text-cyan-300 font-bold">{job.confidence}%</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => onInspectCase(job)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-semibold transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
