"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CalendarDays, Flag, CheckCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30">
      {/* Navbar Glassmorphism */}
      <header className="sticky top-0 z-50 px-4 lg:px-8 h-20 flex items-center border-b border-white/5 bg-background/60 backdrop-blur-xl">
        <Link className="flex items-center justify-center gap-2 transition-transform hover:scale-105" href="/">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Flag className="h-6 w-6 text-primary" />
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">
            SaaSintética
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-2 sm:gap-4">
          <Link href="/admin/login" className="hidden sm:block">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground rounded-full">
              Panel Admin
            </Button>
          </Link>
          <Link href="/login">
            <Button className="rounded-full shadow-lg shadow-primary/25 font-semibold group">
              Iniciar Sesión
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 lg:py-40 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 -z-10" />

          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center text-center space-y-8"
            >
              <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary shadow-sm backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                La revolución en gestión deportiva
              </div>
              
              <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
                Lleva tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">cancha sintética</span> al siguiente nivel
              </h1>
              
              <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
                Olvídate del papel, lápiz y los mensajes de WhatsApp perdidos. Nuestro sistema gestiona tus reservas, clientes y torneos de manera automática y profesional.
              </p>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto"
              >
                <Link href="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/30 font-bold transition-all">
                    Acceder a mi panel
                  </Button>
                </Link>
              </motion.div>
              <p className="text-xs text-muted-foreground pt-4 max-w-sm">
                * El registro de nuevas canchas es exclusivo. Contacta a administración para unirte a la red.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative w-full py-24 bg-zinc-950/50 border-t border-white/5">
          <div className="container px-4 md:px-6 mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Todo lo que necesitas para triunfar</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Herramientas diseñadas específicamente para dueños de complejos deportivos que quieren optimizar su tiempo y multiplicar sus ganancias.</p>
            </motion.div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-card p-8 hover:border-primary/50 transition-colors"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-start space-y-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <CalendarDays className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">Reservas 24/7</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Tus clientes verán la disponibilidad real y podrán agendar en cualquier momento desde su celular mediante tu enlace personalizado.
                  </p>
                </div>
              </motion.div>

              {/* Feature 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-card p-8 hover:border-primary/50 transition-colors"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-start space-y-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">Torneos en Vivo</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Gestiona ligas y torneos completos. Los jugadores podrán ver tablas de posiciones, goleadores y minutos de juego en tiempo real.
                  </p>
                </div>
              </motion.div>

              {/* Feature 3 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-card p-8 hover:border-primary/50 transition-colors sm:col-span-2 lg:col-span-1"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-start space-y-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">Gestión Total</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Administra múltiples canchas, define horarios personalizados, precios dinámicos y obtén estadísticas de tu negocio en tiempo real.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-8 border-t border-white/5 bg-background">
        <div className="container px-4 md:px-6 mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary opacity-50" />
            <span className="font-semibold text-muted-foreground">SaaSintética</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SaaSintética. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
