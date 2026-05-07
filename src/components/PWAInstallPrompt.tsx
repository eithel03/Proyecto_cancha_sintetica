'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share, Download, X, Smartphone, Info, Apple, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface PWAInstallPromptProps {
  businessName: string
  businessLogo: string
  slug: string
}

export function PWAInstallPrompt({ businessName, businessLogo, slug }: PWAInstallPromptProps) {
  const [isStandalone, setIsStandalone] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')

  useEffect(() => {
    // Check if already installed
    if (typeof window !== 'undefined') {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
      setIsStandalone(isPWA)

      // Detect platform
      const userAgent = window.navigator.userAgent.toLowerCase()
      if (/iphone|ipad|ipod/.test(userAgent)) {
        setPlatform('ios')
      } else if (/android/.test(userAgent)) {
        setPlatform('android')
      }

      // Handle Android Install Prompt
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault()
        setDeferredPrompt(e)
      })
    }
  }, [])

  const handleInstallClick = async () => {
    if (platform === 'android' && deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setIsOpen(false)
        toast.success('¡Instalación iniciada!')
      }
    } else {
      setIsOpen(true)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: businessName,
          text: `Reserva tu cancha en ${businessName} de forma rápida y sencilla.`,
          url: window.location.href
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Enlace copiado al portapapeles')
    }
  }

  if (isStandalone) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-24 right-6 z-40 md:bottom-8"
      >
        <Button
          onClick={handleInstallClick}
          className="rounded-full h-14 w-14 sm:h-16 sm:w-auto sm:px-6 bg-primary text-black font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 group"
        >
          <Download className="w-5 h-5 group-hover:bounce" />
          <span className="hidden sm:inline">Instalar App</span>
        </Button>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10 rounded-[32px] overflow-hidden p-0">
          <div className="relative p-6 sm:p-8 space-y-6">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
            
            <DialogHeader className="relative z-10">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-white/10 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
                  {businessLogo ? (
                    <img src={businessLogo} alt={businessName} className="w-full h-full object-contain" />
                  ) : (
                    <Smartphone className="w-12 h-12 text-primary" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-white">
                    Instalar {businessName}
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 font-medium mt-1">
                    Accede directamente desde tu pantalla de inicio
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 relative z-10">
              {platform === 'ios' ? (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Apple className="w-4 h-4" /> Instrucciones para iPhone:
                  </p>
                  <ol className="space-y-3">
                    <li className="flex items-start gap-3 text-sm text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                      <p>Toca el botón <strong>Compartir</strong> <Share className="w-4 h-4 inline mx-1 text-blue-400" /> en la barra inferior.</p>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                      <p>Desliza hacia abajo y selecciona <strong>"Agregar a Inicio"</strong> <PlusSquare className="w-4 h-4 inline mx-1" />.</p>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                      <p>Confirma tocando <strong>"Agregar"</strong> en la esquina superior derecha.</p>
                    </li>
                  </ol>
                </div>
              ) : platform === 'android' ? (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                  <div className="bg-emerald-500/20 p-3 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Compatible con Android</p>
                    <p className="text-xs text-zinc-500 font-medium">Toca el botón de abajo para instalar instantáneamente.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                  <div className="bg-blue-500/20 p-3 rounded-xl">
                    <Info className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Instalación Manual</p>
                    <p className="text-xs text-zinc-500 font-medium">Busca la opción "Instalar aplicación" en el menú de tu navegador.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  className="rounded-2xl h-12 border-white/5 bg-white/5 text-zinc-400 font-bold uppercase tracking-widest text-[10px]"
                >
                  Cerrar
                </Button>
                {platform === 'android' && deferredPrompt ? (
                  <Button 
                    onClick={handleInstallClick}
                    className="rounded-2xl h-12 bg-primary text-black font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                  >
                    Instalar Ahora
                  </Button>
                ) : (
                  <Button 
                    onClick={handleShare}
                    className="rounded-2xl h-12 bg-primary text-black font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    <Share className="w-3.5 h-3.5" /> Compartir Link
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PlusSquare(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  )
}
