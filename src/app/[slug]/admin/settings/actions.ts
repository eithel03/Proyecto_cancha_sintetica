'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validatePhone } from '@/lib/phone'
import { verifyBusinessAccess } from '@/lib/auth'

export async function updateBusiness(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const whatsapp = formData.get('whatsapp') as string
  const location = formData.get('location') as string
  const latitude = formData.get('latitude') as string
  const longitude = formData.get('longitude') as string
  const logo_url = formData.get('logo_url') as string

  const access = await verifyBusinessAccess(id)
  if (access.error) return { error: access.error }

  if (!name) return { error: 'El nombre es obligatorio' }
  const businessPhone = validatePhone(phone)
  if (!businessPhone.ok) return { error: businessPhone.error }
  const businessWhatsapp = validatePhone(whatsapp)
  if (!businessWhatsapp.ok) return { error: `WhatsApp: ${businessWhatsapp.error}` }

  // Actualizar cover_image_url solo si viene en el form;
  // la portada se gestiona por separado vía updateCoverImage
  const updateData: Record<string, unknown> = {
    name,
    phone: businessPhone.value.replace(/-/g, ''),
    whatsapp: businessWhatsapp.value ? businessWhatsapp.value.replace(/-/g, '') : null,
    location,
    latitude: latitude ? parseFloat(latitude) : null,
    longitude: longitude ? parseFloat(longitude) : null,
    logo_url: logo_url || null,
  }
  const cover_image_url = formData.get('cover_image_url') as string
  if (cover_image_url) updateData.cover_image_url = cover_image_url

  const { error } = await supabase
    .from('businesses')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return { error: 'Error al actualizar negocio: ' + error.message }
  }

  const { data: biz } = await supabase.from('businesses').select('slug').eq('id', id).single()
  if (biz?.slug) {
    revalidatePath(`/${biz.slug}/admin/settings`)
    revalidatePath(`/${biz.slug}`, 'layout')
  }
  return { success: true }
}

type BusinessHourInput = {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

export async function updateBusinessHours(businessId: string, hours: BusinessHourInput[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const access = await verifyBusinessAccess(businessId)
  if (access.error) return { error: access.error }

  // Eliminar horas existentes y reemplazar con las nuevas
  // Usamos upsert para manejar inserción y actualización
  const { error } = await supabase
    .from('business_hours')
    .upsert(
      hours.map(h => ({
        business_id: businessId,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed
      })),
      { onConflict: 'business_id,day_of_week' }
    )

  if (error) {
    return { error: 'Error al actualizar horarios: ' + error.message }
  }

  const { data: biz } = await supabase.from('businesses').select('slug').eq('id', businessId).single()
  if (biz?.slug) revalidatePath(`/${biz.slug}/admin/settings`)
  return { success: true }
}

export async function createException(data: { business_id: string, exception_date: string, reason?: string, is_closed: boolean }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const access = await verifyBusinessAccess(data.business_id)
  if (access.error) return { error: access.error }

  const { data: newException, error } = await supabase
    .from('business_exceptions')
    .insert(data)
    .select()
    .single()

  if (error) return { error: 'Error al crear excepción: ' + error.message }
  
  const { data: biz } = await supabase.from('businesses').select('slug').eq('id', data.business_id).single()
  if (biz?.slug) revalidatePath(`/${biz.slug}/admin/settings`)
  return { success: true, data: newException }
}

export async function deleteException(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Get business_id before deleting for access check and revalidation
  const { data: exception } = await supabase.from('business_exceptions').select('business_id').eq('id', id).single()

  if (exception?.business_id) {
    const access = await verifyBusinessAccess(exception.business_id)
    if (access.error) return { error: access.error }
  }

  const { error } = await supabase
    .from('business_exceptions')
    .delete()
    .eq('id', id)

  if (error) return { error: 'Error al eliminar excepción: ' + error.message }
  
  if (exception?.business_id) {
    const { data: biz } = await supabase.from('businesses').select('slug').eq('id', exception.business_id).single()
    if (biz?.slug) revalidatePath(`/${biz.slug}/admin/settings`)
  }
  return { success: true }
}

export async function updateBranding(businessId: string, branding: Record<string, string>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const access = await verifyBusinessAccess(businessId)
  if (access.error) return { error: access.error }

  const { error } = await supabase
    .from('businesses')
    .update({ branding })
    .eq('id', businessId)

  if (error) return { error: 'Error al actualizar apariencia: ' + error.message }

  const { data: biz } = await supabase.from('businesses').select('slug').eq('id', businessId).single()
  if (biz?.slug) {
    revalidatePath(`/${biz.slug}/admin/settings`)
    revalidatePath(`/${biz.slug}`, 'layout')
  }
  return { success: true }
}

export async function updateCoverImage(businessId: string, coverImageUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const access = await verifyBusinessAccess(businessId)
  if (access.error) return { error: access.error }

  const { error } = await supabase
    .from('businesses')
    .update({ cover_image_url: coverImageUrl || null })
    .eq('id', businessId)

  if (error) return { error: 'Error al actualizar la portada: ' + error.message }
  const { data: biz } = await supabase.from('businesses').select('slug').eq('id', businessId).single()
  if (biz?.slug) {
    revalidatePath(`/${biz.slug}/admin/settings`)
    revalidatePath(`/${biz.slug}`, 'layout')
  }
  return { success: true }
}

