'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { checkAvailability } from '@/app/[slug]/reservar/actions'
import { formatTime12h } from '@/lib/utils'
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { HeroSection, ChallengeCard, EmptyState } from '@/components/portal'

function getInitials(name?: string) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function ChallengesClient({ 
  initialChallenges, 
  businessId,
  userId,
  courts,
  businessHours,
  exceptions = []
}: { 
  initialChallenges: any[], 
  businessId: string,
  userId?: string,
  courts: any[],
  businessHours: any[],
  exceptions?: any[]
}) {
  const [challenges, setChallenges] = useState(initialChallenges)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [selectedCourt, setSelectedCourt] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [minDate, setMinDate] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [gender, setGender] = useState('masculino')
  const [menCount, setMenCount] = useState('3')
  const [womenCount, setWomenCount] = useState('2')
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('sv-SE'))
  const [occupiedSlots, setOccupiedSlots] = useState<any[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setChallenges(initialChallenges)
  }, [initialChallenges])

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
    setSelectedDate(today)
  }, [])

  useEffect(() => {
    setChallenges(initialChallenges)
  }, [initialChallenges])

  useEffect(() => {
    async function checkBusySlots() {
      if (!selectedCourt || !selectedDate) return
      setLoadingAvailability(true)
      try {
        const busy = await checkAvailability(selectedCourt, selectedDate)
        if (Array.isArray(busy)) {
          setOccupiedSlots(busy)
        }
      } catch (error) {
        console.error("Error checking availability:", error)
      } finally {
        setLoadingAvailability(false)
      }
    }
    checkBusySlots()
  }, [selectedCourt, selectedDate])

  const currentException = useMemo(() => {
    return (exceptions || []).find(ex => ex.exception_date === selectedDate)
  }, [exceptions, selectedDate])

  const TIME_OPTIONS = useMemo(() => {
    if (currentException) return []
    if (!businessHours || businessHours.length === 0) {
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
      const time = `${hours.toString().padStart(2, '0')}:${mins}`
      
      const isBusy = occupiedSlots.some(slot => {
        const start = slot.start_time.substring(0, 5)
        const end = slot.end_time.substring(0, 5)
        const [hh, mm] = time.split(':')
        const timeEnd = `${(parseInt(hh) + 1).toString().padStart(2, '0')}:${mm}`
        return time < end && timeEnd > start
      })

      if (!isBusy) {
        options.push(time)
      }
    }
    return options
  }, [businessHours, occupiedSlots])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    
    if (!userId) {
      setIsAuthDialogOpen(true)
      return
    }

    if (!selectedCourt || selectedCourt === '') {
      toast.error('Debes seleccionar una cancha para el desafío.')
      return
    }

    if (!selectedTime) {
      toast.error('Selecciona una hora para el encuentro.')
      return
    }

    const court = courts.find(c => c.id === selectedCourt)
    if (gender === 'mixto') {
      const total = parseInt(menCount) + parseInt(womenCount)
      const capacity = court?.capacity || 5
      if (total > capacity) {
        const errorMsg = `Esta cancha tiene una capacidad máxima de ${capacity} jugadores por equipo. Tu selección actual es de ${total} personas.`
        
        toast.custom((t: any) => (
          <div className={`${t.visible ? 'animate-in fade-in slide-in-from-right-4' : 'animate-out fade-out slide-out-to-right-4'} relative overflow-hidden p-4 rounded-2xl bg-white border border-red-200 shadow-xl min-w-[320px]`}>
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/10 blur-[40px] rounded-full" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-red-500">Atención requerida</p>
                <p className="text-sm font-medium text-foreground leading-snug">{errorMsg}</p>
              </div>
            </div>
          </div>
        ), { duration: 5000, position: 'top-right' })
        return
      }
    }

    setError(null)

    setPending(true)
    const formData = new FormData(e.currentTarget)
    formData.append('business_id', businessId)
    formData.append('court_id', selectedCourt)
    formData.append('time', selectedTime)
    formData.append('gender', gender)
    if (gender === 'mixto') {
      formData.append('men_count', menCount)
      formData.append('women_count', womenCount)
    }

    const result = await createChallenge(formData)
    setPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Reto publicado correctamente.')
      setIsDialogOpen(false)
      setSelectedCourt('')
      setSelectedTime('')
      setGender('masculino')
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
      '¿Deseas aceptar este reto?',
      async () => {
        setPending(true)
        const result = await acceptChallenge(challengeId)
        setPending(false)

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Reto aceptado y confirmado.')
          setChallenges((prev: any) => prev.map((c: any) => 
            c.id === challengeId ? { ...c, status: 'confirmed', opponent_id: userId } : c
          ))
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

  if (!isMounted) return null

  const selectedCourtName = courts.find(c => c.id === selectedCourt)?.name

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Hero competitivo */}
      <HeroSection
        icon={Zap}
        badge="Modo competitivo"
        title="Muro de retos"
        subtitle="Busca rivales, pacta la hora y demuestra quién manda."
        variant="navy"
        className="rounded-none"
        containerClassName="max-w-5xl p-4 md:p-8"
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            render={
              <Button className="w-full lg:w-auto bg-gold hover:bg-[#ffd233] text-navy font-bold px-6 h-12 rounded-xl shadow-lg shadow-gold/20 transition-all flex items-center justify-center gap-2 text-sm">
                <Swords className="w-4 h-4" /> Lanzar desafío
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[500px] bg-white border-slate-200 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col p-0">
            <form onSubmit={handleCreate} className="flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 no-scrollbar">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Nuevo reto</DialogTitle>
                <DialogDescription className="text-sm text-slate-500">Define las reglas del campo y espera a tu oponente.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 py-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">¿Dónde será el duelo?</Label>
                  <Select name="court_id" required onValueChange={(v) => {
                    setSelectedCourt(v || '')
                    setError(null)
                  }} value={selectedCourt}>
                    <SelectTrigger type="button" className="bg-white border-slate-200 h-11 font-medium rounded-xl">
                      <SelectValue placeholder="Selecciona cancha">
                        {selectedCourtName || "Selecciona cancha"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 rounded-xl">
                      {courts.map(court => (
                        <SelectItem key={court.id} value={court.id} className="font-medium focus:bg-green-50"> 
                          {court.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Fecha</Label>
                    <Input 
                      name="date" 
                      type="date" 
                      required 
                      className="bg-white border-slate-200 h-11 font-medium rounded-xl" 
                      min={minDate} 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Hora</Label>
                    <Select name="time" required onValueChange={(v) => {
                      setSelectedTime(v || '')
                      setError(null)
                    }} value={selectedTime}>
                      <SelectTrigger type="button" className="bg-white border-slate-200 h-11 font-medium rounded-xl text-left">
                        <SelectValue placeholder={loadingAvailability ? "Buscando..." : "--:--"} />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 rounded-xl max-h-[200px] overflow-y-auto">
                        {TIME_OPTIONS.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500 font-medium">No hay horarios libres</div>
                        ) : (
                          TIME_OPTIONS.map(time => (
                            <SelectItem key={time} value={time} className="font-medium focus:bg-green-50">
                              {formatTime12h(time)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {currentException ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-2xl border border-red-200 space-y-2 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <p className="text-red-600 font-semibold">
                      {currentException.reason?.toLowerCase().includes('feriado') ? '¡Es un día feriado!' : 'Fecha bloqueada'}
                    </p>
                    <p className="text-slate-600 text-xs font-medium">{currentException.reason || 'No se permiten retos hoy.'}</p>
                  </div>
                ) : (
                  <div className="space-y-5 border-t border-slate-100 pt-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Tipo de encuentro</Label>
                    <Select value={gender} onValueChange={(v) => {
                      setGender(v || '')
                      setError(null)
                    }}>
                      <SelectTrigger type="button" className="bg-white border-slate-200 h-11 font-medium rounded-xl">
                        <SelectValue placeholder="Selecciona género">
                          {gender === 'masculino' && 'Masculino'}
                          {gender === 'femenino' && 'Femenino'}
                          {gender === 'mixto' && 'Mixto (Hombres y Mujeres)'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 rounded-xl">
                        <SelectItem value="masculino" className="font-medium focus:bg-green-50">Masculino</SelectItem>
                        <SelectItem value="femenino" className="font-medium focus:bg-green-50">Femenino</SelectItem>
                        <SelectItem value="mixto" className="font-medium focus:bg-green-50">Mixto (Hombres y Mujeres)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {gender === 'mixto' && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Hombres</Label>
                        <Input 
                          type="number" 
                          value={menCount} 
                          onChange={(e) => {
                            setMenCount(e.target.value)
                            setError(null)
                          }} 
                          className="bg-white border-slate-200 h-11 font-medium text-center rounded-xl" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Mujeres</Label>
                        <Input 
                          type="number" 
                          value={womenCount} 
                          onChange={(e) => {
                            setWomenCount(e.target.value)
                            setError(null)
                          }} 
                          className="bg-white border-slate-200 h-11 font-medium text-center rounded-xl" 
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Mensaje <span className="text-slate-400 font-normal">(opcional)</span></Label>
                    <Textarea name="notes" placeholder="Ej: Buscamos equipo nivel medio..." className="bg-white border-slate-200 min-h-[100px] font-medium rounded-xl resize-none" />
                  </div>
                </div>
              )}
            </div>
          </div>
              <DialogFooter className="p-6 sm:p-8 pt-0">
                <Button type="submit" disabled={pending || loadingAvailability} className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-12 text-sm rounded-xl transition-colors">
                  {pending ? 'Publicando...' : 'Publicar reto'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </HeroSection>

      <div className="max-w-5xl mx-auto w-full p-4 md:p-8 space-y-8">
      {/* Login CTA si no está autenticado */}
      {!userId && (
        <div className="bg-gold/8 border border-gold/25 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="bg-gold/15 rounded-xl p-2.5 flex-shrink-0">
              <User className="w-5 h-5 text-navy" />
            </div>
            <p className="text-sm text-foreground font-medium">Inicia sesión para publicar tus propios retos y aceptar desafíos.</p>
          </div>
          <Button
            onClick={() => setIsAuthDialogOpen(true)}
            className="flex-shrink-0 self-end sm:self-auto bg-gold hover:bg-[#ffd233] text-navy font-bold h-11 px-6 rounded-xl transition-colors"
          >
            Iniciar sesión
          </Button>
        </div>
      )}

      {/* Lista de retos */}
      {challenges.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="¡El muro está desierto!"
          description="Sé el primero en lanzar un reto"
          action={
            userId ? (
              <Button onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-white font-semibold h-11 px-6 rounded-xl">
                <Swords className="w-4 h-4 mr-2" /> Lanzar desafío
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
          {challenges.map((reto) => {
            const isCreator = userId === reto.creator_id
            
            return (
              <ChallengeCard
                key={reto.id}
                challenge={reto}
                isCreator={isCreator}
                onAccept={() => handleAccept(reto.id)}
                onCancel={() => handleCancel(reto.id)}
                pending={pending}
              />
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
    </div>
  )
}
