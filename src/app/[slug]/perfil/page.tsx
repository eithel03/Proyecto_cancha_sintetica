import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from './ProfileClient'
import { PublicNav } from '@/components/PublicNav'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function ProfilePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.id) {
    redirect(`/cliente/login?redirectTo=/${slug}/perfil`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/cliente/login')

  const { data: reservations } = await supabase
    .from('reservations')
    .select('*, courts(name)')
    .eq('customer_id', user.id)
    .eq('business_id', business.id)
    .eq('hidden_by_customer', false)
    .order('reservation_date', { ascending: false })

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*, courts(name)')
    .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .eq('business_id', business.id)
    .eq('hidden_by_customer', false)
    .order('challenge_date', { ascending: false })

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      <PublicNav slug={business.slug} businessName={business.name} />

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <ProfileClient 
          initialProfile={profile} 
          initialReservations={reservations || []} 
          initialChallenges={challenges || []}
          businessSlug={business.slug}
        />
      </main>

      <footer className="text-center py-8 text-sm text-muted-foreground border-t border-border mt-auto">
        Potenciado por <Link href="/" className="text-primary font-medium hover:underline">SaaSintética</Link>
      </footer>
    </div>
  )
}
