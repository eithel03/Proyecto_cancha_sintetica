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
      <DialogContent 
        className="sm:max-w-[400px] rounded-2xl border-border bg-card text-card-foreground shadow-xl"
        aria-describedby="confirmation-dialog-description"
      >
        <div className={`absolute top-0 left-0 w-full h-1 ${variant === 'danger' ? 'bg-destructive' : 'bg-primary'}`} />
        
        <DialogHeader className="pt-8">
          <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-destructive/10 border border-destructive/20' : 'bg-primary/10 border border-primary/20'}`}>
            {variant === 'danger' ? <AlertCircle className="w-8 h-8 text-destructive" /> : <HelpCircle className="w-8 h-8 text-primary" />}
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-card-foreground text-center">
            {title}
          </DialogTitle>
          <DialogDescription id="confirmation-dialog-description" className="text-muted-foreground text-center font-medium text-sm pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 pb-2">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:flex-1 font-semibold text-sm h-12 rounded-xl border border-border bg-surface text-foreground"
          >
            {cancelText}
          </Button>
          <Button 
            type="button"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className={`w-full sm:flex-1 font-semibold text-sm h-12 rounded-xl shadow-sm transition-transform duration-200 hover:scale-[1.02] ${
              variant === 'danger' 
                ? 'bg-destructive text-white hover:bg-destructive/90' 
                : ''
            }`}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
