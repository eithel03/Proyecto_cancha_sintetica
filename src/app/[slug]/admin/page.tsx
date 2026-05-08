import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flag, CalendarDays, Users, ArrowUpRight, Activity } from 'lucide-react'
import { DashboardStats } from './DashboardStats'
import Link from 'next/link'

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

  // Fetch all reservations for stats (not just pending)
  const { data: allReservations } = await supabase
    .from('reservations')
    .select('id, status, reservation_date, courts(price_per_hour)')
    .eq('business_id', business.id)

  const pendingReservations = allReservations?.filter(r => r.status === 'pending') || []
  const confirmedReservations = allReservations?.filter(r => r.status === 'confirmed') || []

  // Fetch all challenges for stats
  const { data: allChallenges } = await supabase
    .from('challenges')
    .select('id, status, challenge_date')
    .eq('business_id', business.id)

  // Fetch counts
  const { count: courtsCountData } = await supabase
    .from('courts')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id)

  const courtsCount = courtsCountData || 0
  const reservationsCount = pendingReservations.length

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent uppercase italic">Panel de Control</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Gestionando <span className="text-primary font-bold">{business.name}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href={`/${business.slug}/admin/courts`} className="block">
          <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-md hover:border-primary/50 transition-all group overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">Canchas Activas</CardTitle>
              <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary/20 transition-colors">
                <Flag className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{courtsCount}</div>
              <p className="text-[10px] text-zinc-500 mt-1 font-bold uppercase">Disponibles para reserva</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href={`/${business.slug}/admin/reservations?status=pendientes`} className="block">
          <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-md hover:border-orange-500/50 transition-all group overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">Pendientes</CardTitle>
              <div className="bg-orange-500/10 p-2 rounded-xl group-hover:bg-orange-500/20 transition-colors">
                <CalendarDays className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-orange-500">{reservationsCount}</div>
              <p className="text-[10px] text-zinc-500 mt-1 font-bold uppercase tracking-tighter">Requieren tu atención inmediata</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-md hover:border-purple-500/50 transition-all group overflow-hidden h-full">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">Portal Público</CardTitle>
            <div className="bg-purple-500/10 p-2 rounded-xl group-hover:bg-purple-500/20 transition-colors">
              <Users className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-black truncate mt-1 text-purple-400">
              /{business.slug}
            </div>
            <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase text-primary hover:text-white transition-colors mt-1 inline-block">
              Ver vista de cliente
            </a>
          </CardContent>
        </Card>
      </div>

      <DashboardStats 
        reservations={allReservations || []} 
        challenges={allChallenges || []} 
      />
    </div>
  )
}
