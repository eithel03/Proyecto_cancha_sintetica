import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicBusiness } from '@/lib/public-data'
import ChallengesClient from './ChallengesClient'
import { PublicNav } from '@/components/PublicNav'
import { PublicFooter } from '@/components/PublicFooter'

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function ChallengesPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const business = await getPublicBusiness(slug)

  if (!business) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const challengeQuery = supabase
    .from('challenges_public')
    .select('id, business_id, court_id, court_name, creator_id, opponent_id, customer_name, challenge_date, challenge_time, notes, status, gender, men_count, women_count')
    .eq('business_id', business.id)
    // Confirmed challenges are private to the admin panel. Clients only see
    // challenges that can still be accepted, plus their own active challenges.
    .in('status', ['open', 'accepted'])

  const visibleChallengesQuery = user?.id
    ? challengeQuery.or(`status.eq.open,creator_id.eq.${user.id}`)
    : challengeQuery.eq('status', 'open')

  const [
    { data: challenges },
    { data: courts },
    { data: businessHours },
    { data: exceptions },
  ] = await Promise.all([
    visibleChallengesQuery
      .order('challenge_date', { ascending: true })
      .order('challenge_time', { ascending: true }),
    supabase
      .from('courts')
      .select('id, name, capacity')
      .eq('business_id', business.id)
      .eq('is_active', true),
    supabase
      .from('business_hours')
      .select('day_of_week, open_time, close_time, is_closed')
      .eq('business_id', business.id),
    supabase
      .from('business_exceptions')
      .select('exception_date, reason, is_closed')
      .eq('business_id', business.id)
      .eq('is_closed', true),
  ])

  const opponentIds = Array.from(new Set(
    (challenges || [])
      .map((challenge) => challenge.opponent_id)
      .filter((id): id is string => Boolean(id))
  ))

  let opponentNames = new Map<string, string | null>()
  if (opponentIds.length > 0) {
    const { data: publicProfiles } = await supabase
      .from('profiles_public')
      .select('id, full_name')
      .in('id', opponentIds)

    opponentNames = new Map(
      (publicProfiles || []).map((profile: { id: string; full_name: string | null }) => [profile.id, profile.full_name])
    )
  }

  const challengesWithOpponent = (challenges || []).map((challenge) => ({
    ...challenge,
    courts: challenge.court_name ? { name: challenge.court_name } : null,
    opponent: challenge.opponent_id
      ? { full_name: opponentNames.get(challenge.opponent_id) ?? null }
      : null,
  }))

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      <PublicNav slug={business.slug} businessName={business.name} showTournament={business.show_tournament ?? true} />

      <main className="flex-1 w-full overflow-x-clip animate-in fade-in slide-in-from-bottom-4 duration-700">
        <ChallengesClient 
          initialChallenges={challengesWithOpponent} 
          businessId={business.id}
          userId={user?.id}
          courts={courts || []}
          businessHours={businessHours || []}
          exceptions={exceptions || []}
        />
      </main>

      <PublicFooter business={business} />
    </div>
  )
}
