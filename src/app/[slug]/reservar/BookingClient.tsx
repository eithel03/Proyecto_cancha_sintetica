'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createReservation, checkAvailability, acceptChallenge } from './actions'
import { toast } from 'sonner'
import Link from 'next/link'
import { CheckCircle2, Loader2, User, Flag, Calendar, Clock } from 'lucide-react'
import { AuthPromptDialog } from '@/components/AuthPromptDialog'
import { useRouter } from 'next/navigation'

// Generar bloques de 8:00 AM a 10:00 PM (22:00)
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8)

export default function BookingClient({ 
  business, 
  courts, 
  preselectedCourtId,
  customerProfile 
}: { 
  business: any, 
  courts: any[],
  preselectedCourtId?: string,
  customerProfile: any
}) {
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const router = useRouter()

  const [selectedCourt, setSelectedCourt] = useState<string>(preselectedCourtId || (courts.length > 0 ? courts[0].id : ''))
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('sv-SE'))
  
  const [occupiedSlots, setOccupiedSlots] = useState<{start_time: string, end_time: string, id?: string, type?: string}[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null)

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
    // block is hour:00 to (hour+1):00
    const startT = `${hour.toString().padStart(2, '0')}:00`
    const endT = `${(hour + 1).toString().padStart(2, '0')}:00`

    return occupiedSlots.find((res: any) => {
      // Normalizamos eliminando segundos para la comparación si es necesario
      const resStart = res.start_time.substring(0, 5)
      const resEnd = res.end_time.substring(0, 5)
      return resStart < endT && resEnd > startT
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Si no hay perfil de cliente (modo invitado), abrir diálogo de login
    if (!customerProfile) {
      setIsAuthDialogOpen(true)
      return
    }

    if (!selectedSlot) return toast.error('Debes seleccionar una hora disponible.')

    setPending(true)
    
    if (selectedChallengeId) {
      // Es un reto, usamos acceptChallenge
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
    formData.append('time_slot', selectedSlot) // format: "08:00-09:00"

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
      <Card className="max-w-xl mx-auto text-center py-12">
        <CardContent className="space-y-6">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-3xl font-bold">{selectedChallengeId ? '¡Reto Aceptado!' : '¡Reserva Solicitada!'}</h2>
          <p className="text-muted-foreground">
            {selectedChallengeId 
              ? 'Has aceptado el reto correctamente. El administrador confirmará el partido en breve.' 
              : 'Tu reserva ha sido enviada y está en estado Pendiente. El administrador confirmará la disponibilidad.'}
          </p>
          <div className="pt-6">
            <Link href={`/${business.slug}`}>
              <Button variant="outline">Volver a la página principal</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const courtObj = courts.find(c => c.id === selectedCourt)

  return (
    <Card className="max-w-3xl mx-auto w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl">Reservar Cancha</CardTitle>
        <CardDescription>Selecciona fecha y hora para jugar en {business.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-8">
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="court_id">Cancha</Label>
              <Select value={selectedCourt} onValueChange={(val) => setSelectedCourt(val || '')} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una cancha">
                    {courtObj ? `${courtObj.name} - ₡${courtObj.price_per_person}/pers` : 'Selecciona una cancha'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {courts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} - ₡{c.price_per_person}/pers</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha de la reserva</Label>
              <Input 
                id="date" 
                name="date" 
                type="date" 
                required 
                min={new Date().toLocaleDateString('sv-SE')} 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Horarios Disponibles</h3>
            
            {loadingSlots ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {HOURS.map(hour => {
                  const startStr = `${hour.toString().padStart(2, '0')}:00`
                  const endStr = `${(hour + 1).toString().padStart(2, '0')}:00`
                  const slotStr = `${startStr}-${endStr}`
                  const occupancy = getSlotOccupancy(hour)
                  const isSelected = selectedSlot === slotStr
                  
                  const isConfirmedChallenge = occupancy?.type === 'confirmed_challenge'
                  const isAcceptedChallenge = occupancy?.type === 'accepted_challenge'
                  const isOpenChallenge = occupancy?.type === 'open_challenge'
                  const isOccupied = !!occupancy

                  return (
                    <Button
                      key={hour}
                      type="button"
                      variant={isSelected ? "default" : (isOccupied ? "secondary" : "outline")}
                      className={`h-12 w-full transition-all flex flex-col items-center justify-center gap-0 leading-none ${
                        isOccupied && !isOpenChallenge ? 'cursor-not-allowed' : ''
                      } ${
                        isConfirmedChallenge 
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-700 font-bold' 
                          : isAcceptedChallenge
                          ? 'bg-amber-500/30 text-amber-500 border-amber-500/50 border-dashed font-bold animate-pulse'
                          : isOpenChallenge
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 border-dashed font-black'
                          : (isOccupied ? 'opacity-40 line-through decoration-zinc-100 decoration-[3px] shadow-inner bg-zinc-900/50 border-zinc-800' : '')
                      }`}
                      disabled={isOccupied && !isOpenChallenge}
                      onClick={() => {
                        setSelectedSlot(slotStr)
                        setSelectedChallengeId(isOpenChallenge ? (occupancy.id || null) : null)
                      }}
                    >
                      <span className="text-sm">{startStr}</span>
                      {isOpenChallenge && <span className="text-[9px] uppercase tracking-tighter">Reto Abierto</span>}
                      {isAcceptedChallenge && <span className="text-[9px] uppercase tracking-tighter italic">Aceptado</span>}
                    </Button>
                  )
                })}
              </div>
            )}
            {!loadingSlots && (
              <div className="flex flex-wrap gap-4 mt-4 text-[10px] font-black uppercase tracking-widest p-4 bg-black/20 rounded-xl border border-white/5">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <div className="w-3 h-3 bg-zinc-700 line-through decoration-zinc-100 decoration-1 rounded-sm" /> Reservado
                </span>
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <div className="w-3 h-3 border-2 border-dashed border-emerald-500 rounded-sm" /> Reto Abierto
                </span>
                <span className="flex items-center gap-1.5 text-amber-500">
                  <div className="w-3 h-3 border-2 border-dashed border-amber-500 rounded-sm" /> Reto Aceptado
                </span>
                <span className="flex items-center gap-1.5 text-indigo-500">
                  <div className="w-3 h-3 bg-indigo-600 rounded-sm" /> Reto Confirmado
                </span>
              </div>
            )}
          </div>

          {selectedSlot && (
            <div className={`p-6 rounded-lg space-y-4 ${selectedChallengeId ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-primary/10'}`}>
              <h3 className={`font-bold text-lg ${selectedChallengeId ? 'text-emerald-500' : 'text-primary'}`}>
                {selectedChallengeId ? '¡Matchmaking Detectado!' : 'Resumen de tu Reserva'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="col-span-2 text-zinc-400 mb-2 p-3 bg-white/5 rounded-xl border border-white/5 italic">
                  {selectedChallengeId 
                    ? '⚠️ Matchmaking: Al confirmar, estarás aceptando el desafío de otro equipo.' 
                    : '⚽ Estás solicitando una reserva normal para jugar.'}
                </div>
                
                <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-xl border border-white/10 group transition-all hover:border-primary/30">
                  <User className="w-5 h-5 text-white shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Cliente</span>
                    <span className="text-zinc-100 font-bold">{customerProfile?.full_name || 'Invitado'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-xl border border-white/10 group transition-all hover:border-primary/30">
                  <Flag className="w-5 h-5 text-white shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Cancha</span>
                    <span className="text-zinc-100 font-bold">{courtObj?.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-xl border border-white/10 group transition-all hover:border-primary/30">
                  <Calendar className="w-5 h-5 text-white shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Fecha</span>
                    <span className="text-zinc-100 font-bold">{selectedDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-xl border border-white/10 group transition-all hover:border-primary/30">
                  <Clock className="w-5 h-5 text-white shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Horario</span>
                    <span className="text-zinc-100 font-bold">{selectedSlot}</span>
                  </div>
                </div>

                <div className="col-span-2 text-xl font-black mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Total a pagar:</span>
                  <span className="text-primary text-3xl tracking-tighter">₡{courtObj?.price_per_person?.toLocaleString()}</span>
                </div>
              </div>
              
              <Button type="submit" className={`w-full h-12 text-lg font-black ${selectedChallengeId ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} disabled={pending}>
                {pending ? 'Procesando...' : (selectedChallengeId ? 'ACEPTAR RETO' : 'Confirmar Reserva')}
              </Button>
            </div>
          )}

        </form>
      </CardContent>
      <AuthPromptDialog 
        isOpen={isAuthDialogOpen} 
        onOpenChange={setIsAuthDialogOpen} 
        title="¡Casi lo tienes!"
        description="Para confirmar tu reserva y asegurar tu espacio en la cancha, necesitas iniciar sesión o crear una cuenta."
        redirectTo={typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '/'}
      />
    </Card>
  )
}
