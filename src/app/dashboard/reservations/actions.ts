'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateReservationStatus(reservationId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', reservationId)

  if (error) {
    return { error: 'Error al actualizar reserva: ' + error.message }
  }

  revalidatePath('/dashboard/reservations')
  return { success: true }
}
