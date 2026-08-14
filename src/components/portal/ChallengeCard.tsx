'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Swords, MapPin, Clock, User, Users, CheckCircle2, XCircle } from 'lucide-react'
import { formatTime12h } from '@/lib/utils'

interface ChallengeCardProps {
  challenge: {
    id: string
    customer_name?: string
    courts?: { name: string }
    challenge_time?: string
    challenge_date?: string
    notes?: string
    status?: string
    gender?: string
    men_count?: number
    women_count?: number
    creator_id?: string
  }
  isCreator?: boolean
  onAccept?: () => void
  onCancel?: () => void
  pending?: boolean
}

function getInitials(name?: string) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function ChallengeCard({ challenge, isCreator = false, onAccept, onCancel, pending = false }: ChallengeCardProps) {
  const status = challenge.status || 'open'

  return (
    <Card className="overflow-hidden border-border bg-card shadow-soft transition-all duration-200 hover:border-green-300 hover:shadow-card-hover hover:-translate-y-0.5 rounded-2xl">
      <CardContent className="p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                {getInitials(challenge.customer_name)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold tracking-tight text-foreground truncate max-w-[160px] sm:max-w-none">
                  {challenge.customer_name}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> {challenge.courts?.name}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block" />
                  <span className="flex items-center gap-1">
                    {challenge.gender === 'mixto' ? (
                      <><Users className="w-3.5 h-3.5 text-primary" /> {challenge.men_count}H / {challenge.women_count}M</>
                    ) : (
                      <><User className="w-3.5 h-3.5 text-primary" /> <span className="capitalize">{challenge.gender}</span></>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
              <div className="flex flex-col items-center sm:items-end leading-none">
                <span className="text-lg font-bold text-foreground">
                  {challenge.challenge_time ? formatTime12h(challenge.challenge_time).split(' ')[0] : ''}
                </span>
                <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                  {challenge.challenge_time ? formatTime12h(challenge.challenge_time).split(' ').slice(1).join(' ') : ''}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium sm:mt-2">
                {challenge.challenge_date}
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-4 sm:p-5 border border-border text-foreground relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <Swords className="w-20 h-20" />
            </div>
            <p className="relative z-10 leading-relaxed font-medium text-sm">
              &ldquo;{challenge.notes || '¡Estamos buscando rival para jugar!'}&rdquo;
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {status === 'open' && (
              <div className="flex gap-3 w-full">
                {isCreator ? (
                  <Button
                    onClick={onCancel}
                    disabled={pending}
                    variant="ghost"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 font-medium text-sm h-11 rounded-xl"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Cancelar reto
                  </Button>
                ) : (
                  <Button
                    onClick={onAccept}
                    disabled={pending}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-11 rounded-xl transition-colors"
                  >
                    <Swords className="w-4 h-4 mr-2" /> Aceptar desafío
                  </Button>
                )}
              </div>
            )}

            {status === 'accepted' && (
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                <div className="bg-amber-50 border border-amber-200 text-amber-700 font-semibold px-5 py-3 rounded-xl text-xs w-full sm:flex-1 text-center">
                  Reto aceptado
                </div>
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5" /> Pendiente de validación
                </div>
              </div>
            )}

            {status === 'confirmed' && (
              <div className="flex items-center gap-3 w-full bg-green-50 border border-green-200 p-2.5 rounded-xl">
                <div className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-2 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" /> Listo
                </div>
                <span className="text-xs font-semibold text-green-700 ml-auto pr-2">¡Escenario listo!</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
