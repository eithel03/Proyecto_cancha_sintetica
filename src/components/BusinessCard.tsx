'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, MapPin, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { toggleFavorite } from '@/app/cliente/actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { AuthPromptDialog } from './AuthPromptDialog'

interface BusinessCardProps {
  business: {
    id: string
    name: string
    slug: string
    location?: string
    logo_url?: string
    cover_image_url?: string
    description?: string
    phone?: string
    latitude?: number
    longitude?: number
    description?: string
  }
  isFavorite: boolean
  distance?: number
}

export function BusinessCard({ business, isFavorite, distance }: BusinessCardProps) {
  const router = useRouter()
  const [favorite, setFavorite] = useState(isFavorite)
  const [loading, setLoading] = useState(false)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setLoading(true)
    const result = await toggleFavorite(business.id)
    
    if (result.error === 'authentication_required') {
      setIsAuthDialogOpen(true)
    } else if (result.success) {
      setFavorite(result.action === 'added')
      toast.success(result.action === 'added' ? 'Agregado a favoritos' : 'Eliminado de favoritos')
    } else {
      toast.error('Error al actualizar favorito')
    }
    setLoading(false)
  }

  return (
    <motion.div
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-white/10 bg-card/40 backdrop-blur-md group hover:border-primary/50 transition-all h-full flex flex-col rounded-[24px] sm:rounded-[32px]">
        <div className="relative h-40 sm:h-48 overflow-hidden">
          <img
            src={business.cover_image_url || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop'}
            alt={business.name}
            className="w-full h-full object-cover transition-transform duration-700 sm:group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          
          <button
            onClick={handleToggleFavorite}
            disabled={loading}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 sm:p-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-primary/20 hover:border-primary/50 transition-all z-20"
          >
            <Heart className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors ${favorite ? 'fill-primary text-primary' : 'text-white'}`} />
          </button>
          
          <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 z-10">
            <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-white line-clamp-1 group-hover:text-primary transition-colors">{business.name}</h3>
            <div className="space-y-1 mt-1">
              {business.location && (
                <p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                  {business.location}
                  {distance !== undefined && (
                    <span className="ml-auto bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[8px]">
                      {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                    </span>
                  )}
                </p>
              )}
              {business.phone && (
                <p className="text-white/60 text-[10px] sm:text-[11px] font-medium flex items-center gap-1 truncate">
                  <span className="text-primary font-bold">W:</span>
                  {business.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-4 sm:p-5 flex-1">
          <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed font-medium">
            {business.description || 'Disfruta de las mejores canchas sintéticas con el mejor ambiente deportivo, iluminación profesional y amplios parqueos.'}
          </p>
        </CardContent>

        <CardFooter className="p-4 sm:p-5 pt-0 sm:pt-0">
          <Link href={`/${business.slug}`} className="w-full">
            <Button className="w-full h-10 sm:h-11 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] shadow-lg shadow-primary/10 group-hover:shadow-primary/20 transition-all flex items-center justify-center gap-2">
              Ver Sintética
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </CardFooter>
      </Card>

      <AuthPromptDialog 
        isOpen={isAuthDialogOpen} 
        onOpenChange={setIsAuthDialogOpen} 
        title="¡Guarda tus favoritos!"
        description="Inicia sesión para guardar este local en tu lista de favoritos y acceder más rápido."
        redirectTo="/"
      />
    </motion.div>
  )
}
