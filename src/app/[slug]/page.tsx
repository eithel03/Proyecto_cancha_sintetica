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
              {business.whatsapp && (
                  <a
                    href={`https://wa.me/${business.whatsapp.replace(/\D/g, '').slice(-8)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-white/75 hover:border-white/30 transition-colors"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    {business.whatsapp}
                  </a>
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
