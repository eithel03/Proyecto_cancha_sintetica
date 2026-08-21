'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Search, X, Loader2, Crosshair } from 'lucide-react'
import { toast } from 'sonner'

type Coordinates = { lat: string; lng: string }
type SearchResult = { lat: string; lon: string; display_name: string }
type LeafletPoint = { lat: number; lng: number }
type LeafletMap = { setView: (center: [number, number], zoom: number, options?: { animate?: boolean }) => LeafletMap; invalidateSize: () => void; remove: () => void; on: (event: string, handler: (event: { latlng: LeafletPoint }) => void) => void }
type LeafletMarker = { setLatLng: (point: [number, number]) => LeafletMarker; addTo: (map: LeafletMap) => LeafletMarker; on: (event: string, handler: (event: { target: { getLatLng: () => LeafletPoint } }) => void) => void }
type LeafletApi = { map: (container: HTMLElement, options?: { zoomControl?: boolean }) => LeafletMap; tileLayer: (url: string, options: { attribution: string }) => { addTo: (map: LeafletMap) => void }; marker: (point: [number, number], options: { draggable: boolean }) => LeafletMarker }

declare global { interface Window { L?: LeafletApi } }

interface MapPickerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (lat: string, lng: string, address?: string) => void
  initialLat?: string
  initialLng?: string
  initialAddress?: string
}

const DEFAULT_COORDINATES: Coordinates = { lat: '10.3237', lng: '-84.4246' }

