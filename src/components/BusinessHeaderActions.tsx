'use client'

import { useState } from 'react'
import { Heart, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleFavorite } from '@/app/cliente/actions'
import { toast } from 'sonner'
import { AuthPromptDialog } from './AuthPromptDialog'

interface BusinessHeaderActionsProps {
  businessId: string
  isInitialFavorite: boolean
  businessName?: string
}

export function BusinessHeaderActions({ businessId, isInitialFavorite, businessName }: BusinessHeaderActionsProps) {
  const [favorite, setFavorite] = useState(isInitialFavorite)
  const [loading, setLoading] = useState(false)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)

  const handleToggleFavorite = async () => {
    setLoading(true)
    const result = await toggleFavorite(businessId)
    
    if (result.error === 'authentication_required') {
      setIsAuthDialogOpen(true)
    } else if (result.success) {
      setFavorite(result.action === 'added')
      toast.success(result.action === 'added' ? 'Agregado a favoritos' : 'Eliminado de favoritos')
    }
    setLoading(false)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: businessName || 'Cancha Sintética',
          text: `Reserva tu cancha en ${businessName || 'esta sintética'} de forma rápida.`,
          url: window.location.href
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Enlace copiado al portapapeles')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleShare}
        aria-label="Compartir"
        title="Compartir"
        className="h-10 w-10 sm:h-11 sm:w-11 rounded-[10px] border border-white/20 bg-white/5 text-white hover:bg-white/15 hover:border-white/30 transition-colors"
      >
        <Share2 className="w-4.5 h-4.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleFavorite}
        disabled={loading}
        aria-label={favorite ? 'Eliminar de favoritos' : 'Guardar'}
        title={favorite ? 'Eliminar de favoritos' : 'Guardar'}
        className={`h-10 w-10 sm:h-11 sm:w-11 rounded-[10px] border border-white/20 bg-white/5 text-white hover:bg-white/15 hover:border-white/30 transition-colors ${favorite ? 'border-gold/50 bg-gold/10' : ''}`}
      >
        <Heart className={`w-4.5 h-4.5 transition-colors ${favorite ? 'fill-gold text-gold' : ''}`} />
      </Button>

      <AuthPromptDialog 
        isOpen={isAuthDialogOpen} 
        onOpenChange={setIsAuthDialogOpen} 
        title="¡Guarda este local!"
        description="Inicia sesión para tener este local siempre a mano en tu perfil."
        redirectTo={typeof window !== 'undefined' ? window.location.pathname : '/'}
      />
    </div>
  )
}
