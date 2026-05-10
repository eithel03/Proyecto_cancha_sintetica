'use client'

import Link from 'next/link'
import { LayoutDashboard, Settings, CalendarDays, Flag, LogOut, Trophy, Menu, X, Swords } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const supabase = createClient()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Inicio', href: `/${slug}/admin`, icon: LayoutDashboard },
    { name: 'Canchas', href: `/${slug}/admin/courts`, icon: Flag },
    { name: 'Reservas', href: `/${slug}/admin/reservations`, icon: CalendarDays },
    { name: 'Retos', href: `/${slug}/admin/retos`, icon: Swords },
    { name: 'Torneo', href: `/${slug}/admin/tournament`, icon: Trophy },
    { name: 'Configuración', href: `/${slug}/admin/settings`, icon: Settings },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="h-screen w-full bg-gray-50 dark:bg-zinc-950 flex overflow-hidden relative">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 fixed top-0 left-0 right-0 z-[60] h-16">
        <h1 className="text-xl font-bold text-primary truncate mr-2 italic tracking-tighter">SINTÉTICA</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 text-foreground flex-shrink-0"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Adaptable width */}
      <aside className={`
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} 
        flex flex-col flex-shrink-0
        w-72 lg:w-64 md:w-20
        bg-white dark:bg-zinc-900 border-l md:border-r md:border-l-0 dark:border-zinc-800
        fixed md:relative z-[80] h-full top-0 right-0 md:right-auto md:left-0
        transition-all duration-300 ease-in-out
      `}>
        <div className="flex items-center justify-between p-6 border-b dark:border-zinc-800 h-16 sm:h-20 flex-shrink-0">
          <h1 className="text-2xl font-bold text-primary italic tracking-tighter hidden lg:block">SINTÉTICA</h1>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-3 lg:p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                title={item.name}
                className={`flex items-center gap-3 px-3 py-3 lg:px-4 rounded-xl transition-all group justify-center lg:justify-start ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                    : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className={`font-bold uppercase tracking-widest text-[10px] truncate lg:block ${isMobileMenuOpen ? 'block' : 'hidden md:hidden lg:block'}`}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 lg:p-4 border-t dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
          <Button 
            variant="ghost" 
            className="w-full justify-center lg:justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-bold text-[10px] uppercase tracking-widest px-0 lg:px-4"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 lg:mr-3" />
            <span className={isMobileMenuOpen ? 'block' : 'hidden lg:block'}>Salir</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-y-auto bg-gray-50 dark:bg-zinc-950 pt-16 md:pt-0">
        <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