export function MapPicker({ isOpen, onOpenChange, onSelect, initialLat, initialLng, initialAddress = '' }: MapPickerProps) {
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [coordinates, setCoordinates] = useState<Coordinates>({ lat: initialLat || DEFAULT_COORDINATES.lat, lng: initialLng || DEFAULT_COORDINATES.lng })
  const [address, setAddress] = useState(initialAddress)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    // Las props pueden cambiar al seleccionar una ubicación previamente guardada.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialLat && initialLng) setCoordinates({ lat: initialLat, lng: initialLng })
    setAddress(initialAddress)
  }, [initialLat, initialLng, initialAddress])

  useEffect(() => {
    if (!isOpen || mapLoaded) return
    const stylesheet = document.createElement('link')
    stylesheet.rel = 'stylesheet'
    stylesheet.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(stylesheet)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => setMapLoaded(true)
    document.head.appendChild(script)
  }, [isOpen, mapLoaded])

  const reverseGeocode = async (lat: string, lng: string) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
      if (!response.ok) return
      const data = await response.json() as { display_name?: string }
      if (data.display_name) setAddress(data.display_name)
    } catch {
      // La coordenada sigue siendo válida aunque el servicio de dirección no responda.
    }
  }

  const updateMapPosition = (lat: string, lng: string, shouldReverseGeocode = true) => {
    const next = { lat: Number(lat).toFixed(8), lng: Number(lng).toFixed(8) }
    setCoordinates(next)
    if (mapRef.current) mapRef.current.setView([Number(next.lat), Number(next.lng)], 15, { animate: true })
    markerRef.current?.setLatLng([Number(next.lat), Number(next.lng)])
    if (shouldReverseGeocode) void reverseGeocode(next.lat, next.lng)
  }

  useEffect(() => {
    if (!isOpen || !mapLoaded) return

    const initMap = () => {
      const L = window.L
      const container = document.getElementById('location-picker-map')
      if (!L || !container || container.offsetHeight === 0) return

      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null }
      container.innerHTML = ''

      const lat = Number(coordinates.lat) || Number(DEFAULT_COORDINATES.lat)
      const lng = Number(coordinates.lng) || Number(DEFAULT_COORDINATES.lng)
      const map = L.map(container, { zoomControl: true }).setView([lat, lng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map)
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
      marker.on('dragend', (event) => { const point = event.target.getLatLng(); updateMapPosition(String(point.lat), String(point.lng)) })
      map.on('click', (event) => updateMapPosition(String(event.latlng.lat), String(event.latlng.lng)))
      mapRef.current = map
      markerRef.current = marker
      window.setTimeout(() => map.invalidateSize(), 100)
    }

    const timer = window.setTimeout(initMap, 50)

    return () => { window.clearTimeout(timer); if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null } }
  // updateMapPosition intentionally uses the current map instance instead of recreating it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mapLoaded])

  useEffect(() => {
    if (!isOpen || !mapRef.current) return
    const lat = Number(coordinates.lat)
    const lng = Number(coordinates.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    mapRef.current.setView([lat, lng], 15, { animate: false })
    markerRef.current?.setLatLng([lat, lng])
    window.setTimeout(() => mapRef.current?.invalidateSize(), 100)
  }, [isOpen, coordinates.lat, coordinates.lng])

  const searchPlaces = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true); setShowResults(true)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`)
      const data = response.ok ? await response.json() as SearchResult[] : []
      setResults(data)
    } catch { setResults([]); toast.error('No se pudo buscar la ubicación.') }
    finally { setSearching(false) }
  }

  const selectResult = (result: SearchResult) => {
    setSearchQuery(result.display_name.split(',')[0])
    setShowResults(false)
    setAddress(result.display_name)
    updateMapPosition(result.lat, result.lon, false)
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error('Este dispositivo no permite obtener la ubicación.')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => { updateMapPosition(String(position.coords.latitude), String(position.coords.longitude)); setLocating(false); toast.success('Ubicación encontrada.') },
      () => { setLocating(false); toast.error('No se pudo obtener la ubicación. Revisa los permisos del navegador.') },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  const canConfirm = Number.isFinite(Number(coordinates.lat)) && Number.isFinite(Number(coordinates.lng))

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="z-[100] flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-slate-200 bg-white p-0 text-slate-900 shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-[860px] sm:rounded-2xl">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div><DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900"><MapPin className="h-5 w-5 text-green-700" />Seleccionar ubicación</DialogTitle><p className="mt-1 text-sm text-slate-500">Busca una dirección o mueve el marcador hasta la ubicación exacta del complejo.</p></div>
            <button type="button" onClick={() => onOpenChange(false)} aria-label="Cerrar selector de ubicación" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row"><form onSubmit={searchPlaces} className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input aria-label="Buscar lugar, dirección o punto de referencia" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setShowResults(true) }} placeholder="Buscar lugar, dirección o punto de referencia…" className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-700 focus:ring-3 focus:ring-green-100" />{searchQuery && <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setSearchQuery(''); setResults([]); setShowResults(false) }} className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}{showResults && searchQuery.trim() && <div className="absolute left-0 right-0 top-12 z-[120] max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">{searching ? <div className="flex items-center gap-2 p-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin text-green-700" />Buscando lugares...</div> : results.length ? results.map((result) => <button type="button" key={`${result.lat}-${result.lon}`} onClick={() => selectResult(result)} className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-green-50"><p className="truncate text-sm font-semibold text-slate-800">{result.display_name.split(',')[0]}</p><p className="truncate text-xs text-slate-500">{result.display_name}</p></button>) : <p className="p-4 text-sm text-slate-500">Presiona buscar para encontrar una ubicación.</p>}</div>}</form><Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating} className="h-11 shrink-0 border-green-200 text-green-700 hover:bg-green-50">{locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}{locating ? 'Buscando ubicación...' : 'Usar mi ubicación actual'}</Button></div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6"><div id="location-picker-map" className="relative z-0 h-[min(48vh,430px)] min-h-[280px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">{!mapLoaded && <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-slate-100 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-green-700" />Cargando mapa...</div>}</div><div className="mt-4 rounded-xl border border-green-100 bg-green-50/70 p-4"><div className="flex items-start gap-3"><Crosshair className="mt-0.5 h-5 w-5 shrink-0 text-green-700" /><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-green-800">Ubicación seleccionada</p><p className="mt-1 break-words text-sm font-semibold text-slate-800">{address || 'Mueve el marcador o haz clic en el mapa para seleccionar una ubicación.'}</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600"><span>Latitud: <strong className="font-mono text-slate-800">{coordinates.lat}</strong></span><span>Longitud: <strong className="font-mono text-slate-800">{coordinates.lng}</strong></span></div></div></div></div></div>
        <DialogFooter className="shrink-0 flex-row justify-end border-t border-slate-200 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-slate-300 text-slate-700 sm:flex-none">Cancelar</Button><Button type="button" disabled={!canConfirm || locating} onClick={() => { onSelect(coordinates.lat, coordinates.lng, address); onOpenChange(false); toast.success('Ubicación seleccionada.') }} className="flex-1 bg-green-700 text-white hover:bg-green-800 sm:flex-none">Confirmar ubicación</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
