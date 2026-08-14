import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Users, Flag, CalendarDays, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { BusinessTableClient } from './BusinessTableClient'

export default async function AdminBusinessesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') redirect('/login')

  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: allCourts } = await supabase
    .from('courts')
    .select('id, business_id')

  const today = new Date().toISOString().split('T')[0]
  const { data: todayReservations } = await supabase
    .from('reservations')
    .select('id, business_id')
    .eq('reservation_date', today)

  let profiles: { id: string; full_name: string | null; phone: string | null }[] = []
  if (businesses && businesses.length > 0) {
    const ownerIds = businesses.map(b => b.owner_id).filter(Boolean)
    if (ownerIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', ownerIds)
      if (data) profiles = data
    }
  }

  // Combinar
  const mergedBusinesses = businesses?.map(b => {
    const ownerProfile = profiles.find(p => p.id === b.owner_id)
    const businessCourts = allCourts?.filter(c => c.business_id === b.id) || []
    const businessReservations = todayReservations?.filter(r => r.business_id === b.id) || []
    return { 
      ...b, 
      ownerProfile,
      courtCount: businessCourts.length,
      todayReservationsCount: businessReservations.length
    }
  }) || []

  const stats = {
    total: mergedBusinesses.length,
    active: mergedBusinesses.filter(b => b.is_active).length,
    inactive: mergedBusinesses.filter(b => !b.is_active).length,
    totalCourts: allCourts?.length || 0,
    totalTodayReservations: todayReservations?.length || 0
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-slate-950">Panel central de negocios</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Gestión global de la red de complejos deportivos.
          </p>
        </div>
        <Link href="/admin/businesses/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-xs h-12 rounded-xl shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-5 w-5" /> Registrar Nuevo Negocio
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Total negocios</p>
                <h3 className="text-3xl font-black text-slate-950">{stats.total}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{stats.active} Activos</span>
              <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">{stats.inactive} Bloqueados</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Canchas totales</p>
                <h3 className="text-3xl font-black text-slate-950">{stats.totalCourts}</h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Flag className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="mt-4 text-[10px] font-medium text-slate-500">Capacidad operativa global</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Reservas hoy</p>
                <h3 className="text-3xl font-black text-slate-950">{stats.totalTodayReservations}</h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <CalendarDays className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <p className="mt-4 text-[10px] font-medium text-slate-500">Movimiento en las últimas 24h</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Estado general</p>
                <h3 className="text-2xl font-black text-emerald-700">ÓPTIMO</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <ShieldAlert className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <p className="mt-4 text-[10px] font-medium text-slate-500">Plataforma estable</p>
          </CardContent>
        </Card>
      </div>

      <BusinessTableClient businesses={mergedBusinesses} />
    </div>
  )
}
