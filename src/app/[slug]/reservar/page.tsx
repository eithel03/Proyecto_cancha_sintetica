import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookingClient from './BookingClient'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PublicNav } from '@/components/PublicNav'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function BookingPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { courtId } = await searchParams
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)

  if (!courts || courts.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicNav slug={business.slug} businessName={business.name} />
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xl text-muted-foreground">Este negocio no tiene canchas disponibles por el momento.</p>
        </div>
      </div>
    )
  }

  const { data: pricingRules } = await supabase
    .from('court_pricing_rules')
    .select('*')
    .in('court_id', courts.map(c => c.id))

  const { data: businessHours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', business.id)

  const { data: exceptions } = await supabase
    .from('business_exceptions')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_closed', true)

  const { data: { user } } = await supabase.auth.getUser()
  let isCustomer = false
  let profileData = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (profile && profile.role === 'customer') {
      isCustomer = true
      profileData = profile
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      <PublicNav slug={business.slug} businessName={business.name} />

      <main className="flex-1 p-4 md:p-10 flex items-start justify-center relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -z-10" />
        
        <BookingClient 
          business={business} 
          courts={courts} 
          preselectedCourtId={typeof courtId === 'string' ? courtId : undefined}
          customerProfile={profileData}
          businessHours={businessHours || []}
          exceptions={exceptions || []}
          pricingRules={pricingRules || []}
        />
      </main>
    </div>
  )
}
