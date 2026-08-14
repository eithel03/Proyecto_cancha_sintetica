'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Store, LogOut, ShieldAlert, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Negocios', href: '/admin/businesses', icon: Store },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [adminName, setAdminName] = useState('Super Admin')

  useEffect(() => {
    let isActive = true

    async function loadAdminName() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, first_name, last_name')
        .eq('id', user.id)
        .maybeSingle()

      const profileName = profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      const name = profileName || user.user_metadata?.full_name || 'Super Admin'
      if (isActive) setAdminName(name)
    }

    loadAdminName()
    return () => {
      isActive = false
    }
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  // Si estamos en el login de admin, no mostramos el sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-950">
      {/* Mobile Header - Only visible on small screens */}
      <div className="fixed left-0 right-0 top-0 z-[60] flex h-16 items-center justify-between border-b border-slate-200 bg-white p-4 md:hidden">
        <div className="flex items-center gap-2 overflow-hidden">
          <ShieldAlert className="h-6 w-6 shrink-0 text-emerald-700" />
          <h1 className="truncate text-lg font-black uppercase tracking-tight text-emerald-950">Super admin</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="shrink-0 rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 flex flex-col shrink-0
        w-72 md:w-64
        bg-emerald-950 text-white border-r border-emerald-900
        fixed md:relative z-[80] h-full top-0 left-0 
        transition-all duration-300 ease-in-out
      `}>
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 p-5">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-emerald-950">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black uppercase tracking-tight">SaaSintética</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/70">Panel central</p>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="rounded-lg p-2 text-emerald-100/70 hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-4">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                title={item.name}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                  isActive 
                    ? 'bg-emerald-400 text-emerald-950 shadow-lg shadow-black/20'
                    : 'text-emerald-50/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
                <span className="truncate text-[10px] font-bold uppercase tracking-widest">
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="mb-4 min-w-0">
            <p className="truncate text-sm font-bold text-slate-100">{adminName}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/60">Super administrador</p>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start rounded-lg px-4 text-[10px] font-bold uppercase tracking-widest text-emerald-50/70 hover:bg-white/10 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 lg:mr-3" />
            <span>Salir</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 w-full flex-1 overflow-y-auto bg-slate-50 pt-16 md:pt-0">
        <div className="mx-auto min-w-0 max-w-7xl p-4 md:p-7 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  )
}
