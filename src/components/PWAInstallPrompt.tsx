'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const [isStandalone, setIsStandalone] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')

  useEffect(() => {
    // No mostrar en rutas de admin
    if (pathname.includes('/admin')) return
    // Check if already installed
    if (typeof window !== 'undefined') {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
      setIsStandalone(isPWA)

      // Detect platform
      const userAgent = window.navigator.userAgent.toLowerCase()
      const isIOS = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      
      if (isIOS) {
        setPlatform('ios')
      } else if (/android/.test(userAgent)) {
        setPlatform('android')
      }

      // Check for previously captured event
      if ((window as any).deferredPWAEvent) {
        setDeferredPrompt((window as any).deferredPWAEvent)
      }

      // Handle Android Install Prompt
      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault()
        setDeferredPrompt(e)
        ;(window as any).deferredPWAEvent = e
      }

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          setDeferredPrompt(null)
          ;(window as any).deferredPWAEvent = null
          setIsOpen(false)
          toast.success('¡Instalación iniciada!')
        }
      } catch (e) {
        console.error(e)
      }
    } else {
      setIsOpen(true)
    }
  }

  const handleModalInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          setDeferredPrompt(null)
          ;(window as any).deferredPWAEvent = null
          setIsOpen(false)
          toast.success('¡Instalación iniciada!')
        }
      } catch (e) {
        console.error(e)
      }
    } else {
      toast.info("Toca el menú de tu navegador (⋮) y selecciona 'Instalar aplicación' o 'Agregar a la pantalla principal'.", { duration: 6000 })
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

  const [isVisible, setIsVisible] = useState(true)
  const isExcludedRoute = pathname.includes('/admin')

  if (isStandalone || !isVisible || isExcludedRoute) return null

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          >
            <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">¿Deseas instalar la aplicación?</p>
                  <p className="text-[10px] text-zinc-400 font-medium">Acceso rápido y mejor experiencia</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsVisible(false)}
                  className="text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-widest h-8"
                >
                  No
                </Button>
                <Button 
                  size="sm"
                  onClick={handleInstallClick}
                  className="bg-primary text-black hover:bg-primary/90 text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-lg flex items-center gap-2"
                >
                  {platform === 'ios' ? <Apple className="w-3.5 h-3.5" /> : null}
                  {platform === 'ios' ? 'Instrucciones' : 'Sí'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                {platform === 'ios' ? (
                  <Button 
                    onClick={() => setIsOpen(false)}
                    className="rounded-2xl h-12 bg-primary text-black font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                  >
                    Entendido
                  </Button>
                ) : (
                  <Button 
                    onClick={handleModalInstallClick}
                    className="rounded-2xl h-12 bg-primary text-black font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" /> Instalar Aplicación
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
