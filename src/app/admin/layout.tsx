'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Store, LogOut, ShieldAlert, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

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
  const supabase = createClient()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  // Si estamos en el login de admin, no mostramos el sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className="h-screen w-full bg-gray-50 dark:bg-zinc-950 flex overflow-hidden relative">
      {/* Mobile Header - Only visible on small screens */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 fixed top-0 left-0 right-0 z-[60] h-16">
        <div className="flex items-center gap-2 overflow-hidden">
          <ShieldAlert className="w-6 h-6 text-red-500 flex-shrink-0" />
          <h1 className="text-lg font-bold text-slate-100 truncate italic tracking-tighter uppercase">Admin</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 text-slate-100 flex-shrink-0 hover:bg-slate-800 rounded-lg transition-colors"
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

      {/* Sidebar Admin - Adaptable width */}
      <aside className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 flex flex-col flex-shrink-0
        w-72 lg:w-64 md:w-20
        bg-slate-900 text-slate-100 border-r border-slate-800
        fixed md:relative z-[80] h-full top-0 left-0 
        transition-all duration-300 ease-in-out
      `}>
        <div className="flex p-4 lg:p-6 border-b border-slate-800 items-center justify-between h-16 sm:h-20 flex-shrink-0">
          <div className="flex items-center gap-2 overflow-hidden mx-auto lg:mx-0">
            <ShieldAlert className="w-6 h-6 text-red-500 flex-shrink-0" />
            <h1 className="text-xl font-bold italic tracking-tighter hidden lg:block uppercase">Sintética</h1>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-3 lg:p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                title={item.name}
                className={`flex items-center gap-3 px-3 py-3 lg:px-4 rounded-xl transition-all group justify-center lg:justify-start ${
                  isActive 
                    ? 'bg-primary text-black shadow-lg shadow-primary/40' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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

        <div className="p-3 lg:p-4 border-t border-slate-800 bg-slate-900 flex-shrink-0">
          <Button 
            variant="ghost" 
            className="w-full justify-center lg:justify-start text-slate-400 hover:text-red-400 hover:bg-slate-800 font-bold text-[10px] uppercase tracking-widest px-0 lg:px-4"
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
