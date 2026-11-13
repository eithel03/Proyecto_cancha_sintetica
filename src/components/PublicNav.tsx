'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Trophy, Swords, User, Flag } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

type NavTab = {
  label: string
  icon: typeof CalendarDays
  href: string
}

function NavLinkContent({ tab, isActive, mobile = false }: { tab: NavTab; isActive: boolean; mobile?: boolean }) {
  const { pending } = useLinkStatus()
  const Icon = tab.icon

  if (mobile) {
    return (
      <span className={`relative flex flex-col items-center justify-center gap-1 rounded-full px-4 py-1 transition-colors ${
        isActive ? 'bg-primary-green-light/80' : ''
      }`}>
        <Icon className={`h-5 w-5 ${isActive ? 'text-primary-green-dark' : ''} ${pending ? 'animate-pulse' : ''}`} />
        <span className={`text-[10px] font-semibold ${isActive ? 'text-primary-green-dark' : ''}`}>
          {tab.label}
        </span>
        {pending && <span className="absolute inset-x-3 -bottom-1 h-0.5 animate-pulse rounded-full bg-primary" />}
      </span>
    )
  }

  return (
    <>
      <Icon className={`h-4 w-4 ${isActive ? 'text-gold' : ''} ${pending ? 'animate-pulse' : ''}`} />
      {tab.label}
      {pending && <span className="h-1.5 w-1.5 animate-ping rounded-full bg-gold" aria-hidden="true" />}
      {isActive && (
        <span className="absolute -bottom-[11px] left-3 right-3 h-[3px] rounded-full bg-gold" />
      )}
    </>
  )
}

export function PublicNav({ slug, businessName, showTournament = true }: { slug: string; businessName: string; showTournament?: boolean }) {
  const pathname = usePathname()

  const tabs = [
    { label: 'Reservas', icon: CalendarDays, href: `/${slug}` },
    { label: 'Torneo', icon: Trophy, href: `/${slug}/torneo` },
    { label: 'Retos', icon: Swords, href: `/${slug}/retos` },
    { label: 'Mi perfil', icon: User, href: `/${slug}/perfil` },
  ].filter((tab) => showTournament || tab.label !== 'Torneo')

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
                  prefetch="auto"
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative px-4 py-2 rounded-xl text-sm transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'bg-gold/10 text-gold font-semibold'
                      : 'text-white/55 font-medium hover:text-white hover:bg-white/5'
                  }`}
                >
                  <NavLinkContent tab={tab} isActive={isActive} />
                </Link>
              )
            })}
            <ThemeToggle
              align="end"
              className="ml-2 border-white/15 bg-white/10 text-white hover:border-white/30 hover:bg-white/15 hover:text-white"
            />
          </nav>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border md:hidden safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const isActive = isActiveTab(tab)
            return (
              <Link
                key={tab.label}
                href={tab.href}
                prefetch="auto"
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-w-0 flex-1 py-1.5 transition-colors relative ${
                  isActive ? 'text-primary-green-dark' : 'text-muted-foreground'
                }`}
              >
                <NavLinkContent tab={tab} isActive={isActive} mobile />
              </Link>
            )
          })}
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center py-1.5 text-muted-foreground">
            <ThemeToggle
              align="end"
              className="h-8 w-8 rounded-full border-0 bg-transparent text-muted-foreground hover:bg-primary-green-light/60 hover:text-foreground"
            />
            <span className="text-[10px] font-semibold">Tema</span>
          </div>
        </div>
      </nav>
    </>
  )
}
