import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TournamentClient from './TournamentClient'

export default async function TournamentPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch business to get business_id
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    // If no business, maybe they need onboarding
    redirect('/onboarding')
  }

  // Fetch teams
  const { data: teams } = await supabase
    .from('tournament_teams')
    .select('*')
    .eq('business_id', business.id)
    .order('name')

  // Fetch players (needed for selection)
  const { data: players } = await supabase
    .from('tournament_players')
    .select('*, tournament_teams(name, gender)')
    .eq('business_id', business.id)
    .order('first_name')

  // Fetch matches
  const { data: matches } = await supabase
    .from('tournament_matches')
    .select('*, home:home_team_id(name, logo_url, gender), away:away_team_id(name, logo_url, gender), court:court_id(name)')
    .eq('business_id', business.id)
    .order('match_date', { ascending: false })

  // Fetch courts for match scheduling
  const { data: courts } = await supabase
    .from('courts')
    .select('id, name')
    .eq('business_id', business.id)
    .eq('is_active', true)

  // Fetch stats (match events) for team details
  const { data: stats } = await supabase
    .from('tournament_match_events')
    .select('*, player:player_id(first_name, last_name, team_id), team:team_id(name)')
    .eq('business_id', business.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Torneo</h1>
        <p className="text-muted-foreground">Administra equipos, jugadores y jornadas del campeonato.</p>
      </div>

      <TournamentClient 
        businessId={business.id}
        initialTeams={teams || []}
        initialPlayers={players || []}
        initialMatches={matches || []}
        courts={courts || []}
        stats={stats || []}
      />
    </div>
  )
}
