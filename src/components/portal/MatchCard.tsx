'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, MapPin, Clock } from 'lucide-react'
import { formatTime12h } from '@/lib/utils'

interface MatchCardProps {
  match: {
    id: string
    home?: { name: string; logo_url?: string | null }
    away?: { name: string; logo_url?: string | null }
    home_team_id?: string
    away_team_id?: string
    home_score?: number
    away_score?: number
    match_time?: string
    match_date?: string
    status?: string
    current_minute?: number
    court?: { name: string }
    gender?: string
  }
  isLive?: boolean
  isHighlighted?: boolean
  onClick?: () => void
}

export function MatchCard({ match, isLive = false, isHighlighted = false, onClick }: MatchCardProps) {
  const isFinished = match.status === 'finished'

  return (
    <Card
      className={cn(
        "overflow-hidden border-border bg-card cursor-pointer transition-all duration-200 rounded-2xl group shadow-soft",
        "hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-card-hover",
        isHighlighted && "ring-2 ring-primary/20 border-primary/30",
        isLive && "border-red-200"
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {isLive && (
          <div className="bg-red-50 px-5 py-2.5 flex justify-between items-center border-b border-red-100">
            <span className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> {match.court?.name}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-red-200 px-2.5 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-red-600">
                {match.status === 'live' ? `En vivo · ${match.current_minute || 0}'` : 'Entretiempo'}
              </span>
            </span>
          </div>
        )}

        {isHighlighted && !isLive && (
          <div className="bg-primary/5 px-5 py-2 flex items-center justify-center border-b border-primary/10">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Partido de hoy</span>
          </div>
        )}

        <div className="p-5 sm:p-6 flex items-center justify-between gap-3">
          <div className="text-center flex-1 space-y-2 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto bg-white rounded-xl p-2 shadow-sm border border-slate-100 group-hover:scale-105 transition-transform">
              {match.home?.logo_url ? (
                <img src={match.home.logo_url} className="w-full h-full object-contain" alt={match.home.name} />
              ) : (
                <Shield className="w-full h-full text-slate-300" />
              )}
            </div>
            <p className="font-semibold text-xs sm:text-sm text-foreground leading-tight truncate max-w-[100px] sm:max-w-[130px]">
              {match.home?.name}
            </p>
          </div>

          <div className="px-3 sm:px-5 flex flex-col items-center">
            {isFinished ? (
              <div className="flex items-baseline gap-2 sm:gap-3">
                <span className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-none">
                  {match.home_score}
                </span>
                <span className="text-lg sm:text-xl font-semibold text-slate-300">:</span>
                <span className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-none">
                  {match.away_score}
                </span>
              </div>
            ) : (
              <span className="text-lg sm:text-xl font-bold text-slate-400">VS</span>
            )}
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span className="font-medium">{match.match_time ? formatTime12h(match.match_time) : ''}</span>
            </div>
          </div>

          <div className="text-center flex-1 space-y-2 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto bg-white rounded-xl p-2 shadow-sm border border-slate-100 group-hover:scale-105 transition-transform">
              {match.away?.logo_url ? (
                <img src={match.away.logo_url} className="w-full h-full object-contain" alt={match.away.name} />
              ) : (
                <Shield className="w-full h-full text-slate-300" />
              )}
            </div>
            <p className="font-semibold text-xs sm:text-sm text-foreground leading-tight truncate max-w-[100px] sm:max-w-[130px]">
              {match.away?.name}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
