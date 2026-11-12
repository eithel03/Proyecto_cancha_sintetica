import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TournamentPublicClient from './TournamentPublicClient'
import { PublicNav } from '@/components/PublicNav'
import { PublicFooter } from '@/components/PublicFooter'
import { getPublicBusiness } from '@/lib/public-data'

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function PublicTournamentPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getPublicBusiness(slug)

  if (!business) notFound()

  // SECURITY: el toggle del negocio bloquea el acceso público al torneo.
  if (business.show_tournament === false) {
    redirect(`/${slug}`)
  }

  const supabase = await createClient()

  const [
    { data: matches },
    { data: teams },
    { data: rawStandings },
    { data: stats },
    { data: classificationZones },
  ] = await Promise.all([
    supabase
      .from('tournament_matches')
      .select('*, home:home_team_id(name, logo_url), away:away_team_id(name, logo_url), court:court_id(name)')
      .eq('business_id', business.id)
      .order('match_date', { ascending: false }),
    supabase
      .from('tournament_teams')
      .select('*, players:tournament_players(*)')
      .eq('business_id', business.id)
      .eq('is_active', true),
    supabase.from('tournament_standings').select('*').eq('business_id', business.id),
    supabase
      .from('tournament_match_events')
      .select('*, player:player_id(first_name, last_name, team_id), team:team_id(name)')
      .eq('business_id', business.id),
    supabase.from('tournament_classification_zones').select('*').eq('business_id', business.id),
  ])

  const standings = (rawStandings || []).map(s => ({
    ...s,
    gender: teams?.find(t => t.id === s.team_id)?.gender || 'masculino'
  }))

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      <PublicNav slug={business.slug} businessName={business.name} showTournament={business.show_tournament ?? true} />

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
