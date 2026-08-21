import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TournamentPublicClient from './TournamentPublicClient'
import { PublicNav } from '@/components/PublicNav'
import { PublicFooter } from '@/components/PublicFooter'

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

  const { data: classificationZones } = await supabase
    .from('tournament_classification_zones')
    .select('*')
    .eq('business_id', business.id)

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      <PublicNav slug={business.slug} businessName={business.name} />

      <main className="flex-1 w-full overflow-x-clip animate-in fade-in slide-in-from-bottom-4 duration-700">
        <TournamentPublicClient 
          businessId={business.id}
          businessName={business.name}
          matches={matches || []}
          standings={standings || []}
          teams={teams || []}
          stats={stats || []}
          classificationZones={classificationZones || []}
        />
      </main>

      <PublicFooter business={business} />
    </div>
  )
}
