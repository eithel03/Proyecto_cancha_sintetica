import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicBusiness, getPublicCourts } from '@/lib/public-data'
import BookingClient from './BookingClient'
import { PublicNav } from '@/components/PublicNav'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function BookingPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { courtId } = await searchParams
  const [business, supabase] = await Promise.all([
    getPublicBusiness(slug),
    createClient(),
  ])

  if (!business) notFound()

  const [{ data: { user } }, courts] = await Promise.all([
    supabase.auth.getUser(),
    getPublicCourts(business.id),
  ])

  if (courts.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicNav slug={business.slug} businessName={business.name} showTournament={business.show_tournament ?? true} />
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xl text-muted-foreground">Este negocio no tiene canchas disponibles por el momento.</p>
        </div>
      </div>
    )
  }

  const profileQuery = user
    ? supabase
        .from('profiles')
        .select('id, full_name, phone, role')
        .eq('id', user.id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [
    { data: pricingRules },
    { data: businessHours, error: businessHoursError },
    { data: exceptions },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from('court_pricing_rules')
      .select('court_id, day_of_week, start_time, end_time, price')
      .in('court_id', courts.map(c => c.id)),
    supabase
      .from('business_hours')
      .select('day_of_week, open_time, close_time, is_closed')
      .eq('business_id', business.id),
    supabase
      .from('business_exceptions')
      .select('exception_date, reason, is_closed')
      .eq('business_id', business.id)
      .eq('is_closed', true),
    profileQuery,
  ])
  const profileData = profile?.role === 'customer' ? profile : null

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      <PublicNav slug={business.slug} businessName={business.name} showTournament={business.show_tournament ?? true} />

      <main className="flex-1 p-4 md:p-10 flex items-start justify-center relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -z-10" />
        
        <BookingClient 
          business={business} 
          courts={courts} 
          preselectedCourtId={typeof courtId === 'string' ? courtId : undefined}
          customerProfile={profileData}
          businessHours={businessHours || []}
          businessHoursLoadError={businessHoursError?.message}
          exceptions={exceptions || []}
          pricingRules={pricingRules || []}
        />
      </main>
    </div>
  )
}
