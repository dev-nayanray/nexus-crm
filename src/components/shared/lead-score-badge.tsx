'use client'

import { computeLeadScore } from '@/lib/lead-scoring'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Flame, Sun, Cloud, Snowflake } from 'lucide-react'

interface LeadScoreBadgeProps {
  lead: {
    value?: number | null
    probability?: number | null
    stage?: string
    source?: string
    createdAt?: Date | string
    status?: string
  }
  showBreakdown?: boolean
  size?: 'sm' | 'md'
}

const LABEL_ICONS = {
  Hot: Flame,
  Warm: Sun,
  Cool: Cloud,
  Cold: Snowflake,
  Lost: Snowflake,
}

export function LeadScoreBadge({ lead, showBreakdown = false, size = 'sm' }: LeadScoreBadgeProps) {
  const score = computeLeadScore(lead)
  const Icon = LABEL_ICONS[score.label as keyof typeof LABEL_ICONS] ?? Snowflake

  if (!showBreakdown) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${score.color} cursor-help`}>
              <Icon className="h-2.5 w-2.5" />
              {score.total}
              <span className="hidden sm:inline">· {score.label}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="space-y-0.5">
              <p className="font-semibold">Lead Score: {score.total}/100 (Grade {score.grade})</p>
              <p className="text-muted-foreground">Value: {score.breakdown.value} pts</p>
              <p className="text-muted-foreground">Probability: {score.breakdown.probability} pts</p>
              <p className="text-muted-foreground">Stage: {score.breakdown.stage} pts</p>
              <p className="text-muted-foreground">Recency: {score.breakdown.recency} pts</p>
              <p className="text-muted-foreground">Source: {score.breakdown.source} pts</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${score.color}`}>
      <Icon className="h-3 w-3" />
      <span>{score.total}/100</span>
      <span className="opacity-70">· {score.label} (Grade {score.grade})</span>
    </div>
  )
}
