'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Trophy, Swords, User, Menu, X, Flag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

export function PublicNav({ slug, businessName }: { slug: string; businessName: string }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const tabs = [
    { label: 'Reservas', icon: CalendarDays, href: `/${slug}` },
    { label: 'Torneo', icon: Trophy, href: `/${slug}/torneo` },
    { label: 'Retos', icon: Swords, href: `/${slug}/retos` },
    { label: 'Mi perfil', icon: User, href: `/${slug}/perfil` },
  ]

  const isActiveTab = (tab: { label: string; href: string }) =>
    pathname === tab.href ||
    (tab.label === 'Reservas' && pathname === `/${slug}`)

  return (
    <>
      {/* Desktop + Tablet Navbar */}
      <header className="sticky top-0 z-50 w-full bg-navy hidden md:block border-b border-white/5">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href={`/${slug}`} className="flex items-center gap-3 min-w-0 group">
            <div className="w-9 h-9 rounded-xl bg-gold/15 flex items-center justify-center flex-shrink-0 group-hover:bg-gold/20 transition-colors">
              <Flag className="w-4 h-4 text-gold" />
            </div>
            <span className="flex flex-col min-w-0 leading-none">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                {businessName}
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40 mt-1">
                Complejo deportivo
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {tabs.map((tab) => {
              const isActive = isActiveTab(tab)
              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className={`relative px-4 py-2 rounded-xl text-sm transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'bg-gold/10 text-gold font-semibold'
                      : 'text-white/55 font-medium hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${isActive ? 'text-gold' : ''}`} />
                  {tab.label}
                  {isActive && (
                    <span className="absolute -bottom-[11px] left-3 right-3 h-[3px] rounded-full bg-gold" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-50 w-full bg-navy md:hidden border-b border-white/5">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link href={`/${slug}`} className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0">
              <Flag className="w-4 h-4 text-gold" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white truncate">
              {businessName}
            </span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="text-white h-9 w-9 rounded-lg bg-white/5 border border-white/10"
          >
            {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Mobile Slide Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.2 }}
              className="fixed top-0 right-0 bottom-0 w-[80%] max-w-sm bg-navy border-l border-white/10 p-6 flex flex-col z-[70] md:hidden shadow-xl"
            >
              <div className="flex justify-between items-center mb-8">
                <span className="text-sm font-bold text-white">Menú</span>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label="Cerrar menú" className="h-9 w-9 text-white/70">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid gap-1.5">
                {tabs.map((tab) => {
                  const isActive = isActiveTab(tab)
                  return (
                    <Link
                      key={tab.label}
                      href={tab.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm transition-colors min-h-11 ${
                        isActive ? 'bg-white/10 text-gold font-semibold' : 'text-white/65 font-medium hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <tab.icon className={`w-5 h-5 ${isActive ? 'text-gold' : ''}`} />
                      {tab.label}
                      {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-gold" />}
                    </Link>
                  )
                })}
              </div>

              <div className="mt-auto pt-10 text-center">
                <p className="text-xs font-medium text-white/30">Sintetica Pital</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-border md:hidden safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const isActive = isActiveTab(tab)
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-1 min-w-0 flex-1 py-1.5 transition-colors relative ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <tab.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                <span className={`text-[10px] font-semibold ${isActive ? 'text-primary' : ''}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 w-8 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
