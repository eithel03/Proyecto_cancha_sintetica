'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Clock, MapPin } from 'lucide-react'
import { formatTime12h } from '@/lib/utils'

interface MatchRowProps {
  match: {
    id: string
    home?: { name: string; logo_url?: string | null }
    away?: { name: string; logo_url?: string | null }
    home_score?: number
    away_score?: number
    match_time?: string
    match_date?: string
    status?: string
    current_minute?: number
    court?: { name: string }
  }
  isToday?: boolean
  onClick?: () => void
}

function TeamLogo({ logoUrl, name, size = 'md' }: { logoUrl?: string | null; name: string; size?: 'sm' | 'md' }) {
  const [imageError, setImageError] = useState(false)
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 sm:w-12 sm:h-12 text-sm'

  if (logoUrl && !imageError) {
    return (
      <div className={cn(sizeClasses, 'rounded-full bg-white p-1 border border-slate-100 flex-shrink-0 shadow-sm')}>
        {/* Plain img keeps the onError fallback independent of remote image config. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          className="w-full h-full object-contain"
          alt={name}
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  return (
    <div className={cn(sizeClasses, 'rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 font-bold text-primary')}>
      {initials}
    </div>
  )
}

export function MatchRow({ match, isToday = false, onClick }: MatchRowProps) {
  const isFinished = match.status === 'finished'
  const isLive = match.status === 'live' || match.status === 'halftime'
  const hasResult = isFinished || isLive
  const homeName = match.home?.name || 'Equipo local'
  const awayName = match.away?.name || 'Equipo visitante'

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative px-4 sm:px-5 py-3.5 sm:py-4 transition-colors cursor-pointer",
        isToday
          ? "m-2 rounded-xl border border-[#86D9B7] bg-[#F0FBF6] hover:bg-[#E7F9F2] shadow-[0_6px_18px_rgba(22,101,52,0.06)]"
          : "hover:bg-[#FBF9F3]",
        !isToday && "border-b border-border/60 last:border-b-0"
      )}
    >
      {/* Today badge */}
      {isToday && (
        <div className="mb-2.5">
          <span className="inline-flex items-center rounded-full bg-[#FFF4D6] border border-[#EAD9A8] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B7791F]">
            Partido de hoy
          </span>
        </div>
      )}

      {/* Desktop layout */}
      <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_minmax(130px,0.9fr)_minmax(0,1fr)_minmax(100px,0.75fr)] items-center gap-4">
        {/* Home team */}
        <div className="flex items-center gap-3 min-w-0 justify-start">
          <TeamLogo logoUrl={match.home?.logo_url} name={homeName} />
          <span className="font-semibold text-sm text-foreground truncate">{homeName}</span>
        </div>

        {/* Score / VS */}
        <div className="flex items-center justify-center">
          {hasResult ? (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-base tabular-nums",
              isToday
                ? "bg-white border-green-300 text-foreground shadow-sm"
                : "bg-white border-slate-200 text-foreground"
            )}>
              <span>{match.home_score}</span>
              <span className="text-slate-300 text-sm font-semibold">-</span>
              <span>{match.away_score}</span>
            </div>
          ) : (
            <div className="flex items-center px-4 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-sm font-bold text-slate-400 tracking-wide">VS</span>
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-3 min-w-0 justify-end">
          <span className="font-semibold text-sm text-foreground truncate text-right">{awayName}</span>
          <TeamLogo logoUrl={match.away?.logo_url} name={awayName} />
        </div>

        {/* Time & Court */}
        <div className="flex flex-col items-end gap-0.5 min-w-[90px]">
          {isLive && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-red-500 mb-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              {match.current_minute || 0}&apos;
            </span>
          )}
          {isFinished && (
            <span className="text-[10px] font-medium text-slate-400 mb-0.5">Finalizado</span>
          )}
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {match.match_time ? formatTime12h(match.match_time) : ''}
          </span>
          {match.court?.name && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <MapPin className="w-3 h-3" />
              {match.court.name}
            </span>
          )}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden space-y-3">
        {/* Teams row */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm text-foreground truncate max-w-full">{homeName}</span>
            <TeamLogo logoUrl={match.home?.logo_url} name={homeName} size="sm" />
          </div>

          {hasResult ? (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-base tabular-nums flex-shrink-0",
              isToday
                ? "bg-white border-green-300 text-foreground shadow-sm"
                : "bg-white border-slate-200 text-foreground"
            )}>
              <span>{match.home_score}</span>
              <span className="text-slate-300 text-sm">-</span>
              <span>{match.away_score}</span>
            </div>
          ) : (
            <div className="flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 flex-shrink-0">
              <span className="text-xs font-bold text-slate-400">VS</span>
            </div>
          )}

          <div className="flex flex-col items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm text-foreground truncate max-w-full text-center">{awayName}</span>
            <TeamLogo logoUrl={match.away?.logo_url} name={awayName} size="sm" />
          </div>
        </div>

        {/* Time & Court row */}
        <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
          {isLive && (
            <span className="inline-flex items-center gap-1 font-bold text-red-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              EN VIVO {match.current_minute || 0}&apos;
            </span>
          )}
          {isFinished && (
            <span className="font-medium text-slate-400">Finalizado</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {match.match_time ? formatTime12h(match.match_time) : ''}
          </span>
          {match.court?.name && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {match.court.name}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
