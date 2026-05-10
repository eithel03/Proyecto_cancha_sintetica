'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateBusiness } from './actions'
import { toast } from 'sonner'
import BusinessHoursManager from './BusinessHoursManager'
import { Store, Globe, Phone, MapPin, Save, CalendarOff, Plus, Trash2, Search, Map as MapIcon, Palette, Layout, Type, Layers, Upload, Shield, Loader2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MapPicker } from '@/components/MapPicker'
import { MapPreview } from '@/components/MapPreview'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { updateBranding } from './actions'
import { createAdminReservation } from '../reservations/actions'
import { checkAvailability } from '../../reservar/actions'
import { useParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatTime12h } from '@/lib/utils'
import { useMemo, useEffect } from 'react'

export default function SettingsClient({ 
  business, 
  initialHours, 
  initialExceptions = [],
  courts = []
}: { 
  business: any, 
  initialHours: any[], 
  initialExceptions?: any[],
  courts?: any[]
}) {
  const params = useParams()
  const slug = params.slug as string
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
  const [logoUrl, setLogoUrl] = useState(business.logo_url || '')
  const [uploading, setUploading] = useState(false)
  
  // Estado para Bloqueo Manual
  const [manualResData, setManualResData] = useState({
    court_id: '',
    date: new Date().toLocaleDateString('sv-SE'),
    time: '',
    customer_name: 'BLOQUEO ADMINISTRATIVO',
    notes: ''
  })
  const [manualPending, setManualPending] = useState(false)
  const [occupiedSlots, setOccupiedSlots] = useState<any[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  // Cargar disponibilidad cuando cambian cancha o fecha
  useEffect(() => {
    async function loadBusy() {
      if (!manualResData.court_id || !manualResData.date) return
      setLoadingAvailability(true)
      try {
        const busy = await checkAvailability(manualResData.court_id, manualResData.date)
        if (Array.isArray(busy)) {
          setOccupiedSlots(busy)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingAvailability(false)
      }
    }
    loadBusy()
  }, [manualResData.court_id, manualResData.date])

  const isDateBlockedByException = useMemo(() => {
    return exceptions.find(ex => ex.exception_date === manualResData.date)
  }, [exceptions, manualResData.date])

  const TIME_OPTIONS = useMemo(() => {
    if (!manualResData.date || isDateBlockedByException) return []
    const dayOfWeek = new Date(manualResData.date + 'T12:00:00').getDay()
    const daySchedule = initialHours.find(h => h.day_of_week === dayOfWeek)
    
    if (!daySchedule || daySchedule.is_closed) return []
    
    const start = parseInt(daySchedule.open_time.split(':')[0])
    const end = parseInt(daySchedule.close_time.split(':')[0])
    
    const options = []
    for (let h = start; h <= end - 1; h += 0.5) {
      const hours = Math.floor(h)
      const mins = h % 1 === 0 ? '00' : '30'
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins}`
      
      const isBusy = occupiedSlots.some(slot => {
        const s = slot.start_time.substring(0, 5)
        const e = slot.end_time.substring(0, 5)
        return timeStr >= s && timeStr < e
      })
      
      options.push({ time: timeStr, isBusy })
    }
    return options
  }, [manualResData.date, initialHours, occupiedSlots])

  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualResData.court_id || !manualResData.date || !manualResData.time) {
      return toast.error('Completa los campos obligatorios')
    }

    setManualPending(true)
    const [h, m] = manualResData.time.split(':').map(Number)
    const endTime = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`

    const result = await createAdminReservation({
      business_id: business.id,
      court_id: manualResData.court_id,
      customer_name: manualResData.customer_name,
      customer_phone: 'ADMIN',
      reservation_date: manualResData.date,
      start_time: manualResData.time + ':00',
      end_time: endTime,
      notes: manualResData.notes || 'Bloqueo personalizado desde configuración',
      slug
    })

    setManualPending(false)
    if (result.success) {
      toast.success('Horario bloqueado correctamente')
      setManualResData(prev => ({ ...prev, time: '', notes: '' }))
      // Recargar disponibilidad
      const busy = await checkAvailability(manualResData.court_id, manualResData.date)
      if (Array.isArray(busy)) setOccupiedSlots(busy)
    } else {
      toast.error(result.error)
    }
  }


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
    setBranding((prev: any) => ({ ...prev, [key]: value }))
  }

  return (
    <Tabs defaultValue="general" className="space-y-8">
      <div className="w-full overflow-x-auto pb-4 -mb-4 no-scrollbar">
        <TabsList className="bg-zinc-900/50 p-1 border border-white/5 rounded-2xl h-14 w-max min-w-full sm:w-auto">
          <TabsTrigger value="general" className="rounded-xl px-4 sm:px-6 gap-2 h-12 data-[state=active]:bg-zinc-800"><Store className="w-4 h-4" /> General</TabsTrigger>
          <TabsTrigger value="horarios" className="rounded-xl px-4 sm:px-6 gap-2 h-12 data-[state=active]:bg-zinc-800"><CalendarOff className="w-4 h-4" /> Horarios</TabsTrigger>
          <TabsTrigger value="apariencia" className="rounded-xl px-4 sm:px-6 gap-2 h-12 data-[state=active]:bg-zinc-800"><Palette className="w-4 h-4" /> Apariencia</TabsTrigger>
          <TabsTrigger value="bloqueos" className="rounded-xl px-4 sm:px-6 gap-2 h-12 data-[state=active]:bg-zinc-800"><Shield className="w-4 h-4 text-primary" /> Reserva Personalizada</TabsTrigger>
        </TabsList>
      </div>

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
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/5">
                <div className="relative group">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-zinc-900 rounded-3xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
                    {logoUrl ? (
                      <img src={logoUrl} className="w-full h-full object-contain" alt="Logo preview" />
                    ) : (
                      <Shield className="w-10 h-10 text-zinc-700" />
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 p-2 bg-primary text-black rounded-xl cursor-pointer shadow-lg hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4" />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        
                        setUploading(true)
                        try {
                          const { createClient } = await import('@/lib/supabase/client')
                          const supabase = createClient()
                          
                          const fileExt = file.name.split('.').pop()
                          const fileName = `${business.id}/pwa-logo-${Math.random()}.${fileExt}`
                          
                          const { data, error } = await supabase.storage
                            .from('logos')
                            .upload(fileName, file)
                            
                          if (error) throw error
                          
                          const { data: { publicUrl } } = supabase.storage
                            .from('logos')
                            .getPublicUrl(fileName)
                            
                          setLogoUrl(publicUrl)
                          toast.success('Logo actualizado correctamente')
                        } catch (error: any) {
                          toast.error('Error al subir imagen: ' + error.message)
                        } finally {
                          setUploading(false)
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="font-black uppercase italic tracking-tighter text-white">Logo de la Empresa</h4>
                  <p className="text-xs text-zinc-500 max-w-[250px]">Este logo se usará como icono de la aplicación cuando tus clientes la instalen en sus teléfonos.</p>
                  <input type="hidden" name="logo_url" value={logoUrl} />
                </div>
              </div>

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
      <TabsContent value="bloqueos" className="space-y-8 focus-visible:outline-none">
        <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Shield className="w-5 h-5" /> Reserva Personalizada (Administrador)
            </CardTitle>
            <CardDescription>Aparta cupos o bloquea horarios específicos de forma rápida.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualBlock} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 p-6 rounded-2xl bg-white/5 border border-white/5">
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Elegir Cancha</Label>
                  <Select value={manualResData.court_id} onValueChange={(v) => setManualResData({...manualResData, court_id: v})}>
                    <SelectTrigger className="bg-zinc-900 border-white/10 h-12 rounded-xl font-bold">
                      <SelectValue placeholder="Seleccionar cancha">
                        {courts.find(c => c.id === manualResData.court_id)?.name || "Seleccionar cancha"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      {courts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Seleccionar Fecha</Label>
                  <Input 
                    type="date" 
                    value={manualResData.date} 
                    onChange={(e) => setManualResData({...manualResData, date: e.target.value})}
                    className="bg-zinc-900 border-white/10 h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Seleccionar Horario</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
                  {loadingAvailability ? (
                    <div className="col-span-full py-12 flex flex-col items-center gap-3 text-zinc-500 border border-dashed border-white/10 rounded-2xl">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Verificando disponibilidad...</p>
                    </div>
                  ) : isDateBlockedByException ? (
                    <div className="col-span-full py-12 flex flex-col items-center gap-3 text-red-500 bg-red-500/5 border border-dashed border-red-500/20 rounded-2xl animate-in fade-in zoom-in duration-500">
                      <CalendarOff className="w-8 h-8" />
                      <div className="text-center">
                        <p className="text-sm font-black uppercase tracking-tight">Fecha Bloqueada por Excepción</p>
                        <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest mt-1">Motivo: {isDateBlockedByException.reason || 'No especificado'}</p>
                      </div>
                    </div>
                  ) : TIME_OPTIONS.length === 0 ? (
                    <div className="col-span-full py-12 flex flex-col items-center gap-3 text-amber-500 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-2xl">
                      <Clock className="w-8 h-8 opacity-50" />
                      <p className="text-[10px] font-black uppercase tracking-widest">El local está cerrado en este día</p>
                    </div>
                  ) : (
                    TIME_OPTIONS.map((opt) => (
                      <button
                        key={opt.time}
                        type="button"
                        disabled={opt.isBusy}
                        onClick={() => setManualResData({ ...manualResData, time: opt.time })}
                        className={`
                          relative group p-4 rounded-2xl border transition-all duration-300
                          ${manualResData.time === opt.time 
                            ? 'bg-primary border-primary text-black scale-105 shadow-lg shadow-primary/20' 
                            : opt.isBusy
                              ? 'bg-red-500/10 border-red-500/20 text-red-500/40 cursor-not-allowed'
                              : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-primary/50 hover:text-primary hover:bg-primary/5'
                          }
                        `}
                      >
                        <span className="text-xs font-black tracking-tighter">{formatTime12h(opt.time)}</span>
                        {opt.isBusy && (
                          <div className="absolute -top-1 -right-1">
                            <Badge variant="destructive" className="px-1 py-0 h-4 text-[7px] font-black">OCUPADO</Badge>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Motivo o Nota del Bloqueo</Label>
                <Input 
                  placeholder="Ej: Mantenimiento de cancha, Partido de liga predeterminado..." 
                  value={manualResData.notes} 
                  onChange={(e) => setManualResData({...manualResData, notes: e.target.value})}
                  className="bg-zinc-900 border-white/10 h-14 rounded-2xl"
                />
              </div>

              <div className="pt-6 border-t border-white/5">
                <Button 
                  type="submit" 
                  disabled={manualPending || !manualResData.time}
                  className="w-full sm:w-auto px-12 h-14 bg-primary hover:bg-primary/90 text-black font-black uppercase italic tracking-tighter rounded-2xl shadow-xl shadow-primary/20"
                >
                  {manualPending ? 'BLOQUEANDO...' : <><Shield className="w-4 h-4 mr-2" /> CONFIRMAR RESERVA PERSONALIZADA</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

