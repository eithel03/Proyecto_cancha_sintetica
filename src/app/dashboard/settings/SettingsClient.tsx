'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateBusiness } from './actions'
import { toast } from 'sonner'
import BusinessHoursManager from './BusinessHoursManager'
import { Store, Globe, Phone, MapPin, Save, CalendarOff, Plus, Trash2, Search, Map as MapIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MapPicker } from '@/components/MapPicker'

export default function SettingsClient({ business, initialHours, initialExceptions = [] }: { business: any, initialHours: any[], initialExceptions?: any[] }) {
  const [pending, setPending] = useState(false)
  const [exceptions, setExceptions] = useState<any[]>(initialExceptions)
  const [newExDate, setNewExDate] = useState('')
  const [newExReason, setNewExReason] = useState('')
  const [coords, setCoords] = useState({ lat: business.latitude || '', lng: business.longitude || '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [isMapOpen, setIsMapOpen] = useState(false)

  const searchAddress = async () => {
    if (!searchQuery) {
      toast.error('Ingresa una dirección o nombre de lugar para buscar')
      return
    }
    
    setPending(true)
    try {
      // Usamos el servicio gratuito de Nominatim (OpenStreetMap)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      
      if (data && data.length > 0) {
        setCoords({
          lat: data[0].lat.toString(),
          lng: data[0].lon.toString()
        })
        toast.success('Ubicación encontrada y aplicada')
      } else {
        toast.error('No se encontraron resultados para esa búsqueda.')
      }
    } catch (error) {
      toast.error('Error al conectar con el servicio de mapas.')
    } finally {
      setPending(false)
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

  return (
    <div className="space-y-8">
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
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary">Buscador de Ubicación (GPS)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        placeholder="Busca por nombre o dirección (ej: Pital de San Carlos)" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-zinc-900 border-white/10 pl-10"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchAddress())}
                      />
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    </div>
                    <Button type="button" onClick={searchAddress} variant="secondary">
                      Buscar
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-[10px] text-zinc-500 uppercase font-black">Latitud</Label>
                    <Input name="latitude" value={coords.lat} onChange={(e) => setCoords({...coords, lat: e.target.value})} className="bg-zinc-900 border-white/10" placeholder="Latitud" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-[10px] text-zinc-500 uppercase font-black">Longitud</Label>
                    <Input name="longitude" value={coords.lng} onChange={(e) => setCoords({...coords, lng: e.target.value})} className="bg-zinc-900 border-white/10" placeholder="Longitud" />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="button" onClick={() => setIsMapOpen(true)} variant="outline" className="flex-1 border-blue-500/50 text-blue-500 hover:bg-blue-500/10">
                      <MapIcon className="w-4 h-4 mr-2" /> Seleccionar en Mapa
                    </Button>
                    <Button type="button" onClick={captureLocation} variant="outline" className="flex-1 border-primary/50 text-primary hover:bg-primary/10">
                      <MapPin className="w-4 h-4 mr-2" /> Usar GPS Actual
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 italic">Puedes buscar tu local por nombre, dirección o capturar tu posición actual si estás en el sitio.</p>
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

      <BusinessHoursManager businessId={business.id} initialHours={initialHours} />

      <MapPicker 
        isOpen={isMapOpen}
        onOpenChange={setIsMapOpen}
        onSelect={(lat, lng) => setCoords({ lat, lng })}
        initialLat={coords.lat}
        initialLng={coords.lng}
      />

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
    </div>
  )
}

