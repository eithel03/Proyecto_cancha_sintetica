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
      <DialogContent className="sm:max-w-[425px] bg-white border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-green-400" />
        
        <DialogHeader className="pt-8 px-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
            <ShieldAlert className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center tracking-tight text-foreground">
            Inicia sesión para continuar
          </DialogTitle>
          <DialogDescription className="text-center text-slate-500 pt-2 text-sm leading-relaxed px-4">
            {description} Únete a nuestra comunidad para disfrutar de todas las funcionalidades.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-6 px-2">
          <Link href={`/cliente/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="w-full">
            <Button className="w-full h-12 rounded-xl font-semibold gap-2 text-base">
              <LogIn className="h-5 w-5" />
              Iniciar sesión
            </Button>
          </Link>
          
          <Link href={`/cliente/registro?redirectTo=${encodeURIComponent(redirectTo)}`} className="w-full">
            <Button variant="outline" className="w-full h-12 rounded-xl font-semibold gap-2 text-base border-slate-200 hover:bg-slate-50">
              <UserPlus className="h-5 w-5 text-primary" />
              Registrarse
            </Button>
          </Link>
        </div>

        <DialogFooter className="sm:justify-center border-t border-slate-100 pt-5 pb-1">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-slate-500 hover:text-foreground font-medium text-sm"
          >
            Quizás en otro momento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
