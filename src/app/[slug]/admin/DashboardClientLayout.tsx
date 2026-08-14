'use client'

import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useSyncExternalStore, useState } from 'react'
import {
  CalendarDays,
  Home,
  LandPlot,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Swords,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const SIDEBAR_COLLAPSE_KEY = 'admin-sidebar-collapsed'

let collapseListeners: (() => void)[] = []
let collapseSnapshot = false
let collapseSnapshotLoaded = false

function loadCollapseSnapshot() {
  if (typeof window === 'undefined' || collapseSnapshotLoaded) return
  collapseSnapshotLoaded = true
  try {
    collapseSnapshot = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1'
  } catch {
    collapseSnapshot = false
  }
}

function subscribeCollapse(listener: () => void) {
  collapseListeners.push(listener)
  return () => {
    collapseListeners = collapseListeners.filter((item) => item !== listener)
  }
}

function getCollapseSnapshot() {
  loadCollapseSnapshot()
  return collapseSnapshot
}

function getCollapseServerSnapshot() {
  return false
}

function toggleCollapsed() {
  collapseSnapshot = !collapseSnapshot
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapseSnapshot ? '1' : '0')
  } catch {
    // localStorage no disponible
  }
  collapseListeners.forEach((listener) => listener())
}

export default function DashboardLayout({
  children,
  businessName,
  userName,
  pendingReservationsCount,
  pendingChallengesCount,
}: {
  children: React.ReactNode
  businessName: string
  userName: string
  pendingReservationsCount: number
  pendingChallengesCount: number
}) {
  const pathname = usePathname()
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isCollapsed = useSyncExternalStore(subscribeCollapse, getCollapseSnapshot, getCollapseServerSnapshot)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navigation = [
    { name: 'Panel general', href: `/${slug}/admin`, icon: LayoutDashboard },
    { name: 'Reservas', href: `/${slug}/admin/reservations`, icon: CalendarDays, count: pendingReservationsCount },
    { name: 'Canchas', href: `/${slug}/admin/courts`, icon: LandPlot },
    { name: 'Retos', href: `/${slug}/admin/retos`, icon: Swords, count: pendingChallengesCount },
    { name: 'Torneo', href: `/${slug}/admin/tournament`, icon: Trophy },
    { name: 'Perfil', href: `/${slug}/admin/perfil`, icon: User },
    { name: 'Portal público', href: `/${slug}`, icon: Users, external: true },
    { name: 'Configuración', href: `/${slug}/admin/settings`, icon: Settings },
  ]

  const compact = isCollapsed && !isMobileMenuOpen

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-slate-50 text-slate-950">
      <div className="fixed left-0 right-0 top-0 z-[60] flex h-16 items-center justify-between border-b border-slate-200 bg-white p-4 md:hidden">
        <h1 className="mr-2 truncate text-lg font-black text-emerald-800">{businessName}</h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="shrink-0 p-2 text-slate-900"
          aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed right-0 top-0 z-[80] flex h-full shrink-0 flex-col border-l border-emerald-900/80 bg-emerald-950 text-white transition-all duration-300 ease-in-out md:relative md:left-0 md:right-auto md:border-l-0 md:border-r',
          isMobileMenuOpen ? 'w-80 translate-x-0' : 'w-80 translate-x-full',
          'md:translate-x-0',
          compact ? 'md:w-[76px] md:min-w-[76px]' : 'md:w-[236px] md:min-w-[236px]',
        )}
      >
        <div className={cn('flex h-20 shrink-0 items-center p-5', compact ? 'justify-center' : 'justify-between')}>
          <div className={cn('min-w-0 items-center gap-3', compact ? 'hidden' : 'flex')}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-emerald-950 shadow-lg shadow-black/20">
              <Home className="h-6 w-6" />
            </span>
          </div>
          <div className="flex items-center">
            <button
              onClick={toggleCollapsed}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-emerald-50/70 transition-colors hover:bg-white/10 hover:text-white md:flex"
              aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
              title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-white/70 hover:text-white md:hidden"
              aria-label="Cerrar menú"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                title={item.name}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-3 transition-all',
                  compact ? 'justify-center' : 'md:justify-start md:px-4',
                  isActive
                    ? 'bg-amber-300 text-emerald-950 shadow-lg shadow-black/20'
                    : 'text-emerald-50/90 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
                <span className={cn('truncate text-[10px] font-bold uppercase tracking-widest', compact ? 'hidden' : 'block')}>
                  {item.name}
                </span>
                {Boolean(item.count) && (
                  <span
                    className={cn(
                      compact
                        ? 'absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-black leading-none text-white shadow-md shadow-black/20'
                        : 'ml-auto hidden min-w-7 rounded-full bg-emerald-500 px-2 py-1 text-center text-xs font-black text-white shadow-md shadow-black/20 md:inline-block',
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-rose-300 transition-colors hover:bg-white/10',
              compact ? 'justify-center' : '',
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!compact && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      <main className="min-w-0 w-full flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 pt-16 md:pt-0">
        <div className="min-w-0 w-full p-4 md:p-6 lg:p-9">{children}</div>
      </main>
    </div>
  )
}
