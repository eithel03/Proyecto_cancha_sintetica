'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateBusiness } from './actions'
import { toast } from 'sonner'
import BusinessHoursManager from './BusinessHoursManager'
import { Store, Globe, Phone, MapPin, Save, CalendarOff, Plus, Trash2, Search, Map as MapIcon, Palette, Layout, Type, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MapPicker } from '@/components/MapPicker'
import { MapPreview } from '@/components/MapPreview'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { updateBranding } from './actions'

export default function SettingsClient({ business, initialHours, initialExceptions = [] }: { business: any, initialHours: any[], initialExceptions?: any[] }) {
  const [pending, setPending] = useState(false)
  const [exceptions, setExceptions] = useState<any[]>(initialExceptions)
  const [newExDate, setNewExDate] = useState('')
  const [newExReason, setNewExReason] = useState('')
  const [coords, setCoords] = useState({ lat: business.latitude || '', lng: business.longitude || '' })
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [branding, setBranding] = useState(business.branding || {
    primary: '#10b981',
    background: '#09090b',
    text: '#ffffff',
    card_bg: '#18181b',
    accent: '#10b981'
  })
  const [brandingPending, setBrandingPending] = useState(false)


  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La geolocalización no es soportada por tu navegador')
      return
    }

    toast.promise(
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCoords({
              lat: position.coords.latitude.toString(),
              lng: position.coords.longitude.toString()
            })
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

  async function onSubmit(formData: FormData) {
    setPending(true)
    formData.append('id', business.id)
    const result = await updateBusiness(formData)
    setPending(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Configuración actualizada correctamente')
    }
  }

  const addException = async () => {
    if (!newExDate) return
    setPending(true)
    
    const { createException } = await import('./actions')
    const result = await createException({
      business_id: business.id,
      exception_date: newExDate,
      reason: newExReason,
      is_closed: true
    })

    if (result.success) {
      setExceptions([...exceptions, result.data])
      setNewExDate('')
      setNewExReason('')
      toast.success('Fecha bloqueada correctamente')
    } else {
      toast.error(result.error)
    }
    setPending(false)
  }

  const removeException = async (id: string) => {
    setPending(true)
    const { deleteException } = await import('./actions')
    const result = await deleteException(id)
    if (result.success) {
      setExceptions(exceptions.filter(e => e.id !== id))
      toast.success('Bloqueo eliminado')
    } else {
      toast.error(result.error)
    }
    setPending(false)
  }

  const handleBrandingSave = async () => {
    setBrandingPending(true)
    const result = await updateBranding(business.id, branding)
    setBrandingPending(false)
    if (result.success) {
      toast.success('Apariencia actualizada correctamente')
    } else {
      toast.error(result.error)
    }
  }

  const updateBrandingColor = (key: string, value: string) => {
    setBranding(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Tabs defaultValue="general" className="space-y-8">
      <TabsList className="bg-zinc-900/50 p-1 border border-white/5 rounded-2xl h-14 w-full sm:w-auto">
        <TabsTrigger value="general" className="rounded-xl px-6 gap-2 h-12 data-[state=active]:bg-zinc-800"><Store className="w-4 h-4" /> General</TabsTrigger>
        <TabsTrigger value="horarios" className="rounded-xl px-6 gap-2 h-12 data-[state=active]:bg-zinc-800"><CalendarOff className="w-4 h-4" /> Horarios</TabsTrigger>
        <TabsTrigger value="apariencia" className="rounded-xl px-6 gap-2 h-12 data-[state=active]:bg-zinc-800"><Palette className="w-4 h-4" /> Apariencia</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-8 focus-visible:outline-none">
        <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" /> Información General
            </CardTitle>
            <CardDescription>Actualiza los datos públicos de tu sintética para que los clientes te encuentren.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={onSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Nombre del Local</Label>
                  <div className="relative">
                    <Input id="name" name="name" defaultValue={business.name} required className="bg-zinc-900 border-white/10 pl-10" />
                    <Store className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Enlace Personalizado</Label>
                  <div className="relative">
                    <Input id="slug" defaultValue={business.slug} disabled className="bg-zinc-900/50 border-white/5 pl-10 text-zinc-500" />
                    <Globe className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  </div>
                  <p className="text-[10px] text-zinc-500 italic">Este enlace es único y no se puede cambiar.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-zinc-500">WhatsApp de Contacto</Label>
                  <div className="relative">
                    <Input id="phone" name="phone" defaultValue={business.phone || ''} className="bg-zinc-900 border-white/10 pl-10" placeholder="8888 8888" />
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Ubicación Física</Label>
                  <div className="relative">
                    <Input id="location" name="location" defaultValue={business.location || ''} className="bg-zinc-900 border-white/10 pl-10" placeholder="Ej: 200m Sur de la Iglesia" />
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  </div>
                </div>

                <div className="space-y-4 md:col-span-2 border-t border-white/5 pt-6">
                  <input type="hidden" name="latitude" value={coords.lat} />
                  <input type="hidden" name="longitude" value={coords.lng} />

                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-end gap-2 w-full">
                      <Button type="button" onClick={() => setIsMapOpen(true)} variant="outline" className="flex-1 border-blue-500/50 text-blue-500 hover:bg-blue-500/10 h-12 rounded-xl">
                        <MapIcon className="w-4 h-4 mr-2" /> Seleccionar Ubicación en Mapa
                      </Button>
                      <Button type="button" onClick={captureLocation} variant="outline" className="flex-1 border-primary/50 text-primary hover:bg-primary/10 h-12 rounded-xl">
                        <MapPin className="w-4 h-4 mr-2" /> Usar GPS del Dispositivo
                      </Button>
                    </div>
                  </div>

                  <MapPreview lat={coords.lat} lng={coords.lng} />

                  <p className="text-[10px] text-zinc-500 italic">La ubicación GPS es necesaria para que los clientes puedan ver la distancia hasta tu local.</p>
                </div>
              </div>
              
              <Button type="submit" className="w-full sm:w-auto font-bold px-8" disabled={pending}>
                {pending ? (
                  <>Guardando...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Guardar Información</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <MapPicker 
          isOpen={isMapOpen}
          onOpenChange={setIsMapOpen}
          onSelect={(lat, lng) => setCoords({ lat, lng })}
          initialLat={coords.lat}
          initialLng={coords.lng}
        />
      </TabsContent>

      <TabsContent value="horarios" className="space-y-8 focus-visible:outline-none">
        <BusinessHoursManager businessId={business.id} initialHours={initialHours} />

        <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-red-500" /> Calendario de Excepciones
            </CardTitle>
            <CardDescription>Bloquea fechas específicas (feriados, mantenimiento) para que no se puedan realizar reservas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex-1 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fecha a Bloquear</Label>
                <Input type="date" value={newExDate} onChange={(e) => setNewExDate(e.target.value)} className="bg-zinc-900 border-white/10" />
              </div>
              <div className="flex-[2] space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Motivo (Opcional)</Label>
                <Input placeholder="Ej: Mantenimiento, Feriado..." value={newExReason} onChange={(e) => setNewExReason(e.target.value)} className="bg-zinc-900 border-white/10" />
              </div>
              <div className="flex items-end">
                <Button onClick={addException} disabled={!newExDate || pending} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" /> Bloquear Fecha
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {exceptions.length === 0 ? (
                <p className="text-center py-8 text-zinc-500 text-xs font-bold uppercase tracking-widest border border-dashed border-white/5 rounded-2xl">No hay fechas bloqueadas actualmente.</p>
              ) : (
                exceptions.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="bg-red-500/10 p-2 rounded-lg">
                        <CalendarOff className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-100">{new Date(ex.exception_date + 'T12:00:00').toLocaleDateString('es-ES', { dateStyle: 'full' })}</p>
                        {ex.reason && <p className="text-xs text-zinc-500">{ex.reason}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeException(ex.id)} className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="apariencia" className="space-y-8 focus-visible:outline-none">
        <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" /> Personalización Visual
            </CardTitle>
            <CardDescription>Ajusta los colores del portal para que coincidan con la identidad de tu marca.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Layout className="w-3 h-3" /> Color Primario
                    </Label>
                    <div className="flex gap-2">
                      <Input type="color" value={branding.primary} onChange={(e) => updateBrandingColor('primary', e.target.value)} className="w-12 h-10 p-1 bg-zinc-900 border-white/10 cursor-pointer" />
                      <Input type="text" value={branding.primary} onChange={(e) => updateBrandingColor('primary', e.target.value)} className="flex-1 bg-zinc-900 border-white/10 uppercase font-mono" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Layers className="w-3 h-3" /> Color de Fondo
                    </Label>
                    <div className="flex gap-2">
                      <Input type="color" value={branding.background} onChange={(e) => updateBrandingColor('background', e.target.value)} className="w-12 h-10 p-1 bg-zinc-900 border-white/10 cursor-pointer" />
                      <Input type="text" value={branding.background} onChange={(e) => updateBrandingColor('background', e.target.value)} className="flex-1 bg-zinc-900 border-white/10 uppercase font-mono" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Type className="w-3 h-3" /> Color de Texto
                    </Label>
                    <div className="flex gap-2">
                      <Input type="color" value={branding.text} onChange={(e) => updateBrandingColor('text', e.target.value)} className="w-12 h-10 p-1 bg-zinc-900 border-white/10 cursor-pointer" />
                      <Input type="text" value={branding.text} onChange={(e) => updateBrandingColor('text', e.target.value)} className="flex-1 bg-zinc-900 border-white/10 uppercase font-mono" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Layers className="w-3 h-3" /> Color de Tarjetas
                    </Label>
                    <div className="flex gap-2">
                      <Input type="color" value={branding.card_bg} onChange={(e) => updateBrandingColor('card_bg', e.target.value)} className="w-12 h-10 p-1 bg-zinc-900 border-white/10 cursor-pointer" />
                      <Input type="text" value={branding.card_bg} onChange={(e) => updateBrandingColor('card_bg', e.target.value)} className="flex-1 bg-zinc-900 border-white/10 uppercase font-mono" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <Button onClick={handleBrandingSave} disabled={brandingPending} className="w-full sm:w-auto font-bold px-8">
                    {brandingPending ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" /> Guardar Apariencia</>}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Vista Previa (Borrador)</Label>
                <div 
                  className="rounded-3xl p-6 border shadow-2xl transition-colors duration-500"
                  style={{ 
                    backgroundColor: branding.background,
                    borderColor: `${branding.primary}20`,
                    color: branding.text
                  }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${branding.primary}20` }}>
                      <Store className="w-6 h-6" style={{ color: branding.primary }} />
                    </div>
                    <div className="h-2 w-24 rounded-full" style={{ backgroundColor: `${branding.primary}40` }} />
                  </div>
                  
                  <div className="space-y-4">
                    <div 
                      className="p-4 rounded-2xl border" 
                      style={{ 
                        backgroundColor: branding.card_bg, 
                        borderColor: `${branding.text}10` 
                      }}
                    >
                      <div className="h-4 w-3/4 rounded-md mb-2" style={{ backgroundColor: branding.text, opacity: 0.8 }} />
                      <div className="h-2 w-1/2 rounded-md" style={{ backgroundColor: branding.text, opacity: 0.3 }} />
                    </div>

                    <div 
                      className="h-12 rounded-xl flex items-center justify-center font-bold text-sm uppercase tracking-tighter italic" 
                      style={{ backgroundColor: branding.primary, color: '#000' }}
                    >
                      Reservar Ahora
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

