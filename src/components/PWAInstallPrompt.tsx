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
            transition={{ duration: 0.25 }}
            className="fixed z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[21rem]"
          >
            <div className="relative bg-white sm:rounded-2xl rounded-t-2xl sm:border border-slate-200 border-t border-slate-200 shadow-[0_-4px_24px_rgba(23,33,30,0.08)] sm:shadow-lg px-4 sm:px-5 pt-3 pb-4 sm:py-4">
              {/* Handle visual en móvil */}
              <div className="sm:hidden mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200" />

              <button
                onClick={() => setIsVisible(false)}
                aria-label="Cerrar"
                className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 pr-8">
                <div className="bg-primary/10 rounded-xl p-2 flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">Instala nuestra app</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Reserva más rápido y recibe novedades.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3.5">
                <Button
                  variant="outline"
                  onClick={() => setIsVisible(false)}
                  className="h-11 rounded-xl border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50"
                >
                  Ahora no
                </Button>
                <Button
                  onClick={handleInstallClick}
                  className="h-11 rounded-xl bg-gold text-navy font-bold text-sm hover:bg-[#ffd233]"
                >
                  {platform === 'ios' ? <Apple className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  {platform === 'ios' ? 'Instrucciones' : 'Instalar'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200 rounded-2xl overflow-hidden p-0">
          <div className="relative p-6 sm:p-8 space-y-6">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
            
            <DialogHeader className="relative z-10">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 p-2 shadow-sm flex items-center justify-center overflow-hidden">
                  {businessLogo ? (
                    <img src={businessLogo} alt={businessName} className="w-full h-full object-contain" />
                  ) : (
                    <Smartphone className="w-10 h-10 text-primary" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    Instalar {businessName}
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium mt-1 text-sm">
                    Accede directamente desde tu pantalla de inicio
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 relative z-10">
              {platform === 'ios' ? (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-2">
                    <Apple className="w-4 h-4" /> Instrucciones para iPhone:
                  </p>
                  <ol className="space-y-3">
                    <li className="flex items-start gap-3 text-sm text-slate-600">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                      <p>Toca el botón <strong>Compartir</strong> <Share className="w-4 h-4 inline mx-1 text-blue-500" /> en la barra inferior.</p>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-600">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                      <p>Desliza hacia abajo y selecciona <strong>"Agregar a Inicio"</strong> <PlusSquare className="w-4 h-4 inline mx-1" />.</p>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-600">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                      <p>Confirma tocando <strong>"Agregar"</strong> en la esquina superior derecha.</p>
                    </li>
                  </ol>
                </div>
              ) : platform === 'android' ? (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center gap-4">
                  <div className="bg-green-50 p-3 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Compatible con Android</p>
                    <p className="text-xs text-slate-500 font-medium">Toca el botón de abajo para instalar instantáneamente.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center gap-4">
                  <div className="bg-blue-50 p-3 rounded-xl">
                    <Info className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Instalación manual</p>
                    <p className="text-xs text-slate-500 font-medium">Busca la opción "Instalar aplicación" en el menú de tu navegador.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl h-12 border-slate-200 text-slate-600 font-medium text-sm"
                >
                  Cerrar
                </Button>
                {platform === 'ios' ? (
                  <Button 
                    onClick={handleInstallClick}
                    className="rounded-xl h-12 bg-gold text-navy font-bold text-sm hover:bg-[#ffd233]"
                  >
                    Instalar ahora
                  </Button>
                ) : (
                  <Button 
                    onClick={handleShare}
                    className="rounded-xl h-12 bg-gold text-navy font-bold text-sm hover:bg-[#ffd233] flex items-center justify-center gap-2"
                  >
                    <Share className="w-3.5 h-3.5" /> Compartir link
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
