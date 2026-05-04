import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flag, CalendarDays, Users, ArrowUpRight, Activity } from 'lucide-react'
import { DashboardCharts } from './DashboardCharts'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the business for this user
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    redirect('/login')
  }

  if (business.is_active === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
        <div className="bg-red-500/10 p-4 rounded-full mb-4">
          <Activity className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="text-4xl font-bold text-red-500">Cuenta Suspendida</h1>
        <p className="text-xl text-muted-foreground max-w-md">Tu negocio ha sido desactivado por la administración. Por favor, contacta con soporte para reactivar tu cuenta.</p>
      </div>
    )
  }

  // Fetch some quick stats
  const { count: courtsCount } = await supabase
    .from('courts')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id)

  const { count: reservationsCount } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id)
    .eq('status', 'pending')

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido de vuelta, {business.name}</h1>
          <p className="text-muted-foreground mt-2">
            Aquí tienes un resumen rápido del rendimiento de tus canchas.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canchas Activas</CardTitle>
            <div className="bg-primary/20 p-2 rounded-lg">
              <Flag className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{courtsCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center text-emerald-400">
              <ArrowUpRight className="h-3 w-3 mr-1" /> +1 este mes
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas Pendientes</CardTitle>
            <div className="bg-orange-500/20 p-2 rounded-lg">
              <CalendarDays className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reservationsCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren tu confirmación hoy</p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Estimados</CardTitle>
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₡450K</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center text-emerald-400">
              <ArrowUpRight className="h-3 w-3 mr-1" /> +12% vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enlace Público</CardTitle>
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <Users className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate mt-1">
              /{business.slug}
            </div>
            <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
              Visitar mi portal
            </a>
          </CardContent>
        </Card>
      </div>

      <DashboardCharts />
    </div>
  )
}
