import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookingClient from './BookingClient'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function BookingPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { courtId } = await searchParams
  const supabase = await createClient()

  // 1. Fetch Business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  // 2. Fetch active courts
  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)

  if (!courts || courts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-xl text-muted-foreground">Este negocio no tiene canchas disponibles por el momento.</p>
      </div>
    )
  }

  // 2.1 Fetch Pricing Rules for all active courts
  const { data: pricingRules } = await supabase
    .from('court_pricing_rules')
    .select('*')
    .in('court_id', courts.map(c => c.id))

  // 3. Fetch Business Hours
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
    <div className="min-h-screen bg-zinc-950 flex flex-col selection:bg-primary/30">
      <header className="bg-zinc-900/50 backdrop-blur-xl border-b border-white/5 p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent -z-10" />
        <Link href={`/${business.slug}`} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-primary transition-colors font-bold text-sm flex items-center gap-2">
          <span className="text-xl">←</span> <span className="hidden md:inline">VOLVER</span>
        </Link>
        <h1 className="text-2xl font-black italic tracking-tighter bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">{business.name.toUpperCase()}</h1>
      </header>

      <main className="flex-1 p-4 md:p-12 flex items-start justify-center relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] -z-10" />
        
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
