import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Flag, ArrowRight } from 'lucide-react'
import { LandingHero, LandingFeatures } from '@/components/LandingClient'
import { BusinessDirectory } from '@/components/BusinessDirectory'
import { getBusinesses, getUserFavorites } from './cliente/actions'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const { businesses, count } = await getBusinesses()
  const favorites = await getUserFavorites()
  
  // Verificar si hay usuario para el botón del navbar
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'owner'
  const isCustomer = user?.user_metadata?.role === 'customer'

  // Si es cliente, enviarlo a explorar automáticamente
  if (isCustomer) {
    redirect('/explorar')
  }

  // Si no está logueado, mostrar pantalla de acceso restringido
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="w-full max-w-md space-y-8 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-zinc-900 border border-white/5 mb-4 shadow-2xl">
            <Flag className="h-10 w-10 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-white italic uppercase">
              Acceso <span className="text-primary">Restringido</span>
            </h1>
            <p className="text-zinc-500 font-medium">
              Esta sección es exclusiva para administradores de la plataforma.
            </p>
          </div>

          <div className="grid gap-4 pt-4">
            <Link href="/admin/login">
              <Button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-zinc-950 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 transition-all">
                Ingresar como Super Admin
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-xs transition-all">
                Panel de Dueño
              </Button>
            </Link>
          </div>

          <div className="pt-8 border-t border-white/5">
            <p className="text-zinc-500 text-sm mb-4">¿Eres un jugador buscando canchas?</p>
            <Link href="/explorar">
              <Button variant="link" className="text-primary font-bold hover:text-primary/80">
                Ir al Directorio Público
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30">
      {/* Navbar Glassmorphism */}
      <header className="sticky top-0 z-50 px-4 lg:px-8 h-20 flex items-center border-b border-white/5 bg-background/60 backdrop-blur-xl">
        <Link className="flex items-center justify-center gap-2 transition-transform hover:scale-105" href="/">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Flag className="h-6 w-6 text-primary" />
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">
            SaaSintética
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-2 sm:gap-4">
          <Link href="/dashboard">
            <Button className="rounded-full shadow-lg shadow-primary/25 font-semibold">
              Mi Panel de Control
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {isAdmin && <LandingHero />}
        
        {/* Business Directory Section (Solo Admin puede verla aquí ahora como vista previa) */}
        <div className="pt-12">
          <div className="container px-4 md:px-6 mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
              Vista previa del directorio
            </div>
          </div>
          <BusinessDirectory 
            businesses={businesses} 
            favorites={favorites} 
            totalCount={count} 
          />
        </div>

        {isAdmin && <LandingFeatures />}
      </main>

      <footer className="w-full py-12 border-t border-white/5 bg-zinc-950">
        <div className="container px-4 md:px-6 mx-auto text-center">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} SaaSintética. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
