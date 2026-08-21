'use client'

import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface BusinessHeaderActionsProps {
  businessName?: string
}

export function BusinessHeaderActions({ businessName }: BusinessHeaderActionsProps) {
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
    <Button
      variant="ghost"
      size="icon"
      onClick={handleShare}
      aria-label="Compartir"
      title="Compartir"
      className="h-10 w-10 sm:h-11 sm:w-11 rounded-[10px] border border-white/20 bg-white/5 text-white hover:bg-white/15 hover:border-white/30 transition-colors flex-shrink-0"
    >
      <Share2 className="w-4.5 h-4.5" />
    </Button>
  )
}