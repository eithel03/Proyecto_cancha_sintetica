'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CalendarCheck, Flag, Swords, User, Menu, X, Trophy, BarChart3, Users, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

export function PublicNav({ slug, businessName }: { slug: string, businessName: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)

  const isTournamentPage = pathname.endsWith('/torneo')

  const tabs = [
    { label: 'RESERVAS', icon: CalendarCheck, href: `/${slug}` },
    { label: 'TORNEO', icon: Flag, href: `/${slug}/torneo` },
    { label: 'RETOS', icon: Swords, href: `/${slug}/retos` },
    { label: 'MI PERFIL', icon: User, href: `/${slug}/perfil` },
  ]

  const tournamentTabs = [
    { id: 'jornada', label: 'JORNADA', icon: Calendar },
    { id: 'clasificacion', label: 'TABLA', icon: Trophy },
    { id: 'estadisticas', label: 'STATS', icon: BarChart3 },
    { id: 'equipos', label: 'EQUIPOS', icon: Users },
  ]

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand/Logo */}
        <Link href={`/${slug}`} className="flex items-center gap-3 group">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <span className="text-base sm:text-xl font-black italic uppercase tracking-tighter text-white">
            {businessName}
          </span>
        </Link>

        {/* Desktop Nav - Cleaner text links */}
        <nav className="hidden md:flex items-center gap-8">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || (tab.label === 'RESERVAS' && pathname === `/${slug}`)
            return (
              <Link 
                key={tab.label}
                href={tab.href} 
                className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:text-primary ${
                  isActive ? 'text-primary' : 'text-zinc-500'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {/* Mobile Toggle */}
        <div className="md:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsOpen(!isOpen)}
            className="text-white h-10 w-10 rounded-xl bg-white/5 border border-white/5"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] md:hidden"
            />
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-zinc-950 border-l border-white/10 p-8 flex flex-col z-[70] md:hidden shadow-2xl"
            >
              <div className="flex justify-between items-center mb-12">
                 <span className="text-xl font-black italic uppercase tracking-tighter text-white">{businessName}</span>
                 <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-zinc-500">
                    <X className="w-6 h-6" />
                 </Button>
              </div>

              <div className="space-y-6">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4">Navegación</p>
                <div className="grid gap-2">
                  {tabs.map((tab) => {
                    const isActive = pathname === tab.href || (tab.label === 'RESERVAS' && pathname === `/${slug}`)
                    return (
                      <Link 
                        key={tab.label}
                        href={tab.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-4 p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                          isActive 
                            ? 'bg-primary text-black shadow-lg shadow-primary/20' 
                            : 'bg-white/5 text-zinc-400'
                        }`}
                      >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                      </Link>
                    )
                  })}
                </div>
              </div>

              <div className="mt-auto pt-12 text-center">
                <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.2em]">SaaSintética v1.0</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
