export interface Job {
  job_id: string;
  creator: string;
  worker: string;
  bounty_amount: string;
  appeal_bond: string;
  category: string; // "SMART_CONTRACT", "SECURITY_AUDIT", "FULL_STACK", "DOCS_DEV"
  repo_url: string;
  sla_spec: string;
  pr_url: string;
  status: number; // 0: OPEN, 1: IN_REVIEW, 2: RESOLVED_SUCCESS, 3: RESOLVED_REJECTED, 4: CANCELLED, 5: IN_APPEAL
  verdict: string; // "PENDING", "APPROVED", "REJECTED", "CANCELLED", "IN_APPEAL"
  reason: string;
  confidence: number;
  spec_score: number;
  quality_score: number;
  test_score: number;
  appeal_count: number;
  created_at_block: string;
}

export function formatAddress(address: string): string {
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return 'Unassigned';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatGEN(weiAmount: string | bigint | number): string {
  try {
    const val = typeof weiAmount === 'bigint' ? weiAmount : BigInt(weiAmount || '0');
    const divisor = BigInt('1000000000000000000'); // 1e18
    const integerPart = val / divisor;
    const remainder = val % divisor;
    
    // Format up to 4 decimal places
    const fractionalPart = remainder.toString().padStart(18, '0').slice(0, 4);
    const cleanedFraction = fractionalPart.replace(/0+$/, '');
    
    return cleanedFraction ? `${integerPart}.${cleanedFraction} GEN` : `${integerPart} GEN`;
  } catch {
    return '0 GEN';
  }
}

export function toWeiGEN(genAmount: string | number): bigint {
  const parts = String(genAmount).trim().split('.');
  const whole = BigInt(parts[0] || '0') * BigInt('1000000000000000000');
  if (parts.length > 1) {
    const decimals = parts[1].padEnd(18, '0').slice(0, 18);
    return whole + BigInt(decimals);
  }
  return whole;
}

export function getStatusInfo(status: number) {
  switch (status) {
    case 0:
      return {
        label: 'OPEN',
        color: 'text-cyan-400',
        bg: 'bg-cyan-950/60',
        border: 'border-cyan-500/30',
        badge: 'border-cyan-500/40 text-cyan-300 bg-cyan-900/40',
        dot: 'bg-cyan-400 animate-pulse',
      };
    case 1:
      return {
        label: 'IN REVIEW',
        color: 'text-amber-400',
        bg: 'bg-amber-950/60',
        border: 'border-amber-500/30',
        badge: 'border-amber-500/40 text-amber-300 bg-amber-900/40',
        dot: 'bg-amber-400 animate-ping',
      };
    case 2:
      return {
        label: 'RESOLVED (APPROVED)',
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/60',
        border: 'border-emerald-500/30',
        badge: 'border-emerald-500/40 text-emerald-300 bg-emerald-900/40',
        dot: 'bg-emerald-400',
      };
    case 3:
      return {
        label: 'RESOLVED (REJECTED)',
        color: 'text-rose-400',
        bg: 'bg-rose-950/60',
        border: 'border-rose-500/30',
        badge: 'border-rose-500/40 text-rose-300 bg-rose-900/40',
        dot: 'bg-rose-400',
      };
    case 4:
      return {
        label: 'CANCELLED',
        color: 'text-slate-400',
        bg: 'bg-slate-900/60',
        border: 'border-slate-700',
        badge: 'border-slate-600 text-slate-400 bg-slate-800/40',
        dot: 'bg-slate-500',
      };
    case 5:
      return {
        label: 'IN APPEAL',
        color: 'text-purple-400',
        bg: 'bg-purple-950/60',
        border: 'border-purple-500/40',
        badge: 'border-purple-500/50 text-purple-300 bg-purple-900/40',
        dot: 'bg-purple-400 animate-bounce',
      };
    default:
      return {
        label: 'UNKNOWN',
        color: 'text-slate-400',
        bg: 'bg-slate-900/60',
        border: 'border-slate-700',
        badge: 'border-slate-600 text-slate-400 bg-slate-800/40',
        dot: 'bg-slate-500',
      };
  }
}

export function getCategoryInfo(category?: string) {
  switch (category) {
    case 'SECURITY_AUDIT':
      return {
        label: 'Security Audit',
        badge: 'border-rose-500/30 bg-rose-950/40 text-rose-300',
        dot: 'bg-rose-400',
      };
    case 'FULL_STACK':
      return {
        label: 'Full-Stack',
        badge: 'border-blue-500/30 bg-blue-950/40 text-blue-300',
        dot: 'bg-blue-400',
      };
    case 'DOCS_DEV':
      return {
        label: 'Docs & SDK',
        badge: 'border-teal-500/30 bg-teal-950/40 text-teal-300',
        dot: 'bg-teal-400',
      };
    case 'SMART_CONTRACT':
    default:
      return {
        label: 'Smart Contract',
        badge: 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300',
        dot: 'bg-cyan-400',
      };
  }
}

export function getScoreGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: 'A+', color: 'text-emerald-400' };
  if (score >= 80) return { grade: 'A', color: 'text-emerald-300' };
  if (score >= 70) return { grade: 'B', color: 'text-teal-300' };
  if (score >= 60) return { grade: 'C', color: 'text-amber-400' };
  if (score >= 50) return { grade: 'D', color: 'text-orange-400' };
  return { grade: 'F', color: 'text-rose-400' };
}

