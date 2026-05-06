'use client'

import * as React from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, HelpCircle } from 'lucide-react'

interface ConfirmationDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
}

export function ConfirmationDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary'
}: ConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-white/10 rounded-[32px] overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-1.5 ${variant === 'danger' ? 'bg-red-500' : 'bg-primary'}`} />
        
        <DialogHeader className="pt-6">
          <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
            {variant === 'danger' ? <AlertCircle className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
          </div>
          <DialogTitle className="text-xl font-black italic uppercase tracking-tighter text-white text-center">
            {title}
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-center font-medium text-sm pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 pb-2">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:flex-1 font-bold uppercase tracking-widest text-[10px] h-12 rounded-xl border border-white/5 hover:bg-white/5"
          >
            {cancelText}
          </Button>
          <Button 
            type="button"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className={`w-full sm:flex-1 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl shadow-lg ${
              variant === 'danger' 
                ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' 
                : 'bg-primary hover:bg-primary/90 shadow-primary/20'
            }`}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
