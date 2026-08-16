/**
 * Lead scoring algorithm — computes a 0-100 score based on:
 * - Value (higher = better, capped at 30 pts)
 * - Probability (direct mapping, 0-30 pts)
 * - Stage progression (NEW=0, CONTACTED=5, QUALIFIED=10, PROPOSAL=15, NEGOTIATION=20, WON=25, LOST=0)
 * - Recency (leads created in last 7 days get bonus, up to 15 pts)
 * - Source quality (REFERRAL=10, WEBSITE=5, EVENT=8, ADS=3, COLD_CALL=2, OTHER=0)
 *
 * Total max = 30 + 30 + 25 + 15 + 10 = 110, normalized to 0-100
 */

const STAGE_POINTS: Record<string, number> = {
  NEW: 0,
  CONTACTED: 5,
  QUALIFIED: 10,
  PROPOSAL: 15,
  NEGOTIATION: 20,
  WON: 25,
  LOST: 0,
}

const SOURCE_POINTS: Record<string, number> = {
  REFERRAL: 10,
  EVENT: 8,
  WEBSITE: 5,
  ADS: 3,
  COLD_CALL: 2,
  OTHER: 0,
}

export interface LeadScore {
  total: number       // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  breakdown: {
    value: number
    probability: number
    stage: number
    recency: number
    source: number
  }
  label: string       // "Hot", "Warm", "Cool", "Cold"
  color: string       // tailwind classes for badge
}

export function computeLeadScore(lead: {
  value?: number | null
  probability?: number | null
  stage?: string
  source?: string
  createdAt?: Date | string
  status?: string
}): LeadScore {
  if (lead.status === 'LOST' || lead.stage === 'LOST') {
    return {
      total: 0,
      grade: 'F',
      breakdown: { value: 0, probability: 0, stage: 0, recency: 0, source: 0 },
      label: 'Lost',
      color: 'bg-rose-100 text-rose-700 border-rose-200',
    }
  }

  // Value score (cap at 30 pts, $50k+ = max)
  const value = lead.value ?? 0
  const valueScore = Math.min(30, (value / 50000) * 30)

  // Probability score (direct, 0-30)
  const probabilityScore = Math.min(30, lead.probability ?? 0 * 0.3)

  // Stage score (0-25)
  const stageScore = STAGE_POINTS[lead.stage ?? 'NEW'] ?? 0

  // Recency score (0-15): created in last 7 days = 15, last 30 = 10, last 90 = 5, else 0
  const created = lead.createdAt ? new Date(lead.createdAt) : null
  let recencyScore = 0
  if (created) {
    const daysSince = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince <= 7) recencyScore = 15
    else if (daysSince <= 30) recencyScore = 10
    else if (daysSince <= 90) recencyScore = 5
  }

  // Source score (0-10)
  const sourceScore = SOURCE_POINTS[lead.source ?? 'OTHER'] ?? 0

  const rawTotal = valueScore + probabilityScore + stageScore + recencyScore + sourceScore
  const total = Math.min(100, Math.round((rawTotal / 110) * 100))

  let grade: LeadScore['grade'] = 'F'
  let label = 'Cold'
  let color = 'bg-slate-100 text-slate-700 border-slate-200'

  if (total >= 80) { grade = 'A'; label = 'Hot'; color = 'bg-rose-100 text-rose-700 border-rose-200' }
  else if (total >= 60) { grade = 'B'; label = 'Warm'; color = 'bg-amber-100 text-amber-700 border-amber-200' }
  else if (total >= 40) { grade = 'C'; label = 'Cool'; color = 'bg-sky-100 text-sky-700 border-sky-200' }
  else if (total >= 20) { grade = 'D'; label = 'Cold'; color = 'bg-slate-100 text-slate-700 border-slate-200' }

  return {
    total,
    grade,
    label,
    color,
    breakdown: {
      value: Math.round(valueScore),
      probability: Math.round(probabilityScore),
      stage: stageScore,
      recency: recencyScore,
      source: sourceScore,
    },
  }
}
