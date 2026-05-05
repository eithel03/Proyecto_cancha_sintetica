'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Swords, Calendar, Clock, MapPin, AlertCircle, CheckCircle2, User, XCircle } from 'lucide-react'
import { createChallenge, acceptChallenge, cancelChallenge } from './actions'
import { toast } from 'sonner'
import { AuthPromptDialog } from '@/components/AuthPromptDialog'
import { useRouter } from 'next/navigation'

export default function ChallengesClient({ 
  initialChallenges, 
  businessId,
  userId,
  courts 
}: { 
  initialChallenges: any[], 
  businessId: string,
  userId?: string,
  courts: any[]
}) {
  const [challenges, setChallenges] = useState(initialChallenges)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [selectedCourt, setSelectedCourt] = useState<string | undefined>(undefined)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const router = useRouter()

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    
    if (!userId) {
      setIsAuthDialogOpen(true)
      return
    }

    if (!selectedCourt) {
      toast.error('Por favor, selecciona una cancha.')
      return
    }

    setPending(true)
    const formData = new FormData(e.currentTarget)
    formData.append('business_id', businessId)
    formData.append('court_id', selectedCourt)

    const result = await createChallenge(formData)
    setPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Reto publicado correctamente.')
      setIsDialogOpen(false)
      window.location.reload()
    }
  }

  async function handleAccept(challengeId: string) {
    if (!userId) {
      setIsAuthDialogOpen(true)
      return
    }
    if (!confirm('¿Deseas aceptar este reto? El administrador deberá confirmar el partido después.')) return

    setPending(true)
    const result = await acceptChallenge(challengeId)
    setPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('¡Has aceptado el reto! Espera la confirmación del administrador.')
      window.location.reload()
    }
  }

  async function handleCancel(challengeId: string) {
    if (!confirm('¿Estás seguro de que deseas cancelar este reto?')) return

    setPending(true)
    const result = await cancelChallenge(challengeId)
    setPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Reto cancelado.')
      window.location.reload()
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-emerald-500 italic tracking-tighter uppercase">Muro de Retos</h2>
          <p className="text-zinc-400 font-medium">Encuentra equipos rivales y organiza partidos amistosos.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger className="bg-emerald-600 hover:bg-emerald-700 font-black text-white px-8 h-12 rounded-full shadow-lg shadow-emerald-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
            <Swords className="w-5 h-5" /> Publicar un Reto
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-emerald-500">Lanzar un Desafío</DialogTitle>
                <DialogDescription className="text-zinc-400">Completa los detalles para que otros equipos puedan verte en el muro.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="grid gap-2">
                  <Label htmlFor="court_id" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Seleccionar Cancha</Label>
                    <Select 
                      name="court_id" 
                      required 
                      value={selectedCourt} 
                      onValueChange={(v) => setSelectedCourt(v || undefined)}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 h-12 font-bold">
                        <SelectValue placeholder="¿En qué cancha?">
                          {courts.find(c => c.id === selectedCourt)?.name || '¿En qué cancha?'}
                        </SelectValue>
                      </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {courts.map(court => (
                        <SelectItem key={court.id} value={court.id} className="font-bold">{court.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Fecha</Label>
                    <Input id="date" name="date" type="date" required className="bg-zinc-900 border-zinc-800 h-12 font-bold" min={new Date().toLocaleDateString('sv-SE')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="time" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Hora de inicio</Label>
                    <Input id="time" name="time" type="time" required className="bg-zinc-900 border-zinc-800 h-12 font-bold" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Mensaje para tus rivales</Label>
                  <Textarea id="notes" name="notes" placeholder="Ej: Buscamos equipo nivel medio, juego amistoso..." className="bg-zinc-900 border-zinc-800 min-h-[100px] font-medium" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending} className="w-full bg-emerald-600 hover:bg-emerald-700 font-black h-12 text-lg">
                  {pending ? 'Publicando...' : 'LANZAR RETO'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {challenges.length === 0 ? (
        <Card className="bg-zinc-900/20 border-zinc-800 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-600">
              <Swords className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-bold text-zinc-400 tracking-tight italic">¡EL MURO ESTÁ DESIERTO!</p>
              <p className="text-sm text-zinc-500 max-w-xs">Sé el primero en lanzar un reto y encuentra rivales para tu próximo partido.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {challenges.map((reto) => {
            const isCreator = userId === reto.creator_id
            const isOpponent = userId === reto.opponent_id
            
            return (
              <Card key={reto.id} className={`overflow-hidden border-zinc-800 bg-zinc-900/30 transition-all hover:bg-zinc-900/50 ${isCreator ? 'border-l-4 border-l-emerald-500' : ''}`}>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xl font-black tracking-tighter uppercase italic">{reto.customer_name}</p>
                          <div className="flex items-center gap-3 text-xs text-zinc-500 font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-white" /> {reto.courts?.name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-white font-black text-sm italic">
                          <Clock className="w-4 h-4 text-white" /> {reto.challenge_time.substring(0, 5)}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter">
                          {reto.challenge_date}
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/40 rounded-xl p-5 border border-white/5 italic text-zinc-300 relative group overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Swords className="w-12 h-12" />
                      </div>
                      <p className="relative z-10 leading-relaxed font-medium">"{reto.notes || '¡Estamos buscando rival para jugar!'}"</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                      {reto.status === 'open' && (
                        <>
                          {isCreator ? (
                            <Button onClick={() => handleCancel(reto.id)} disabled={pending} variant="ghost" className="w-full sm:w-auto text-red-400 hover:text-red-500 hover:bg-red-500/10 font-bold gap-2">
                              <XCircle className="w-4 h-4" /> Cancelar
                            </Button>
                          ) : (
                            <Button onClick={() => handleAccept(reto.id)} disabled={pending} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 shadow-lg shadow-emerald-900/20 gap-2">
                              <Swords className="w-4 h-4" /> Aceptar Reto
                            </Button>
                          )}
                        </>
                      )}

                      {reto.status === 'accepted' && (
                        <div className="flex items-center gap-4 w-full">
                          <Badge className="bg-amber-500 text-black font-black px-4 py-1 flex-1 sm:flex-none justify-center">RETO ACEPTADO</Badge>
                          <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest animate-pulse italic">Esperando confirmación admin...</span>
                          {(isCreator || isOpponent) && (
                            <Button onClick={() => handleCancel(reto.id)} variant="ghost" size="sm" className="text-zinc-500 hover:text-red-400">Cancelar</Button>
                          )}
                        </div>
                      )}

                      {reto.status === 'confirmed' && (
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                          <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 w-full sm:w-auto justify-center font-black italic tracking-tight">
                            <CheckCircle2 className="w-4 h-4" /> RETO CONFIRMADO
                          </div>
                          <span className="text-xs font-black uppercase text-amber-500 tracking-widest italic">¡LISTO PARA JUGAR!</span>
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
    </div>
  )
}
