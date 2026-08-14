'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  CalendarDays,
  ExternalLink,
  ImagePlus,
  Loader2,
  Map,
  MapPin,
  Palette,
  MessageCircle as Phone,
  Save,
  Store,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPicker } from '@/components/MapPicker'
import { MapPreview } from '@/components/MapPreview'
import { updateBusiness, updateBranding, updateCoverImage, createException, deleteException } from './actions'
import BusinessHoursManager from './BusinessHoursManager'

type Branding = {
  primary: string
  secondary: string
  background: string
  text: string
  card_bg: string
  cover_image_url?: string
}

type Business = {
  id: string
  name: string
  slug: string
  phone: string | null
  whatsapp: string | null
  email?: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  logo_url: string | null
  cover_image_url: string | null
  branding: Partial<Branding> | null
}

type Exception = {
  id: string
  exception_date: string
  reason: string | null
}

type Hour = {
  id?: string
  business_id?: string
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

const defaultBranding: Branding = {
  primary: '#15803d',
  secondary: '#f59e0b',
  background: '#f5f7f4',
  text: '#17251d',
  card_bg: '#ffffff',
}

const colorFields: Array<{ key: keyof Branding; label: string }> = [
  { key: 'primary', label: 'Color principal' },
  { key: 'secondary', label: 'Color secundario' },
  { key: 'background', label: 'Color de fondo' },
  { key: 'text', label: 'Color de texto' },
  { key: 'card_bg', label: 'Color de tarjetas' },
]

function SectionHeader({ icon: Icon, title, description }: { icon: typeof Store; title: string; description: string }) {
  return (
    <CardHeader className="border-b border-slate-100 pb-4">
      <CardTitle className="flex items-center gap-2 text-lg text-slate-900"><Icon className="h-5 w-5 text-emerald-700" />{title}</CardTitle>
      <CardDescription className="text-slate-500">{description}</CardDescription>
    </CardHeader>
  )
}

function SaveBar({ pending, dirty, onDiscard, label = 'Guardar cambios' }: { pending: boolean; dirty: boolean; onDiscard: () => void; label?: string }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500" aria-live="polite">{dirty ? 'Tienes cambios sin guardar.' : 'Todos los cambios están guardados.'}</p>
      <div className="flex w-full gap-2 sm:w-auto">
        <Button type="button" variant="outline" onClick={onDiscard} disabled={!dirty || pending} className="flex-1 border-slate-300 text-slate-700 sm:flex-none"><X className="mr-2 h-4 w-4" />Descartar</Button>
        <Button type="submit" disabled={!dirty || pending} className="flex-1 bg-emerald-700 text-white hover:bg-emerald-800 sm:flex-none">{pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : <><Save className="mr-2 h-4 w-4" />{label}</>}</Button>
      </div>
    </div>
  )
}

