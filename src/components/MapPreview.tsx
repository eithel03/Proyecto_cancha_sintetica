'use client'

import { useEffect, useRef, useState } from 'react'

interface MapPreviewProps {
  lat: string
  lng: string
}

export function MapPreview({ lat, lng }: MapPreviewProps) {
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    // Cargar Leaflet si no está cargado
    if (!(window as any).L) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.async = true
      script.onload = () => setMapLoaded(true)
      document.head.appendChild(script)
    } else {
      setMapLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!mapLoaded || !lat || !lng) return

    const L = (window as any).L
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lng)

    if (isNaN(latitude) || isNaN(longitude)) return

    if (!mapRef.current) {
      mapRef.current = L.map('map-preview', {
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false
      }).setView([latitude, longitude], 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapRef.current)

      markerRef.current = L.marker([latitude, longitude]).addTo(mapRef.current)
    } else {
      mapRef.current.setView([latitude, longitude], 15)
      markerRef.current.setLatLng([latitude, longitude])
      mapRef.current.invalidateSize()
    }
  }, [mapLoaded, lat, lng])

  return (
    <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 h-[200px] bg-zinc-900 relative">
      {!lat || !lng ? (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
          Sin ubicación seleccionada
        </div>
      ) : (
        <div id="map-preview" className="w-full h-full" />
      )}
    </div>
  )
}
