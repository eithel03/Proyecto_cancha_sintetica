'use client'

import { usePathname } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'

export function SuspensionCheck({ 
  isActive, 
  businessName,
  children 
}: { 
  isActive: boolean
  businessName: string
  children: React.ReactNode 
}) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.includes('/admin')

  if (!isActive && !isAdminRoute) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <div className="w-12 h-12 text-amber-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">Fuera de Servicio</h1>
        <p className="text-zinc-400 max-w-sm font-medium mb-8">
          Lo sentimos, <span className="text-white font-bold">{businessName}</span> no está aceptando reservas en este momento. Por favor, intenta más tarde.
        </p>
        <div className="w-full max-w-xs h-1 bg-zinc-900 rounded-full overflow-hidden">
          <div className="w-1/3 h-full bg-amber-500 animate-[loading_2s_ease-in-out_infinite]" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
