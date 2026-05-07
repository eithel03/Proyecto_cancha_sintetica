'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Clock4, 
  User, 
  LogOut, 
  Swords, 
  Trash2, 
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  Eraser,
  Smartphone
} from 'lucide-react'
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { updateProfile, hideHistoryItem, clearAllHistory } from './actions'
import { toast } from 'sonner'

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
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-6 sm:py-8 space-y-8 sm:space-y-10 animate-in fade-in duration-1000">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <Link href={`/${businessSlug}`} className="group inline-flex items-center gap-2 text-primary hover:text-white transition-colors text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1 sm:mb-2">
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:-translate-x-1" /> Volver a {businessSlug}
          </Link>
          <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase text-white drop-shadow-sm">Mi Perfil</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] sm:text-xs">Gestión de cuenta y actividades</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="w-full md:w-auto border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 font-black uppercase tracking-widest text-[10px] sm:text-xs h-12 sm:h-14 px-8 rounded-2xl transition-all"
        >
          <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
        </Button>
      </div>

      {isAdmin && (
        <div className="bg-amber-500/5 border border-amber-500/20 p-4 sm:p-6 rounded-3xl flex flex-col sm:flex-row items-center gap-4 sm:gap-5 shadow-lg shadow-amber-500/5">
          <div className="bg-amber-500/20 p-3 rounded-2xl">
            <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-amber-500 font-black uppercase text-[10px] sm:text-sm tracking-widest">Cuenta Administrativa</p>
            <p className="text-amber-200/60 text-[11px] sm:text-sm font-medium mt-1">
              Sesión activa: <span className="text-white font-bold">{profile.email}</span>
            </p>
          </div>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl">
              Panel Admin
            </Button>
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 sm:gap-10">
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-3xl overflow-hidden relative rounded-[32px] sm:rounded-[40px]">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-emerald-500 to-primary" />
            <CardHeader className="pb-6 text-center">
              <div className="mx-auto w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary to-emerald-600 p-1 mb-4 sm:mb-6 shadow-2xl shadow-primary/30 rotate-3 transition-transform hover:rotate-0">
                <div className="w-full h-full bg-zinc-950 rounded-[inherit] flex items-center justify-center">
                  <User className="w-10 h-10 sm:w-14 sm:h-14 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase">{profile.full_name}</CardTitle>
              <CardDescription className="text-zinc-500 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.2em] truncate px-4">{profile.email}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <form action={handleUpdateProfile} className="space-y-4 sm:space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Nombre Completo</Label>
                    <Input name="full_name" defaultValue={profile.full_name} className="bg-zinc-900/50 border-white/10 h-12 sm:h-14 font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Teléfono Móvil (+506)</Label>
                    <div className="relative">
                      <Input name="phone" defaultValue={profile.phone} className="bg-zinc-900/50 border-white/10 h-12 sm:h-14 pl-12 font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl focus:ring-primary/20" />
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    </div>
                  </div>
                </div>
                <Button disabled={pending} className="w-full font-black uppercase tracking-widest text-[10px] sm:text-sm h-12 sm:h-14 rounded-xl sm:rounded-2xl shadow-lg shadow-primary/20">
                  {pending ? 'Guardando...' : 'Actualizar Perfil'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-10 sm:space-y-12">
          <section className="space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between px-2 sm:px-0">
              <h3 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase flex items-center gap-3 sm:gap-4 text-white">
                <div className="w-2 sm:w-2.5 h-8 sm:h-10 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" /> Mis Reservas
              </h3>
              {reservations.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearAll}
                  className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 font-black text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl px-3 sm:px-4 h-8 sm:h-10"
                >
                  <Eraser className="w-3.5 h-3.5 mr-1 sm:mr-2" /> Limpiar
                </Button>
              )}
            </div>

            {reservations.length === 0 ? (
              <div className="bg-zinc-900/10 border-2 border-dashed border-white/5 rounded-[32px] sm:rounded-[40px] p-10 sm:p-20 text-center space-y-4 sm:space-y-6 group hover:border-primary/20 transition-all duration-500">
                <div className="bg-zinc-900/80 w-16 h-16 sm:w-24 sm:h-24 rounded-[24px] sm:rounded-[32px] flex items-center justify-center mx-auto mb-2 sm:mb-4 shadow-2xl group-hover:scale-110 transition-transform">
                  <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-700" />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-zinc-400 font-black italic text-lg sm:text-xl uppercase tracking-tighter">Tu agenda está libre</p>
                  <p className="text-zinc-600 text-[10px] sm:text-sm font-medium uppercase tracking-widest">No tienes reservas activas.</p>
                </div>
                <Link href={`/${businessSlug}/reservar`} className="block">
                  <Button className="w-full sm:w-auto font-black uppercase tracking-widest text-[10px] sm:text-xs h-12 sm:h-14 px-8 sm:px-10 rounded-xl sm:rounded-2xl shadow-xl shadow-primary/20">
                    RESERVAR AHORA
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {reservations.map((res) => (
                  <Card key={res.id} className="border-white/5 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all group rounded-[28px] sm:rounded-[32px] overflow-hidden hover:border-primary/20 duration-300">
                    <CardContent className="p-4 sm:p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-8">
                        <div className="flex items-center gap-3 sm:gap-6">
                          <div className={`w-12 h-12 sm:w-20 sm:h-20 rounded-[18px] sm:rounded-[28px] flex items-center justify-center shadow-lg flex-shrink-0 ${res.status === 'confirmed' ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-500'}`}>
                            {res.status === 'confirmed' ? <CheckCircle2 className="w-6 h-6 sm:w-10 sm:h-10" /> : <Clock4 className="w-6 h-6 sm:w-10 sm:h-10" />}
                          </div>
                          <div className="space-y-0.5 sm:space-y-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                              <h4 className="text-base sm:text-2xl font-black italic tracking-tighter uppercase text-white truncate max-w-[140px] sm:max-w-none">{res.courts?.name}</h4>
                              <span className={`text-[7px] sm:text-[9px] font-black px-2 py-0.5 sm:py-1 rounded-full uppercase tracking-widest shadow-sm self-start sm:self-auto ${res.status === 'confirmed' ? 'bg-primary text-black' : 'bg-amber-500 text-black'}`}>
                                {res.status === 'confirmed' ? 'CONFIRMADA' : 'PENDIENTE'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[8px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                              <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" /> {res.reservation_date}</span>
                              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" /> {res.start_time.substring(0, 5)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5 sm:border-transparent">
                          {['cancelled', 'completed'].includes(res.status) && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleHideItem('reservation', res.id)}
                              className="w-9 h-9 sm:w-14 sm:h-14 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl sm:rounded-2xl transition-all"
                            >
                              <Trash2 className="w-4 h-4 sm:w-6 sm:h-6" />
                            </Button>
                          )}
                          <Link href={`/${businessSlug}/reservar?courtId=${res.court_id}`} className="flex-1 sm:flex-none">
                            <Button variant="outline" className="w-full sm:w-auto font-black text-[9px] sm:text-xs uppercase tracking-widest h-10 sm:h-14 px-5 sm:px-8 rounded-xl sm:rounded-2xl border-white/10 hover:border-primary/50 transition-all">
                              Repetir <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1 sm:ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-6 sm:space-y-8">
            <h3 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase flex items-center gap-3 sm:gap-4 text-white">
              <div className="w-2 sm:w-2.5 h-8 sm:h-10 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" /> Mis Retos
            </h3>
            
            {challenges.length === 0 ? (
              <div className="bg-emerald-500/[0.02] border-2 border-dashed border-emerald-500/10 rounded-[32px] sm:rounded-[40px] p-10 sm:p-20 text-center space-y-4">
                <p className="text-emerald-500/40 font-black italic text-lg sm:text-xl uppercase tracking-tighter">¿Buscas un rival?</p>
                <p className="text-zinc-600 text-[10px] sm:text-sm font-medium uppercase tracking-widest">Encuentra o publica retos.</p>
                <Link href={`/${businessSlug}/retos`} className="block">
                  <Button variant="outline" className="w-full sm:w-auto mt-2 sm:mt-4 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 font-black uppercase tracking-widest text-[10px] sm:text-xs h-12 sm:h-14 px-8 sm:px-10 rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-500/5">
                    IR AL MURO DE RETOS
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {challenges.map((challenge) => (
                  <Card key={challenge.id} className="border-emerald-500/10 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.08] transition-all rounded-[28px] sm:rounded-[32px] overflow-hidden group">
                    <CardContent className="p-4 sm:p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-8">
                        <div className="space-y-3 sm:space-y-4 flex-1">
                          <div className="flex items-center gap-3 sm:gap-6">
                            <div className="p-2.5 sm:p-4 bg-emerald-500/20 rounded-xl sm:rounded-2xl shadow-inner flex-shrink-0">
                              <Swords className="w-5 h-5 sm:w-8 sm:h-8 text-emerald-500" />
                            </div>
                            <div className="min-w-0">
                               <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                                 <h4 className="font-black italic text-base sm:text-2xl uppercase tracking-tighter text-white truncate max-w-[140px] sm:max-w-none">{challenge.courts?.name}</h4>
                                 <span className="text-[7px] sm:text-[9px] font-black px-2 py-0.5 sm:py-1 rounded-full uppercase tracking-widest shadow-sm bg-emerald-500 text-black self-start sm:self-auto">
                                   {challenge.status.toUpperCase()}
                                 </span>
                               </div>
                               <div className="flex gap-x-3 gap-y-1 text-[8px] sm:text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mt-0.5 sm:mt-2">
                                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {challenge.challenge_date}</span>
                                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {challenge.challenge_time.substring(0, 5)}</span>
                              </div>
                            </div>
                          </div>
                          {challenge.notes && (
                            <p className="text-[10px] sm:text-sm italic text-emerald-100/50 bg-black/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5">"{challenge.notes}"</p>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5 sm:border-transparent gap-4">
                          {challenge.status === 'accepted' && challenge.opponent && (
                            <div className="bg-emerald-500/10 p-2.5 sm:p-5 rounded-2xl sm:rounded-[28px] flex items-center gap-3 sm:gap-4 border border-emerald-500/20 shadow-xl flex-1 sm:flex-none">
                              <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg flex-shrink-0">
                                <User className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-black" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[7px] sm:text-[9px] font-black uppercase text-emerald-500 tracking-widest">Rival</p>
                                <p className="font-black text-xs sm:text-lg text-white uppercase tracking-tighter truncate max-w-[90px] sm:max-w-none">{challenge.opponent.full_name}</p>
                              </div>
                            </div>
                          )}

                          {['cancelled', 'completed'].includes(challenge.status) && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleHideItem('challenge', challenge.id)}
                              className="w-9 h-9 sm:w-14 sm:h-14 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl sm:rounded-2xl transition-all ml-auto"
                            >
                              <Trash2 className="w-4 h-4 sm:w-6 sm:h-6" />
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
        </div>
      </div>
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
