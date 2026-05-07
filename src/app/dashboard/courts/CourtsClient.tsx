'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Loader2, ImageIcon, Coins, Clock } from 'lucide-react'
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
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'

export default function CourtsClient({ initialCourts, businessId }: { initialCourts: any[], businessId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [editingCourt, setEditingCourt] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [pricingCourt, setPricingCourt] = useState<any>(null)
  const [pricingRules, setPricingRules] = useState<any[]>([])
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [selectedCapacity, setSelectedCapacity] = useState("5")
  
  // Estado para Diálogo de Confirmación
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean,
    title: string,
    description: string,
    onConfirm: () => void,
    variant?: 'danger' | 'primary'
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  })

  const showConfirm = (title: string, description: string, onConfirm: () => void, variant: 'danger' | 'primary' = 'primary') => {
    setConfirmConfig({ isOpen: true, title, description, onConfirm, variant })
  }

  async function onSubmit(formData: FormData) {
    setPending(true)
    formData.append('business_id', businessId)
    formData.append('capacity', selectedCapacity)
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
    showConfirm(
      'Eliminar Cancha',
      '¿Estás seguro de eliminar esta cancha? Esta acción borrará permanentemente el registro y no se podrá deshacer.',
      async () => {
        const result = await deleteCourt(id)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Cancha eliminada')
        }
      },
      'danger'
    )
  }

  const loadPricingRules = async (court: any) => {
    setPricingCourt(court)
    setLoadingPricing(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase.from('court_pricing_rules').select('*').eq('court_id', court.id).order('day_of_week').order('start_time')
    setPricingRules(data || [])
    setLoadingPricing(false)
  }

  const addPricingRule = async (formData: FormData) => {
    setPending(true)
    const { createPricingRule } = await import('./actions')
    const result = await createPricingRule({
      court_id: pricingCourt.id,
      day_of_week: parseInt(formData.get('day_of_week') as string),
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      price: parseFloat(formData.get('price') as string)
    })

    if (result.success) {
      setPricingRules([...pricingRules, result.data])
      toast.success('Regla de precio añadida')
    } else {
      toast.error(result.error)
    }
    setPending(false)
  }

  const deletePricingRule = async (id: string) => {
    const { deletePricingRule } = await import('./actions')
    const result = await deletePricingRule(id)
    if (result.success) {
      setPricingRules(pricingRules.filter(r => r.id !== id))
      toast.success('Regla eliminada')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <ConfirmationDialog
        isOpen={confirmConfig.isOpen}
        onOpenChange={(val) => setConfirmConfig({ ...confirmConfig, isOpen: val })}
        title={confirmConfig.title}
        description={confirmConfig.description}
        onConfirm={confirmConfig.onConfirm}
        variant={confirmConfig.variant}
      />
      <div className="flex justify-end mb-6">
        <Dialog open={open} onOpenChange={(val) => { 
          setOpen(val); 
          if(!val) { 
            setEditingCourt(null); 
            setImageUrl(''); 
            setSelectedCapacity("5");
          } 
        }}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Agregar Cancha
              </Button>
            }
          />
          <DialogContent className="max-w-md w-[95vw] rounded-3xl">
            <DialogHeader>
              <DialogTitle>{editingCourt ? 'Editar Cancha' : 'Nueva Cancha'}</DialogTitle>
              <DialogDescription>
                Completa los detalles de la cancha sintética.
              </DialogDescription>
            </DialogHeader>
            <form key={editingCourt?.id || 'new'} action={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" defaultValue={editingCourt?.name} placeholder="Cancha 1 (Fútbol 5)" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_per_person">Precio por persona (₡)</Label>
                <Input id="price_per_person" name="price_per_person" type="number" defaultValue={editingCourt?.price_per_person} placeholder="1500" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Tipo de Cancha</Label>
                <Select 
                  name="capacity" 
                  value={selectedCapacity} 
                  onValueChange={setSelectedCapacity}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona el tipo de cancha" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="5">Fútbol 5 (5 vs 5)</SelectItem>
                    <SelectItem value="6">Fútbol 6 (6 vs 6)</SelectItem>
                    <SelectItem value="7">Fútbol 7 (7 vs 7)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción (Opcional)</Label>
                <Textarea id="description" name="description" defaultValue={editingCourt?.description} placeholder="Detalles de la cancha..." />
              </div>
              
              <div className="space-y-2">
                <Label>Imagen de la Cancha</Label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-24 h-40 sm:h-24 bg-zinc-100 dark:bg-zinc-800 rounded-lg border flex items-center justify-center overflow-hidden">
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
                <div className="absolute top-3 right-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 z-20">
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 text-white hover:bg-emerald-500 hover:text-white hover:border-emerald-400 transition-all shadow-xl"
                    onClick={() => loadPricingRules(court)}
                    title="Precios Dinámicos"
                  >
                    <Coins className="h-4.5 w-4.5" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 text-white hover:bg-primary hover:text-white hover:border-primary/50 transition-all shadow-xl"
                    onClick={() => {
                      setEditingCourt(court);
                      setSelectedCapacity(court.capacity?.toString() || "5");
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4.5 w-4.5" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl bg-red-500/80 backdrop-blur-xl border border-red-400/20 text-white hover:bg-red-600 transition-all shadow-xl"
                    onClick={() => handleDelete(court.id)}
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </Button>
                </div>
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{court.name}</CardTitle>
                  <div className="flex flex-col gap-1">
                    <Badge variant={court.is_active ? 'default' : 'secondary'} className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 w-fit">
                      {court.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                    <Badge variant="outline" className="w-fit">
                      Fútbol {court.capacity || 5}
                    </Badge>
                  </div>
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

      <Dialog open={!!pricingCourt} onOpenChange={(val) => { if(!val) setPricingCourt(null) }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-500" /> Precios Dinámicos: {pricingCourt?.name}
            </DialogTitle>
            <DialogDescription>
              Configura tarifas especiales por horario para esta cancha (Precios en ₡).
            </DialogDescription>
          </DialogHeader>
          
          <form action={addPricingRule} className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-zinc-900 rounded-xl border border-white/5">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase">Día</Label>
              <select name="day_of_week" className="w-full h-10 rounded-lg bg-zinc-800 border-white/10 text-xs px-2">
                <option value="0">Lunes</option>
                <option value="1">Martes</option>
                <option value="2">Miércoles</option>
                <option value="3">Jueves</option>
                <option value="4">Viernes</option>
                <option value="5">Sábado</option>
                <option value="6">Domingo</option>
              </select>
            </div>
            <div className="grid grid-cols-2 sm:contents gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase">Inicio</Label>
                <Input name="start_time" type="time" required className="bg-zinc-800 h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase">Fin</Label>
                <Input name="end_time" type="time" required className="bg-zinc-800 h-10" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase">Precio (₡)</Label>
              <Input name="price" type="number" required className="bg-zinc-800 h-10" placeholder="2000" />
            </div>
            <Button type="submit" className="col-span-full h-10 font-bold" disabled={pending}>
              {pending ? 'Añadiendo...' : '+ Añadir Regla'}
            </Button>
          </form>

          <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2">
            {loadingPricing ? (
              <div className="text-center py-8"><Loader2 className="animate-spin mx-auto w-6 h-6" /></div>
            ) : pricingRules.length === 0 ? (
              <p className="text-center py-8 text-zinc-500 text-xs font-bold uppercase">No hay reglas de precio dinámico.</p>
            ) : (
              pricingRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-[9px] font-black">
                      {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'][rule.day_of_week]}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span className="font-bold">{rule.start_time.substring(0, 5)} - {rule.end_time.substring(0, 5)}</span>
                    </div>
                    <span className="text-emerald-500 font-black">₡{rule.price.toLocaleString()}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deletePricingRule(rule.id)} className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
