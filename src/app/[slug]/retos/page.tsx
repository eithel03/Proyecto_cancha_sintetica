import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChallengesClient from './ChallengesClient'
import { PublicNav } from '@/components/PublicNav'
import Link from 'next/link'

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
    .select('*, courts(name)')
    .eq('business_id', business.id)
    .eq('status', 'open')

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

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <ChallengesClient 
          initialChallenges={challenges || []} 
          businessId={business.id}
          userId={user?.id}
          courts={courts || []}
          businessHours={businessHours || []}
          exceptions={exceptions || []}
        />
      </main>

      <footer className="text-center py-8 text-sm text-muted-foreground border-t border-border">
        Potenciado por <Link href="/" className="text-primary font-medium hover:underline">SaaSintética</Link>
      </footer>
    </div>
  )
}
