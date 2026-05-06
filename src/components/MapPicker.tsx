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

      if (!mapRef.current) {
        mapRef.current = L.map('map-container').setView([lat, lng], 15)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(mapRef.current)

        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current)

        markerRef.current.on('dragend', (e: any) => {
          const { lat, lng } = e.target.getLatLng()
          setSelectedCoords({ lat: lat.toFixed(8), lng: lng.toFixed(8) })
        })

        mapRef.current.on('click', (e: any) => {
          const { lat, lng } = e.latlng
          markerRef.current.setLatLng([lat, lng])
          setSelectedCoords({ lat: lat.toFixed(8), lng: lng.toFixed(8) })
        })
      } else {
        mapRef.current.setView([lat, lng], 15)
        markerRef.current.setLatLng([lat, lng])
      }
    }

    return () => {
      // No destruimos el mapa para evitar errores de recreación si se cierra y abre rápido, 
      // pero podríamos invalidar tamaño si fuera necesario.
    }
  }, [mapLoaded, isOpen])

  const handleConfirm = () => {
    onSelect(selectedCoords.lat, selectedCoords.lng)
    onOpenChange(false)
    toast.success('Ubicación seleccionada en el mapa')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[500px] flex flex-col p-0 overflow-hidden bg-zinc-950 border-white/10">
        <DialogHeader className="p-4 border-b border-white/5">
          <DialogTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Selecciona ubicación en el mapa
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 relative bg-zinc-900">
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
              Cargando mapa...
            </div>
          )}
          <div id="map-container" className="w-full h-full" style={{ minHeight: '300px' }} />
        </div>

        <DialogFooter className="p-4 bg-zinc-900 border-t border-white/5">
          <div className="flex-1 text-[10px] text-zinc-500 flex flex-col justify-center">
            <p className="font-bold text-zinc-400">Coord: {selectedCoords.lat}, {selectedCoords.lng}</p>
            <p>Arrastra el marcador o haz clic en cualquier punto.</p>
          </div>
          <div className="flex gap-2">
            <DialogClose render={<Button variant="ghost" className="text-zinc-400 hover:text-white" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleConfirm} className="bg-primary text-black hover:bg-primary/90">
              Confirmar Ubicación
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