export default function SettingsClient({ business, initialHours, initialExceptions = [] }: { business: Business; initialHours: Hour[]; initialExceptions?: Exception[] }) {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const [pending, setPending] = useState(false)
  const [name, setName] = useState(business.name)
  const [phone, setPhone] = useState((business.phone || '').replace(/-/g, ''))
  const [whatsapp, setWhatsapp] = useState((business.whatsapp || '').replace(/-/g, ''))
  const [location, setLocation] = useState(business.location || '')
  const [coords, setCoords] = useState({ lat: business.latitude?.toString() || '', lng: business.longitude?.toString() || '' })
  const [logoUrl, setLogoUrl] = useState(business.logo_url || '')
  const [coverUrl, setCoverUrl] = useState(business.cover_image_url || '')
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [exceptions, setExceptions] = useState<Exception[]>(initialExceptions)
  const [newExDate, setNewExDate] = useState('')
  const [newExReason, setNewExReason] = useState('')
  const [branding, setBranding] = useState<Branding>({ ...defaultBranding, ...(business.branding || {}) })
  const [savedBranding, setSavedBranding] = useState<Branding>({ ...defaultBranding, ...(business.branding || {}) })
  const [brandingPending, setBrandingPending] = useState(false)

  const generalDirty = name !== business.name || phone !== (business.phone || '') || whatsapp !== (business.whatsapp || '') || location !== (business.location || '') || coords.lat !== (business.latitude?.toString() || '') || coords.lng !== (business.longitude?.toString() || '') || logoUrl !== (business.logo_url || '')
  const appearanceDirty = coverUrl !== (business.cover_image_url || '') || JSON.stringify(branding) !== JSON.stringify(savedBranding)
  const portalUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://saasintetica.app'}/${slug}`

  const captureLocation = () => {
    if (!navigator.geolocation) return toast.error('La geolocalización no está disponible en este dispositivo.')
    toast.promise(new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject)), {
      loading: 'Solicitando ubicación...',
      success: (position) => { setCoords({ lat: position.coords.latitude.toString(), lng: position.coords.longitude.toString() }); return 'Ubicación encontrada.' },
      error: 'No se pudo obtener la ubicación. Revisa los permisos del navegador.',
    })
  }

  const submitGeneral = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    const formData = new FormData()
    formData.set('id', business.id); formData.set('name', name.trim()); formData.set('phone', phone); formData.set('whatsapp', whatsapp); formData.set('location', location); formData.set('latitude', coords.lat); formData.set('longitude', coords.lng); formData.set('logo_url', logoUrl)
    const result = await updateBusiness(formData)
    setPending(false)
    if (result.error) toast.error(result.error); else toast.success('Información actualizada correctamente')
  }

  const uploadCover = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) return toast.error('Formato no compatible. Usa JPG, PNG o WebP.')
    if (file.size > 5 * 1024 * 1024) return toast.error('La imagen supera el tamaño permitido de 5 MB.')
    setUploadingCover(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${business.id}/cover-${crypto.randomUUID()}.${extension}`
      const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: false, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('logos').getPublicUrl(path)
      setCoverUrl(data.publicUrl)
      toast.success('Imagen de portada lista para guardar.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo subir la imagen.')
    } finally { setUploadingCover(false) }
  }

  const submitAppearance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBrandingPending(true)
    const brandingResult = await updateBranding(business.id, branding)
    const coverResult = await updateCoverImage(business.id, coverUrl)
    setBrandingPending(false)
    if (brandingResult.error || coverResult.error) toast.error(brandingResult.error || coverResult.error); else { setSavedBranding(branding); toast.success('Apariencia actualizada correctamente') }
  }

  const addException = async () => {
    if (!newExDate) return toast.error('Selecciona una fecha.')
    const result = await createException({ business_id: business.id, exception_date: newExDate, reason: newExReason, is_closed: true })
    if (result.success && result.data) { setExceptions([...exceptions, result.data as Exception].sort((a, b) => a.exception_date.localeCompare(b.exception_date))); setNewExDate(''); setNewExReason(''); toast.success('Cierre agregado.') } else toast.error(result.error)
  }

  const removeException = async (id: string) => { const result = await deleteException(id); if (result.success) { setExceptions(exceptions.filter((item) => item.id !== id)); toast.success('Cierre eliminado.') } else toast.error(result.error) }
  const updateColor = (key: keyof Branding, value: string) => setBranding((current) => ({ ...current, [key]: value }))

  return (
    <Tabs defaultValue="general" className="settings-fields space-y-6">
      <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <TabsTrigger value="general" className="h-11 gap-2 rounded-lg text-slate-600 data-[state=active]:bg-emerald-700 data-[state=active]:text-white"><Store className="h-4 w-4" />General</TabsTrigger>
        <TabsTrigger value="horarios" className="h-11 gap-2 rounded-lg text-slate-600 data-[state=active]:bg-emerald-700 data-[state=active]:text-white"><CalendarDays className="h-4 w-4" />Horarios</TabsTrigger>
        <TabsTrigger value="apariencia" className="h-11 gap-2 rounded-lg text-slate-600 data-[state=active]:bg-emerald-700 data-[state=active]:text-white"><Palette className="h-4 w-4" />Apariencia</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-5">
        <form onSubmit={submitGeneral} className="space-y-5">
          <Card className="border-slate-200 bg-white shadow-sm"><SectionHeader icon={Store} title="Identidad del negocio" description="Configura cómo se identifica tu complejo dentro de la plataforma." /><CardContent className="space-y-6 pt-5">
            <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
              <div className="flex flex-col items-center gap-3"><div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">{logoUrl ? <img src={logoUrl} alt="Logo del negocio" className="h-full w-full object-contain" /> : <Store className="h-10 w-10 text-slate-300" />}</div><label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"><Upload className="h-4 w-4" />Cambiar logo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) return toast.error('La imagen supera el tamaño permitido de 5 MB.'); const { createClient } = await import('@/lib/supabase/client'); const supabase = createClient(); const extension = file.name.split('.').pop() || 'png'; const path = `${business.id}/logo-${crypto.randomUUID()}.${extension}`; const { error } = await supabase.storage.from('logos').upload(path, file); if (error) return toast.error('No se pudo subir el logo.'); const { data } = supabase.storage.from('logos').getPublicUrl(path); setLogoUrl(data.publicUrl); toast.success('Logo listo para guardar.') }} /></label><button type="button" onClick={() => setLogoUrl('')} disabled={!logoUrl} className="text-xs text-rose-600 disabled:opacity-40"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Eliminar logo</button><p className="text-center text-xs text-slate-500">JPG, PNG o WebP · máximo 5 MB</p></div>
              <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="business-name">Nombre del local</Label><Input id="business-name" value={name} onChange={(event) => setName(event.target.value)} required className="border-slate-300" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="business-slug">Identificador del portal público</Label><div className="flex min-w-0 items-center rounded-md border border-slate-300 bg-slate-50"><span className="hidden px-3 text-sm text-slate-500 sm:inline">saasintetica.app/</span><Input id="business-slug" value={business.slug} readOnly className="border-0 bg-transparent focus-visible:ring-0" /></div><p className="break-all text-xs text-slate-500">{portalUrl}</p></div></div>
            </div>
            <Button type="button" variant="outline" onClick={() => window.open(`/${slug}`, '_blank')} className="border-slate-300 text-slate-700"><ExternalLink className="mr-2 h-4 w-4" />Ver portal</Button>
          </CardContent></Card>

          <Card className="border-slate-200 bg-white shadow-sm"><SectionHeader icon={Phone} title="Información de contacto" description="Datos para que clientes y administradores puedan comunicarse con el negocio." /><CardContent className="grid gap-4 pt-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="whatsapp">WhatsApp de contacto</Label><Input id="whatsapp" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="+506 8888-8888" inputMode="tel" className="border-slate-300" /><p className="text-xs text-slate-500">Incluye el prefijo +506 cuando corresponda.</p></div><div className="space-y-2"><Label htmlFor="phone">Teléfono secundario <span className="font-normal text-slate-400">(opcional)</span></Label><Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="8888-8888" inputMode="tel" className="border-slate-300" /></div>{business.email && <div className="space-y-2 sm:col-span-2"><Label>Correo electrónico</Label><Input value={business.email} readOnly className="border-slate-300 bg-slate-50" /></div>}<Button type="button" variant="outline" onClick={() => { const target = (whatsapp || phone).replace(/\D/g, ''); if (!target) return toast.error('Agrega un número de WhatsApp primero.'); window.open(`https://wa.me/506${target.slice(-8)}?text=${encodeURIComponent('Hola, este es un mensaje de prueba de SaaSintética.')}`, '_blank') }} className="w-fit border-emerald-200 text-emerald-700"><Phone className="mr-2 h-4 w-4" />Probar WhatsApp</Button></CardContent></Card>

          <Card className="border-slate-200 bg-white shadow-sm"><SectionHeader icon={MapPin} title="Ubicación física" description="Define dónde se encuentra el complejo para que los clientes puedan ubicarlo." /><CardContent className="grid gap-5 pt-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><div className="space-y-4"><div className="space-y-2"><Label htmlFor="location">Dirección o referencia</Label><Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Frente al parque de Pital, San Carlos" className="border-slate-300" /></div><div className="flex flex-col gap-2 sm:flex-row lg:flex-col"><Button type="button" variant="outline" onClick={() => setIsMapOpen(true)} className="justify-start border-slate-300 text-slate-700"><Map className="mr-2 h-4 w-4" />Seleccionar en el mapa</Button><Button type="button" variant="outline" onClick={captureLocation} className="justify-start border-emerald-200 text-emerald-700"><MapPin className="mr-2 h-4 w-4" />Usar mi ubicación actual</Button></div><div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><p className="font-semibold text-slate-700">Detalles de ubicación</p><p>Latitud: {coords.lat || 'Sin definir'}</p><p>Longitud: {coords.lng || 'Sin definir'}</p></div></div><MapPreview lat={coords.lat} lng={coords.lng} /></CardContent></Card>
          <SaveBar pending={pending} dirty={generalDirty} onDiscard={() => { setName(business.name); setPhone(business.phone || ''); setWhatsapp(business.whatsapp || ''); setLocation(business.location || ''); setCoords({ lat: business.latitude?.toString() || '', lng: business.longitude?.toString() || '' }); setLogoUrl(business.logo_url || '') }} />
        </form>
        <MapPicker isOpen={isMapOpen} onOpenChange={setIsMapOpen} onSelect={(lat, lng, address) => { setCoords({ lat, lng }); if (address) setLocation(address) }} initialLat={coords.lat} initialLng={coords.lng} initialAddress={location} />
      </TabsContent>

      <TabsContent value="horarios" className="space-y-5"><BusinessHoursManager businessId={business.id} initialHours={initialHours} /><Card className="border-slate-200 bg-white shadow-sm"><SectionHeader icon={CalendarDays} title="Excepciones y cierres" description="Bloquea fechas especiales, mantenimiento, feriados o eventos." /><CardContent className="space-y-5 pt-5"><div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[180px_1fr_auto]"><div className="space-y-2"><Label htmlFor="exception-date">Fecha</Label><Input id="exception-date" type="date" value={newExDate} onChange={(event) => setNewExDate(event.target.value)} className="border-slate-300 bg-white" /></div><div className="space-y-2"><Label htmlFor="exception-reason">Motivo <span className="font-normal text-slate-400">(opcional)</span></Label><Input id="exception-reason" value={newExReason} onChange={(event) => setNewExReason(event.target.value)} placeholder="Feriado, mantenimiento..." className="border-slate-300 bg-white" /></div><Button type="button" onClick={addException} className="self-end bg-emerald-700 text-white hover:bg-emerald-800"><CalendarDays className="mr-2 h-4 w-4" />Agregar cierre</Button></div><div className="space-y-2">{exceptions.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No hay fechas bloqueadas.</div> : exceptions.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div><p className="font-semibold capitalize text-slate-800">{new Date(`${item.exception_date}T12:00:00`).toLocaleDateString('es-CR', { dateStyle: 'full' })}</p><p className="text-sm text-slate-500">{item.reason || 'Cierre del negocio'}</p></div><Button type="button" variant="ghost" size="icon" aria-label="Eliminar cierre" onClick={() => removeException(item.id)} className="text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></Button></div>)}</div></CardContent></Card></TabsContent>

      <TabsContent value="apariencia" className="space-y-5"><form onSubmit={submitAppearance} className="space-y-5"><div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><Card className="border-slate-200 bg-white shadow-sm"><SectionHeader icon={Palette} title="Apariencia del portal" description="Personaliza los colores y la imagen que verán tus clientes." /><CardContent className="space-y-5 pt-5"><div className="grid gap-4 sm:grid-cols-2">{colorFields.map(({ key, label }) => <div key={key} className="space-y-2"><Label htmlFor={`color-${key}`}>{label}</Label><div className="flex gap-2"><Input type="color" value={branding[key] as string} onChange={(event) => updateColor(key, event.target.value)} className="h-10 w-12 cursor-pointer border-slate-300 p-1" /><Input id={`color-${key}`} value={branding[key] as string} onChange={(event) => updateColor(key, event.target.value)} pattern="^#[0-9A-Fa-f]{6}$" className="border-slate-300 font-mono uppercase" /></div></div>)}</div><div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4"><span className="w-full text-xs font-semibold text-slate-500">Paletas sugeridas</span>{[['#15803d','#f59e0b'],['#166534','#eab308'],['#0f766e','#fb923c']].map(([primary, secondary]) => <button type="button" key={primary} onClick={() => setBranding((current) => ({ ...current, primary, secondary }))} className="h-8 w-14 rounded-md border border-slate-300" style={{ background: `linear-gradient(90deg, ${primary} 50%, ${secondary} 50%)` }} aria-label={`Usar paleta ${primary}`} />)}<Button type="button" variant="ghost" onClick={() => setBranding(defaultBranding)} className="text-slate-600">Restablecer colores</Button></div><div className="space-y-3 border-t border-slate-100 pt-4"><div><Label>Imagen de portada</Label><p className="text-xs text-slate-500">JPG, PNG o WebP · máximo 5 MB · proporción recomendada 16:9.</p></div><label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:border-emerald-500">{uploadingCover ? <Loader2 className="h-6 w-6 animate-spin text-emerald-700" /> : <ImagePlus className="h-6 w-6 text-slate-400" />}<span className="mt-2 text-sm font-semibold text-slate-700">Seleccionar o reemplazar portada</span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingCover} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(file) }} /></label>{coverUrl && <Button type="button" variant="outline" onClick={() => setCoverUrl('')} className="border-rose-200 text-rose-600"><Trash2 className="mr-2 h-4 w-4" />Eliminar portada</Button>}</div></CardContent></Card><Card className="border-slate-200 bg-white shadow-sm"><CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="text-lg text-slate-900">Vista previa del portal</CardTitle><CardDescription className="text-slate-500">La vista se actualiza mientras editas.</CardDescription></CardHeader><CardContent className="pt-5"><div className="overflow-hidden rounded-2xl border border-slate-200" style={{ background: branding.background, color: branding.text }}><div className="relative flex h-36 items-end overflow-hidden p-5" style={{ background: coverUrl ? `url(${coverUrl}) center/cover` : branding.primary }}><div className="absolute inset-0 bg-black/25" /><div className="relative flex items-center gap-3 text-white"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white shadow">{logoUrl ? <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" /> : <Store className="h-6 w-6 text-emerald-700" />}</div><div><p className="font-bold">{name || 'Nombre del negocio'}</p><p className="text-xs text-white/80">Reserva tu cancha</p></div></div></div><div className="space-y-3 p-5"><div className="rounded-xl p-4 shadow-sm" style={{ background: branding.card_bg }}><p className="font-semibold">Cancha disponible</p><p className="mt-1 text-xs opacity-70">Selecciona un horario para reservar.</p></div><button type="button" className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white" style={{ background: branding.primary }}>Reservar ahora</button></div></div></CardContent></Card></div><SaveBar pending={brandingPending} dirty={appearanceDirty} onDiscard={() => { setBranding(savedBranding); setCoverUrl(business.cover_image_url || '') }} label="Guardar apariencia" /></form></TabsContent>
    </Tabs>
  )
}
