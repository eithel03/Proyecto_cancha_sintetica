'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createReservation, checkAvailability, acceptChallenge } from './actions'
import { toast } from 'sonner'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Calendar, CalendarCheck, Check, CheckCircle2, CircleDollarSign, Clock, Loader2, MapPin, ShieldCheck, Swords, Timer, X } from 'lucide-react'
import { AuthPromptDialog } from '@/components/AuthPromptDialog'
import { cn, formatTime12h } from '@/lib/utils'

function getChallengeGenderMeta(gender?: string) {
  switch (gender) {
    case 'masculino':
      return { label: 'Masculino', className: 'border-blue-200 bg-blue-100 text-blue-700' }
    case 'femenino':
      return { label: 'Femenino', className: 'border-pink-200 bg-pink-100 text-pink-700' }
    case 'mixto':
      return { label: 'Mixto', className: 'border-violet-200 bg-violet-100 text-violet-700' }
    default:
      return null
  }
}

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
    gender?: string | null,
    home?: { name: string, logo_url?: string | null },
    away?: { name: string, logo_url?: string | null }
  }[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null)

  const summaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedSlot && summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedSlot])

  const currentDayOfWeek = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00')
    return d.getDay()
  }, [selectedDate])

  const daySchedule = useMemo(() => {
    return businessHours.find(h => h.day_of_week === currentDayOfWeek)
  }, [businessHours, currentDayOfWeek])

  const currentException = useMemo(() => {
    return (exceptions || []).find(ex => ex.exception_date === selectedDate)
  }, [exceptions, selectedDate])

  const formatTime = (h: number) => {
    const hours = Math.floor(h)
    const mins = h % 1 === 0 ? '00' : '30'
    return `${hours.toString().padStart(2, '0')}:${mins}`
  }

  const HOURS = useMemo(() => {
    if (!daySchedule || daySchedule.is_closed) return []
    
    const start = parseInt(daySchedule.open_time.split(':')[0])
    const end = parseInt(daySchedule.close_time.split(':')[0])
    
    const slots = []
    for (let h = start; h <= end - 1; h += 0.5) {
      slots.push(h)
    }
    return slots
  }, [daySchedule])

  useEffect(() => {
    let cancelled = false
    async function loadAvailability() {
      if (!selectedCourt || !selectedDate) return
      setLoadingSlots(true)
      setSelectedSlot(null)
      setSelectedChallengeId(null)

      const url = new URL(window.location.href)
      url.searchParams.set('courtId', selectedCourt)
      window.history.replaceState({}, '', url.toString())

      const result = await checkAvailability(selectedCourt, selectedDate)
      if (cancelled) return
      if (Array.isArray(result)) {
        setOccupiedSlots(result)
      } else if (result && (result as any).error) {
        toast.error('Error al cargar disponibilidad: ' + (result as any).error)
        setOccupiedSlots([])
      }
      setLoadingSlots(false)
    }
    loadAvailability()
    return () => { cancelled = true }
  }, [selectedCourt, selectedDate])

  const getSlotOccupancy = (hour: number) => {
    const startT = formatTime(hour)
    const endT = formatTime(hour + 1)

    return occupiedSlots.find((res: any) => {
      const partsStart = res.start_time.split(':')
      const partsEnd = res.end_time.split(':')
      const resStart = `${partsStart[0].padStart(2, '0')}:${partsStart[1]}`
      const resEnd = `${partsEnd[0].padStart(2, '0')}:${partsEnd[1]}`
      
      return startT < resEnd && endT > resStart
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
        toast.success('Reto aceptado.')
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
      <Card className="max-w-xl mx-auto text-center py-14 border-border bg-white shadow-soft rounded-2xl animate-in zoom-in-95 duration-500">
        <CardContent className="space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-green-700" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{selectedChallengeId ? 'Reto aceptado' : '¡Solicitud enviada!'}</h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto">
              {selectedChallengeId 
                ? 'Has aceptado el desafío. El administrador confirmará el partido y te notificaremos.' 
                : 'Tu reserva está en revisión. Recibirás una notificación cuando sea confirmada.'}
            </p>
          </div>
          <div className="pt-4">
            <Link href={`/${business.slug}`}>
              <Button className="font-bold px-8 h-12 rounded-xl bg-gold text-navy hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/25">Volver al inicio</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const courtObj = courts.find(c => c.id === selectedCourt)

  const dayParts = [
    { key: 'morning', label: 'Mañana', from: 0, to: 12 },
    { key: 'afternoon', label: 'Tarde', from: 12, to: 18 },
    { key: 'night', label: 'Noche', from: 18, to: 24 },
  ]

  const slotPrice = selectedSlot ? getSlotPrice(selectedSlot.split('-')[0]) : Number(courtObj?.price_per_person || 0)
  const selectedChallenge = selectedChallengeId
    ? occupiedSlots.find((slot) => slot.id === selectedChallengeId)
    : undefined
  const selectedChallengeGenderMeta = getChallengeGenderMeta(selectedChallenge?.gender || undefined)

  return (
    <>
      <Card className="max-w-5xl mx-auto w-full bg-card border-border rounded-2xl shadow-soft overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="text-center pt-7 pb-5 space-y-1 border-b border-border/70">
        <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Reservar cancha</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">Selecciona tu cancha, fecha y horario.</CardDescription>
      </CardHeader>

      <CardContent className="px-4 sm:px-8 py-6 sm:py-7">
        <form id="booking-form" onSubmit={onSubmit} className="space-y-6">

          <div className="grid gap-5 md:grid-cols-2 rounded-2xl bg-[#F4F0E6] border border-border p-5 sm:p-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Elegir cancha</Label>
              <Select value={selectedCourt} onValueChange={(val) => setSelectedCourt(val || '')} required>
                <SelectTrigger className="bg-white dark:bg-white dark:hover:bg-white border-border h-12 rounded-xl px-4 text-foreground shadow-none focus-visible:border-gold focus-visible:ring-gold/25">
                  <SelectValue placeholder="Selecciona una cancha">
                    {courtObj ? (
                      <span className="flex min-w-0 w-full items-center gap-2">
                        <span className="truncate font-semibold">{courtObj.name}</span>
                        <span className="shrink-0 ml-auto rounded-full bg-[#F4F0E6] px-2.5 py-0.5 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                          ₡{Number(courtObj.price_per_person).toLocaleString('es-CR')}<span className="hidden sm:inline"> por persona</span>
                        </span>
                      </span>
                    ) : (
                      'Selecciona una cancha'
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white border-border rounded-xl p-1.5 shadow-lg shadow-navy/10">
                  {courts.map(c => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      className="py-2.5 pl-3.5 pr-8 rounded-xl font-medium text-foreground hover:bg-gold/15 focus:bg-gold/25 focus:text-navy data-[highlighted]:bg-gold/25 data-[selected]:bg-gold/25 data-[selected]:text-navy"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate font-semibold">{c.name}</span>
                        <span className="shrink-0 text-xs font-bold text-slate-500">₡{Number(c.price_per_person).toLocaleString('es-CR')}/persona</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-semibold text-foreground">Seleccionar fecha</Label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary pointer-events-none" />
                <Input 
                  id="date" 
                  name="date" 
                  type="date" 
                  required 
                  min={new Date().toLocaleDateString('sv-SE')} 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white dark:bg-white border-border h-12 pl-10 rounded-xl font-medium text-foreground shadow-none focus-visible:border-gold focus-visible:ring-gold/25"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex flex-wrap items-start justify-between gap-2.5 sm:gap-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10">
                    <Clock className="w-4 h-4 text-primary" />
                  </span>
                  Horarios disponibles
                </h3>
                <p className="text-xs text-slate-500 mt-1 pl-10">Selecciona la hora en la que deseas jugar.</p>
              </div>
              {daySchedule && !daySchedule.is_closed && (
                <span className="shrink-0 rounded-full bg-white border border-border px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-soft">
                  {formatTime12h(daySchedule.open_time)} – {formatTime12h(daySchedule.close_time)}
                </span>
              )}
            </div>
            
            {loadingSlots ? (
              <div className="flex flex-col items-center justify-center p-16 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-slate-500 font-medium">Buscando disponibilidad...</p>
              </div>
            ) : !daySchedule || daySchedule.is_closed || currentException ? (
              <div className="flex flex-col items-center justify-center p-12 bg-red-50 border border-red-200 rounded-2xl space-y-3 animate-in fade-in duration-500 text-center">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="text-red-600 font-semibold text-lg">
                  {currentException?.reason?.toLowerCase().includes('feriado') ? '¡Día feriado!' : (currentException ? 'Fecha bloqueada' : 'Local cerrado')}
                </p>
                <p className="text-slate-600 text-sm max-w-md">
                  {currentException 
                    ? (currentException.reason || 'Este local ha bloqueado las reservas para este día.')
                    : `Este local no atiende reservas los días ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long' })}.`}
                </p>
              </div>
            ) : (
              dayParts.map(part => {
                const partSlots = HOURS.filter(h => h >= part.from && h < part.to)
                if (partSlots.length === 0) return null
                return (
                  <div key={part.key} className="space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{part.label}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
                      {partSlots.map(hour => {
                        const startStr = formatTime(hour)
                        const endStr = formatTime(hour + 1)
                        const slotStr = `${startStr}-${endStr}`
                        const occupancy = getSlotOccupancy(hour)
                        const occStart = occupancy?.start_time ? `${occupancy.start_time.split(':')[0].padStart(2, '0')}:${occupancy.start_time.split(':')[1]}` : ''
                        const occEnd = occupancy?.end_time ? `${occupancy.end_time.split(':')[0].padStart(2, '0')}:${occupancy.end_time.split(':')[1]}` : ''
                        const isInInterval = !!occupancy && startStr >= occStart && startStr < occEnd
                        const isSelected = selectedSlot === slotStr
                        const isOpenChallenge = occupancy?.type === 'open_challenge' && isInInterval
                        const isAcceptedChallenge = occupancy?.type === 'accepted_challenge' && isInInterval
                        const isConfirmedChallenge = occupancy?.type === 'confirmed_challenge' && isInInterval
                        const isTournamentMale = occupancy?.type === 'tournament_male' && isInInterval
                        const isTournamentFemale = occupancy?.type === 'tournament_female' && isInInterval
                        const isTournament = isTournamentMale || isTournamentFemale
                        const isNormalReservation = occupancy?.type === 'reservation' && isInInterval
                        const isBlocked = !!occupancy && !isInInterval
                        const isOccupied = !!occupancy
                        const challengeGenderMeta = (isOpenChallenge || isAcceptedChallenge || isConfirmedChallenge)
                          ? getChallengeGenderMeta(occupancy?.gender || undefined)
                          : null
                        const currentPrice = getSlotPrice(startStr)
                        const hasSpecialPrice = currentPrice !== courts.find(c => c.id === selectedCourt)?.price_per_person

                        return (
                          <Button
                            key={hour}
                            type="button"
                            variant="ghost"
                            className={cn(
                              "h-16 w-full transition-all duration-150 flex flex-col items-center justify-center gap-0.5 leading-none relative rounded-xl border",
                              isSelected
                                ? "border-navy bg-navy text-white ring-2 ring-gold/50 shadow-md shadow-navy/20"
                                : isOccupied && !isOpenChallenge
                                  ? "border-border bg-surface text-muted-foreground cursor-not-allowed opacity-75"
                                  : "border-border bg-card hover:border-gold/60 hover:bg-gold/8 hover:-translate-y-0.5 hover:shadow-sm hover:shadow-gold/10",
                              isOpenChallenge && !isSelected && "border-green-400 bg-green-50 text-green-700 border-dashed animate-pulse"
                            )}
                            onClick={() => {
                              if (isOccupied && !isOpenChallenge) {
                                toast.error(isBlocked
                                  ? 'Este horario no tiene tiempo suficiente para completar la reserva (59 minutos).'
                                  : 'Este horario no está disponible: la cancha estará ocupada en ese intervalo.')
                                return
                              }
                              setSelectedSlot(slotStr)
                              setSelectedChallengeId(isOpenChallenge ? (occupancy.id || null) : null)
                            }}
                          >
                            <span className={cn(
                              "text-sm font-bold flex items-center gap-1",
                              isSelected ? "text-white" : isOpenChallenge ? "text-green-700" : isOccupied ? "text-slate-400" : "text-foreground",
                              isOccupied && !isOpenChallenge && "line-through"
                            )}>
                              {isSelected && <Check className="size-3.5 text-gold" aria-hidden="true" />}
                              {formatTime12h(startStr)}
                            </span>
                            {!isOccupied && (
                              <span className={cn("text-[11px] font-semibold", isSelected ? "text-gold" : "text-muted-foreground")}>
                                ₡{currentPrice.toLocaleString('es-CR')}
                              </span>
                            )}
                            <div className="flex gap-1 flex-wrap justify-center">
                              {isOpenChallenge && <span className="text-[8px] font-semibold uppercase bg-green-600 text-white px-1.5 rounded">Reto disp.</span>}
                              {isAcceptedChallenge && <span className="text-[8px] font-semibold uppercase bg-amber-200 text-amber-900 px-1.5 rounded">Por confirmar</span>}
                              {isConfirmedChallenge && <span className="text-[8px] font-semibold uppercase bg-amber-500 text-white px-1.5 rounded">Reto</span>}
                              {challengeGenderMeta && (
                                <span className={cn('rounded border px-1.5 text-[8px] font-bold uppercase', challengeGenderMeta.className)}>
                                  {challengeGenderMeta.label}
                                </span>
                              )}
                              {isTournament && (
                                <span className={cn(
                                  "text-[8px] font-semibold uppercase px-1.5 rounded text-white",
                                  isTournamentMale ? "bg-blue-600" : "bg-pink-500"
                                )}>
                                  T. {isTournamentMale ? 'MAS' : 'FEM'}
                                </span>
                              )}
                              {isNormalReservation && <span className="text-[8px] font-semibold uppercase bg-slate-400 text-white px-1.5 rounded">Ocupado</span>}
                              {hasSpecialPrice && !isOccupied && <span className="text-[8px] font-semibold uppercase bg-amber-500 text-white px-1.5 rounded">Promo</span>}
                            </div>
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {selectedSlot ? (
            <div
              ref={summaryRef}
              className={cn(
                "rounded-2xl border p-5 sm:p-6 space-y-5 mb-36 sm:mb-0 scroll-mt-4 transition-all animate-in slide-in-from-top-4 duration-300",
                selectedChallengeId ? "bg-green-50/70 border-green-200" : "bg-white border-border shadow-soft"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
                <h3 className="font-bold text-lg tracking-tight text-foreground flex items-center gap-2.5">
                  <span className={cn("flex size-8 items-center justify-center rounded-xl", selectedChallengeId ? "bg-green-100" : "bg-gold/15")}>
                    {selectedChallengeId
                      ? <Swords className="w-4 h-4 text-green-700" aria-hidden="true" />
                      : <CalendarCheck className="w-4 h-4 text-gold" aria-hidden="true" />}
                  </span>
                  {selectedChallengeId ? '¡Reto detectado!' : 'Resumen de tu reserva'}
                </h3>
                <span className={cn("shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white", selectedChallengeId ? "bg-green-700" : "bg-navy")}>
                  {selectedChallengeId ? 'Modo matchmaking' : 'Reserva normal'}
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedSlot(null); setSelectedChallengeId(null) }}
                  aria-label="Cancelar selección"
                  className="shrink-0 flex size-8 items-center justify-center rounded-lg border border-border text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedChallengeId && selectedChallengeGenderMeta && (
                  <div className={cn('flex items-center gap-3 rounded-xl border p-3.5 sm:col-span-2', selectedChallengeGenderMeta.className)}>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-white/70">
                      <Swords className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium opacity-75">Tipo de reto</p>
                      <p className="font-bold">Reto {selectedChallengeGenderMeta.label.toLowerCase()}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-surface border border-border p-3.5 rounded-xl">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card border border-border"><MapPin className="w-4 h-4 text-primary" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500">Cancha</p>
                    <p className="font-semibold text-foreground truncate">{courtObj?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-surface border border-border p-3.5 rounded-xl">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card border border-border"><Calendar className="w-4 h-4 text-primary" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500">Fecha</p>
                    <p className="font-semibold text-foreground truncate">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { dateStyle: 'long' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-surface border border-border p-3.5 rounded-xl">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card border border-border"><Clock className="w-4 h-4 text-primary" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500">Horario</p>
                    <p className="font-semibold text-foreground">{formatTime12h(selectedSlot.split('-')[0])} – {formatTime12h(selectedSlot.split('-')[1])}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-surface border border-border p-3.5 rounded-xl">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card border border-border"><Timer className="w-4 h-4 text-primary" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500">Duración</p>
                    <p className="font-semibold text-foreground">60 min</p>
                  </div>
                </div>
                <div className="sm:col-span-2 flex items-center gap-3 bg-gold/8 border border-gold/25 p-3.5 rounded-xl">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card border border-gold/30"><CircleDollarSign className="w-4 h-4 text-navy" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500">Precio</p>
                    <p className="font-bold text-foreground">₡{slotPrice.toLocaleString('es-CR')} por persona</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-xs text-slate-500">Total sugerido</p>
                  <p className="text-3xl font-extrabold tracking-tight text-foreground">
                    ₡{slotPrice.toLocaleString('es-CR')}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">* Cobro por persona / partido</p>
                </div>
                <Button 
                  type="submit" 
                  disabled={pending}
                  className={cn(
                    "w-full sm:w-auto h-[52px] px-10 text-base font-bold rounded-xl transition-all",
                    selectedChallengeId
                      ? "bg-green-700 hover:bg-green-800"
                      : "bg-gold text-navy hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/25"
                  )}
                >
                  {pending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {selectedChallengeId ? 'Aceptar reto' : 'Confirmar reserva'}
                      {!selectedChallengeId && <ArrowRight className="w-5 h-5" aria-hidden="true" />}
                    </>
                  )}
                </Button>
              </div>

              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                Revisa la cancha, fecha y horario antes de confirmar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                type="button"
                disabled
                className="w-full h-[52px] text-base font-bold rounded-xl bg-surface text-muted-foreground"
              >
                Selecciona un horario
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                Revisa la cancha, fecha y horario antes de confirmar.
              </p>
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

    {selectedSlot && (
      <div className="fixed inset-x-0 bottom-16 z-[60] p-3 sm:hidden">
        <div className="mx-auto flex items-center justify-between gap-3 rounded-2xl bg-navy px-4 py-3 shadow-lg shadow-navy/30">
          <button
            type="button"
            onClick={() => { setSelectedSlot(null); setSelectedChallengeId(null) }}
            aria-label="Cancelar selección"
            className="shrink-0 flex size-9 items-center justify-center rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">{selectedChallengeId ? 'Reto detectado' : 'Total sugerido'}</p>
            <p className="text-lg font-extrabold text-gold leading-tight">₡{slotPrice.toLocaleString('es-CR')}</p>
          </div>
          <Button
            type="submit"
            form="booking-form"
            disabled={pending}
            className={cn(
              "shrink-0 h-12 px-6 text-base font-bold rounded-xl transition-all",
              selectedChallengeId
                ? "bg-green-700 hover:bg-green-800"
                : "bg-gold text-navy hover:bg-gold/90"
            )}
          >
            {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : (selectedChallengeId ? 'Aceptar reto' : 'Confirmar reserva')}
          </Button>
        </div>
      </div>
    )}
  </>
)
}
