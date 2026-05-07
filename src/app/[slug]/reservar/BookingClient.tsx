'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createReservation, checkAvailability, acceptChallenge } from './actions'
import { toast } from 'sonner'
import Link from 'next/link'
import { CheckCircle2, Loader2, User, Flag, Calendar, Clock, AlertCircle, Sparkles } from 'lucide-react'
import { AuthPromptDialog } from '@/components/AuthPromptDialog'
import { cn } from '@/lib/utils'

export default function BookingClient({ 
  business, 
  courts, 
  preselectedCourtId,
  customerProfile,
  businessHours,
  exceptions = [],
  pricingRules = []
}: { 
  business: any, 
  courts: any[],
  preselectedCourtId?: string,
  customerProfile: any,
  businessHours: any[],
  exceptions?: any[],
  pricingRules?: any[]
}) {
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)

  const [selectedCourt, setSelectedCourt] = useState<string>(preselectedCourtId || (courts.length > 0 ? courts[0].id : ''))
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('sv-SE'))
  
  const [occupiedSlots, setOccupiedSlots] = useState<{
    start_time: string, 
    end_time: string, 
    id?: string, 
    type?: string,
    home?: { name: string, logo_url?: string | null },
    away?: { name: string, logo_url?: string | null }
  }[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null)

  // Obtener el día de la semana para el horario dinámico (0-6)
  const currentDayOfWeek = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00') // Usamos mediodía para evitar problemas de zona horaria
    return d.getDay()
  }, [selectedDate])

  const daySchedule = useMemo(() => {
    return businessHours.find(h => h.day_of_week === currentDayOfWeek)
  }, [businessHours, currentDayOfWeek])

  const currentException = useMemo(() => {
    return (exceptions || []).find(ex => ex.exception_date === selectedDate)
  }, [exceptions, selectedDate])

  // Helper para formatear horas decimales (8.5 -> "08:30")
  const formatTime = (h: number) => {
    const hours = Math.floor(h)
    const mins = h % 1 === 0 ? '00' : '30'
    return `${hours.toString().padStart(2, '0')}:${mins}`
  }

  // Generar bloques de horas dinámicos con intervalos de 30 min
  const HOURS = useMemo(() => {
    if (!daySchedule || daySchedule.is_closed) return []
    
    const start = parseInt(daySchedule.open_time.split(':')[0])
    const end = parseInt(daySchedule.close_time.split(':')[0])
    
    // Generar slots cada 30 minutos (pasos de 0.5)
    // El último slot posible debe terminar exactamente a la hora de cierre
    const slots = []
    for (let h = start; h <= end - 1; h += 0.5) {
      slots.push(h)
    }
    return slots
  }, [daySchedule])

  useEffect(() => {
    async function loadAvailability() {
      if (!selectedCourt || !selectedDate) return
      setLoadingSlots(true)
      setSelectedSlot(null)
      setSelectedChallengeId(null)
      const reserved = await checkAvailability(selectedCourt, selectedDate)
      setOccupiedSlots(reserved)
      setLoadingSlots(false)
    }
    loadAvailability()
  }, [selectedCourt, selectedDate])

  const getSlotOccupancy = (hour: number) => {
    const startT = formatTime(hour)
    const endT = formatTime(hour + 1)

    return occupiedSlots.find((res: any) => {
      const resStart = res.start_time.substring(0, 5)
      const resEnd = res.end_time.substring(0, 5)
      // Un slot está ocupado si se solapa con cualquier reserva existente
      return resStart < endT && resEnd > startT
    })
  }

  const getSlotPrice = (slotTime: string) => {
    if (!selectedCourt) return 0
    const court = courts.find(c => c.id === selectedCourt)
    if (!court) return 0
    
    const rule = (pricingRules || []).find(r => {
      if (r.court_id !== selectedCourt) return false
      if (r.day_of_week !== currentDayOfWeek) return false
      const start = r.start_time.substring(0, 5)
      const end = r.end_time.substring(0, 5)
      return slotTime >= start && slotTime < end
    })
    
    return rule ? rule.price : court.price_per_person
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!customerProfile) {
      setIsAuthDialogOpen(true)
      return
    }

    if (!selectedSlot) return toast.error('Debes seleccionar una hora disponible.')

    setPending(true)
    
    if (selectedChallengeId) {
      const result = await acceptChallenge(selectedChallengeId)
      setPending(false)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('¡Reto aceptado! El administrador lo confirmará pronto.')
        setSuccess(true)
      }
      return
    }
    
    const formData = new FormData()
    formData.append('business_id', business.id)
    formData.append('court_id', selectedCourt)
    formData.append('date', selectedDate)
    formData.append('time_slot', selectedSlot)

    const result = await createReservation(formData)
    setPending(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <Card className="max-w-xl mx-auto text-center py-16 border-white/10 bg-zinc-950/50 backdrop-blur-2xl shadow-2xl animate-in zoom-in-95 duration-500">
        <CardContent className="space-y-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
            <CheckCircle2 className="w-20 h-20 text-emerald-500 relative" />
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-black italic tracking-tighter uppercase">{selectedChallengeId ? '¡Reto Aceptado!' : '¡Solicitud Enviada!'}</h2>
            <p className="text-zinc-400 font-medium">
              {selectedChallengeId 
                ? 'Has aceptado el desafío. El administrador confirmará el partido y te notificaremos.' 
                : 'Tu reserva está en revisión. Recibirás una notificación cuando sea confirmada.'}
            </p>
          </div>
          <div className="pt-8">
            <Link href={`/${business.slug}`}>
              <Button className="font-bold px-8 h-12 shadow-xl shadow-primary/20">Volver al Inicio</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const courtObj = courts.find(c => c.id === selectedCourt)

  return (
    <Card className="max-w-4xl mx-auto w-full border-white/10 bg-zinc-950/50 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
      <CardHeader className="text-center pb-10 pt-12 space-y-2">
        <CardTitle className="text-4xl font-black italic tracking-tighter uppercase flex items-center justify-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" /> Reservar Cancha
        </CardTitle>
        <CardDescription className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Asegura tu espacio en {business.name}</CardDescription>
      </CardHeader>
      <CardContent className="px-6 md:px-12 pb-12">
        <form onSubmit={onSubmit} className="space-y-10">
          
          <div className="grid gap-8 md:grid-cols-2 p-8 rounded-3xl bg-white/5 border border-white/5">
            <div className="space-y-3">
              <Label htmlFor="court_id" className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Elegir Cancha</Label>
              <Select value={selectedCourt} onValueChange={(val) => setSelectedCourt(val || '')} required>
                <SelectTrigger className="bg-zinc-900/50 border-white/10 h-12 text-zinc-100 font-bold">
                  <SelectValue placeholder="Selecciona una cancha">
                    {courtObj ? `${courtObj.name} - ₡${Number(courtObj.price_per_person).toLocaleString('es-CR')}/p` : 'Selecciona una cancha'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {courts.map(c => (
                    <SelectItem key={c.id} value={c.id} className="font-bold focus:bg-primary/20">{c.name} - ₡{Number(c.price_per_person).toLocaleString('es-CR')}/p</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="date" className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Seleccionar Fecha</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-zinc-500" />
                <Input 
                  id="date" 
                  name="date" 
                  type="date" 
                  required 
                  min={new Date().toLocaleDateString('sv-SE')} 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-zinc-900/50 border-white/10 h-12 pl-10 font-bold text-zinc-100"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Horarios Disponibles
              </h3>
              {daySchedule && !daySchedule.is_closed && (
                <Badge variant="outline" className="text-[10px] font-black border-white/10 text-zinc-500">
                  {daySchedule.open_time.substring(0, 5)} - {daySchedule.close_time.substring(0, 5)}
                </Badge>
              )}
            </div>
            
            {loadingSlots ? (
              <div className="flex flex-col items-center justify-center p-16 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-zinc-500 font-bold uppercase tracking-tighter text-xs">Buscando disponibilidad...</p>
              </div>
            ) : !daySchedule || daySchedule.is_closed || currentException ? (
              <div className="flex flex-col items-center justify-center p-16 bg-red-500/5 rounded-3xl border border-red-500/10 space-y-3 animate-in fade-in duration-500">
                <AlertCircle className="w-12 h-12 text-red-500/50" />
                <p className="text-red-500 font-black uppercase italic tracking-tight text-lg">
                  {currentException ? 'Fecha Bloqueada' : 'Local Cerrado'}
                </p>
                <p className="text-zinc-500 text-sm font-medium">
                  {currentException 
                    ? (currentException.reason || 'Este local ha bloqueado las reservas para este día.')
                    : `Este local no atiende reservas los días ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long' })}.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {HOURS.map(hour => {
                  const startStr = formatTime(hour)
                  const endStr = formatTime(hour + 1)
                  const slotStr = `${startStr}-${endStr}`
                  const occupancy = getSlotOccupancy(hour)
                  const isSelected = selectedSlot === slotStr
                  const isOpenChallenge = occupancy?.type === 'open_challenge'
                  const isAcceptedChallenge = occupancy?.type === 'accepted_challenge'
                  const isConfirmedChallenge = occupancy?.type === 'confirmed_challenge'
                  const isTournamentMale = occupancy?.type === 'tournament_male'
                  const isTournamentFemale = occupancy?.type === 'tournament_female'
                  const isTournament = isTournamentMale || isTournamentFemale
                  const isNormalReservation = occupancy?.type === 'reservation'

                  const isOccupied = !!occupancy
                  const currentPrice = getSlotPrice(startStr)
                  const hasSpecialPrice = currentPrice !== courts.find(c => c.id === selectedCourt)?.price_per_person

                  // Colores dinámicos Premium
                  const getSlotStyles = () => {
                    if (!isOccupied) return "border-white/5 bg-zinc-900/50 hover:bg-zinc-900 hover:border-emerald-500/50"
                    if (isTournamentMale) return "border-blue-500/50 bg-blue-600/20 text-blue-200"
                    if (isTournamentFemale) return "border-pink-400/50 bg-pink-500/20 text-pink-200"
                    if (isConfirmedChallenge) return "border-amber-500/50 bg-amber-500/20 text-amber-200"
                    if (isAcceptedChallenge) return "border-amber-200/50 bg-amber-200/20 text-amber-100"
                    if (isOpenChallenge) return "border-emerald-500/50 bg-emerald-500/10 text-emerald-500 border-dashed animate-pulse"
                    return "border-zinc-700/50 bg-zinc-800/40 text-zinc-400 grayscale" // Normal (Gris)
                  }

                  return (
                    <Button
                      key={hour}
                      type="button"
                      variant="ghost"
                      className={cn(
                        "h-20 w-full transition-all flex flex-col items-center justify-center gap-1.5 leading-none relative group rounded-2xl border",
                        getSlotStyles(),
                        isSelected && "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-105 z-10",
                        isOccupied && !isOpenChallenge && "cursor-not-allowed"
                      )}
                      disabled={isOccupied && !isOpenChallenge}
                      onClick={() => {
                        setSelectedSlot(slotStr)
                        setSelectedChallengeId(isOpenChallenge ? (occupancy.id || null) : null)
                      }}
                    >
                      <span className="text-base font-black tracking-tighter">{startStr}</span>
                      <div className="flex gap-1 flex-wrap justify-center">
                        {isOpenChallenge && <span className="text-[8px] font-black uppercase bg-emerald-500 text-black px-1 rounded">RETO DISP.</span>}
                        {isAcceptedChallenge && <span className="text-[8px] font-black uppercase bg-amber-200 text-black px-1 rounded">POR CONFIRMAR</span>}
                        {isConfirmedChallenge && <span className="text-[8px] font-black uppercase bg-amber-500 text-black px-1 rounded">RETO CONFIRMADO</span>}
                        {isTournament && (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn(
                              "text-[8px] font-black uppercase px-1 rounded text-white",
                              isTournamentMale ? "bg-blue-600" : "bg-pink-500"
                            )}>
                              TORNEO {isTournamentMale ? 'MAS' : 'FEM'}
                            </span>
                            <span className="text-[7px] font-bold opacity-70 truncate max-w-[60px]">
                              {occupancy.home?.name} vs {occupancy.away?.name}
                            </span>
                          </div>
                        )}
                        {isNormalReservation && <span className="text-[8px] font-black uppercase bg-zinc-600 text-white px-1 rounded">RESERVADO</span>}
                        {hasSpecialPrice && !isOccupied && <span className="text-[8px] font-black uppercase bg-amber-500 text-black px-1 rounded">PROMO</span>}
                      </div>
                      {!isOccupied && <span className="text-[9px] font-bold text-zinc-500">₡{currentPrice.toLocaleString('es-CR')}</span>}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>

          {selectedSlot && (
            <div className={`p-8 rounded-3xl space-y-6 transition-all animate-in slide-in-from-top-4 duration-500 ${selectedChallengeId ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-primary/5 border border-primary/20'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-black text-2xl italic uppercase tracking-tighter ${selectedChallengeId ? 'text-emerald-500' : 'text-primary'}`}>
                  {selectedChallengeId ? '¡Reto Detectado!' : 'Detalles de Reserva'}
                </h3>
                <Badge className={selectedChallengeId ? 'bg-emerald-500' : 'bg-primary'}>
                  {selectedChallengeId ? 'MODO MATCHMAKING' : 'RESERVA NORMAL'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5 transition-all hover:bg-zinc-900">
                    <div className="bg-white/5 p-2 rounded-xl"><User className="w-5 h-5 text-zinc-400" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Jugador</p>
                      <p className="font-bold text-zinc-100">{customerProfile?.full_name || 'Invitado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5 transition-all hover:bg-zinc-900">
                    <div className="bg-white/5 p-2 rounded-xl"><Flag className="w-5 h-5 text-zinc-400" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Cancha Seleccionada</p>
                      <p className="font-bold text-zinc-100">{courtObj?.name}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5 transition-all hover:bg-zinc-900">
                    <div className="bg-white/5 p-2 rounded-xl"><Calendar className="w-5 h-5 text-zinc-400" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Día del Encuentro</p>
                      <p className="font-bold text-zinc-100">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { dateStyle: 'long' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5 transition-all hover:bg-zinc-900">
                    <div className="bg-white/5 p-2 rounded-xl"><Clock className="w-5 h-5 text-zinc-400" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Hora de Inicio</p>
                      <p className="font-bold text-zinc-100">{selectedSlot.split('-')[0]}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-center sm:text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Sugerido</p>
                  <p className="text-4xl font-black italic tracking-tighter text-white">
                    ₡{selectedSlot ? getSlotPrice(selectedSlot.split('-')[0]).toLocaleString() : Number(courtObj?.price_per_person).toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-600 mt-1 italic">* Cobro por persona / partido</p>
                </div>
                <Button 
                  type="submit" 
                  disabled={pending}
                  className={`w-full sm:w-auto h-16 px-12 text-xl font-black italic tracking-tighter shadow-2xl transition-all hover:scale-105 active:scale-95 ${selectedChallengeId ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' : 'shadow-primary/20'}`}
                >
                  {pending ? 'PROCESANDO...' : (selectedChallengeId ? 'ACEPTAR RETO' : 'RESERVAR AHORA')}
                </Button>
              </div>
            </div>
          )}

        </form>
      </CardContent>

      <AuthPromptDialog 
        isOpen={isAuthDialogOpen} 
        onOpenChange={setIsAuthDialogOpen} 
        title="¡Casi estás listo para jugar!"
        description="Para procesar tu reserva y enviarla a los administradores de la sintética, necesitas estar logueado."
        redirectTo={typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '/'}
      />
    </Card>
  )
}

function Badge({ children, variant = 'default', className = '' }: { children: React.ReactNode, variant?: 'default' | 'outline', className?: string }) {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    outline: 'border border-zinc-700 text-zinc-400'
  }
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${variants[variant]} ${className}`}>{children}</span>
}
