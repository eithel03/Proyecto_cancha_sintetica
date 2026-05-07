import Link from 'next/link'
import { Flag } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin - SaaSintética',
  description: 'Panel de administración de canchas sintéticas',
  manifest: '/admin.webmanifest',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden md:flex md:w-1/2 bg-zinc-950 p-10 flex-col justify-between relative overflow-hidden">
        {/* Background Texture/Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-zinc-950 to-zinc-950" />
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />

        <div className="relative z-10 flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-xl">
            <Flag className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold text-white">SaaSintética</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold text-white mb-4">Gestiona tu complejo deportivo como un profesional.</h1>
          <p className="text-zinc-400 text-lg">Únete a la red de administradores que han automatizado sus reservas y multiplicado sus ganancias sin esfuerzo.</p>
        </div>

        <div className="relative z-10 text-zinc-500 text-sm">
          © {new Date().getFullYear()} SaaSintética. Todos los derechos reservados.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </div>
    </div>
  )
}
