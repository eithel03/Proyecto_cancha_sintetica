import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, Flag, CalendarDays, Activity, ArrowUpRight } from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    redirect('/login')
  }

  // Fetch stats (Super Admin bypasses RLS so they can see all)
  const { count: businessesCount } = await supabase.from('businesses').select('*', { count: 'exact', head: true })
  const { count: activeBusinesses } = await supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('is_active', true)
  const { count: courtsCount } = await supabase.from('courts').select('*', { count: 'exact', head: true })
  const { count: reservationsCount } = await supabase.from('reservations').select('*', { count: 'exact', head: true })
  const { count: pendingReservations } = await supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'pending')

  return (
    <div className="space-y-7">
      <div className="rounded-2xl bg-emerald-950 p-4 text-white shadow-lg shadow-emerald-950/10 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Super administrador</p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Panel de control general</h2>
            <p className="mt-2 text-sm font-medium text-emerald-100/75">Métricas globales de la plataforma SaaSintética.</p>
          </div>
          <ArrowUpRight className="hidden h-8 w-8 text-emerald-300 sm:block" />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Total negocios</CardTitle>
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Store className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-slate-950">{businessesCount || 0}</div>
            <p className="mt-1 text-xs font-medium text-emerald-700">{activeBusinesses || 0} activos</p>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Total canchas</CardTitle>
            <span className="rounded-lg bg-sky-50 p-2 text-sky-700"><Flag className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-slate-950">{courtsCount || 0}</div>
            <p className="mt-1 text-xs font-medium text-slate-500">Capacidad operativa global</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Total reservas</CardTitle>
            <span className="rounded-lg bg-amber-50 p-2 text-amber-700"><Activity className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-slate-950">{reservationsCount || 0}</div>
            <p className="mt-1 text-xs font-medium text-slate-500">Reservas registradas</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Reservas pendientes</CardTitle>
            <span className="rounded-lg bg-rose-50 p-2 text-rose-700"><CalendarDays className="h-4 w-4" /></span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-slate-950">{pendingReservations || 0}</div>
            <p className="mt-1 text-xs font-medium text-rose-700">Requieren atención</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
