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
  }
  isFavorite: boolean
}

export function BusinessCard({ business, isFavorite }: BusinessCardProps) {
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
      <Card className="overflow-hidden border-white/10 bg-card/40 backdrop-blur-md group hover:border-primary/50 transition-all h-full flex flex-col">
        <div className="relative h-48 overflow-hidden">
          <img
            src={business.cover_image_url || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop'}
            alt={business.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <button
            onClick={handleToggleFavorite}
            disabled={loading}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-primary/20 hover:border-primary/50 transition-all z-20"
          >
            <Heart className={`h-5 w-5 transition-colors ${favorite ? 'fill-primary text-primary' : 'text-white'}`} />
          </button>
          
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <h3 className="text-xl font-bold text-white line-clamp-1 group-hover:text-primary transition-colors">{business.name}</h3>
            {business.location && (
              <p className="text-white/80 text-xs flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3 text-primary" />
                {business.location}
              </p>
            )}
          </div>
        </div>

        <CardContent className="p-5 flex-1">
          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
            {business.description || 'Disfruta de las mejores canchas sintéticas con el mejor ambiente deportivo, iluminación profesional y amplios parqueos.'}
          </p>
        </CardContent>

        <CardFooter className="p-5 pt-0">
          <Link href={`/${business.slug}`} className="w-full">
            <Button className="w-full h-11 rounded-xl font-semibold shadow-lg shadow-primary/10 group-hover:shadow-primary/20 transition-all flex items-center justify-center gap-2">
              Ver Instalaciones
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
