import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Phone, Flag, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BusinessHeaderActions } from '@/components/BusinessHeaderActions'
import { PublicFooter } from '@/components/PublicFooter'
import { PublicNav } from '@/components/PublicNav'
import { CourtCard } from '@/components/CourtCard'
import { PublicPageContainer, SectionHeader, EmptyState } from '@/components/portal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function PublicBusinessPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!business) {
    notFound()
  }

  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile && (profile.role === 'owner' || profile.role === 'super_admin')) {
      isAdmin = true
    }
  }

  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)

  const mapsUrl = business.latitude && business.longitude
    ? `https://www.google.com/maps?q=${business.latitude},${business.longitude}`
    : business.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location)}`
      : null

  return (
    <div className="flex flex-col font-sans">
      <PublicNav slug={business.slug} businessName={business.name} />

      {isAdmin && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-4 sticky top-16 z-40">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
            <ShieldCheck className="w-4 h-4" />
            <span>Panel de administración activo</span>
          </div>
          <Link href="/dashboard" className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-400 transition-colors">
            Entrar
          </Link>
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden bg-navy">
        <div className="hero-pattern absolute inset-0 pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(245,191,22,0.12)_0%,rgba(13,48,55,0)_50%)] pointer-events-none" />
        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-gold/5 blur-[100px] pointer-events-none" />

        <PublicPageContainer className="relative z-10 py-10 sm:py-14 lg:py-20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-5 max-w-2xl">
              <div className="inline-flex items-center gap-2.5 rounded-full bg-gold/12 border border-gold/25 px-3.5 py-1.5">
                <div className="w-7 h-7 rounded-full bg-gold/15 flex items-center justify-center">
                  <Flag className="w-3.5 h-3.5 text-gold" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
                  Complejo deportivo
                </span>
              </div>

              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-white leading-[1.1]">
                  {business.name}
                </h1>
                <BusinessHeaderActions businessName={business.name} />
              </div>

              <p className="text-sm sm:text-base text-white/50 leading-relaxed max-w-lg">
                Reserva tu cancha y empieza el partido. Luces encendidas todas las noches para que el juego nunca pare.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {business.location && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-white/75">
                    <MapPin className="w-4 h-4 text-gold flex-shrink-0" />
                    {business.location}
                  </span>
                )}
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-white/75 hover:border-white/30 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                    {business.phone}
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto h-12 px-7 rounded-xl bg-gold hover:bg-gold/90 text-navy font-bold gap-2 shadow-lg shadow-gold/15 transition-all text-sm">
                      <MapPin className="w-4 h-4" /> Ver ubicación
                    </Button>
                  </a>
                )}
                {business.phone && (
                  <a href={`tel:${business.phone}`} className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto h-12 px-7 rounded-xl border-white/20 bg-white/5 text-white font-semibold gap-2 hover:bg-white/10 hover:border-white/30 transition-colors text-sm">
                      <Phone className="w-4 h-4" /> Contactar
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </PublicPageContainer>
      </section>

      {/* CANCHAS */}
      <main className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <SectionHeader
          icon={Flag}
          title="Canchas"
          description="Elige tu cancha, selecciona tu horario y reserva en segundos."
          action={
            courts && courts.length > 0 ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200/70 px-3.5 py-1.5 text-xs font-semibold text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                {courts.length} cancha{courts.length !== 1 ? 's' : ''} disponible{courts.length !== 1 ? 's' : ''}
              </span>
            ) : undefined
          }
        />

        <div className="mt-6 flex flex-wrap gap-5">
          {courts && courts.length > 0 ? (
            courts.map((court, i) => (
              <CourtCard key={court.id} court={court} slug={business.slug} priority={i === 0} />
            ))
          ) : (
            <EmptyState
              icon={Flag}
              title="Aún no hay canchas configuradas."
              className="w-full"
            />
          )}
        </div>
      </main>

      <PublicFooter business={business} />
    </div>
  )
}
