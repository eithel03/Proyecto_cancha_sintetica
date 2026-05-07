'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MapPin, Search } from 'lucide-react'
import { toast } from 'sonner'

interface MapPickerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (lat: string, lng: string) => void
  initialLat?: string
  initialLng?: string
}

export function MapPicker({ isOpen, onOpenChange, onSelect, initialLat, initialLng }: MapPickerProps) {
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [selectedCoords, setSelectedCoords] = useState({ lat: initialLat || '10.3237', lng: initialLng || '-84.4246' })
  const [mapLoaded, setMapLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Sincronizar coordenadas iniciales si cambian externamente
  useEffect(() => {
    if (initialLat && initialLng) {
      setSelectedCoords({ lat: initialLat, lng: initialLng })
    }
  }, [initialLat, initialLng])

  // Lógica de Autocompletado (Debounced)
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`)
        const data = await res.json()
        setSuggestions(data)
        setShowSuggestions(true)
      } catch (error) {
        console.error('Error fetching suggestions', error)
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (isOpen && !mapLoaded) {
      // Cargar Leaflet desde CDN
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.async = true
      script.onload = () => {
        setMapLoaded(true)
      }
      document.head.appendChild(script)
    }
  }, [isOpen, mapLoaded])

  useEffect(() => {
    if (mapLoaded && isOpen) {
      const L = (window as any).L
      if (!L) return

      const container = document.getElementById('map-container')
      if (!container) return

      const lat = parseFloat(selectedCoords.lat) || 10.3237
      const lng = parseFloat(selectedCoords.lng) || -84.4246

      // Limpiar cualquier instancia previa si existiera (doble seguridad)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      // Crear nueva instancia vinculada al nuevo contenedor del DOM
      const map = L.map('map-container').setView([lat, lng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map)

      marker.on('dragend', (e: any) => {
        const { lat, lng } = e.target.getLatLng()
        setSelectedCoords({ lat: lat.toFixed(8), lng: lng.toFixed(8) })
      })

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        marker.setLatLng([lat, lng])
        setSelectedCoords({ lat: lat.toFixed(8), lng: lng.toFixed(8) })
      })

      mapRef.current = map
      markerRef.current = marker

      // Arreglar dimensiones después de que el modal termine de animar
      setTimeout(() => {
        map.invalidateSize()
      }, 200)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [mapLoaded, isOpen])

  const selectLocation = (lat: string, lon: string, displayName: string) => {
    const newCoords = { lat: parseFloat(lat).toFixed(8), lng: parseFloat(lon).toFixed(8) }
    setSelectedCoords(newCoords)
    setSearchQuery(displayName)
    setShowSuggestions(false)
    
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([lat, lon], 15)
      markerRef.current.setLatLng([lat, lon])
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery) return

    setIsSearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`)
      const data = await res.json()
      
      if (data && data.length > 0) {
        selectLocation(data[0].lat, data[0].lon, data[0].display_name)
        toast.success('Ubicación encontrada')
      } else {
        toast.error('No se encontraron resultados.')
      }
    } catch (error) {
      toast.error('Error al buscar ubicación.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleConfirm = () => {
    onSelect(selectedCoords.lat, selectedCoords.lng)
    onOpenChange(false)
    toast.success('Ubicación seleccionada en el mapa')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col p-0 overflow-hidden bg-zinc-950 border-white/10 shadow-2xl">
        <DialogHeader className="p-4 border-b border-white/5 bg-zinc-950 flex flex-row items-center justify-between gap-4">
          <DialogTitle className="text-white flex items-center gap-2 whitespace-nowrap">
            <MapPin className="w-5 h-5 text-primary" /> Ubicación
          </DialogTitle>
          
          <div className="flex-1 max-w-md relative">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input 
                type="text"
                placeholder="Buscar lugar (ej: Pital, San Carlos)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 3 && setShowSuggestions(true)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary/50"
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </form>

            {/* Dropdown de Sugerencias */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[1000] overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectLocation(s.lat, s.lon, s.display_name)}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-zinc-200 line-clamp-1">{s.display_name.split(',')[0]}</p>
                        <p className="text-[10px] text-zinc-500 line-clamp-1">{s.display_name.split(',').slice(1).join(',').trim()}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 relative bg-zinc-900">
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500 font-bold uppercase tracking-widest text-xs">
              Cargando mapa...
            </div>
          )}
          <div id="map-container" className="w-full h-full" />
        </div>

        <DialogFooter className="p-4 bg-zinc-950 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[10px] text-zinc-500 flex flex-col">
            <p className="font-black uppercase tracking-widest text-zinc-400 mb-1">Guía de Uso</p>
            <p className="italic">Usa el buscador arriba o arrastra el marcador para definir la posición exacta.</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none text-zinc-400 hover:text-white">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} className="flex-1 sm:flex-none bg-primary text-black font-black uppercase tracking-tighter italic hover:bg-primary/90 px-8">
              Confirmar Ubicación
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
