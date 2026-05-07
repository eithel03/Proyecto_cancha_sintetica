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

