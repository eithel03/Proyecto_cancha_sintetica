"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CalendarDays, Flag, ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export function LandingHero() {
  return (
    <section className="relative w-full py-16 sm:py-20 lg:py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
      <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 -z-10" />

      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center text-center space-y-6 sm:space-y-8"
        >
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] sm:text-sm font-black uppercase tracking-widest text-primary shadow-sm backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            La revolución en gestión deportiva
          </div>
          
          <h1 className="max-w-4xl text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black italic tracking-tighter uppercase leading-[0.9] sm:leading-tight">
            Lleva tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-400">cancha sintética</span> al siguiente nivel
          </h1>
          
          <p className="mx-auto max-w-2xl text-base sm:text-xl text-muted-foreground leading-relaxed font-medium">
            Olvídate del papel, lápiz y los mensajes de WhatsApp perdidos. Nuestro sistema gestiona tus reservas, clientes y torneos de manera automática y profesional.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4 sm:mt-8 w-full sm:w-auto">
            <Link href="#directorio" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-10 text-xs sm:text-lg rounded-2xl sm:rounded-full shadow-xl shadow-primary/30 font-black uppercase tracking-widest transition-all">
                Explorar Canchas
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-10 text-xs sm:text-lg rounded-2xl sm:rounded-full border-slate-300 hover:bg-slate-100 font-bold tracking-tight transition-all">
                Panel de Dueño
              </Button>
            </Link>
          </div>
          <p className="text-[9px] sm:text-xs text-zinc-500 pt-4 max-w-sm font-bold uppercase tracking-widest">
            * El registro de nuevas canchas es exclusivo para administradores del complejo.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

export function LandingFeatures() {
  return (
    <section className="relative w-full py-20 sm:py-24 bg-slate-50 border-t border-slate-200">
      <div className="container px-4 md:px-6 mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">Todo lo que necesitas para triunfar</h2>
          <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto font-medium">Herramientas diseñadas específicamente para optimizar tu tiempo y mejorar la experiencia de tus jugadores.</p>
        </motion.div>

        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard 
            icon={<CalendarDays className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />}
            title="Reservas 24/7"
            description="Tus clientes verán la disponibilidad real y podrán agendar en cualquier momento desde su celular."
          />
          <FeatureCard 
            icon={<ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />}
            title="Torneos en Vivo"
            description="Gestiona ligas completas. Los jugadores podrán ver tablas de posiciones y goleadores en tiempo real."
          />
          <FeatureCard 
            icon={<Zap className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />}
            title="Gestión Total"
            description="Administra múltiples canchas, define horarios personalizados y obtén estadísticas de tu negocio."
          />
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-card p-6 sm:p-8 shadow-sm hover:border-primary/50 transition-colors"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 flex flex-col items-start space-y-3 sm:space-y-4">
        <div className="p-3 bg-primary/10 rounded-xl sm:rounded-2xl">
          {icon}
        </div>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h3>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed font-medium">
          {description}
        </p>
      </div>
    </motion.div>
  )
}
