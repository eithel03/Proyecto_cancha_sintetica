'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createBusinessWithUser } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Search, Map as MapIcon } from 'lucide-react'
import { MapPicker } from '@/components/MapPicker'
import { MapPreview } from '@/components/MapPreview'

export default function NewBusinessClient() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [slugPreview, setSlugPreview] = useState('')
  const [coords, setCoords] = useState({ lat: '', lng: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [isMapOpen, setIsMapOpen] = useState(false)

  const searchAddress = async () => {
    if (!searchQuery) {
      toast.error('Ingresa una dirección para buscar')
      return
    }

    setPending(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()

      if (data && data.length > 0) {
        setCoords({
          lat: data[0].lat.toString(),
          lng: data[0].lon.toString()
        })
        toast.success('Ubicación encontrada')
      } else {
        toast.error('No se encontraron resultados')
      }
    } catch (error) {
      toast.error('Error al buscar ubicación')
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
        error: 'No se pudo obtener la ubicación.'
      }
    )
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setSlugPreview(value)
  }

  async function onSubmit(formData: FormData) {
    setPending(true)
    const result = await createBusinessWithUser(formData)
    setPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Negocio y Usuario creados correctamente.')
      router.push('/admin/businesses')
    }
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Alta de Nuevo Negocio</CardTitle>
        <CardDescription>
          Completa los datos de la sintética y genera la cuenta de acceso para su administrador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-8">

          {/* Datos del Negocio */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">1. Datos del Negocio</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="b_name">Nombre de la Sintética</Label>
                <Input id="b_name" name="b_name" required placeholder="Sintética Pital" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b_slug">Slug (Enlace Público)</Label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 px-3 text-gray-500 sm:text-sm bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700">
                    /
                  </span>
                  <Input
                    id="b_slug"
                    name="b_slug"
                    value={slugPreview}
                    onChange={handleSlugChange}
                    className="rounded-l-none"
                    placeholder="sintetica-pital"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="b_phone">Teléfono Fijo</Label>
                <Input id="b_phone" name="b_phone" placeholder="2460-0000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b_whatsapp">WhatsApp Público</Label>
                <Input id="b_whatsapp" name="b_whatsapp" placeholder="8888-8888" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="b_location">Ubicación</Label>
                <Input id="b_location" name="b_location" placeholder="Frente al parque..." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="b_description">Descripción</Label>
                <Textarea id="b_description" name="b_description" />
              </div>
              <div className="space-y-4 md:col-span-2 border-t pt-4">
                <Label className="text-primary font-bold">Localización GPS</Label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Busca por dirección (ej: Alajuela, Costa Rica)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchAddress())}
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  </div>
                  <Button type="button" onClick={searchAddress} variant="secondary">
                    Buscar
                  </Button>
                </div>

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

                <input type="hidden" name="b_latitude" value={coords.lat} />
                <input type="hidden" name="b_longitude" value={coords.lng} />

                <p className="text-[10px] text-zinc-500 italic mt-1">La ubicación GPS es necesaria para que los clientes puedan ver la distancia hasta tu local.</p>
              </div>
            </div>
          </div>

          {/* Datos del Usuario Owner */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">2. Credenciales del Administrador (Dueño)</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="u_name">Nombre Completo</Label>
                <Input id="u_name" name="u_name" required placeholder="Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u_phone">Teléfono Personal</Label>
                <Input id="u_phone" name="u_phone" placeholder="8888-8888" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u_email">Correo Electrónico (Login)</Label>
                <Input id="u_email" name="u_email" type="email" required placeholder="juan@ejemplo.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u_password">Contraseña Temporal</Label>
                <Input id="u_password" name="u_password" required placeholder="Min 6 caracteres" minLength={6} />
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => router.push('/admin/businesses')} type="button">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creando sistema...' : 'Crear Negocio y Cuenta'}
            </Button>
          </div>
          <MapPicker
            isOpen={isMapOpen}
            onOpenChange={setIsMapOpen}
            onSelect={(lat, lng) => setCoords({ lat, lng })}
            initialLat={coords.lat}
            initialLng={coords.lng}
          />
        </form>
      </CardContent>
    </Card>
  )
}
