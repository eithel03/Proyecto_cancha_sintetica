'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createCourt(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const businessId = formData.get('business_id') as string
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const pricePerPerson = formData.get('price_per_person') as string
  const capacity = formData.get('capacity') as string
  const imageUrl = formData.get('image_url') as string
  
  if (!name || !pricePerPerson) return { error: 'Nombre y precio por persona son obligatorios' }

  // Verificar límite de canchas
  const { data: business } = await supabase
    .from('businesses')
    .select('max_courts')
    .eq('id', businessId)
    .single()

  const maxCourts = business?.max_courts || 1

  const { count } = await supabase
    .from('courts')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)

  if (count !== null && count >= maxCourts) {
    return { error: 'Has alcanzado el límite máximo de canchas permitidas. Contacta a soporte para ampliar tu plan.' }
  }

  const { error } = await supabase
    .from('courts')
    .insert({
      business_id: businessId,
      name,
      description,
      price_per_person: parseFloat(pricePerPerson),
      capacity: capacity ? parseInt(capacity) : 5,
      image_url: imageUrl,
      is_active: true
    })

  if (error) {
    return { error: 'Error al crear la cancha: ' + error.message }
  }

  revalidatePath('/dashboard/courts')
  return { success: true }
}

export async function updateCourt(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const pricePerPerson = formData.get('price_per_person') as string
  const capacity = formData.get('capacity') as string
  const imageUrl = formData.get('image_url') as string
  
  if (!id || !name || !pricePerPerson) return { error: 'ID, nombre y precio por persona son obligatorios' }

  const { error } = await supabase
    .from('courts')
    .update({
      name,
      description,
      price_per_person: parseFloat(pricePerPerson),
      capacity: capacity ? parseInt(capacity) : 5,
      image_url: imageUrl
    })
    .eq('id', id)

  if (error) {
    return { error: 'Error al actualizar la cancha: ' + error.message }
  }

  revalidatePath('/dashboard/courts')
  return { success: true }
}

export async function deleteCourt(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('courts')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: 'Error al eliminar la cancha: ' + error.message }
  }

  revalidatePath('/dashboard/courts')
  return { success: true }
}

export async function createPricingRule(data: { court_id: string, day_of_week: number, start_time: string, end_time: string, price: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

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

  const { error } = await supabase
    .from('court_pricing_rules')
    .delete()
    .eq('id', id)

  if (error) return { error: 'Error al eliminar regla de precio: ' + error.message }
  
  return { success: true }
}