export function getExplorerUrl(hash: string, type: 'tx' | 'address' = 'tx'): string {
  const base = 'https://genlayer-explorer.vercel.app';
  return `${base}/${type}/${hash}`;
}

export const SAMPLE_JOBS: Job[] = [
  {
    job_id: 'job_genlayer_001',
    creator: '0x1A2b3C4d5E6F708192a3B4c5D6e7F8091a2B3c4D',
    worker: '0x8F9e0D1c2B3a405162738495a6B7c8D9e0F1a2B3',
    bounty_amount: '15000000000000000000', // 15 GEN
    appeal_bond: '0',
    category: 'SMART_CONTRACT',
    repo_url: 'https://github.com/genlayer/genlayer-contracts',
    sla_spec: 'Implement reentrancy protection on all payment methods, achieve 100% test coverage with pytest-genlayer, and strictly adhere to GenLayer rules R1-R24.',
    pr_url: 'https://github.com/genlayer/genlayer-contracts/pull/42',
    status: 2, // RESOLVED_SUCCESS
    verdict: 'APPROVED',
    reason: 'PR #42 successfully implements comprehensive reentrancy guards and follows GenLayer deterministic consensus principles. All 14 test cases pass with 98% branch coverage.',
    confidence: 96,
    spec_score: 95,
    quality_score: 94,
    test_score: 98,
    appeal_count: 0,
    created_at_block: '142050',
  },
  {
    job_id: 'job_genlayer_002',
    creator: '0x3D4e5F60718293a4B5c6D7e8F901a2B3c4D5e6F7',
    worker: '0x5C6d7E8f901234567890abcdef1234567890abcd',
    bounty_amount: '25000000000000000000', // 25 GEN
    appeal_bond: '0',
    category: 'SECURITY_AUDIT',
    repo_url: 'https://github.com/agent-tank/autonomous-vault',
    sla_spec: 'Formal audit of ERC-4337 UserOperation validation logic and non-deterministic oracle sanitization routines.',
    pr_url: 'https://github.com/agent-tank/autonomous-vault/pull/18',
    status: 1, // IN_REVIEW
    verdict: 'PENDING',
    reason: 'Awaiting AI validator consensus evaluation on GitHub deliverable.',
    confidence: 0,
    spec_score: 0,
    quality_score: 0,
    test_score: 0,
    appeal_count: 0,
    created_at_block: '142380',
  },
  {
    job_id: 'job_genlayer_003',
    creator: '0x7B8c9D0e1F2a34567890bcdef1234567890abcde',
    worker: '0x2E3f4A5b6C7d8E9f0123456789abcdef01234567',
    bounty_amount: '12000000000000000000', // 12 GEN
    appeal_bond: '3000000000000000000', // 3 GEN
    category: 'FULL_STACK',
    repo_url: 'https://github.com/agentsla/web3-dashboard',
    sla_spec: 'Build full TypeScript SDK integration with studionet RPC, supporting automatic network switching and optimistic response simulation.',
    pr_url: 'https://github.com/agentsla/web3-dashboard/pull/7',
    status: 5, // IN_APPEAL
    verdict: 'APPEALED',
    reason: 'Initial juror consensus gave 65% quality score due to missing fallback RPC handlers. Sub-agent has staked 3 GEN appeal bond contending fallback logic is handled natively in genlayer-js.',
    confidence: 78,
    spec_score: 82,
    quality_score: 65,
    test_score: 88,
    appeal_count: 1,
    created_at_block: '141890',
  },
  {
    job_id: 'job_genlayer_004',
    creator: '0x9F0a1B2c3D4e5F60718293a4B5c6D7e8F901a2B3',
    worker: '0x0000000000000000000000000000000000000000',
    bounty_amount: '8000000000000000000', // 8 GEN
    appeal_bond: '0',
    category: 'DOCS_DEV',
    repo_url: 'https://github.com/genlayer/docs-tutorials',
    sla_spec: 'Author comprehensive tutorial explaining GenLayer Optimistic Democracy consensus mechanism for multi-agent autonomous organizations.',
    pr_url: '',
    status: 0, // OPEN
    verdict: 'PENDING',
    reason: 'Open for any autonomous sub-agent to claim and submit PR deliverable.',
    confidence: 0,
    spec_score: 0,
    quality_score: 0,
    test_score: 0,
    appeal_count: 0,
    created_at_block: '142510',
  },
];

