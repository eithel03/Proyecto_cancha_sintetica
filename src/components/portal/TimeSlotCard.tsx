'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { formatTime12h } from '@/lib/utils'

interface TimeSlotCardProps {
  time: string
  price?: number
  isSelected?: boolean
  isOccupied?: boolean
  isChallenge?: boolean
  isTournament?: boolean
  tournamentGender?: 'masculino' | 'femenino'
  challengeType?: string
  hasSpecialPrice?: boolean
  disabled?: boolean
  onClick?: () => void
}

export function TimeSlotCard({
  time,
  price,
  isSelected = false,
  isOccupied = false,
  isChallenge = false,
  isTournament = false,
  tournamentGender = 'masculino',
  challengeType,
  hasSpecialPrice = false,
  disabled = false,
  onClick,
}: TimeSlotCardProps) {
  const timeLabel = formatTime12h(time)

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-16 w-full transition-all duration-150 flex flex-col items-center justify-center gap-0.5 leading-none relative rounded-xl border",
        isSelected
          ? "border-navy bg-navy text-white ring-2 ring-gold/50 shadow-md shadow-navy/20"
          : isOccupied && !isChallenge
            ? "border-border bg-surface text-muted-foreground cursor-not-allowed opacity-75"
            : "border-border bg-card hover:border-gold/60 hover:bg-gold/8 hover:-translate-y-0.5 hover:shadow-sm hover:shadow-gold/10",
        isChallenge && !isSelected && "border-green-400 bg-green-50 text-green-700 border-dashed animate-pulse"
      )}
      disabled={disabled || (isOccupied && !isChallenge)}
      onClick={onClick}
    >
      <span className={cn(
        "text-sm font-bold flex items-center gap-1",
        isSelected ? "text-white" : isChallenge ? "text-green-700" : isOccupied ? "text-slate-400" : "text-foreground"
      )}>
        {isSelected && <Check className="size-3.5 text-gold" aria-hidden="true" />}
        {timeLabel}
      </span>
      {!isOccupied && price !== undefined && (
        <span className={cn("text-[11px] font-semibold", isSelected ? "text-gold" : "text-muted-foreground")}>
          ₡{price.toLocaleString('es-CR')}
        </span>
      )}
      <div className="flex gap-1 flex-wrap justify-center">
        {isChallenge && <span className="text-[8px] font-semibold uppercase bg-green-600 text-white px-1.5 rounded">Reto disp.</span>}
        {challengeType === 'accepted_challenge' && <span className="text-[8px] font-semibold uppercase bg-amber-200 text-amber-900 px-1.5 rounded">Por confirmar</span>}
        {challengeType === 'confirmed_challenge' && <span className="text-[8px] font-semibold uppercase bg-amber-500 text-white px-1.5 rounded">Reto</span>}
        {isTournament && (
          <span className={cn(
            "text-[8px] font-semibold uppercase px-1.5 rounded text-white",
            tournamentGender === 'masculino' ? "bg-blue-600" : "bg-pink-500"
          )}>
            T. {tournamentGender === 'masculino' ? 'MAS' : 'FEM'}
          </span>
        )}
        {isOccupied && !isChallenge && <span className="text-[8px] font-semibold uppercase bg-slate-400 text-white px-1.5 rounded">Ocupado</span>}
        {hasSpecialPrice && !isOccupied && <span className="text-[8px] font-semibold uppercase bg-amber-500 text-white px-1.5 rounded">Promo</span>}
      </div>
    </Button>
  )
}
