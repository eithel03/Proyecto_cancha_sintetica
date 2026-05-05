import Link from 'next/link'
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
          <Link href="/admin/login" className="hidden sm:block">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground rounded-full">
              Panel Admin
            </Button>
          </Link>
          {user ? (
            <Link href="/dashboard">
              <Button className="rounded-full shadow-lg shadow-primary/25 font-semibold">
                Mi Panel
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button className="rounded-full shadow-lg shadow-primary/25 font-semibold group">
                Iniciar Sesión
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <LandingHero />
        
        {/* Business Directory Section */}
        <BusinessDirectory 
          businesses={businesses} 
          favorites={favorites} 
          totalCount={count} 
        />

        <LandingFeatures />
      </main>

      <footer className="w-full py-12 border-t border-white/5 bg-zinc-950">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-2">
                <Flag className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">SaaSintética</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs text-center md:text-left">
                La plataforma líder para la gestión de complejos deportivos y canchas sintéticas.
              </p>
            </div>
            
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-primary transition-colors">Términos</Link>
              <Link href="#" className="hover:text-primary transition-colors">Privacidad</Link>
              <Link href="#" className="hover:text-primary transition-colors">Contacto</Link>
            </div>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SaaSintética. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
