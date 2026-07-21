'use client'

import { useState } from 'react'
import { MoreHorizontal, Edit, Trash, AlertTriangle, Loader2, Map as MapIcon, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { updateBusiness, deleteBusiness } from './actions'

import { MapPicker } from '@/components/MapPicker'
import { MapPreview } from '@/components/MapPreview'

export function BusinessActions({ business }: { business: any }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)

  // Edit form state
  const [formData, setFormData] = useState({
    name: business.name,
    slug: business.slug,
    location: business.location || '',
    phone: business.phone || '',
    whatsapp: business.whatsapp || '',
    description: business.description || '',
    is_active: business.is_active,
    max_courts: business.max_courts ?? 1,
    latitude: business.latitude || '',
    longitude: business.longitude || '',
    owner_id: business.owner_id,
    owner_name: business.ownerProfile?.full_name || '',
    owner_phone: business.ownerProfile?.phone || ''
  })

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La geolocalización no es soportada por tu navegador')
      return
    }

    toast.promise(
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setFormData((prev: any) => ({
              ...prev,
              latitude: position.coords.latitude.toString(),
              longitude: position.coords.longitude.toString()
            }))
            resolve(position)
          },
          (err) => reject(err)
        )
      }),
      {
        loading: 'Obteniendo ubicación...',
        success: '¡Ubicación capturada correctamente!',
        error: 'No se pudo obtener la ubicación. Asegúrate de dar permisos.'
      }
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }))
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
          <DropdownMenuGroup>
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={async () => {
                const newStatus = !business.is_active;
                const res = await updateBusiness(business.id, { ...business, is_active: newStatus });
                if (res.error) toast.error(res.error);
                else toast.success(newStatus ? 'Negocio activado' : 'Negocio bloqueado');
              }}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              {business.is_active ? 'Bloquear' : 'Desbloquear'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} variant="destructive">
              <Trash className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal Editar */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Editar Negocio</DialogTitle>
              <DialogDescription>
                Realiza cambios en la información de {business.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Sección 1: Datos del Negocio */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary border-b border-primary/20 pb-1">1. Información del Local</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input id="slug" name="slug" value={formData.slug} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono Fijo</Label>
                    <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp Público</Label>
                    <Input id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_courts">Límite de Canchas</Label>
                    <Input id="max_courts" name="max_courts" type="number" min="1" value={formData.max_courts} onChange={handleChange} required />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="location">Ubicación (Texto)</Label>
                    <Input id="location" name="location" value={formData.location} onChange={handleChange} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <textarea 
                      id="description" 
                      name="description" 
                      value={formData.description} 
                      onChange={handleChange}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 border-t pt-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-end gap-2 w-full">
                      <Button type="button" onClick={() => setIsMapOpen(true)} variant="outline" className="flex-1 border-blue-500/50 text-blue-500 hover:bg-blue-500/10 h-10 rounded-xl">
                        <MapIcon className="w-4 h-4 mr-2" /> Seleccionar en Mapa
                      </Button>
                      <Button type="button" onClick={captureLocation} variant="outline" className="flex-1 border-primary/50 text-primary hover:bg-primary/10 h-10 rounded-xl">
                        <MapPin className="w-4 h-4 mr-2" /> Usar GPS
                      </Button>
                    </div>
                  </div>

                  <MapPreview lat={formData.latitude} lng={formData.longitude} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input name="latitude" value={formData.latitude} onChange={handleChange} placeholder="Latitud" />
                    <Input name="longitude" value={formData.longitude} onChange={handleChange} placeholder="Longitud" />
                  </div>
                  <p className="text-[10px] text-zinc-500 italic">La ubicación GPS es necesaria para que los clientes puedan ver la distancia hasta tu local.</p>
                </div>
              </div>

              {/* Sección 2: Datos del Dueño */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary border-b border-primary/20 pb-1">2. Información del Dueño</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="owner_name">Nombre Completo</Label>
                    <Input id="owner_name" name="owner_name" value={formData.owner_name} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner_phone">Teléfono Personal</Label>
                    <Input id="owner_phone" name="owner_phone" value={formData.owner_phone} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* Sección 3: Estado */}
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Estado del Negocio</Label>
                  <p className="text-xs text-muted-foreground">Define si el negocio está operativo o bloqueado.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="is_active" 
                    checked={formData.is_active} 
                    onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, is_active: checked }))} 
                  />
                  <Badge variant={formData.is_active ? "default" : "destructive"}>
                    {formData.is_active ? 'Activo' : 'Bloqueado'}
                  </Badge>
                </div>
              </div>
            </div>
            <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
          <MapPicker 
            isOpen={isMapOpen}
            onOpenChange={setIsMapOpen}
            onSelect={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
            initialLat={formData.latitude}
            initialLng={formData.longitude}
          />
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
