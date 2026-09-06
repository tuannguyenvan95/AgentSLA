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


