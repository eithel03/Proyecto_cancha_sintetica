'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifyBusinessAccess } from '@/lib/auth'

export async function createCourt(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const businessId = formData.get('business_id') as string
  const slug = formData.get('slug') as string

  const access = await verifyBusinessAccess(businessId)
  if (access.error) return { error: access.error }
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const pricePerPerson = formData.get('price_per_person') as string
  const capacity = formData.get('capacity') as string
  const imageUrl = formData.get('image_url') as string
  const isActive = formData.get('is_active') !== 'false'
  
  if (!name || !pricePerPerson) return { error: 'Nombre y precio por persona son obligatorios' }
  if (Number(pricePerPerson) < 0) return { error: 'El precio no puede ser negativo' }
  if (capacity && Number(capacity) <= 0) return { error: 'La capacidad debe ser mayor que cero' }

  const { data: court, error } = await supabase
    .from('courts')
    .insert({
      business_id: businessId,
      name,
      description,
      price_per_person: parseFloat(pricePerPerson),
      capacity: capacity ? parseInt(capacity) : 5,
      image_url: imageUrl,
      is_active: isActive
    })
    .select('*')
    .single()

  if (error) {
    return { error: 'Error al crear la cancha: ' + error.message }
  }

  if (slug) revalidatePath(`/${slug}/admin/courts`)
  return { success: true, data: court }
}

export async function updateCourt(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const id = formData.get('id') as string
  const slug = formData.get('slug') as string

  // Look up business_id from court for access check
  const { data: existingCourt } = await supabase.from('courts').select('business_id').eq('id', id).single()
  if (existingCourt) {
    const access = await verifyBusinessAccess(existingCourt.business_id)
    if (access.error) return { error: access.error }
  }
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const pricePerPerson = formData.get('price_per_person') as string
  const capacity = formData.get('capacity') as string
  const imageUrl = formData.get('image_url') as string
  const isActive = formData.get('is_active') !== 'false'
  
  if (!id || !name || !pricePerPerson) return { error: 'ID, nombre y precio por persona son obligatorios' }
  if (Number(pricePerPerson) < 0) return { error: 'El precio no puede ser negativo' }
  if (capacity && Number(capacity) <= 0) return { error: 'La capacidad debe ser mayor que cero' }

  const { data: court, error } = await supabase
    .from('courts')
    .update({
      name,
      description,
      price_per_person: parseFloat(pricePerPerson),
      capacity: capacity ? parseInt(capacity) : 5,
      image_url: imageUrl,
      is_active: isActive
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return { error: 'Error al actualizar la cancha: ' + error.message }
  }

  if (slug) revalidatePath(`/${slug}/admin/courts`)
  return { success: true, data: court }
}

export async function updateCourtStatus(id: string, isActive: boolean, slug?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: existingCourt } = await supabase.from('courts').select('business_id').eq('id', id).single()
  if (!existingCourt) return { error: 'Cancha no encontrada' }
  const access = await verifyBusinessAccess(existingCourt.business_id)
  if (access.error) return { error: access.error }

  const { data: court, error } = await supabase
    .from('courts')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return { error: 'Error al actualizar el estado de la cancha: ' + error.message }
  }

  if (slug) revalidatePath(`/${slug}/admin/courts`)
  return { success: true, data: court }
}

export async function deleteCourt(id: string, slug?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: existingCourt } = await supabase.from('courts').select('business_id').eq('id', id).single()
  if (!existingCourt) return { error: 'Cancha no encontrada' }
  const access = await verifyBusinessAccess(existingCourt.business_id)
  if (access.error) return { error: access.error }

  const { count } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('court_id', id)

  if ((count || 0) > 0) {
    return { error: 'Esta cancha tiene reservas vinculadas. Desactívala en lugar de eliminarla.' }
  }

  const { error } = await supabase
    .from('courts')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: 'Error al eliminar la cancha: ' + error.message }
  }

  if (slug) revalidatePath(`/${slug}/admin/courts`)
  return { success: true }
}

export async function createPricingRule(data: { court_id: string, day_of_week: number, start_time: string, end_time: string, price: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Verify business access via court's business_id
  const { data: court } = await supabase.from('courts').select('business_id').eq('id', data.court_id).single()
  if (court) {
    const access = await verifyBusinessAccess(court.business_id)
    if (access.error) return { error: access.error }
  }

  const { data: newRule, error } = await supabase
    .from('court_pricing_rules')
    .insert(data)
    .select()
    .single()

  if (error) return { error: 'Error al crear regla de precio: ' + error.message }
  
  return { success: true, data: newRule }
}

export async function deletePricingRule(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Verify business access via rule → court → business_id
  const { data: rule } = await supabase
    .from('court_pricing_rules')
    .select('court_id')
    .eq('id', id)
    .single()

  if (rule) {
    const { data: court } = await supabase.from('courts').select('business_id').eq('id', rule.court_id).single()
    if (court) {
      const access = await verifyBusinessAccess(court.business_id)
      if (access.error) return { error: access.error }
    }
  }

  const { error } = await supabase
    .from('court_pricing_rules')
    .delete()
    .eq('id', id)

  if (error) return { error: 'Error al eliminar regla de precio: ' + error.message }
  
  return { success: true }
}
