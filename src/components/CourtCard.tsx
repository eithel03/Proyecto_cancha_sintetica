'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, Users, ChevronRight } from 'lucide-react'

interface CourtCardProps {
  court: {
    id: string
    name: string
    description?: string | null
    price_per_hour?: number | null
    price_per_person?: number | null
    capacity?: number | null
    image_url?: string | null
    is_active?: boolean | null
  }
  slug: string
  priority?: boolean
}

function CourtField({ desaturated = false }: { desaturated?: boolean }) {
  return (
    <div className={`absolute inset-0 ${desaturated ? 'grayscale opacity-80' : ''}`}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#3fae74_0%,#2f9565_60%,#2a8a5d_100%)]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_60px)]" />
      <div className="absolute inset-x-3 sm:inset-x-4 inset-y-2.5 sm:inset-y-3 border-2 border-white/30 rounded-md" />
      <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white/25 -translate-x-1/2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 border-white/25" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/30" />
    </div>
  )
}

export function CourtCard({ court, slug, priority = false }: CourtCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const hasImage = !!court.image_url
  const isActive = court.is_active !== false

  const price = court.price_per_hour ?? court.price_per_person
  const priceLabel = court.price_per_hour != null ? 'por hora' : 'por persona'
  const capacity = court.capacity || 5
  const formatPrice = (n: number) => Number(n).toLocaleString('es-CR').replace(/\./g, ' ')

  const cardInner = (
    <>
      {/* Imagen */}
      <div className="relative aspect-[16/10] overflow-hidden bg-surface">
        {hasImage && !imageFailed && !imageLoaded && (
          <div className="absolute inset-0 animate-shimmer" />
        )}
        {hasImage && !imageFailed && court.image_url && (
          <Image
            src={court.image_url}
            alt={court.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {(!hasImage || imageFailed) && <CourtField desaturated={!isActive} />}

        {/* Badge */}
        <span className={`absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${
          isActive
            ? 'bg-white/95 border border-green-200 text-green-700'
            : 'bg-white/95 border border-slate-200 text-slate-500'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-slate-400'}`} />
          {isActive ? 'Disponible' : 'Ocupada'}
        </span>
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col p-5 gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-tight text-foreground truncate">{court.name}</h3>
            {court.description && (
              <p className="text-sm text-muted-foreground font-medium mt-0.5 truncate">{court.description}</p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-primary-green-dark/8 border border-primary-green-dark/15 px-2.5 py-1 text-[11px] font-semibold text-primary-green-dark">
            Fútbol {capacity}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-muted-foreground/60" /> {capacity} vs {capacity}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground/60" /> 60 min
          </span>
        </div>

        {price != null && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              ₡{formatPrice(price)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">{priceLabel}</span>
          </div>
        )}

        <div className="mt-auto pt-1">
          {isActive ? (
            <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold h-12 text-sm font-bold text-navy shadow-sm shadow-gold/15 transition-all group-hover:brightness-105 group-hover:-translate-y-px">
              Reservar cancha
              <ChevronRight className="w-4 h-4" />
            </span>
          ) : (
            <span className="flex w-full items-center justify-center rounded-xl bg-surface h-12 text-sm font-medium text-muted-foreground border border-border cursor-not-allowed">
              Disponible desde las 9:00 p.m.
            </span>
          )}
        </div>
      </div>
    </>
  )

  const cardClasses =
    'group flex flex-col overflow-hidden rounded-2xl bg-card border border-border shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover hover:border-gold/30 w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.833rem)] max-w-[380px]'

  if (isActive) {
    return (
      <Link href={`/${slug}/reservar?courtId=${court.id}`} className={cardClasses}>
        {cardInner}
      </Link>
    )
  }
  return <div className={cardClasses}>{cardInner}</div>
}
