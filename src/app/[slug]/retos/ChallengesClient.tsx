'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Swords, Calendar, Clock, MapPin, AlertCircle, CheckCircle2, User, XCircle, Trophy, Zap, Users } from 'lucide-react'
import { createChallenge, acceptChallenge, cancelChallenge } from '@/app/[slug]/retos/actions'
import { toast } from 'sonner'
import { AuthPromptDialog } from '@/components/AuthPromptDialog'
import { useRouter } from 'next/navigation'

import { ConfirmationDialog } from '@/components/ConfirmationDialog'

export default function ChallengesClient({ 
  initialChallenges, 
  businessId,
  userId,
  courts,
  businessHours 
}: { 
  initialChallenges: any[], 
  businessId: string,
  userId?: string,
  courts: any[],
  businessHours: any[]
}) {
  const [challenges, setChallenges] = useState(initialChallenges)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [selectedCourt, setSelectedCourt] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [minDate, setMinDate] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  // Estado para Diálogo de Confirmación
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean,
    title: string,
    description: string,
    onConfirm: () => void,
    variant?: 'danger' | 'primary'
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  })

  const showConfirm = (title: string, description: string, onConfirm: () => void, variant: 'danger' | 'primary' = 'primary') => {
    setConfirmConfig({ isOpen: true, title, description, onConfirm, variant })
  }

  useEffect(() => {
    setIsMounted(true)
    const today = new Date().toLocaleDateString('sv-SE')
    setMinDate(today)
  }, [])

  // Generar opciones de tiempo (cada 30 min) basadas en el horario más amplio del negocio
  const TIME_OPTIONS = useMemo(() => {
    if (!businessHours || businessHours.length === 0) {
      // Fallback a un horario general si no hay configurados
      return Array.from({ length: 32 }, (_, i) => {
        const h = Math.floor(i / 2) + 7
        const m = i % 2 === 0 ? '00' : '30'
        return `${h.toString().padStart(2, '0')}:${m}`
      })
    }

    const openHours = businessHours.filter(h => !h.is_closed)
    if (openHours.length === 0) return []

    const minOpen = Math.min(...openHours.map(h => parseInt(h.open_time.split(':')[0])))
    const maxClose = Math.max(...openHours.map(h => parseInt(h.close_time.split(':')[0])))

    const options = []
    for (let h = minOpen; h <= maxClose - 1; h += 0.5) {
      const hours = Math.floor(h)
      const mins = h % 1 === 0 ? '00' : '30'
      options.push(`${hours.toString().padStart(2, '0')}:${mins}`)
    }
    return options
  }, [businessHours])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    
    if (!userId) {
      setIsAuthDialogOpen(true)
      return
    }

    if (!selectedCourt || selectedCourt === '') {
      toast.error('Por favor, selecciona una cancha.')
      return
    }

    if (!selectedTime) {
      toast.error('Por favor, selecciona una hora.')
      return
    }

    setPending(true)
    const formData = new FormData(e.currentTarget)
    formData.append('business_id', businessId)
    formData.append('court_id', selectedCourt)
    formData.append('time', selectedTime)

    const result = await createChallenge(formData)
    setPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Reto publicado correctamente.')
      setIsDialogOpen(false)
      setSelectedCourt('')
      setSelectedTime('')
      router.refresh()
    }
  }

  async function handleAccept(challengeId: string) {
    if (!userId) {
      setIsAuthDialogOpen(true)
      return
    }

    showConfirm(
      'Aceptar Reto',
      '¿Deseas aceptar este reto? El administrador deberá confirmar el partido después para que sea oficial.',
      async () => {
        setPending(true)
        const result = await acceptChallenge(challengeId)
        setPending(false)

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('¡Has aceptado el reto! Espera la confirmación del administrador.')
          router.refresh()
        }
      }
    )
  }

  async function handleCancel(challengeId: string) {
    showConfirm(
      'Cancelar Reto',
      '¿Estás seguro de que deseas cancelar este reto? Esta acción es irreversible.',
      async () => {
        setPending(true)
        const result = await cancelChallenge(challengeId)
        setPending(false)

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Reto cancelado.')
          router.refresh()
        }
      },
      'danger'
    )
  }

  // Prevención de errores de hidratación
  if (!isMounted) return null

  // Helper para obtener el nombre de la cancha seleccionada
  const selectedCourtName = courts.find(c => c.id === selectedCourt)?.name

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 bg-zinc-900/40 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-white/5 backdrop-blur-sm">
        <div className="text-center md:text-left space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1 sm:mb-2">
            <Zap className="w-3 h-3 fill-current" /> Modo Competitivo
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
            Muro de <span className="text-emerald-500">Retos</span>
          </h2>
          <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] sm:text-xs">Busca rivales, pacta la hora y demuestra quién manda</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            render={
              <Button className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-black font-black px-8 sm:px-10 h-14 sm:h-16 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 text-xs sm:text-sm tracking-widest uppercase">
                <Swords className="w-5 h-5" /> Lanzar Desafío
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-white/10 rounded-[32px] sm:rounded-[40px] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
            <form onSubmit={handleCreate}>
              <DialogHeader className="space-y-3 sm:space-y-4">
                <DialogTitle className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white text-center">Nuevo Reto</DialogTitle>
                <DialogDescription className="text-zinc-500 text-center font-medium text-sm">Define las reglas del campo y espera a tu oponente.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:gap-6 py-6 sm:py-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">¿Dónde será el duelo?</Label>
                  <Select name="court_id" required onValueChange={(v) => setSelectedCourt(v)} value={selectedCourt}>
                    <SelectTrigger type="button" className="bg-zinc-900/50 border-white/10 h-12 sm:h-14 font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl">
                      <SelectValue placeholder="Selecciona Cancha">
                        {selectedCourtName || "Selecciona Cancha"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10 rounded-2xl">
                      {courts.map(court => (
                        <SelectItem key={court.id} value={court.id} className="font-bold focus:bg-emerald-500 focus:text-black">
                          {court.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Fecha</Label>
                    <Input name="date" type="date" required className="bg-zinc-900/50 border-white/10 h-12 sm:h-14 font-bold text-sm sm:text-lg rounded-xl sm:rounded-2xl" min={minDate} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Hora</Label>
                    <Select name="time" required onValueChange={setSelectedTime} value={selectedTime}>
                      <SelectTrigger type="button" className="bg-zinc-900/50 border-white/10 h-12 sm:h-14 font-bold text-sm sm:text-lg rounded-xl sm:rounded-2xl text-left">
                        <SelectValue placeholder="--:--" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-white/10 rounded-2xl max-h-[200px] overflow-y-auto">
                        {TIME_OPTIONS.map(time => (
                          <SelectItem key={time} value={time} className="font-bold focus:bg-emerald-500 focus:text-black">
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Mensaje (Opcional)</Label>
                  <Textarea name="notes" placeholder="Ej: Buscamos equipo nivel medio..." className="bg-zinc-900/50 border-white/10 min-h-[100px] sm:min-h-[120px] font-medium rounded-xl sm:rounded-2xl text-base sm:text-lg resize-none" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black h-14 sm:h-16 text-base sm:text-lg rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-500/20">
                  {pending ? 'CARGANDO...' : 'PUBLICAR RETO'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {challenges.length === 0 ? (
        <div className="bg-zinc-900/10 border-2 border-dashed border-white/5 rounded-[32px] sm:rounded-[40px] p-12 sm:p-24 text-center space-y-4 sm:space-y-6">
          <div className="bg-zinc-900/80 w-16 h-16 sm:w-24 sm:h-24 rounded-[24px] sm:rounded-[32px] flex items-center justify-center mx-auto mb-2 sm:mb-4 shadow-2xl">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-700" />
          </div>
          <div className="space-y-1 sm:space-y-2">
            <p className="text-zinc-400 font-black italic text-lg sm:text-xl uppercase tracking-tighter">¡El muro está desierto!</p>
            <p className="text-zinc-600 text-[10px] sm:text-sm font-medium uppercase tracking-widest">Sé el primero en lanzar un reto</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {challenges.map((reto) => {
            const isCreator = userId === reto.creator_id
            
            return (
              <Card key={reto.id} className={`overflow-hidden border-white/5 bg-zinc-950/40 backdrop-blur-md transition-all hover:border-emerald-500/30 group rounded-[24px] sm:rounded-[32px] ${isCreator ? 'ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5' : ''}`}>
                <CardContent className="p-6 sm:p-8">
                  <div className="space-y-5 sm:space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex items-center gap-4 sm:gap-5">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/20 to-zinc-800 flex items-center justify-center text-emerald-500 shadow-inner">
                          <User className="w-6 h-6 sm:w-8 sm:h-8" />
                        </div>
                        <div>
                          <p className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-white group-hover:text-emerald-400 transition-colors">{reto.customer_name}</p>
                          <div className="flex items-center gap-3 text-[9px] sm:text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-0.5 sm:mt-1">
                            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> {reto.courts?.name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                        <div className="inline-flex items-center gap-2 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-white font-black text-[10px] sm:text-xs tracking-widest uppercase">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" /> {reto.challenge_time.substring(0, 5)}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-zinc-500 font-black uppercase tracking-widest sm:mt-2">
                          {reto.challenge_date}
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-900/60 rounded-xl sm:rounded-2xl p-5 sm:p-6 border border-white/5 italic text-zinc-300 relative overflow-hidden group-hover:bg-zinc-900/80 transition-all">
                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Swords className="w-20 h-20 sm:w-24 sm:h-24" />
                      </div>
                      <p className="relative z-10 leading-relaxed font-medium text-base sm:text-lg">"{reto.notes || '¡Estamos buscando rival para jugar!'}"</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                      {reto.status === 'open' && (
                        <div className="flex gap-3 w-full">
                          {isCreator ? (
                            <Button onClick={() => handleCancel(reto.id)} disabled={pending} variant="ghost" className="w-full text-red-400/60 hover:text-red-500 hover:bg-red-500/10 font-black uppercase tracking-widest text-[9px] sm:text-[10px] h-12 sm:h-14 rounded-xl sm:rounded-2xl">
                              <XCircle className="w-4 h-4 mr-2" /> Cancelar Reto
                            </Button>
                          ) : (
                            <Button onClick={() => handleAccept(reto.id)} disabled={pending} className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black h-12 sm:h-14 rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-[10px] sm:text-xs">
                              <Swords className="w-4 h-4 mr-2" /> Aceptar Desafío
                            </Button>
                          )}
                        </div>
                      )}

                      {reto.status === 'accepted' && (
                        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full">
                          <div className="bg-amber-500 text-black font-black px-5 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] tracking-widest uppercase w-full sm:flex-1 text-center">
                            RETO ACEPTADO
                          </div>
                          <div className="flex items-center justify-center gap-2 text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest animate-pulse whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5" /> Pendiente de Validación
                          </div>
                        </div>
                      )}

                      {reto.status === 'confirmed' && (
                        <div className="flex items-center gap-3 sm:gap-4 w-full bg-emerald-500/10 p-2 rounded-xl sm:rounded-2xl border border-emerald-500/20">
                          <div className="bg-emerald-500 text-black font-black px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] tracking-widest uppercase flex items-center gap-2 flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4" /> LISTO
                          </div>
                          <span className="text-[8px] sm:text-[10px] font-black uppercase text-emerald-500 tracking-widest italic ml-auto pr-2 sm:pr-4">¡ESCENARIO LISTO!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      
      <AuthPromptDialog 
        isOpen={isAuthDialogOpen} 
        onOpenChange={setIsAuthDialogOpen} 
        title="¡Únete al desafío!"
        description="Para publicar tus propios retos o aceptar el de otros equipos, necesitas iniciar sesión."
        redirectTo={typeof window !== 'undefined' ? window.location.pathname : '/'}
      />
      <ConfirmationDialog 
        isOpen={confirmConfig.isOpen}
        onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, isOpen: open }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
        variant={confirmConfig.variant}
      />
    </div>
  )
}
