'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Trophy, Swords, User, Flag } from 'lucide-react'

export function PublicNav({ slug, businessName }: { slug: string; businessName: string }) {
  const pathname = usePathname()

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

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-border md:hidden safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const isActive = isActiveTab(tab)
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`flex flex-col items-center justify-center min-w-0 flex-1 py-1.5 transition-colors relative ${
                  isActive ? 'text-primary-green-dark' : 'text-muted-foreground'
                }`}
              >
                <span className={`flex flex-col items-center justify-center gap-1 px-4 py-1 rounded-full transition-colors ${
                  isActive ? 'bg-primary-green-light/80' : ''
                }`}>
                  <tab.icon className={`w-5 h-5 ${isActive ? 'text-primary-green-dark' : ''}`} />
                  <span className={`text-[10px] font-semibold ${isActive ? 'text-primary-green-dark' : ''}`}>
                    {tab.label}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}