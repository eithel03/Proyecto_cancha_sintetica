'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, CheckCircle2, XCircle, Clock4, User, LogOut, Swords, Trash2, Eraser } from 'lucide-react'
import { toast } from 'sonner'
import { updateProfile, hideHistoryItem, clearAllHistory } from './actions'
import Link from 'next/link'

export default function ProfileClient({ initialProfile, initialReservations, initialChallenges, businessSlug }: { 
  initialProfile: any, 
  initialReservations: any[],
  initialChallenges: any[],
  businessSlug: string
}) {
  const [profile, setProfile] = useState(initialProfile)
  const [reservations, setReservations] = useState(initialReservations)
  const [challenges, setChallenges] = useState(initialChallenges)
  const [pending, setPending] = useState(false)

  async function handleUpdateProfile(formData: FormData) {
    setPending(true)
    const result = await updateProfile(formData)
    setPending(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Perfil actualizado correctamente')
      setProfile(result.data)
    }
  }

  async function handleHideItem(type: 'reservation' | 'challenge', id: string) {
    if (!confirm('¿Deseas eliminar este registro de tu vista?')) return
    
    const result = await hideHistoryItem(type, id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Registro ocultado')
      if (type === 'reservation') {
        setReservations(prev => prev.filter(r => r.id !== id))
      } else {
        setChallenges(prev => prev.filter(c => c.id !== id))
      }
    }
  }

  async function handleClearHistory() {
    if (!confirm('¿Deseas limpiar todo tu historial de retos y reservas pasadas? Esto no afectará las reservas vigentes.')) return
    
    setPending(true)
    const businessId = reservations[0]?.business_id || challenges[0]?.business_id
    if (!businessId) {
      setPending(false)
      return toast.error('No hay historial para limpiar.')
    }

    const result = await clearAllHistory(businessId)
    setPending(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Historial limpiado correctamente.')
      window.location.reload()
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'confirmed': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Confirmada</Badge>
      case 'pending': return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock4 className="w-3 h-3 mr-1" /> Pendiente</Badge>
      case 'accepted': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Swords className="w-3 h-3 mr-1" /> Aceptado</Badge>
      case 'cancelled': return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Cancelada</Badge>
      case 'completed': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Completada</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[350px_1fr]">
      {/* Sidebar: Datos Personales */}
      <div className="space-y-6">
        <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Mis Datos
            </CardTitle>
            <CardDescription>Mantén tu información actualizada para tus reservas.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo</Label>
                <Input id="full_name" name="full_name" defaultValue={profile.full_name} placeholder="Tu nombre" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-center px-3 rounded-md bg-white/10 border border-white/10 text-zinc-400 text-sm font-bold">
                    +506
                  </div>
                  <Input id="phone" name="phone" defaultValue={profile.phone} placeholder="8888 8888" required className="flex-1" />
                </div>
              </div>
              <Button type="submit" className="w-full font-bold" disabled={pending}>
                {pending ? 'Guardando...' : 'Actualizar Perfil'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {(reservations.length > 0 || challenges.length > 0) && (
          <Button 
            variant="outline" 
            className="w-full border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={handleClearHistory}
            disabled={pending}
          >
            <Eraser className="w-4 h-4 mr-2" /> Limpiar Historial Pasado
          </Button>
        )}

        <Button 
          variant="outline" 
          className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors"
          onClick={async () => {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            await supabase.auth.signOut()
            window.location.href = `/${businessSlug}`
          }}
        >
          <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
        </Button>
      </div>

      {/* Main: Reservas y Retos */}
      <div className="space-y-12">
        {/* Sección Reservas */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Mis Reservas en {businessSlug}
          </h3>

          {reservations.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl bg-card/30">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground text-lg">No hay reservas visibles.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {reservations.map((res) => (
                <Card key={res.id} className="border-white/10 bg-zinc-900/40 border-l-4 border-l-primary/30 group">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-xl">{res.courts?.name}</span>
                          {getStatusBadge(res.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-primary" /> {res.reservation_date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-primary" /> {res.start_time.substring(0, 5)}</span>
                        </div>
                      </div>
                      
                      {(() => {
                        const isPast = new Date(res.reservation_date + 'T23:59:59') < new Date()
                        const isFinalStatus = ['cancelled', 'completed'].includes(res.status)
                        
                        if (isPast || isFinalStatus) {
                          return (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all"
                              onClick={() => handleHideItem('reservation', res.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sección Retos */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" /> Mis Retos / Desafíos
          </h3>

          {challenges.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl bg-card/30">
              <Swords className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground text-lg">No hay retos visibles.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {challenges.map((reto) => {
                const isCreator = profile.id === reto.creator_id
                const isPast = new Date(reto.challenge_date + 'T23:59:59') < new Date()
                const isFinalStatus = ['cancelled', 'completed'].includes(reto.status)

                return (
                  <Card key={reto.id} className={`border-white/10 bg-zinc-900/40 border-l-4 group ${isCreator ? 'border-l-primary' : 'border-l-emerald-500'}`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-xl">
                              {isCreator ? 'Reto Creado' : 'Reto Aceptado'} - {reto.courts?.name}
                            </span>
                            {getStatusBadge(reto.status)}
                          </div>
                          <p className="text-sm text-zinc-400">
                            {reto.status === 'accepted' && isCreator && (
                              <span className="text-emerald-400 font-bold">¡Aceptado por un rival! Esperando confirmación admin.</span>
                            )}
                            {reto.status === 'open' && isCreator && "Buscando rival..."}
                            {reto.status === 'confirmed' && "¡Confirmado! Revisa tus reservas."}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-primary" /> {reto.challenge_date}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-primary" /> {reto.challenge_time.substring(0, 5)}</span>
                          </div>
                        </div>

                        {(isPast || isFinalStatus) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all"
                            onClick={() => handleHideItem('challenge', reto.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
