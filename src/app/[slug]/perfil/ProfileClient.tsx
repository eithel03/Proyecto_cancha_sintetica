'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Clock4, 
  User, 
  LogOut, 
  Swords, 
  Trash2, 
  ShieldCheck,
  ArrowLeft,
  Eraser,
  Smartphone,
  CalendarClock,
  Settings
} from 'lucide-react'
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { updateProfile, hideHistoryItem, clearAllHistory } from './actions'
import { toast } from 'sonner'
import { formatTime12h } from '@/lib/utils'
import { EmptyState } from '@/components/portal'

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

  const isAdmin = profile.role === 'owner' || profile.role === 'super_admin'

  const showConfirm = (title: string, description: string, onConfirm: () => void, variant: 'danger' | 'primary' = 'primary') => {
    setConfirmConfig({ isOpen: true, title, description, onConfirm, variant })
  }

  async function handleUpdateProfile(formData: FormData) {
    const doUpdate = async () => {
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

    if (isAdmin) {
      showConfirm(
        'Cambiar Datos Administrativos',
        'Eres administrador. ¿Seguro que quieres cambiar tus datos personales desde aquí?',
        doUpdate
      )
    } else {
      await doUpdate()
    }
  }

  async function handleHideItem(type: 'reservation' | 'challenge', id: string) {
    showConfirm(
      'Ocultar Registro',
      '¿Deseas ocultar este registro de tu vista? No se borrará del sistema.',
      async () => {
        const result = await hideHistoryItem(type, id)
        if (result.success) {
          if (type === 'reservation') {
            setReservations((prev: any) => prev.filter((r: any) => r.id !== id))
          } else {
            setChallenges((prev: any) => prev.filter((c: any) => c.id !== id))
          }
          toast.success('Registro ocultado')
        } else {
          toast.error(result.error || 'No se pudo ocultar el registro')
        }
      }
    )
  }

  async function handleClearAll() {
    const businessId = reservations[0]?.business_id || challenges[0]?.business_id
    if (!businessId) return toast.error('No hay historial para limpiar.')

    showConfirm(
      'Limpiar Historial',
      '¿Seguro que quieres limpiar todo el historial de registros pasados? Esta acción no se puede deshacer.',
      async () => {
        setPending(true)
        const result = await clearAllHistory(businessId)
        setPending(false)
        if (result.success) {
          setReservations([])
          setChallenges([])
          toast.success('Historial limpiado')
        } else {
          toast.error(result.error || 'Error al limpiar historial')
        }
      },
      'danger'
    )
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${businessSlug}`
  }

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-6 sm:py-10 space-y-8 sm:space-y-10 animate-in fade-in duration-500">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <Link href={`/${businessSlug}`} className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> Volver al inicio
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/8 border border-primary/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
            <User className="w-3.5 h-3.5" /> Mi cuenta
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Mi perfil</h1>
          <p className="text-sm text-muted-foreground">Gestiona tu cuenta y tu actividad</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="w-full md:w-auto border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 font-medium text-sm h-11 px-6 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
        </Button>
      </div>

      {/* Admin Banner */}
      {isAdmin && (
        <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
          <div className="bg-amber-100 p-2.5 rounded-xl">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-amber-800">Cuenta administrativa</p>
            <p className="text-xs text-amber-700/80 mt-0.5">
              Sesión activa: <span className="font-semibold text-amber-900">{profile.email}</span>
            </p>
          </div>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto bg-gold hover:bg-[#ffd233] text-navy font-bold text-sm h-10 px-5 rounded-xl">
              Panel admin
            </Button>
          </Link>
        </div>
      )}

      {/* Tabs de contenido */}
      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="flex w-full max-w-md mx-auto h-12 bg-card border border-border rounded-xl p-1 gap-1 shadow-soft">
          <TabsTrigger value="perfil" className="flex-1 rounded-lg font-medium text-xs sm:text-sm text-muted-foreground hover:text-primary-green hover:bg-primary-green-subtle data-[state=active]:bg-primary-green data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all">
            <Settings className="w-3.5 h-3.5 mr-1.5" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="reservas" className="flex-1 rounded-lg font-medium text-xs sm:text-sm text-muted-foreground hover:text-primary-green hover:bg-primary-green-subtle data-[state=active]:bg-primary-green data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all">
            <CalendarClock className="w-3.5 h-3.5 mr-1.5" /> Reservas
          </TabsTrigger>
          <TabsTrigger value="retos" className="flex-1 rounded-lg font-medium text-xs sm:text-sm text-muted-foreground hover:text-primary-green hover:bg-primary-green-subtle data-[state=active]:bg-primary-green data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all">
            <Swords className="w-3.5 h-3.5 mr-1.5" /> Retos
          </TabsTrigger>
        </TabsList>

        {/* Tab Perfil */}
        <TabsContent value="perfil" className="mt-6">
          <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
            <div className="lg:col-span-4">
              <Card className="border-border bg-card shadow-soft rounded-2xl overflow-hidden">
                <CardHeader className="pb-5 text-center border-b border-border">
                  <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold tracking-tight text-foreground">{profile.full_name}</CardTitle>
                  <CardDescription className="text-sm text-slate-500 truncate px-4">{profile.email}</CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <form action={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Nombre completo</Label>
                      <Input name="full_name" defaultValue={profile.full_name} className="bg-white border-slate-200 h-11 font-medium rounded-xl focus-visible:ring-primary/20" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Teléfono móvil (+506)</Label>
                      <div className="relative">
                        <Input name="phone" type="tel" inputMode="tel" defaultValue={profile.phone} placeholder="8888-8888" className="bg-white border-slate-200 h-11 pl-11 font-medium rounded-xl focus-visible:ring-primary/20" />
                        <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <Button disabled={pending} className="w-full bg-gold hover:bg-[#ffd233] text-navy font-bold text-sm h-11 rounded-xl transition-colors">
                      {pending ? 'Guardando...' : 'Actualizar perfil'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-8">
              <Card className="border-border bg-card shadow-soft rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border p-5">
                  <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2.5 text-foreground">
                    <div className="p-2 bg-primary/10 rounded-lg"><User className="w-4 h-4 text-primary" /></div> Información de cuenta
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="bg-surface border border-border p-4 rounded-xl">
                      <p className="text-[11px] font-medium text-slate-500 mb-1">Email</p>
                      <p className="font-semibold text-foreground text-sm truncate">{profile.email}</p>
                    </div>
                    <div className="bg-surface border border-border p-4 rounded-xl">
                      <p className="text-[11px] font-medium text-slate-500 mb-1">Teléfono</p>
                      <p className="font-semibold text-foreground text-sm">{profile.phone || 'No registrado'}</p>
                    </div>
                    <div className="bg-surface border border-border p-4 rounded-xl">
                      <p className="text-[11px] font-medium text-slate-500 mb-1">Rol</p>
                      <p className="font-semibold text-foreground text-sm capitalize">{profile.role === 'customer' ? 'Cliente' : profile.role}</p>
                    </div>
                    <div className="bg-surface border border-border p-4 rounded-xl">
                      <p className="text-[11px] font-medium text-slate-500 mb-1">Reservas</p>
                      <p className="font-semibold text-foreground text-sm">{reservations.length} reserva{reservations.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab Reservas */}
        <TabsContent value="reservas" className="mt-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10"><CalendarClock className="w-4 h-4 text-primary" /></div> Mis reservas
              </h3>
              {reservations.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearAll}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs font-medium rounded-lg h-8 px-3"
                >
                  <Eraser className="w-3.5 h-3.5 mr-1.5" /> Limpiar
                </Button>
              )}
            </div>

            {reservations.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Tu agenda está libre"
                description="No tienes reservas activas todavía."
                action={
                  <Link href={`/${businessSlug}/reservar`}>
                    <Button className="bg-gold hover:bg-[#ffd233] text-navy font-bold text-sm h-11 px-8 rounded-xl">
                      Reservar ahora
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3">
                {reservations.map((res) => (
                  <Card key={res.id} className="border-border bg-card hover:border-slate-300 transition-colors rounded-2xl overflow-hidden">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${res.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                            {res.status === 'confirmed' ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <Clock4 className="w-5 h-5 sm:w-6 sm:h-6" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-foreground truncate">{res.courts?.name}</h4>
                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${res.status === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                {res.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {res.reservation_date}</span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" /> 
                                {formatTime12h(res.start_time.substring(0, 5))} – {formatTime12h(`${res.start_time.split(':')[0].padStart(2, '0')}:59`)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {(['cancelled', 'completed'].includes(res.status) || res.reservation_date < new Date().toLocaleDateString('sv-SE')) && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleHideItem('reservation', res.id)}
                            className="w-9 h-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        {/* Tab Retos */}
        <TabsContent value="retos" className="mt-6">
          <section className="space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-green-50"><Swords className="w-4 h-4 text-green-700" /></div> Mis retos
            </h3>
            
            {challenges.length === 0 ? (
              <EmptyState
                icon={Swords}
                title="¿Buscas un rival?"
                description="Encuentra o publica retos en el muro."
                action={
                  <Link href={`/${businessSlug}/retos`}>
                    <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50 font-semibold text-sm h-11 px-8 rounded-xl">
                      Ir al muro de retos
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3">
                {challenges.map((challenge) => (
                  <Card key={challenge.id} className="border-border bg-card hover:border-green-200 transition-colors rounded-2xl overflow-hidden">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-2 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-foreground truncate">{challenge.courts?.name}</h4>
                            <span className="rounded-full bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 text-[10px] font-semibold">
                              {challenge.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {challenge.challenge_date}</span>
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> {formatTime12h(challenge.challenge_time.substring(0, 5))}</span>
                          </div>
                          {challenge.notes && (
                            <p className="text-sm italic text-slate-600 bg-slate-50 border border-slate-200 p-3 rounded-xl max-w-lg">&ldquo;{challenge.notes}&rdquo;</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {challenge.status === 'accepted' && challenge.opponent && (
                            <div className="hidden sm:flex items-center gap-2.5 bg-green-50 border border-green-200 p-2.5 rounded-xl">
                              <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase text-green-700 tracking-wide">Rival</p>
                                <p className="font-semibold text-xs text-foreground truncate max-w-[110px]">{challenge.opponent.full_name}</p>
                              </div>
                            </div>
                          )}

                          {(['cancelled', 'completed'].includes(challenge.status) || challenge.challenge_date < new Date().toLocaleDateString('sv-SE')) && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleHideItem('challenge', challenge.id)}
                              className="w-9 h-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>

      <ConfirmationDialog 
        isOpen={confirmConfig.isOpen}
        onOpenChange={(open) => setConfirmConfig((prev: any) => ({ ...prev, isOpen: open }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
        variant={confirmConfig.variant}
      />
    </div>
  )
}
