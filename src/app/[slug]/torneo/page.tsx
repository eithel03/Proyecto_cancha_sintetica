import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Phone, Trophy, CalendarCheck, Flag, Swords, User } from 'lucide-react'
import TournamentPublicClient from './TournamentPublicClient'
import { PublicNav } from '@/components/PublicNav'

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

  // Ya no redirigimos aquí. Dejamos que el usuario vea la información del torneo.
  /*
  if (!isCustomer) {
    redirect(`/cliente/login?redirectTo=${encodeURIComponent(refererPath)}`)
  }
  */

  // Fetch Tournament Data
  const { data: matches } = await supabase
    .from('tournament_matches')
    .select('*, home:home_team_id(name, logo_url), away:away_team_id(name, logo_url), court:court_id(name)')
    .eq('business_id', business.id)
    .order('match_date', { ascending: false })

  const { data: teams } = await supabase
    .from('tournament_teams')
    .select('*, players:tournament_players(*)')
    .eq('business_id', business.id)
    .eq('is_active', true)

  // Asignamos el género a los standings basándonos en el equipo
  const { data: rawStandings } = await supabase
    .from('tournament_standings')
    .select('*')
    .eq('business_id', business.id)

  const standings = (rawStandings || []).map(s => ({
    ...s,
    gender: (teams?.find(t => t.id === s.team_id) as any)?.gender || 'masculino'
  }))

  const { data: stats } = await supabase
    .from('tournament_match_events')
    .select('*, player:player_id(first_name, last_name, team_id), team:team_id(name)')
    .eq('business_id', business.id)

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      <PublicNav slug={business.slug} businessName={business.name} />

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
