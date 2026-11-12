import { revalidateTag, unstable_cache } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export type PublicBusiness = {
  id: string
  name: string
  slug: string
  location: string | null
  phone: string | null
  whatsapp: string | null
  description: string | null
  logo_url: string | null
  cover_image_url: string | null
  latitude: number | null
  longitude: number | null
  branding: Record<string, string> | null
  is_active: boolean | null
  show_tournament: boolean | null
}

export type PublicCourt = {
  id: string
  business_id: string | null
  name: string
  description: string | null
  price_per_hour: number | null
  price_per_person: number | null
  capacity: number | null
  image_url: string | null
  is_active: boolean | null
}

const publicSupabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  },
)

export function getPublicBusiness(slug: string) {
  return unstable_cache(
    async (): Promise<PublicBusiness | null> => {
      const { data, error } = await publicSupabase
        .from('businesses_public')
        .select('id, name, slug, location, phone, whatsapp, description, logo_url, cover_image_url, latitude, longitude, branding, is_active, show_tournament')
        .eq('slug', slug)
        .maybeSingle()

      if (error) {
        console.error('Error loading public business:', error)
        return null
      }

      if (!data?.id || !data.name || !data.slug) return null

      return {
        ...data,
        id: data.id,
        name: data.name,
        slug: data.slug,
        branding: isBranding(data.branding) ? data.branding : null,
      }
    },
    ['public-business', slug],
    {
      revalidate: 60,
      tags: [`public-business:${slug}`],
    },
  )()
}

export function getPublicCourts(businessId: string) {
  return unstable_cache(
    async (): Promise<PublicCourt[]> => {
      const { data, error } = await publicSupabase
        .from('courts')
        .select('id, business_id, name, description, price_per_hour, price_per_person, capacity, image_url, is_active')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error loading public courts:', error)
        return []
      }

      return (data ?? []) as PublicCourt[]
    },
    ['public-courts', businessId],
    {
      revalidate: 60,
      tags: [`public-courts:${businessId}`],
    },
  )()
}

function isBranding(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function invalidatePublicBusiness(slug: string) {
  revalidateTag(`public-business:${slug}`, 'max')
}

export function invalidatePublicCourts(businessId: string) {
  revalidateTag(`public-courts:${businessId}`, 'max')
}
