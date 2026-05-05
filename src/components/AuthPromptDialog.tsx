'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { LogIn, UserPlus, ShieldAlert, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface AuthPromptDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  redirectTo?: string
}

export function AuthPromptDialog({
  isOpen,
  onOpenChange,
  title = "Inicia sesión para continuar",
  description = "Para realizar esta acción necesitas estar registrado en nuestra plataforma.",
  redirectTo = "/"
}: AuthPromptDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-primary/20">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-emerald-400 to-primary animate-pulse" />
        
        <DialogHeader className="pt-8 px-2">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl rotate-12 flex items-center justify-center mb-6 border border-primary/20 relative group transition-transform hover:rotate-0 duration-500">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <ShieldAlert className="h-10 w-10 text-primary -rotate-12 transition-transform group-hover:rotate-0 duration-500" />
          </div>
          <DialogTitle className="text-3xl font-black text-center tracking-tighter leading-tight italic uppercase">
            ¡Alto ahí, <span className="text-primary">crack</span>!
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400 pt-3 text-base leading-relaxed px-4">
            {description} Únete a nuestra comunidad para disfrutar de todas las funcionalidades.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-8 px-2">
          <Link href={`/cliente/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="w-full">
            <Button className="w-full h-14 rounded-2xl font-black gap-3 text-xl shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95">
              <LogIn className="h-6 w-6" />
              INICIAR SESIÓN
            </Button>
          </Link>
          
          <Link href={`/cliente/registro?redirectTo=${encodeURIComponent(redirectTo)}`} className="w-full">
            <Button variant="outline" className="w-full h-14 rounded-2xl font-black gap-3 text-xl border-white/10 hover:bg-white/5 transition-all hover:scale-[1.02] active:scale-95">
              <UserPlus className="h-6 w-6 text-primary" />
              REGISTRARSE
            </Button>
          </Link>
        </div>

        <DialogFooter className="sm:justify-center border-t border-white/5 pt-6 pb-2">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-zinc-500 hover:text-white font-bold tracking-widest text-xs uppercase"
          >
            Quizás en otro momento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
