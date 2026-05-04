'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Swords, CheckCircle2, AlertTriangle, User, Phone, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { confirmChallenge, cancelChallenge } from '@/app/[slug]/retos/actions'
import { createClient } from '@/lib/supabase/client'

export default function AdminChallengesClient({ initialChallenges }: { initialChallenges: any[] }) {
  const [challenges, setChallenges] = useState(initialChallenges)
  const [pending, setPending] = useState(false)

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('admin-challenges-v2')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'challenges' },
        (payload) => {
          toast.success(`¡Nuevo reto publicado! "${payload.new.notes || ''}"`)
          // Recargar para traer los joins (creator profile, etc)
          setTimeout(() => window.location.reload(), 1500)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'challenges' },
        (payload) => {
          if (payload.new.status === 'accepted' && payload.old.status === 'open') {
            toast.info('¡Un reto ha sido aceptado por un oponente!')
            setTimeout(() => window.location.reload(), 1500)
          }
          setChallenges(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function handleConfirm(challengeId: string) {
    if (!confirm('¿Deseas confirmar este reto? Se creará una reserva automática y se notificará a los jugadores.')) return
    
    setPending(true)
    const result = await confirmChallenge(challengeId)
    setPending(false)

    if (result.error) {
      toast.error(result.error, { duration: 5000 })
    } else {
      toast.success('Reto confirmado con éxito.')
      setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, status: 'confirmed' } : c))
    }
  }

  async function handleCancel(challengeId: string) {
    if (!confirm('¿Seguro que deseas cancelar este reto?')) return
    
    setPending(true)
    const result = await cancelChallenge(challengeId)
    setPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Reto cancelado.')
      setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, status: 'cancelled' } : c))
    }
  }

  const acceptedChallenges = challenges.filter(c => c.status === 'accepted')
  const openChallenges = challenges.filter(c => c.status === 'open')
  const historyChallenges = challenges.filter(c => c.status === 'confirmed' || c.status === 'cancelled')

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black tracking-tight uppercase italic text-emerald-500">Gestión de Matchmaking</h2>
        <p className="text-muted-foreground">Supervisa el muro de retos y confirma los encuentros entre equipos.</p>
      </div>

      {/* Retos por Confirmar (Acción Requerida) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold tracking-tight uppercase italic">Pendientes de Confirmación</h3>
        </div>

        {acceptedChallenges.length === 0 ? (
          <Card className="border-dashed bg-zinc-900/10 border-zinc-800">
            <CardContent className="p-12 text-center text-zinc-500 font-medium italic">
              No hay retos aceptados esperando tu confirmación.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {acceptedChallenges.map((reto) => (
              <Card key={reto.id} className="overflow-hidden border-zinc-800 bg-zinc-900/40 relative group">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                <CardContent className="p-8">
                  <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-center">
                    <div className="space-y-8">
                      <div className="flex flex-wrap items-center gap-6">
                        <Badge className="bg-amber-500 text-black font-black px-4 py-1">ACCIÓN REQUERIDA</Badge>
                        <div className="flex items-center gap-4 text-sm font-bold text-zinc-300">
                          <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-500" /> {reto.challenge_date}</span>
                          <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-500" /> {reto.challenge_time.substring(0, 5)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-12 items-center justify-between max-w-2xl">
                        <div className="text-center sm:text-left space-y-1">
                          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Retador</p>
                          <p className="font-black text-2xl italic tracking-tighter uppercase">{reto.creator?.full_name || reto.customer_name}</p>
                          <p className="text-xs text-emerald-500 font-black flex items-center gap-1 justify-center sm:justify-start">
                            <Phone className="w-3 h-3" /> {reto.creator?.phone || reto.customer_phone}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-2">
                          <Swords className="w-8 h-8 text-zinc-700 rotate-45" />
                          <div className="h-px w-20 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                        </div>

                        <div className="text-center sm:text-left space-y-1">
                          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Oponente</p>
                          <p className="font-black text-2xl italic tracking-tighter uppercase">{reto.opponent?.full_name}</p>
                          <p className="text-xs text-emerald-500 font-black flex items-center gap-1 justify-center sm:justify-start">
                            <Phone className="w-3 h-3" /> {reto.opponent?.phone}
                          </p>
                        </div>
                      </div>

                      {reto.notes && (
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 italic text-zinc-400 text-sm max-w-3xl flex gap-3">
                          <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0 text-zinc-600" />
                          "{reto.notes}"
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                      <Button onClick={() => handleConfirm(reto.id)} disabled={pending} className="bg-emerald-600 hover:bg-emerald-700 font-black py-6 text-lg shadow-xl shadow-emerald-900/20">
                        <CheckCircle2 className="w-5 h-5 mr-2" /> Confirmar Partido
                      </Button>
                      <Button onClick={() => handleCancel(reto.id)} disabled={pending} variant="ghost" className="text-red-400 hover:text-red-500 hover:bg-red-500/10 font-bold uppercase tracking-widest text-[10px]">
                        Cancelar Desafío
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Retos Abiertos (Informativo) */}
      <section className="space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Swords className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold tracking-tight uppercase italic text-zinc-300">En Búsqueda de Rival (Muro)</h3>
        </div>
        
        {openChallenges.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No hay retos abiertos publicados.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {openChallenges.map((reto) => (
              <Card key={reto.id} className="bg-zinc-900/20 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-6 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div>
                        <p className="font-black italic uppercase tracking-tight">{reto.creator?.full_name || reto.customer_name}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          {reto.challenge_date} @ {reto.challenge_time.substring(0, 5)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-black border-emerald-500/30 text-emerald-500 px-2">ABIERTO</Badge>
                  </div>
                  
                  {reto.notes && (
                    <p className="text-sm italic text-zinc-400 bg-black/30 p-3 rounded-xl border border-white/5">
                      "{reto.notes}"
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={() => handleConfirm(reto.id)} 
                      disabled={pending}
                      size="sm"
                      className="flex-1 bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-400 border border-zinc-700 font-black text-[10px] tracking-widest uppercase h-10"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-2" /> Confirmar Directo
                    </Button>
                    <Button 
                      onClick={() => handleCancel(reto.id)} 
                      disabled={pending}
                      size="sm"
                      variant="ghost"
                      className="text-zinc-600 hover:text-red-500 font-black text-[10px] tracking-widest uppercase h-10"
                    >
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Historial */}
      <section className="space-y-6 pt-10 opacity-60">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 border-b border-zinc-800 pb-4">Historial de Matchmaking</h3>
        <div className="space-y-3">
          {historyChallenges.slice(0, 8).map((reto) => (
            <div key={reto.id} className="flex justify-between items-center p-4 rounded-xl border border-zinc-800 bg-zinc-900/10 text-xs hover:bg-zinc-900/20 transition-colors">
              <div className="flex items-center gap-4">
                <Badge variant={reto.status === 'confirmed' ? 'default' : 'destructive'} className="text-[8px] font-black uppercase px-2">
                  {reto.status}
                </Badge>
                <span className="font-bold text-zinc-300 italic uppercase tracking-tighter">
                  {reto.creator?.full_name} <span className="text-zinc-600 mx-2">VS</span> {reto.opponent?.full_name || '---'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-zinc-500 font-bold uppercase tracking-widest text-[9px]">
                <span>{reto.challenge_date}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
