import { getBusinesses, getUserFavorites } from '../cliente/actions'
import { BusinessDirectory } from '@/components/BusinessDirectory'
import Link from 'next/link'
import { Flag, Search, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Explorar - SaaSintética',
  description: 'Encuentra las mejores canchas sintéticas cerca de ti',
  manifest: '/explorar.webmanifest',
}

export default async function ExplorarPage() {
  const { businesses, count } = await getBusinesses()
  const favorites = await getUserFavorites()

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Simple Navigation */}
      <header className="sticky top-0 z-50 px-4 lg:px-8 h-20 flex items-center border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl">
        <Link className="flex items-center justify-center gap-2 transition-transform hover:scale-105" href="/">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Flag className="h-6 w-6 text-primary" />
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">
            SaaSintética
          </span>
        </Link>
        <div className="ml-auto" />
      </header>

      <main className="flex-1 pb-20">
        {/* Header Section */}
        <div className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />
          
          <div className="container px-4 md:px-6 mx-auto relative z-10 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wider uppercase animate-in fade-in slide-in-from-top-4 duration-700">
              <Search className="w-3 h-3" />
              Directorio Público
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Explorar <span className="text-primary">sintéticas</span>
            </h1>
            
            <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              Encuentra una cancha disponible para reservar y disfruta del mejor fútbol.
            </p>
          </div>
        </div>

        {/* Directory Section */}
        <div className="container px-4 md:px-6 mx-auto">
          <BusinessDirectory 
            businesses={businesses} 
            favorites={favorites} 
            totalCount={count} 
          />
        </div>
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
