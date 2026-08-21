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
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const query = supabase
    .from('challenges')
    .select('*, courts(name), opponent:profiles!challenges_opponent_id_fkey(full_name)')
    .eq('business_id', business.id)
    .in('status', ['open', 'confirmed'])

  const { data: challenges } = await query.order('challenge_date', { ascending: true })

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
          initialChallenges={challenges || []} 
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
