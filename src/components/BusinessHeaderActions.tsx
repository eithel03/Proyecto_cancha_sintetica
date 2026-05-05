'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleFavorite } from '@/app/cliente/actions'
import { toast } from 'sonner'
import Link from 'next/link'
import { AuthPromptDialog } from './AuthPromptDialog'

interface BusinessHeaderActionsProps {
  businessId: string
  isInitialFavorite: boolean
}

export function BusinessHeaderActions({ businessId, isInitialFavorite }: BusinessHeaderActionsProps) {
  const router = useRouter()
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

  return (
    <div className="flex items-center gap-2 sm:gap-4 absolute top-6 left-6 right-6 justify-between z-20">
      <Link href="/">
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full bg-black/40 backdrop-blur-xl border-white/10 hover:bg-primary/20 hover:border-primary/50 text-white gap-2 h-10 px-4 transition-all group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="font-semibold">Volver al inicio</span>
        </Button>
      </Link>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleFavorite}
        disabled={loading}
        className={`rounded-full bg-black/40 backdrop-blur-xl border-white/10 hover:bg-primary/20 hover:border-primary/50 text-white gap-2 h-10 px-4 transition-all ${favorite ? 'border-primary/50 text-primary bg-primary/5' : ''}`}
      >
        <Heart className={`h-4 w-4 transition-colors ${favorite ? 'fill-primary text-primary' : ''}`} />
        <span className="font-semibold">{favorite ? 'En favoritos' : 'Guardar favorito'}</span>
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
