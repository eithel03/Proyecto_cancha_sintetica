import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AdminUser = {
  id: string
  email?: string | null
  user_metadata?: {
    full_name?: string | null
    name?: string | null
    first_name?: string | null
    last_name?: string | null
  }
}

export type AdminBusiness = {
  id: string
  name: string
  slug: string
  owner_id: string
  is_active: boolean
  location: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  latitude: number | null
  longitude: number | null
  logo_url: string | null
  cover_image_url: string | null
  branding: Record<string, string> | null
}

export type AdminSession = {
  user: AdminUser
  business: AdminBusiness
  isOwner: boolean
}

export const getBusinessBySlug = cache(async (slug: string): Promise<AdminBusiness | null> => {
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  return (business as AdminBusiness | null) ?? null
})

export async function getAdminSession(slug: string): Promise<AdminSession> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const business = await getBusinessBySlug(slug)
  if (!business) redirect('/login')

  const isOwner = business.owner_id === user.id
  if (!isOwner) {
    const { data: staffAccess } = await supabase
      .from('business_users')
      .select('id')
      .eq('business_id', business.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!staffAccess) redirect('/dashboard')
  }

  return { user, business, isOwner }
}
