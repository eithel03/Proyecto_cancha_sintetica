import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChallengesClient from './ChallengesClient'
import { PublicNav } from '@/components/PublicNav'
import { PublicFooter } from '@/components/PublicFooter'

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function ChallengesPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses_public')
    .select('id, name, slug, logo_url, branding, is_active')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const query = supabase
    .from('challenges_public')
    .select('*')
    .eq('business_id', business.id)
    .in('status', ['open', 'confirmed'])

  const { data: challenges } = await query.order('challenge_date', { ascending: true })

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

  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)

  const { data: businessHours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', business.id)

  const { data: exceptions } = await supabase
    .from('business_exceptions')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_closed', true)

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      <PublicNav slug={business.slug} businessName={business.name} />

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
