'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Loader2, ImageIcon } from 'lucide-react'
import { createCourt, updateCourt, deleteCourt } from './actions'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export default function CourtsClient({ initialCourts, businessId }: { initialCourts: any[], businessId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [editingCourt, setEditingCourt] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  async function onSubmit(formData: FormData) {
    setPending(true)
    formData.append('business_id', businessId)
    formData.append('image_url', imageUrl || editingCourt?.image_url || '')
    
    let result;
    if (editingCourt) {
      formData.append('id', editingCourt.id)
      result = await updateCourt(formData)
    } else {
      result = await createCourt(formData)
    }
    
    setPending(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(editingCourt ? 'Cancha actualizada' : 'Cancha creada exitosamente')
      setOpen(false)
      setEditingCourt(null)
      setImageUrl('')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta cancha?')) return
    const result = await deleteCourt(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Cancha eliminada')
    }
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) { setEditingCourt(null); setImageUrl(''); } }}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Agregar Cancha
              </Button>
            }
          />
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCourt ? 'Editar Cancha' : 'Nueva Cancha'}</DialogTitle>
              <DialogDescription>
                Completa los detalles de la cancha sintética.
              </DialogDescription>
            </DialogHeader>
            <form action={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" defaultValue={editingCourt?.name} placeholder="Cancha 1 (Fútbol 5)" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_per_person">Precio por persona (₡)</Label>
                <Input id="price_per_person" name="price_per_person" type="number" defaultValue={editingCourt?.price_per_person} placeholder="1500" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción (Opcional)</Label>
                <Textarea id="description" name="description" defaultValue={editingCourt?.description} placeholder="Detalles de la cancha..." />
              </div>
              
              <div className="space-y-2">
                <Label>Imagen de la Cancha</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-lg border flex items-center justify-center overflow-hidden">
                    {imageUrl || editingCourt?.image_url ? (
                      <img src={imageUrl || editingCourt?.image_url} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        
                        setIsUploading(true)
                        try {
                          const { createClient } = await import('@/lib/supabase/client')
                          const supabase = createClient()
                          
                          const fileExt = file.name.split('.').pop()
                          const fileName = `${Math.random()}.${fileExt}`
                          const filePath = `${businessId}/${fileName}`
                          
                          const { data, error } = await supabase.storage
                            .from('courts')
                            .upload(filePath, file)
                            
                          if (error) throw error
                          
                          const { data: { publicUrl } } = supabase.storage
                            .from('courts')
                            .getPublicUrl(filePath)
                            
                          setImageUrl(publicUrl)
                          toast.success('Imagen cargada correctamente')
                        } catch (error: any) {
                          toast.error('Error al cargar imagen: ' + error.message)
                        } finally {
                          setIsUploading(false)
                        }
                      }}
                      disabled={isUploading}
                    />
                    <p className="text-[10px] text-muted-foreground">Formato sugerido: JPG o PNG</p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={pending || isUploading}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingCourt ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (editingCourt ? 'Guardar Cambios' : 'Crear Cancha')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {initialCourts.length === 0 ? (
          <div className="col-span-full text-center p-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <p className="text-muted-foreground">Aún no tienes canchas registradas.</p>
          </div>
        ) : (
          initialCourts.map((court) => (
            <Card key={court.id} className="overflow-hidden border-zinc-200 dark:border-zinc-800 group transition-all hover:shadow-lg">
              <div className="h-48 bg-zinc-100 dark:bg-zinc-800 relative">
                {court.image_url ? (
                  <img src={court.image_url} className="w-full h-full object-cover" alt={court.name} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingCourt(court);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleDelete(court.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{court.name}</CardTitle>
                  <Badge variant={court.is_active ? 'default' : 'secondary'} className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    {court.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                {court.description && <CardDescription className="line-clamp-2">{court.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Precio por persona</span>
                  <p className="text-3xl font-black text-emerald-500">
                    ₡{court.price_per_person?.toLocaleString() || '0'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  )
}
