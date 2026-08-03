'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validatePhone } from '@/lib/phone'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const fullName = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const profilePhone = validatePhone(phone)
  if (!profilePhone.ok) return { error: profilePhone.error }

  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      full_name: fullName, 
      phone: profilePhone.value
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) return { error: 'Error al actualizar perfil: ' + error.message }
  
  revalidatePath('/[slug]/perfil')
  return { success: true, data }
}

export async function hideHistoryItem(type: 'reservation' | 'challenge', id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const table = type === 'reservation' ? 'reservations' : 'challenges'
  const idColumn = type === 'reservation' ? 'customer_id' : 'creator_id'
  
  let query = supabase.from(table).update({ hidden_by_customer: true }).eq('id', id)

  if (type === 'reservation') {
    query = query.eq('customer_id', user.id)
  } else {
    query = query.or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
  }

  const { error } = await query

  if (error) return { error: 'Error al ocultar: ' + error.message }

  revalidatePath('/[slug]/perfil')
  return { success: true }
}

export async function clearAllHistory(businessId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const today = new Date().toISOString().split('T')[0]

  // Ocultar todas las reservas no vigentes (canceladas, completadas o pasadas)
  const { error: resError } = await supabase
    .from('reservations')
    .update({ hidden_by_customer: true })
    .eq('customer_id', user.id)
    .eq('business_id', businessId)
    .or(`status.in.(cancelled,completed),reservation_date.lt.${today}`)

  // Ocultar retos no vigentes (donde sea creador u oponente)
  const { error: chalError } = await supabase
    .from('challenges')
    .update({ hidden_by_customer: true })
    .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .eq('business_id', businessId)
    .or(`status.in.(cancelled,completed,confirmed),challenge_date.lt.${today}`)

  if (resError || chalError) {
    console.error('Clear History Error:', resError, chalError)
    return { error: 'Error al limpiar historial.' }
  }

  revalidatePath('/[slug]/perfil')
  return { success: true }
}
