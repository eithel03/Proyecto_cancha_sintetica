"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CalendarDays, Flag, ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export function LandingHero() {
  return (
    <section className="relative w-full py-20 lg:py-40 overflow-hidden">
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
            <Link href="#directorio" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/30 font-bold transition-all">
                Explorar Canchas
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full border-white/10 hover:bg-white/5 font-bold transition-all">
                Panel de Dueño
              </Button>
            </Link>
          </motion.div>
          <p className="text-xs text-muted-foreground pt-4 max-w-sm">
            * El registro de nuevas canchas es exclusivo para administradores del complejo.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

export function LandingFeatures() {
  return (
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
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Herramientas diseñadas específicamente para optimizar tu tiempo y mejorar la experiencia de tus jugadores.</p>
        </motion.div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard 
            icon={<CalendarDays className="h-8 w-8 text-primary" />}
            title="Reservas 24/7"
            description="Tus clientes verán la disponibilidad real y podrán agendar en cualquier momento desde su celular."
          />
          <FeatureCard 
            icon={<ShieldCheck className="h-8 w-8 text-primary" />}
            title="Torneos en Vivo"
            description="Gestiona ligas completas. Los jugadores podrán ver tablas de posiciones y goleadores en tiempo real."
          />
          <FeatureCard 
            icon={<Zap className="h-8 w-8 text-primary" />}
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
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-card p-8 hover:border-primary/50 transition-colors"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 flex flex-col items-start space-y-4">
        <div className="p-3 bg-primary/10 rounded-2xl">
          {icon}
        </div>
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  )
}
