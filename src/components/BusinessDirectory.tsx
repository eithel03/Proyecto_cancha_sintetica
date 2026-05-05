'use client'

import { useState } from 'react'
import { BusinessCard } from './BusinessCard'
import { Input } from '@/components/ui/input'
import { Search, Trophy, MapPin, LayoutGrid, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

interface BusinessDirectoryProps {
  businesses: any[]
  favorites: string[]
  totalCount: number
}

export function BusinessDirectory({ businesses, favorites, totalCount }: BusinessDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.location && b.location.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <section className="w-full py-20 relative overflow-hidden" id="directorio">
      {/* Background decoration */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] -z-10" />

      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              Directorio de Complejos
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Encuentra tu próximo <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">terreno de juego</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Explora nuestra red de <span className="text-foreground font-bold">{totalCount} locales registrados</span>. 
              Reserva canchas, únete a torneos y desafía a otros equipos en los mejores complejos del país.
            </p>
          </div>
          
          <div className="relative w-full md:w-96 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-emerald-500/50 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Buscar por nombre o ciudad..." 
                className="pl-12 h-14 bg-card/80 backdrop-blur-xl border-white/10 rounded-2xl focus:border-primary/50 focus:ring-primary/20 transition-all text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filteredBusinesses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredBusinesses.map((business, index) => (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <BusinessCard 
                  business={business} 
                  isFavorite={favorites.includes(business.id)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32 border-2 border-dashed border-white/5 rounded-[3rem] bg-card/20 backdrop-blur-sm"
          >
            <div className="inline-flex p-6 rounded-3xl bg-primary/5 border border-primary/10 mb-6">
              <Search className="h-12 w-12 text-primary opacity-50" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No se encontraron resultados</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              No pudimos encontrar locales que coincidan con "<span className="text-foreground font-medium">{searchTerm}</span>". 
              Intenta con otros términos.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  )
}
