'use client'

import { checkAvailability, type AvailabilityResult } from '@/app/[slug]/reservar/actions'

const AVAILABILITY_CACHE_TTL_MS = 15_000

type CachedAvailability = {
  expiresAt: number
  request: Promise<AvailabilityResult>
}

// Keeps quick changes between date/court selectors from creating duplicate
// server-action requests. The short TTL avoids showing stale occupancy for long.
const availabilityCache = new Map<string, CachedAvailability>()

export function getCachedAvailability(courtId: string, date: string) {
  const key = `${courtId}:${date}`
  const cached = availabilityCache.get(key)

  if (cached && cached.expiresAt > Date.now()) return cached.request

  const request = checkAvailability(courtId, date)
  availabilityCache.set(key, {
    request,
    expiresAt: Date.now() + AVAILABILITY_CACHE_TTL_MS,
  })

  setTimeout(() => {
    const current = availabilityCache.get(key)
    if (current?.request === request) availabilityCache.delete(key)
  }, AVAILABILITY_CACHE_TTL_MS)

  return request
}
