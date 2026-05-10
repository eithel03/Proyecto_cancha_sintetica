'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { notifyUserReservationConfirmed } from '@/lib/notifications'

export async function updateReservationStatus(reservationId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Obtener detalles de la reserva para la notificación
  const { data: res } = await supabase
    .from('reservations')
    .select('*, businesses(name)')
    .eq('id', reservationId)
    .single()

  const { error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', reservationId)

  if (error) {
    return { error: 'Error al actualizar reserva: ' + error.message }
  }

  // Notificar al usuario si se confirma
  if (status === 'confirmed' && res) {
    await notifyUserReservationConfirmed(
      res.customer_name,
      res.businesses?.name || 'la cancha',
      res.reservation_date,
      res.start_time.substring(0, 5),
      res.customer_phone
    )
  }

  revalidatePath('/dashboard/reservations')
  revalidatePath('/[slug]/perfil')
  return { success: true }
}

export async function createAdminReservation(data: {
  business_id: string,
  court_id: string,
  customer_name: string,
  customer_phone: string,
  reservation_date: string,
  start_time: string,
  end_time: string,
  notes?: string,
  slug?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('reservations')
    .insert({
      business_id: data.business_id,
      court_id: data.court_id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      reservation_date: data.reservation_date,
      start_time: data.start_time,
      end_time: data.end_time,
      notes: data.notes,
      status: 'confirmed' // Las reservas manuales del admin se confirman automáticamente
    })

  if (error) {
    if (error.message.includes('ya está reservada')) {
      return { error: 'Este horario ya está ocupado por otra reserva o partido.' }
    }
    return { error: 'Error al crear reserva manual: ' + error.message }
  }

  revalidatePath('/dashboard/reservations')
  if (data.slug) {
    revalidatePath(`/${data.slug}/reservar`, 'page')
    revalidatePath(`/${data.slug}/reservar`, 'layout')
  } else {
    revalidatePath('/[slug]/reservar', 'page')
  }
  return { success: true }
}
