import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Phone, Flag, Clock, CalendarCheck, ImageIcon, Swords, User, Users, ShieldCheck, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BusinessHeaderActions } from '@/components/BusinessHeaderActions'
import { getUserFavorites } from '../cliente/actions'
import { PublicNav } from '@/components/PublicNav'

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

  // Auth Check
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

  const favorites = await getUserFavorites()
  const isInitialFavorite = favorites.includes(business.id)

  return (
    <div className="flex flex-col font-sans">
      <PublicNav slug={business.slug} businessName={business.name} />

      {isAdmin && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-2 text-center text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] backdrop-blur-md sticky top-16 sm:top-20 z-50 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Panel de administración activo</span>
          </div>
          <Link href="/dashboard" className="bg-amber-500 text-black px-3 py-1 rounded-full hover:bg-amber-400 transition-colors">ENTRAR</Link>
        </div>
      )}
      
      {/* Hero Premium Section */}
      <section className="relative py-12 sm:py-24 px-4 sm:px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--primary),transparent_70%)] opacity-20" />
        <div className="absolute top-4 sm:top-8 right-4 sm:right-8 z-20">
            <BusinessHeaderActions 
              businessId={business.id} 
              isInitialFavorite={isInitialFavorite} 
              businessName={business.name}
            />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center justify-center space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">
            <Flag className="w-3 h-3 text-primary" /> Complejo Deportivo
          </div>
          
          <h1 className="w-full max-w-full mx-auto px-2 text-center text-[clamp(2.2rem,8vw,7rem)] sm:text-[clamp(3rem,6.5vw,8rem)] font-black italic tracking-tight sm:tracking-tighter uppercase text-white leading-none text-balance break-words">
            {business.name}
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-sm">
            {business.location && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl backdrop-blur-md border border-white/5 text-zinc-300 font-bold uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" /> 
                <span className="truncate max-w-[150px] sm:max-w-[300px]">{business.location}</span>
                {business.latitude && business.longitude && (
                  <a 
                    href={`https://www.google.com/maps?q=${business.latitude},${business.longitude}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 bg-primary/20 hover:bg-primary text-primary hover:text-black px-2 py-0.5 rounded-lg text-[8px] sm:text-[10px] transition-colors"
                  >
                    VER MAPA
                  </a>
                )}
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl backdrop-blur-md border border-white/5 text-zinc-300 font-bold uppercase tracking-wider">
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" /> {business.phone}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-12">

        <div className="text-center space-y-2 sm:space-y-4">
          <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-white">Nuestras Canchas</h2>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">Selecciona el escenario de tu próxima victoria</p>
        </div>

        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {courts && courts.length > 0 ? (
            courts.map((court) => (
              <Link key={court.id} href={`/${business.slug}/reservar?courtId=${court.id}`} className="group">
                <Card className="h-full border-white/5 bg-zinc-900/40 overflow-hidden rounded-[24px] sm:rounded-[32px] transition-all sm:hover:translate-y-[-8px] hover:border-primary/30 hover:bg-zinc-900/60 relative">
                  <div className="h-40 sm:h-48 bg-zinc-800 flex items-center justify-center relative overflow-hidden">
                    {court.image_url ? (
                      <img 
                        src={court.image_url} 
                        alt={court.name} 
                        className="w-full h-full object-cover transition-transform duration-700 sm:group-hover:scale-110"
                      />
                    ) : (
                      <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-700 sm:group-hover:scale-110 transition-transform duration-500" />
                    )}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                  </div>
                  <CardHeader className="space-y-1 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-2">
                       <CardTitle className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-white truncate">{court.name}</CardTitle>
                       <div className="bg-primary/10 text-primary px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest flex-shrink-0">Activo</div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5 sm:p-6 pt-0 sm:pt-0">
                    <div className="flex items-center gap-4 text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">
                       <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {court.capacity || 5} vs {court.capacity || 5}</span>
                       <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 60 min</span>
                    </div>
                    <Button className="w-full bg-white/5 hover:bg-primary hover:text-black border border-white/10 hover:border-transparent font-black uppercase tracking-widest text-[9px] sm:text-[10px] h-11 sm:h-12 rounded-xl sm:rounded-2xl transition-all">
                      RESERVAR AHORA <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-full py-24 text-center">
              <div className="bg-zinc-900/80 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Flag className="w-10 h-10 text-zinc-700" />
              </div>
              <p className="text-zinc-500 font-black uppercase tracking-widest text-sm">No hay canchas configuradas todavía.</p>
            </div>
          )}
        </div>
      </main>

      <footer className="py-12 border-t border-white/5 text-center space-y-4">
         <p className="text-zinc-600 font-bold uppercase tracking-[0.2em] text-[10px]">
           © 2024 SAASINTÉTICA • PLATAFORMA DE GESTIÓN DEPORTIVA
         </p>
      </footer>
    </div>
  )
}
