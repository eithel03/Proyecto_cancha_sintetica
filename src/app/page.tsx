import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Flag, ArrowRight, Shield, Zap, Calendar, Users, BarChart3, Globe, Swords } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <header className="fixed top-0 z-50 w-full px-4 lg:px-8 h-20 flex items-center border-b border-slate-200 bg-background/80 backdrop-blur-xl">
        <Link className="flex items-center justify-center gap-2 transition-transform hover:scale-105" href="/">
          <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
            <Flag className="h-6 w-6 text-primary" />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            SaaSintética
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-4">
          {user ? (
            <Link href="/dashboard">
              <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm h-11 px-6 shadow-sm transition-all">
                Panel de Control
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm h-11 px-8 shadow-sm transition-all">
                Iniciar Sesión
              </Button>
            </Link>
          )}
        </nav>
      </header>

      <main className="flex-1 pt-32">
        {/* Hero Section */}
        <section className="container px-4 md:px-6 mx-auto text-center space-y-12 pb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-500 text-xs font-semibold tracking-wide animate-in fade-in slide-in-from-top-4 duration-1000">
            <Zap className="w-3 h-3 text-primary" /> El estándar para complejos deportivos
          </div>
          
          <div className="space-y-6 max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
              Automatiza tu <br />
              <span className="text-primary bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent">Sintética</span>
            </h1>
            <p className="text-slate-500 text-lg md:text-2xl font-medium max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              La plataforma premium para gestionar reservas, torneos y desafíos. Escala tu negocio mientras tus clientes disfrutan de una experiencia de otro nivel.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
             {!user && (
               <Link href="/login">
                  <Button className="w-full sm:w-auto h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                    Iniciar Sesión <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
               </Link>
             )}
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-6 pt-24">
            {[
              { icon: Calendar, title: "Reservas Inteligentes", desc: "Gestión en tiempo real con pasarela de pagos y recordatorios automáticos." },
              { icon: Flag, title: "Módulo de Torneos", desc: "Tablas de posiciones, estadísticas de jugadores y gestión de jornadas automática." },
              { icon: Swords, title: "Muro de Retos", desc: "Fomenta la competitividad permitiendo que tus clientes lancen desafíos públicos." },
              { icon: Shield, title: "Seguridad Total", desc: "Control de acceso basado en roles y políticas de seguridad robustas." },
              { icon: BarChart3, title: "Analíticas Avanzadas", desc: "Visualiza el rendimiento de tus canchas con gráficos y reportes de ingresos." },
              { icon: Globe, title: "Portal Personalizado", desc: "Cada negocio tiene su propia ruta y branding único para sus clientes." }
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-primary/40 transition-all text-left space-y-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 border-t border-slate-200 bg-white mt-24">
        <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight text-foreground">SaaSintética</span>
          </div>
          <p className="text-sm text-slate-400 font-medium">
            © {new Date().getFullYear()} • El estándar del fútbol sintético
          </p>
          <div className="flex gap-6">
            <Link href="/login" className="text-slate-500 hover:text-primary transition-colors text-xs font-semibold">Dueños</Link>
            <Link href="/admin/login" className="text-slate-500 hover:text-primary transition-colors text-xs font-semibold">Soporte</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
