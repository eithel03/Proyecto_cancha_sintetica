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
  const imageUrl = formData.get('image_url') as string
  
  if (!name || !pricePerPerson) return { error: 'Nombre y precio por persona son obligatorios' }

  const { error } = await supabase
    .from('courts')
    .insert({
      business_id: businessId,
      name,
      description,
      price_per_person: parseFloat(pricePerPerson),
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
  const imageUrl = formData.get('image_url') as string
  
  if (!id || !name || !pricePerPerson) return { error: 'ID, nombre y precio por persona son obligatorios' }

  const { error } = await supabase
    .from('courts')
    .update({
      name,
      description,
      price_per_person: parseFloat(pricePerPerson),
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
