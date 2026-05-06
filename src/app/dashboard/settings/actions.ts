'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateBusiness(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const location = formData.get('location') as string
  const latitude = formData.get('latitude') as string
  const longitude = formData.get('longitude') as string
  
  if (!name) return { error: 'El nombre es obligatorio' }

  const { error } = await supabase
    .from('businesses')
    .update({
      name,
      phone,
      location,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
    })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return { error: 'Error al actualizar negocio: ' + error.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function updateBusinessHours(businessId: string, hours: any[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Eliminar horas existentes para este negocio antes de insertar las nuevas
  // o usar upsert si es posible. Para simplificar, haremos upsert.
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

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function createException(data: { business_id: string, exception_date: string, reason?: string, is_closed: boolean }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: newException, error } = await supabase
    .from('business_exceptions')
    .insert(data)
    .select()
    .single()

  if (error) return { error: 'Error al crear excepción: ' + error.message }
  
  revalidatePath('/dashboard/settings')
  return { success: true, data: newException }
}

export async function deleteException(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('business_exceptions')
    .delete()
    .eq('id', id)

  if (error) return { error: 'Error al eliminar excepción: ' + error.message }
  
  revalidatePath('/dashboard/settings')
  return { success: true }
}

