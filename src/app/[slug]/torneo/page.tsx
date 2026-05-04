import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Phone, Trophy, CalendarCheck, Flag, Swords, User } from 'lucide-react'
import TournamentPublicClient from './TournamentPublicClient'

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function PublicTournamentPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  // Auth Check - Redirect if not customer
  const { data: { user } } = await supabase.auth.getUser()
  let isCustomer = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile && profile.role === 'customer') {
      isCustomer = true
    }
  }

  const refererPath = `/${business.slug}/torneo`

  if (!isCustomer) {
    // Si no es cliente (o no está logueado), redirigir directamente al login
    redirect(`/cliente/login?redirectTo=${encodeURIComponent(refererPath)}`)
  }

  // Fetch Tournament Data
  const { data: matches } = await supabase
    .from('tournament_matches')
    .select('*, home:home_team_id(name, logo_url), away:away_team_id(name, logo_url), court:court_id(name)')
    .eq('business_id', business.id)
    .order('match_date', { ascending: false })

  const { data: standings } = await supabase
    .from('tournament_standings')
    .select('*')
    .eq('business_id', business.id)

  const { data: teams } = await supabase
    .from('tournament_teams')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)

  const { data: stats } = await supabase
    .from('tournament_match_events')
    .select('*, player:player_id(first_name, last_name, team_id), team:team_id(name)')
    .eq('business_id', business.id)

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      {/* Header Público */}
      <header className="relative bg-zinc-950/80 border-b border-white/10 p-8 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background -z-10" />
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent drop-shadow-md">
          {business.name}
        </h1>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mt-4">
          {business.location && (
            <p className="text-muted-foreground flex items-center justify-center gap-1 bg-white/5 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
              <MapPin className="w-4 h-4 text-primary" /> {business.location}
            </p>
          )}
          {business.phone && (
            <p className="text-muted-foreground flex items-center justify-center gap-1 bg-white/5 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
              <Phone className="w-4 h-4 text-primary" /> {business.phone}
            </p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Navigation Tabs */}
        <div className="flex justify-center border-b border-white/10 mb-8">
          <Link 
            href={`/${business.slug}`} 
            className="px-6 py-4 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-white/20 transition-all flex items-center gap-2"
          >
            <CalendarCheck className="w-4 h-4" /> Reservas
          </Link>
          <div 
            className="px-6 py-4 border-b-2 border-primary text-primary font-bold flex items-center gap-2 cursor-default"
          >
            <Flag className="w-4 h-4" /> Torneo
          </div>
          <Link 
            href={`/${business.slug}/retos`} 
            className="px-6 py-4 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-white/20 transition-all flex items-center gap-2"
          >
            <Swords className="w-4 h-4" /> Retos
          </Link>
          <Link 
            href={`/${business.slug}/perfil`} 
            className="px-6 py-4 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-white/20 transition-all flex items-center gap-2"
          >
            <User className="w-4 h-4" /> Mis Reservas
          </Link>
        </div>

        <TournamentPublicClient 
          matches={matches || []}
          standings={standings || []}
          teams={teams || []}
          stats={stats || []}
        />
      </main>

      <footer className="text-center py-8 text-sm text-muted-foreground border-t border-white/10 bg-zinc-950">
        Potenciado por <Link href="/" className="text-primary font-medium hover:underline">SaaSintética</Link>
      </footer>
    </div>
  )
}
