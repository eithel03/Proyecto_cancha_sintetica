import { createClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin'
import TournamentClient from './TournamentClient'

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function TournamentPage({ params }: PageProps) {
  const { slug } = await params
  const { business } = await getAdminSession(slug)
  const supabase = await createClient()

  const [{ data: teams }, { data: players }, { data: matches }, { data: events }, { data: courts }] = await Promise.all([
    supabase
      .from('tournament_teams')
      .select('*')
      .eq('business_id', business.id)
      .order('name'),
    supabase
      .from('tournament_players')
      .select('*, tournament_teams(name, gender)')
      .eq('business_id', business.id)
      .order('first_name'),
    supabase
      .from('tournament_matches')
      .select('*, home:home_team_id(name, gender, logo_url), away:away_team_id(name, gender, logo_url), court:court_id(name)')
      .eq('business_id', business.id)
      .order('match_date', { ascending: false }),
    supabase
      .from('tournament_match_events')
      .select('*, player:player_id(first_name, last_name, team_id), team:team_id(name, gender)')
      .eq('business_id', business.id),
    supabase
      .from('courts')
      .select('id, name')
      .eq('business_id', business.id)
      .eq('is_active', true),
  ])

  const { data: classificationZones } = await supabase
    .from('tournament_classification_zones')
    .select('gender, direct_count, playoff_count, eliminated_count')
    .eq('business_id', business.id)

  // Fetch stats (match events) for team details
  const { data: stats } = await supabase
    .from('tournament_match_events')
    .select('*, player:player_id(first_name, last_name, team_id), team:team_id(name)')
    .eq('business_id', business.id)

  return (
    <TournamentClient
      businessId={business.id}
      slug={slug}
      initialTeams={teams || []}
      initialPlayers={players || []}
      initialMatches={matches || []}
      initialEvents={events || []}
      courts={courts || []}
      initialClassificationZones={classificationZones || []}
    />
  )
}
