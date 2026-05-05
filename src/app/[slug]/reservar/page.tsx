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

  const refererPath = `/${business.slug}/reservar${courtId ? `?courtId=${courtId}` : ''}`

  // 3. Auth Check
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

  // Ya no redirigimos aquí. Dejamos que el usuario vea la interfaz de reserva.
  /*
  if (!isCustomer) {
    redirect(`/cliente/login?redirectTo=${encodeURIComponent(refererPath)}`)
  }
  */

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col">
      <header className="bg-white dark:bg-zinc-900 border-b p-4 text-center relative">
        <Link href={`/${business.slug}`} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary hover:underline font-medium text-sm">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-primary">{business.name}</h1>
      </header>

      <main className="flex-1 p-4 md:p-8 flex items-start justify-center">
        <BookingClient 
          business={business} 
          courts={courts} 
          preselectedCourtId={typeof courtId === 'string' ? courtId : undefined}
          customerProfile={profileData}
        />
      </main>
    </div>
  )
}
