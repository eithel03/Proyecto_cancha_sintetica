'use client'

import { useState } from 'react'
import { MoreHorizontal, Edit, Trash, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { updateBusiness, deleteBusiness } from './actions'

export function BusinessActions({ business }: { business: any }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit form state
  const [formData, setFormData] = useState({
    name: business.name,
    slug: business.slug,
    location: business.location || '',
    phone: business.phone || '',
    whatsapp: business.whatsapp || '',
    description: business.description || '',
    is_active: business.is_active
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const res = await updateBusiness(business.id, formData)
    setIsSubmitting(false)
    
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Negocio actualizado correctamente')
      setIsEditDialogOpen(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    const res = await deleteBusiness(business.id, business.owner_id)
    setIsSubmitting(false)
    
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Negocio y dueño eliminados exitosamente')
      setIsDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none focus:ring-2 focus:ring-primary">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acciones</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} variant="destructive">
            <Trash className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal Editar */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Editar Negocio</DialogTitle>
              <DialogDescription>
                Realiza cambios en la información de {business.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nombre</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="slug" className="text-right">Slug</Label>
                <Input id="slug" name="slug" value={formData.slug} onChange={handleChange} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">Ubicación</Label>
                <Input id="location" name="location" value={formData.location} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Teléfono</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="whatsapp" className="text-right">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="is_active" className="text-right">Estado</Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Switch 
                    id="is_active" 
                    checked={formData.is_active} 
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))} 
                  />
                  <Label htmlFor="is_active">{formData.is_active ? 'Activo' : 'Inactivo'}</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600 gap-2">
              <AlertTriangle className="h-5 w-5" />
              Precaución: Eliminación Destructiva
            </DialogTitle>
            <DialogDescription className="pt-2 text-foreground">
              Estás a punto de eliminar permanentemente el negocio <strong>{business.name}</strong>.
              <br/><br/>
              Esta acción <strong>eliminará en cascada</strong> todo lo asociado: la cuenta del usuario dueño, sus canchas, reservas, estadísticas y torneos. Esta acción NO se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sí, Eliminar Todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
