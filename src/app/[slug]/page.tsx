import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Phone, Flag, Clock, CalendarCheck, ImageIcon, Swords, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BusinessHeaderActions } from '@/components/BusinessHeaderActions'
import { getUserFavorites } from '../cliente/actions'

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

  // Auth Check - Redirect if not customer
  const { data: { user } } = await supabase.auth.getUser()
  let isCustomer = false
  let isAdmin = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      
    if (profile) {
      if (profile.role === 'customer') {
        isCustomer = true
      } else if (profile.role === 'owner' || profile.role === 'super_admin') {
        isAdmin = true
      }
    }
  }

  const refererPath = `/${business.slug}`

  // Ya no forzamos el login aquí para permitir el acceso como invitado
  // La validación se hará a nivel de acción (favoritos, reservas, etc.)
  /*
  if (!isCustomer && !isAdmin) {
    redirect(`/cliente/login?redirectTo=${encodeURIComponent(refererPath)}`)
  }
  */

  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)

  const favorites = await getUserFavorites()
  const isInitialFavorite = favorites.includes(business.id)

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      {isAdmin && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-2 text-center text-sm text-amber-500 font-medium backdrop-blur-md sticky top-0 z-50">
          Estás viendo esta página con una sesión administrativa. Para probar como cliente, cierra sesión o usa otro navegador.
        </div>
      )}
      
      {/* Header Público */}
      <header className="relative bg-zinc-950/80 border-b border-white/10 p-12 md:p-20 text-center overflow-hidden">
        <BusinessHeaderActions 
          businessId={business.id} 
          isInitialFavorite={isInitialFavorite} 
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background -z-10" />
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent drop-shadow-md">
          {business.name}
        </h1>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mt-4">
          {business.location && (
            <p className="text-muted-foreground flex items-center justify-center gap-1 bg-white/5 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
              <MapPin className="w-4 h-4 text-white" /> {business.location}
            </p>
          )}
          {business.phone && (
            <p className="text-muted-foreground flex items-center justify-center gap-1 bg-white/5 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
              <Phone className="w-4 h-4 text-white" /> {business.phone}
            </p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Navigation Tabs */}
        <div className="flex justify-center border-b border-white/10 mb-8">
          <Link 
            href={`/${business.slug}`} 
            className="px-6 py-4 border-b-2 border-primary text-primary font-bold flex items-center gap-2"
          >
            <CalendarCheck className="w-4 h-4" /> Reservas
          </Link>
          <Link 
            href={`/${business.slug}/torneo`} 
            className="px-6 py-4 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-white/20 transition-all flex items-center gap-2"
          >
            <Flag className="w-4 h-4" /> Torneo
          </Link>
          <Link 
            href={`/${business.slug}/retos`} 
            className="px-6 py-4 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-white/20 transition-all flex items-center gap-2"
          >
            <Swords className="w-4 h-4" /> Retos
          </Link>
          <Link 
            href={`/${business.slug}/perfil`} 
            className="px-6 py-4 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-white/20 transition-all flex items-center gap-2"
          >
            <User className="w-4 h-4" /> Mis Reservas
          </Link>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Selecciona una cancha para reservar</h2>
        </div>

        <div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courts?.length === 0 ? (
              <div className="col-span-full text-center p-12 border border-white/10 rounded-3xl bg-card/50 backdrop-blur-sm">
                <Flag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground text-lg">No hay canchas disponibles por el momento.</p>
              </div>
            ) : (
              courts?.map(court => (
                <Card key={court.id} className="border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group overflow-hidden flex flex-col">
                  <div className="h-48 bg-white/5 relative">
                    {court.image_url ? (
                      <img src={court.image_url} className="w-full h-full object-cover" alt={court.name} />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="w-12 h-12 text-white" />
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl">{court.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1 flex flex-col">
                    <div className="bg-white/5 p-4 rounded-2xl">
                      <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
                        ₡{court.price_per_person?.toLocaleString() || '0'}
                        <span className="text-sm font-normal text-muted-foreground"> / persona</span>
                      </p>
                    </div>
                    {court.description && <p className="text-muted-foreground text-sm line-clamp-2 flex-1">{court.description}</p>}
                    <Link href={`/${business.slug}/reservar?courtId=${court.id}`} className="block mt-auto pt-4">
                      <Button className="w-full font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
                        Seleccionar Horario
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
      
      <footer className="text-center py-8 text-sm text-muted-foreground border-t border-white/10 bg-zinc-950">
        Potenciado por <Link href="/" className="text-primary font-medium hover:underline">SaaSintética</Link>
      </footer>
    </div>
  )
}
